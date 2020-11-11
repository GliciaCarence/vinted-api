// Import du model User
const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    // On vérifie si on a reçu un token
    if (req.headers.authorization) {
      // Si oui, le token existe...
      const token = req.headers.authorization.replace("Bearer ", "");

      // ...on passe alors à la suite :
      // Chercher dans la BDD l'user qui possède ce token
      const user = await User.findOne({ token: token }).select(
        "account email _id"
      );
      // On vérifie que l'user existe
      if (user) {
        // Si l'user existe bien...
        // On ajoute une clé 'user' à l'objet 'req' contenant les infos du user
        req.user = user;
        return next();

        // Si l'user n'xiste pas...
      } else {
        return res.status(400).json({ message: "Unauthorized 1." });
      }

      // Si le token n'xiste pas...
    } else {
      return res.status(400).json({ message: "Unauthorized 2." });
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Export de la fonction
module.exports = isAuthenticated;
