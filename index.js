// Vinted - API

const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");

// Accès aux variables d'envirennement
require("dotenv").config();

const app = express();
app.use(formidable());
app.use(cors());

// Connecter avec la BDD
mongoose.connect(process.env.MONGOBD_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
});

// Configuration de cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Import des routes...
const userRoutes = require("./routes/user");
app.use(userRoutes);
const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

app.all("*", (req, res) => {
  res.status(404).json({ message: "Page  not found" });
});

// Démarrer le server
app.listen(process.env.PORT, () => {
  console.log(`Server started on port : ${process.env.PORT}`);
});
