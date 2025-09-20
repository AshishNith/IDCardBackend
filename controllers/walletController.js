const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// Get wallet balance for a user
const getWalletBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const wallet = await Wallet.findOrCreateWallet(userId);

    res.status(200).json({
      success: true,
      wallet: {
        userId: wallet.userId,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: wallet.formattedBalance,
        lastTransactionAt: wallet.lastTransactionAt,
        isActive: wallet.isActive
      }
    });

  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance',
      error: error.message
    });
  }
};

// Add money to wallet
const addMoneyToWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { 
      amount, 
      description = 'Wallet recharge',
      paymentGateway = 'manual',
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      planDetails
    } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID and amount are required'
      });
    }

    // Find or create wallet
    const wallet = await Wallet.findOrCreateWallet(userId);
    const balanceBefore = wallet.balance;

    // Create transaction record
    const transaction = new Transaction({
      uid: userId,
      amount: amount,
      type: 'WALLET_RECHARGE',
      description: description,
      status: 'success',
      category: 'wallet_recharge',
      paymentGateway: paymentGateway,
      gatewayOrderId: gatewayOrderId,
      gatewayPaymentId: gatewayPaymentId,
      gatewaySignature: gatewaySignature,
      balanceBefore: balanceBefore,
      balanceAfter: balanceBefore + amount,
      metadata: {
        planDetails: planDetails,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      processedAt: new Date()
    });

    // Save transaction
    await transaction.save({ session });

    // Add money to wallet
    await wallet.addMoney(amount, session);

    // Commit transaction
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `₹${amount} added to wallet successfully`,
      wallet: {
        userId: wallet.userId,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: wallet.formattedBalance
      },
      transaction: {
        id: transaction.transactionId,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding money to wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add money to wallet',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Deduct money from wallet
const deductMoneyFromWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { 
      amount, 
      description = 'Wallet deduction',
      cardName = 'Card Purchase'
    } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID and amount are required'
      });
    }

    // Find wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    const balanceBefore = wallet.balance;

    // Create transaction record
    const transaction = new Transaction({
      uid: userId,
      cardName: cardName,
      amount: amount,
      type: 'WALLET_DEBIT',
      description: description,
      status: 'success',
      category: 'card_purchase',
      balanceBefore: balanceBefore,
      balanceAfter: balanceBefore - amount,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      processedAt: new Date()
    });

    // Save transaction
    await transaction.save({ session });

    // Deduct money from wallet
    await wallet.deductMoney(amount, session);

    // Commit transaction
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `₹${amount} deducted from wallet successfully`,
      wallet: {
        userId: wallet.userId,
        balance: wallet.balance,
        currency: wallet.currency,
        formattedBalance: wallet.formattedBalance
      },
      transaction: {
        id: transaction.transactionId,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error deducting money from wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deduct money from wallet',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get transaction history for a user
const getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0, type, status } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Build query
    const query = { uid: userId };
    if (type) query.type = type;
    if (status) query.status = status;

    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Get total count
    const totalCount = await Transaction.countDocuments(query);

    // Format transactions for frontend
    const formattedTransactions = transactions.map(txn => ({
      id: txn.transactionId || txn._id,
      amount: txn.amount,
      type: ['WALLET_RECHARGE', 'RECHARGE', 'REFUND'].includes(txn.type) ? 'credit' : 'debit',
      originalType: txn.type,
      description: txn.description,
      status: txn.status,
      date: txn.createdAt,
      paymentId: txn.gatewayPaymentId,
      orderId: txn.gatewayOrderId,
      cardName: txn.cardName,
      balanceBefore: txn.balanceBefore,
      balanceAfter: txn.balanceAfter,
      metadata: txn.metadata
    }));

    res.status(200).json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });

  } catch (error) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction history',
      error: error.message
    });
  }
};

// Get wallet statistics
const getWalletStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ userId });
    
    // Get transaction stats
    const stats = await Transaction.getUserStats(userId);

    // Get recent transactions count
    const recentCount = await Transaction.countDocuments({
      uid: userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    res.status(200).json({
      success: true,
      stats: {
        currentBalance: wallet ? wallet.balance : 0,
        totalCredits: stats.totalCredits,
        totalDebits: stats.totalDebits,
        netBalance: stats.netBalance,
        creditCount: stats.creditCount,
        debitCount: stats.debitCount,
        recentTransactionsCount: recentCount,
        walletCreatedAt: wallet ? wallet.createdAt : null
      }
    });

  } catch (error) {
    console.error('Error getting wallet stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet statistics',
      error: error.message
    });
  }
};

// Get all wallets for admin (NEW FUNCTION)
const getAllWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({})
      .sort({ createdAt: -1 })
      .select('userId balance currency isActive lastTransactionAt createdAt updatedAt');

    const walletsWithStats = wallets.map(wallet => ({
      _id: wallet._id,
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
      formattedBalance: `₹${wallet.balance.toFixed(2)}`,
      isActive: wallet.isActive,
      lastTransactionAt: wallet.lastTransactionAt,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    }));

    res.status(200).json({
      success: true,
      wallets: walletsWithStats,
      total: walletsWithStats.length,
      totalBalance: walletsWithStats.reduce((sum, wallet) => sum + wallet.balance, 0)
    });

  } catch (error) {
    console.error('Error getting all wallets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallets',
      error: error.message
    });
  }
};

module.exports = {
  getWalletBalance,
  addMoneyToWallet,
  deductMoneyFromWallet,
  getTransactionHistory,
  getWalletStats,
  getAllWallets
};