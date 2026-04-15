const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const authExternal = require('../middleware/authExternal');

// GET: Fetch overall statistics (Total Registrations)
// Requires 'read' permission
router.get('/stats', authExternal('read'), async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const stats = await Booking.aggregate([
      { $group: { _id: null, totalMembers: { $sum: "$totalMembers" } } }
    ]);
    
    const totalMembers = stats.length > 0 ? stats[0].totalMembers : 0;

    res.json({
      success: true,
      data: {
        totalBookings,
        totalMembers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching stats', error: err.message });
  }
});

// GET: Fetch booking details by Reference ID
// Requires 'read' permission
router.get(/^\/booking\/(.*)/, authExternal('read'), async (req, res) => {
  try {
    const referenceId = req.params[0];
    const booking = await Booking.findOne({ referenceId }).lean();
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const user = await User.findOne({ mobile: booking.primaryUserMobile }).select('-photo').lean();
    
    res.json({
      success: true,
      data: booking
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching booking', error: err.message });
  }
});

// GET: Search bookings by Mobile Number
// Requires 'read' permission
router.get('/search', authExternal('read'), async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required in query params' });
    }

    const bookings = await Booking.find({ primaryUserMobile: mobile })
      .select('-members.photo')
      .sort({ createdAt: -1 })
      .lean();
    const user = await User.findOne({ mobile }).select('-photo').lean();

    res.json({
      success: true,
      bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error searching bookings', error: err.message });
  }
});

// Example of a WRITE endpoint (Can be used if they want to create bookings via API)
// router.post('/book', authExternal('write'), async (req, res) => { ... });

module.exports = router;
