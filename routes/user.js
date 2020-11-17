// Import du package express
const express = require("express");
// Appel à la fonction Router(), issue du package express
const router = express.Router();
// Import du package cloudinary - permet d'envoyer une image
const cloudinary = require("cloudinary").v2;

// Créer un compte utilisateur :
// Importer crypto.js
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
// Importer uid2
const uid2 = require("uid2");

// Import des models
const User = require("../models/User");
const Offer = require("../models/Offer");

// Route Signup - permet de créer un nouvel utilisateur
router.post("/user/signup", async (req, res) => {
  try {
    // Vérifier que tous les champs requis sont remplis
    if (req.fields.username && req.fields.password && req.fields.email) {
      // Vérifier si le mail renseigné est déja pris
      const user = await User.findOne({ email: req.fields.email });

      // Si le mail renseigné existe...
      if (user) {
        res.status(400).json({ message: "This email is already in use." });

        // Si le mail renseigné n'existe pas...
      } else {
        // Encryptage du mot de passe user
        const password = req.fields.password;
        const salt = uid2(16);
        const hash = SHA256(password + salt).toString(encBase64);
        const token = uid2(16);

        const userAvatar = req.files.avatar.path;

        // Création d'un nouveau user
        const newUser = new User({
          email: req.fields.email,
          account: {
            username: req.fields.username,
            phone: req.fields.phone,
          },
          token: token,
          hash: hash,
          salt: salt,
        });

        // Envoyer l'image à cloudinary
        const result = await cloudinary.uploader.upload(userAvatar, {
          folder: `/vinted-api/user/${newUser._id}`,
        });

        newUser.avatar = result;

        // Sauvegarder le nouveau user dans la BDD
        await newUser.save();
        // Répondre au client...
        res.status(200).json({
          _id: newUser._id,
          token: newUser.token,
          account: {
            username: newUser.account.username,
            phone: newUser.account.phone,
          },
        });
      }

      // Si les champs requis ne sont pas tous renseignés
    } else {
      res.status(400).json({ message: "Required field." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route Login - permet à l'utilisateur de se connecter à son compte
router.post("/user/login", async (req, res) => {
  try {
    // Destructuring (extraction des clés d'un objet)
    const { email, password } = req.fields;

    // Est-ce que l'utilisateur possède un compte ?
    const user = await User.findOne({ email: email });
    // Si oui...
    if (user) {
      // On check si le mot de passe est bon
      const hashToCompare = SHA256(password + user.salt).toString(encBase64);

      // Ensuite on compare les mots de passe
      if (hashToCompare === user.hash) {
        // Si le mot de passe est correct...
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: {
            username: user.account.username,
            phone: user.account.phone,
          },
        });
        // Si le mot de passe n'est pas correct...
      } else {
        res.status(401).json({ message: "Unauthorized." });
      }
      // Si l'user n'existe pas...
    } else {
      res.status(401).json({ message: "Unauthorized." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Export des routes
module.exports = router;
