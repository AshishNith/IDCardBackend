const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const transactionRoutes = require('./routes/transactions');

const app = express();

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);

// Middleware
app.use(cors(
    {
        origin: [
            'http://localhost:8080', 
            'http://localhost:3000', 
            'http://localhost:3001', 
            'http://localhost:3002', 
            'https://pixelflow-landing.vercel.app',
            'https://pixelflow-landing-vmqm.vercel.app'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
));
app.use(express.json());

// Error handling middleware for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      status: 400,
      message: 'Invalid JSON payload' 
    });
  }
  next();
});

// Connect to MongoDB -- >> Replace 'MONGODB_CONNECTION_STRING' with your actual connection string
mongoose.connect('MONGODB_CONNECTION_STRING', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((error) => {
    console.error('MongoDB connection error:', error);
});



// Routes
app.use('/api/transactions', transactionRoutes);
const cardRoutes = require('./routes/cards');
app.use('/api/cards', cardRoutes);
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);
const walletRoutes = require('./routes/wallet');
app.use('/api/wallet', walletRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
