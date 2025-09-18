const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // Existing fields
    uid: {
        type: String,
        required: true,
        index: true
    },
    cardName: {
        type: String,
        default: 'N/A'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        enum: ['CARD_CREATION', 'RECHARGE', 'WALLET_RECHARGE', 'WALLET_DEBIT', 'REFUND'],
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    time: {
        type: Date,
        default: Date.now,
    },
    
    // New wallet-related fields
    transactionId: {
        type: String,
        unique: true,
        index: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'cancelled'],
        default: 'pending'
    },
    category: {
        type: String,
        enum: ['wallet_recharge', 'card_purchase', 'refund', 'bonus', 'other'],
        default: 'other'
    },
    
    // Payment gateway related fields
    paymentGateway: {
        type: String,
        enum: ['razorpay', 'stripe', 'paytm', 'dummy', 'manual'],
        default: 'manual'
    },
    gatewayOrderId: {
        type: String,
        index: true
    },
    gatewayPaymentId: {
        type: String,
        index: true
    },
    gatewaySignature: {
        type: String
    },
    
    // Balance tracking
    balanceBefore: {
        type: Number,
        default: 0
    },
    balanceAfter: {
        type: Number,
        default: 0
    },
    
    // Additional metadata
    metadata: {
        planDetails: {
            planId: String,
            planName: String,
            cardCount: Number
        },
        ipAddress: String,
        userAgent: String,
        sessionId: String
    },
    
    // Timestamps
    processedAt: {
        type: Date
    },
    failedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    }
},{
    timestamps: true
});

// Indexes for better performance
transactionSchema.index({ uid: 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });
transactionSchema.index({ gatewayOrderId: 1 });
transactionSchema.index({ gatewayPaymentId: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
    const isCredit = ['RECHARGE', 'WALLET_RECHARGE', 'REFUND'].includes(this.type);
    const sign = isCredit ? '+' : '-';
    return `${sign}₹${this.amount.toFixed(2)}`;
});

// Virtual for status badge
transactionSchema.virtual('statusBadge').get(function() {
    const badges = {
        pending: { color: 'yellow', text: 'Pending' },
        success: { color: 'green', text: 'Success' },
        failed: { color: 'red', text: 'Failed' },
        cancelled: { color: 'gray', text: 'Cancelled' }
    };
    return badges[this.status] || badges.pending;
});

// Pre-save middleware to generate transaction ID
transactionSchema.pre('save', function(next) {
    if (!this.transactionId) {
        this.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    next();
});

// Method to mark transaction as successful
transactionSchema.methods.markSuccess = function(balanceAfter, session = null) {
    this.status = 'success';
    this.processedAt = new Date();
    this.balanceAfter = balanceAfter;
    return this.save({ session });
};

// Method to mark transaction as failed
transactionSchema.methods.markFailed = function(reason, session = null) {
    this.status = 'failed';
    this.failedAt = new Date();
    this.metadata = this.metadata || {};
    this.metadata.failureReason = reason;
    return this.save({ session });
};

// Static method to get user's transaction history
transactionSchema.statics.getUserTransactions = function(userId, limit = 10, offset = 0) {
    return this.find({ uid: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();
};

// Static method to get user's transaction stats
transactionSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { uid: userId, status: 'success' } },
        {
            $group: {
                _id: '$type',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        totalCredits: 0,
        totalDebits: 0,
        creditCount: 0,
        debitCount: 0,
        netBalance: 0
    };

    const creditTypes = ['RECHARGE', 'WALLET_RECHARGE', 'REFUND'];
    const debitTypes = ['CARD_CREATION', 'WALLET_DEBIT'];

    stats.forEach(stat => {
        if (creditTypes.includes(stat._id)) {
            result.totalCredits += stat.totalAmount;
            result.creditCount += stat.count;
        } else if (debitTypes.includes(stat._id)) {
            result.totalDebits += stat.totalAmount;
            result.debitCount += stat.count;
        }
    });

    result.netBalance = result.totalCredits - result.totalDebits;
    return result;
};

module.exports = mongoose.model('Transaction', transactionSchema);
