const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('./models/Booking');
const User = require('./models/User');
const Slot = require('./models/Slot');

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // 1. Delete all Bookings
    console.log('Deleting all bookings...');
    await Booking.deleteMany({});

    // 2. Delete all Users
    console.log('Deleting all users...');
    await User.deleteMany({});

    // 3. Reset all Slots
    console.log('Resetting all slots to 0 booked...');
    await Slot.updateMany({}, { booked: 0 });

    console.log('\n--- SUCCESS ---');
    console.log('All registrations and users have been deleted.');
    console.log('All slots have been reset to 0.');
    console.log('----------------\n');

    process.exit(0);
  } catch (err) {
    console.error('Error during reset:', err);
    process.exit(1);
  }
}

resetDatabase();
