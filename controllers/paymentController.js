const Razorpay = require('razorpay');
const crypto = require('crypto');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test endpoint to check if Razorpay is configured
const testRazorpayConfig = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Razorpay configuration test',
      config: {
        key_id: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not Set',
        key_secret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not Set',
        environment: process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'Test' : 'Live'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Configuration test failed',
      error: error.message
    });
  }
};

// Dummy order creation for testing
const createDummyOrder = async (req, res) => {
  try {
    const { amount = 100 } = req.body;

    // Create dummy order response
    const dummyOrder = {
      id: `order_dummy_${Date.now()}`,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_dummy_${Date.now()}`,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000)
    };

    res.status(200).json({
      success: true,
      order: dummyOrder,
      message: 'Dummy order created for testing'
    });

  } catch (error) {
    console.error('Error creating dummy order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dummy order',
      error: error.message
    });
  }
};

// Dummy payment verification for testing
const verifyDummyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      userId = 'test_user_123'
    } = req.body;

    // Simulate payment verification
    const isDummyPayment = razorpay_order_id?.startsWith('order_dummy_');
    
    if (isDummyPayment) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Always return success for dummy payments - Add money to wallet
        let wallet;
        let transaction;

        // Find or create wallet
        wallet = await Wallet.findOrCreateWallet(userId);
        const balanceBefore = wallet.balance;

        // Create transaction record
        transaction = new Transaction({
          uid: userId,
          amount: amount,
          type: 'WALLET_RECHARGE',
          description: '🧪 Test wallet recharge (Dummy payment)',
          status: 'success',
          category: 'wallet_recharge',
          paymentGateway: 'dummy',
          gatewayOrderId: razorpay_order_id,
          gatewayPaymentId: razorpay_payment_id || `pay_dummy_${Date.now()}`,
          gatewaySignature: razorpay_signature,
          balanceBefore: balanceBefore,
          balanceAfter: balanceBefore + amount,
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            isDummy: true
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
          message: 'Dummy payment verified successfully',
          payment: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id || `pay_dummy_${Date.now()}`,
            amount: amount,
            status: 'success',
            verified: true,
            isDummy: true
          },
          wallet: {
            balance: wallet.balance,
            currency: wallet.currency
          },
          transaction: {
            id: transaction.transactionId,
            amount: transaction.amount,
            type: transaction.type,
            status: transaction.status
          }
        });

      } catch (walletError) {
        await session.abortTransaction();
        console.error('Error updating wallet in dummy payment:', walletError);
        
        res.status(200).json({
          success: true,
          message: 'Dummy payment verified but wallet update failed',
          payment: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id || `pay_dummy_${Date.now()}`,
            amount: amount,
            status: 'success',
            verified: true,
            isDummy: true
          },
          walletError: 'Failed to update wallet balance'
        });
      } finally {
        session.endSession();
      }

    } else {
      // For real payments, perform actual verification
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature === expectedSign) {
        res.status(200).json({
          success: true,
          message: 'Real payment verified successfully',
          payment: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            amount: amount,
            status: 'success',
            verified: true,
            isDummy: false
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Payment verification failed'
        });
      }
    }

  } catch (error) {
    console.error('Error verifying dummy payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Test wallet operations
const testWalletOperations = async (req, res) => {
  try {
    const { operation, amount = 100, userId = 'test_user_123' } = req.body;

    switch (operation) {
      case 'add':
        res.status(200).json({
          success: true,
          message: `Added ₹${amount} to wallet`,
          wallet: {
            userId,
            previousBalance: 500,
            newBalance: 500 + amount,
            transaction: {
              id: `txn_${Date.now()}`,
              amount,
              type: 'credit',
              description: 'Test wallet recharge',
              timestamp: new Date().toISOString()
            }
          }
        });
        break;

      case 'deduct':
        res.status(200).json({
          success: true,
          message: `Deducted ₹${amount} from wallet`,
          wallet: {
            userId,
            previousBalance: 500,
            newBalance: 500 - amount,
            transaction: {
              id: `txn_${Date.now()}`,
              amount,
              type: 'debit',
              description: 'Test wallet deduction',
              timestamp: new Date().toISOString()
            }
          }
        });
        break;

      case 'balance':
        res.status(200).json({
          success: true,
          wallet: {
            userId,
            balance: 500,
            currency: 'INR',
            lastUpdated: new Date().toISOString()
          }
        });
        break;

      default:
        res.status(400).json({
          success: false,
          message: 'Invalid operation. Use: add, deduct, or balance'
        });
    }

  } catch (error) {
    console.error('Error in wallet operations test:', error);
    res.status(500).json({
      success: false,
      message: 'Wallet operation test failed',
      error: error.message
    });
  }
};

// Create Razorpay Order
const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    // Validate required fields
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    // Create order options
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1, // Auto capture payment
    };

    // Create order with Razorpay
    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Verify Razorpay Payment
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      userId
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification data'
      });
    }

    // Create signature for verification
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    // Verify signature
    if (razorpay_signature === expectedSign) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Payment is verified - Add money to wallet
        let wallet;
        let transaction;

        if (userId) {
          // Find or create wallet
          wallet = await Wallet.findOrCreateWallet(userId);
          const balanceBefore = wallet.balance;

          // Create transaction record
          transaction = new Transaction({
            uid: userId,
            amount: amount,
            type: 'WALLET_RECHARGE',
            description: 'Wallet recharge via Razorpay',
            status: 'success',
            category: 'wallet_recharge',
            paymentGateway: 'razorpay',
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            gatewaySignature: razorpay_signature,
            balanceBefore: balanceBefore,
            balanceAfter: balanceBefore + amount,
            metadata: {
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
        }

        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          payment: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            amount: amount,
            status: 'success'
          },
          wallet: wallet ? {
            balance: wallet.balance,
            currency: wallet.currency
          } : null,
          transaction: transaction ? {
            id: transaction.transactionId,
            amount: transaction.amount,
            type: transaction.type,
            status: transaction.status
          } : null
        });

      } catch (walletError) {
        await session.abortTransaction();
        console.error('Error updating wallet:', walletError);
        
        // Still return success for payment verification but indicate wallet update failed
        res.status(200).json({
          success: true,
          message: 'Payment verified but wallet update failed',
          payment: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            amount: amount,
            status: 'success'
          },
          walletError: 'Failed to update wallet balance'
        });
      } finally {
        session.endSession();
      }

    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Get Payment Details
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const payment = await razorpay.payments.fetch(paymentId);

    res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount / 100, // Convert back to rupees
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        created_at: payment.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
};

// Refund Payment
const refundPayment = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const refundOptions = {
      amount: amount ? amount * 100 : undefined, // Convert to paise if partial refund
      notes: {
        reason: reason || 'Customer requested refund'
      }
    };

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    res.status(200).json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        payment_id: refund.payment_id
      }
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
  // Test endpoints
  testRazorpayConfig,
  createDummyOrder,
  verifyDummyPayment,
  testWalletOperations
};