const Card = require('../models/Card');

// Get all cards
exports.getAllCards = async (req, res) => {
  try {
    const cards = await Card.find();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update card price
exports.updateCardPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const card = await Card.findByIdAndUpdate(id, { price }, { new: true });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// (Optional) Create a card
exports.createCard = async (req, res) => {
  try {
    const { name, price } = req.body;
    const card = new Card({ name, price });
    await card.save();
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a card
exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findByIdAndDelete(id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card deleted successfully', card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
