const mongoose = require('mongoose');
require('dotenv').config();
const Slot = require('./models/Slot');
const Admin = require('./models/Admin');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // 1. Seed Slots
    const today = new Date();
    const daysToSeed = 30;

    for (let i = 0; i < daysToSeed; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      const existing = await Slot.findOne({ date: dateString });
      if (!existing) {
        await new Slot({ date: dateString, total: 6000, booked: 0 }).save();
        console.log(`Seeded slot for ${dateString}`);
      }
    }

    // 2. Seed Admin
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      await new Admin({
        username: 'admin',
        password: 'admin123', // In production, this would be hashed.
        name: 'Mata Yatra Administrator'
      }).save();
      console.log('Seeded admin user: admin | admin123');
    }

    console.log('Seeding completed!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();

