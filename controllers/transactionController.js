const Transaction = require('../models/Transaction');

// Create new card transaction
exports.createCardTransaction = async (req, res) => {
    try {
        const { uid, cardName, amount } = req.body;
        const transaction = new Transaction({
            uid,
            cardName,
            amount,
            type: 'CARD_CREATION'
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create recharge transaction
exports.createRechargeTransaction = async (req, res) => {
    try {
        const { uid, cardName, amount } = req.body;
        const transaction = new Transaction({
            uid,
            cardName,
            amount,
            type: 'RECHARGE'
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get transactions by UID
exports.getUserTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ uid: req.params.uid });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
