const express = require('express');
const router = express.Router();
const {
  getWalletBalance,
  addMoneyToWallet,
  deductMoneyFromWallet,
  getTransactionHistory,
  getWalletStats,
  getAllWallets
} = require('../controllers/walletController');

// GET /api/wallet/all - Get all wallets (admin)
router.get('/all', getAllWallets);

// GET /api/wallet/:userId/balance - Get wallet balance
router.get('/:userId/balance', getWalletBalance);

// POST /api/wallet/:userId/add - Add money to wallet
router.post('/:userId/add', addMoneyToWallet);

// POST /api/wallet/:userId/deduct - Deduct money from wallet
router.post('/:userId/deduct', deductMoneyFromWallet);

// GET /api/wallet/:userId/transactions - Get transaction history
router.get('/:userId/transactions', getTransactionHistory);

// GET /api/wallet/:userId/stats - Get wallet statistics
router.get('/:userId/stats', getWalletStats);

module.exports = router;