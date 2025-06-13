const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/quiz-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schéma utilisateur
const UserSchema = new mongoose.Schema({
  nom: String,
  email: String,
  numero: String,
  password: String,
  type: String // 'student' ou 'admin'
});
const User = mongoose.model('User', UserSchema);

// Schéma matière (avec _id personnalisé)
const MatiereSchema = new mongoose.Schema({
  _id: String, // <-- ID personnalisé (ex: INF111)
  nom: String,
  description: String // optionnel
}, { timestamps: true });
const Matiere = mongoose.model('Matiere', MatiereSchema);

// Schéma question
const QuestionSchema = new mongoose.Schema({
  matiere: String, // ID de la matière (ex: INF111)
  question: String,
  propositions: [String], // Tableau de 4 propositions
  reponse: String, // Bonne réponse
  explication: String // <-- Ajouté ici
});
const Question = mongoose.model('Question', QuestionSchema);

// Route de login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.json({
        success: true,
        user: {
          nom: user.nom,
          email: user.email,
          numero: user.numero,
          type: user.type
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// CRUD Utilisateurs
app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// CRUD Matières

// Ajouter une matière avec vérification de l'ID
app.post('/api/matieres', async (req, res) => {
  try {
    const { _id, nom, description } = req.body;
    if (!_id || !/^INF\d{3}$/.test(_id)) {
      return res.status(400).json({ success: false, message: "L'ID doit être au format INFxxx." });
    }
    const exists = await Matiere.findById(_id);
    if (exists) {
      return res.status(409).json({ success: false, message: "Cette matière existe déjà." });
    }
    const matiere = new Matiere({ _id, nom, description });
    await matiere.save();
    res.json({ success: true, matiere });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

app.get('/api/matieres', async (req, res) => {
  try {
    const matieres = await Matiere.find();
    res.json({ success: true, matieres });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// CRUD Questions

// Ajouter une question QCM
app.post('/api/questions', async (req, res) => {
  try {
    const { matiere, question, reponses, bonneReponse, explication } = req.body;
    if (!matiere || !question || !Array.isArray(reponses) || reponses.length !== 4 || !bonneReponse) {
      return res.status(400).json({ success: false, message: 'Champs invalides ou manquants.' });
    }
    // Optionnel : vérifier que la matière existe
    // const matiereExists = await Matiere.findById(matiere);
    // if (!matiereExists) return res.status(404).json({ success: false, message: "Matière non trouvée." });

    const newQuestion = new Question({
      matiere,
      question,
      propositions: reponses,
      reponse: bonneReponse,
      explication 
    });
    await newQuestion.save();
    res.json({ success: true, question: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Obtenir toutes les questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json({ success: true, questions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Obtenir 5 questions aléatoires pour une matière donnée
app.get('/api/quiz/:matiereId', async (req, res) => {
  try {
    const { matiereId } = req.params;
    const questions = await Question.aggregate([
      { $match: { matiere: matiereId } },
      { $sample: { size: 5 } }
    ]);
    res.json({ success: true, questions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Supprimer un utilisateur par son ID
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Supprimer une matière par son ID
app.delete('/api/matieres/:id', async (req, res) => {
  try {
    await Matiere.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Supprimer une question par son ID
app.delete('/api/questions/:id', async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Serveur API démarré sur http://localhost:3000');
});