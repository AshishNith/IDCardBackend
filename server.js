const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const transactionRoutes = require('./routes/transactions');

const app = express();

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);

// Middleware
app.use(cors(
    {
        origin: ['http://localhost:8080', 'https://pixelflow-landing.vercel.app'],
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

// Connect to MongoDB
mongoose.connect('mongodb+srv://23bme025:XIWdxagf3YYcW6B5@cluster0.fdwyy1v.mongodb.net/', {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
