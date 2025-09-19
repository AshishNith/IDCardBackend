const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
  getUserPayments, // Add the new import
  // Test endpoints
  testRazorpayConfig,
  createDummyOrder,
  verifyDummyPayment,
  testWalletOperations
} = require('../controllers/paymentController');

// Production endpoints
// POST /api/payments/create-order - Create Razorpay order
router.post('/create-order', createOrder);

// POST /api/payments/verify - Verify payment signature
router.post('/verify', verifyPayment);

// GET /api/payments/:paymentId - Get payment details
router.get('/:paymentId', getPaymentDetails);

// GET /api/payments/user/:uid - Get user payments
router.get('/user/:uid', getUserPayments);

// POST /api/payments/refund - Process refund
router.post('/refund', refundPayment);

// Test endpoints
// GET /api/payments/test/config - Test Razorpay configuration
router.get('/test/config', testRazorpayConfig);

// POST /api/payments/test/create-dummy-order - Create dummy order for testing
router.post('/test/create-dummy-order', createDummyOrder);

// POST /api/payments/test/verify-dummy - Verify dummy payment
router.post('/test/verify-dummy', verifyDummyPayment);

// POST /api/payments/test/wallet - Test wallet operations
router.post('/test/wallet', testWalletOperations);

module.exports = router;