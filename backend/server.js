const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Static Files Serving (MOVED TO TOP)
const uploadsDir = path.join(__dirname, 'uploads');
// Support multiple possible paths for photos
app.use('/api/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// 2. Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
const apiRoutes = require('./routes/api');
const externalApiRoutes = require('./routes/externalApi');

app.use('/api/v1/external', externalApiRoutes);
app.use('/api', apiRoutes);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('Database connection error:', err);
    console.log('Retrying to connect to MongoDB in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
