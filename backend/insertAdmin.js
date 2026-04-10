const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shrimachailmatayatra')
  .then(async () => {
    console.log('MongoDB Connected. Syncing admin credentials...');
    
    const adminUser = 'admin';
    const adminPass = '123456';
    
    const admin = await Admin.findOneAndUpdate(
      { username: adminUser },
      { username: adminUser, password: adminPass, name: 'Main Admin' },
      { upsert: true, new: true }
    );
    
    console.log('Admin account ready!');
    console.log(`Username: ${adminUser}`);
    console.log(`Password: ${adminPass}`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
