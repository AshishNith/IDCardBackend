const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

// Get all cards
router.get('/', cardController.getAllCards);

// Update card price
router.put('/:id/price', cardController.updateCardPrice);

// (Optional) Create a card
router.post('/', cardController.createCard);

module.exports = router;
