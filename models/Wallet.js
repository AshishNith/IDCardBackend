const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTransactionAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
walletSchema.index({ userId: 1 });

// Virtual for formatted balance
walletSchema.virtual('formattedBalance').get(function() {
  return `₹${this.balance.toFixed(2)}`;
});

// Method to add money to wallet
walletSchema.methods.addMoney = function(amount, session = null) {
  this.balance += amount;
  this.lastTransactionAt = new Date();
  return this.save({ session });
};

// Method to deduct money from wallet
walletSchema.methods.deductMoney = function(amount, session = null) {
  if (this.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }
  this.balance -= amount;
  this.lastTransactionAt = new Date();
  return this.save({ session });
};

// Static method to find or create wallet for user
walletSchema.statics.findOrCreateWallet = async function(userId) {
  let wallet = await this.findOne({ userId });
  if (!wallet) {
    wallet = new this({ userId, balance: 0 });
    await wallet.save();
  }
  return wallet;
};

module.exports = mongoose.model('Wallet', walletSchema);