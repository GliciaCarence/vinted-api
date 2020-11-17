// Import du package express
const express = require("express");
// Appel à la fonction Router(), issue du package express
const router = express.Router();
// import du package cloudinary
const cloudinary = require("cloudinary").v2;

// Import des models...
const User = require("../models/User");
const Offer = require("../models/Offer");

// Import du middleware (à chaque fois qu'une authentification est requise)
const isAuthenticated = require("../middlewares/isAuthenticated");

// Création d'une nouvelle offre
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    // Destructuring
    const {
      title,
      description,
      price,
      condition,
      city,
      brand,
      size,
      color,
    } = req.fields;

    const picture = req.files.picture.path;

    // Créer la nouvelle offre (sans l'image)
    const newOffer = new Offer({
      product_title: title,
      product_description: description,
      product_price: price,
      product_details: [
        { BRAND: brand },
        { SIZE: size },
        { CONDITION: condition },
        { COLOR: color },
        { CITY: city },
      ],
      // La référence du user
      owner: req.user,
    });

    // Envoyer l'image à cloudinary
    const result = await cloudinary.uploader.upload(picture, {
      folder: `vinted-api/offers/${newOffer._id}`,
    });
    newOffer.product_image = result;

    // Sauvegarder l'offre
    await newOffer.save();

    res.status(200).json(newOffer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Filtrer les offres
// Permet de récupérer une liste d'annonces, en fonction de filtres
// Si aucun filtre n'est envoyé, cette route renverra un tableau contenant l'ensemble des annonces
router.get("/offers", async (req, res) => {
  try {
    // Création d'un objet vide, où on stockera les requêtes filtrées par titre et par prix
    let filters = {};

    // Si on veut trouver une offre par titre
    if (req.query.title) {
      filters.product_title = new RegExp(req.query.title, "i");
    }

    // Si on veut trouver une offre par prix min
    if (req.query.priceMin) {
      filters.product_price = {
        $gte: req.query.priceMin,
      };
    }

    // Si on veut trouver une offre par prix max
    if (req.query.priceMax) {
      // On vérifie si filters.product_price existe
      if (filters.product_price) {
        // Si oui, on ajoute une clé $lte à l'objet filters.product_price
        filters.product_price.$lte = req.query.priceMax;
        // Si non, on crée un nouveau objet
      } else {
        filters.product_price = {
          $lte: req.query.priceMax,
        };
      }
    }

    // Création d'un objet vide, où on stockera les requêtes filtrées par prix asc ou desc
    let sort = {};

    // Pour touver une offre par prix asc
    if (req.query.sort === "price-asc") {
      sort = { product_price: 1 };
      // Pour trouver une offre par prix desc
    } else if (req.query.sort === "price-desc") {
      sort = { product_price: -1 };
    }

    // Gérér la pagination avec 'limit' et 'skip'
    // Les queries sont des strings et les méthodes 'limit' et 'skip' reçoivent un number en paramètre
    let limit = Number(req.query.limit);

    let page;
    // Si ce paramètre n'est pas transmis, il faut forcer l'affichage de la 1ère page
    if (Number(req.query.page) < 1) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }

    const offers = await Offer.find(filters)
      .populate({
        path: "owner",
        select: "account",
      })
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .select("product_title product_price");

    // Pour afficher la quantité totale d'offres
    const count = await Offer.countDocuments(filters);

    res.status(200).json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Chercher une offre par id
// Permettra de récupérer les détails concernant une annonce, en fonction de son id
router.get("/offers/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account",
    });
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mettre à jour une offre
router.put("/offer/update/:id", isAuthenticated, async (req, res) => {
  try {
    // On cherche l'offre à modifier par son id
    const offerToModify = await Offer.findById(req.params.id);

    // On vérifie si les champs à modifier sont renseignés
    if (req.fields.title) {
      offerToModify.product_title = req.fields.title;
    }

    if (req.fields.description) {
      offerToModify.product_description = req.fields.description;
    }

    if (req.fields.price) {
      offerToModify.product_price = req.fields.price;
    }

    // Modifier le tableau product_details
    const details = offerToModify.product_details;

    // On parcourt chaque élément du tableau pour pouvoir les modifier
    for (let i = 0; i < details.length; i++) {
      if (details[i].BRAND) {
        if (req.fields.brand) {
          details[i].BRAND = req.fields.brand;
        }
      }

      if (details[i].SIZE) {
        if (req.fields.size) {
          details[i].SIZE = req.fields.size;
        }
      }

      if (details[i].CONDITION) {
        if (req.fields.condition) {
          details[i].CONDITION = req.fields.condition;
        }
      }

      if (details[i].COLOR) {
        if (req.fields.color) {
          details[i].COLOR = req.fields.color;
        }
      }

      if (details[i].CITY) {
        if (req.fields.city) {
          details[i].CITY = req.fields.city;
        }
      }
    }

    // Pour que les modifications du tableau soient prises en compte
    offerToModify.markModified("product_details");

    // Modifier l'image
    if (req.files.picture) {
      // Envoyer la nouvelle image à cloudinary
      const result = await cloudinary.uploader.upload(req.files.picture.path, {
        folder: `vinted-api/offers/${offerToModify._id}`,
      });
      offerToModify.product_image = result;
    }

    await offerToModify.save();

    res.status(200).json({ message: "Offer modified sucessfully!" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Supprimer une offre
router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    // On cherche l'offre à supprimer par son id
    const offerToDelete = await Offer.findById(req.params.id);

    // Supprimer ce qu'il y a dans le dossier cloudinary
    await cloudinary.api.delete_resources_by_prefix(
      `vinted-api/offers/${req.params.id}`
    );

    // Ensuite, on supprime le dossier cloudinary
    await cloudinary.api.delete_folder(`vinted-api/offers/${req.params.id}`);

    await offerToDelete.delete();

    res.status(200).json({ message: "Offer deleted successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
