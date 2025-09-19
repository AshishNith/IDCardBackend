const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

// Get all cards
router.get('/', cardController.getAllCards);

// Update card price
router.put('/:id/price', cardController.updateCardPrice);

// Create a card
router.post('/', cardController.createCard);

// Delete a card
router.delete('/:id', cardController.deleteCard);

module.exports = router;
