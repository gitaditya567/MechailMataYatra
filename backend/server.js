const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
// Serve static files from the 'uploads' directory
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Fallback
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Routes
const apiRoutes = require('./routes/api');
const externalApiRoutes = require('./routes/externalApi');

app.use('/api/v1/external', externalApiRoutes);
app.use('/api', apiRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('Database connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
