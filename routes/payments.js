const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment
} = require('../controllers/paymentController');

// POST /api/payments/create-order - Create Razorpay order
router.post('/create-order', createOrder);

// POST /api/payments/verify - Verify payment signature
router.post('/verify', verifyPayment);

// GET /api/payments/:paymentId - Get payment details
router.get('/:paymentId', getPaymentDetails);

// POST /api/payments/refund - Process refund
router.post('/refund', refundPayment);

module.exports = router;