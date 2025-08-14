const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
    },
    cardName: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['CARD_CREATION', 'RECHARGE'],
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    time: {
        type: Date,
        default: Date.now,
    }
},{
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
