const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Admin = require('../models/Admin');
const ApiClient = require('../models/ApiClient');
const crypto = require('crypto');

// Utility for formatting dates as YYYY-MM-DD
const formatDate = (date) => new Date(date).toISOString().split('T')[0];

// Endpoint: Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (admin) {
      res.json({ success: true, admin: { id: admin._id, name: admin.name, username: admin.username } });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Login error', error: err.message });
  }
});

// Endpoint: Admin Stats
router.get('/admin/stats', async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const totalMembers = await Booking.aggregate([
      { $group: { _id: null, count: { $sum: "$totalMembers" } } }
    ]);
    const totalUsers = await User.countDocuments();

    // Today's Stats
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaysBookings = await Booking.countDocuments({ createdAt: { $gte: startOfToday } });
    const todaysMembersAgg = await Booking.aggregate([
      { $match: { createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, count: { $sum: "$totalMembers" } } }
    ]);
    const todaysPilgrims = todaysMembersAgg.length > 0 ? todaysMembersAgg[0].count : 0;
    
    // Recent 5 bookings
    const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(5);

    // Chart Data: Group bookings by date for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const chartStats = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          bookings: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    const chartData = chartStats.map(s => ({
      name: s._id,
      bookings: s.bookings
    }));

    res.json({
      totalBookings,
      totalMembers: totalMembers.length > 0 ? totalMembers[0].count : 0,
      totalUsers,
      todaysBookings,
      todaysPilgrims,
      recentBookings,
      chartData
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});

// Endpoint: Get All Bookings
router.get('/admin/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
    
    // Fetch all relevant users in one go
    const mobiles = bookings.map(b => b.primaryUserMobile);
    const users = await User.find({ mobile: { $in: mobiles } }).lean();
    const userMap = users.reduce((acc, user) => {
      acc[user.mobile] = user;
      return acc;
    }, {});

    // Attach user details to bookings
    const detailedBookings = bookings.map(b => ({
      ...b,
      primaryUser: userMap[b.primaryUserMobile] || {}
    }));

    res.json(detailedBookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err.message });
  }
});

// Endpoint: Get All Slots
router.get('/admin/slots', async (req, res) => {
  try {
    const slots = await Slot.find().sort({ date: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching slots', error: err.message });
  }
});

// Endpoint: Update Slot Capacity
router.post('/admin/update-slot', async (req, res) => {
  try {
    const { date, total } = req.body;
    let slot = await Slot.findOne({ date });
    if (slot) {
      slot.total = total;
      await slot.save();
    } else {
      slot = new Slot({ date, total, booked: 0 });
      await slot.save();
    }
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ message: 'Error updating slot', error: err.message });
  }
});

// [EXISTING ENDPOINTS]
// Endpoint: Check Slot Availability
router.get('/slots/:date', async (req, res) => {
  try {
    const { date } = req.params; // Expects YYYY-MM-DD
    let slot = await Slot.findOne({ date });

    if (!slot) {
      // If no entry exists for this date, assume it has 6000 slots available
      slot = new Slot({ date, total: 6000, booked: 0 });
      await slot.save();
    }

    res.json({
      total: slot.total,
      booked: slot.booked,
      available: slot.total - slot.booked
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching slots', error: err.message });
  }
});

// Endpoint: Check User by Mobile
router.get('/check-user/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const user = await User.findOne({ mobile });
    if (user) {
      return res.json({ registered: true, user });
    }
    res.json({ registered: false });
  } catch (err) {
    res.status(500).json({ message: 'Error checking user', error: err.message });
  }
});

// Endpoint: Mock OTP Trigger
router.post('/send-otp', (req, res) => {
  const { mobile } = req.body;
  // Simulating an OTP send. For testing, it's always '123456'
  const otp = '123456';
  console.log(`[MOCK] Sending OTP ${otp} to ${mobile}`);
  res.json({ message: 'OTP sent successfully', otp: '123456' });
});

// Endpoint: Member Registration & Booking
router.post('/book', async (req, res) => {
  try {
    const { primaryUser, darshanDate, members } = req.body;
    
    // 1. Ensure user is registered (or update if exists)
    let user = await User.findOne({ mobile: primaryUser.mobile });
    if (!user) {
      user = new User(primaryUser); // includes name, mobile, email, photo, age, gender
      await user.save();
    } else {
      // Update existing user with potentially new info
      user.name = primaryUser.name;
      if (primaryUser.email) user.email = primaryUser.email;
      if (primaryUser.photo) user.photo = primaryUser.photo;
      user.age = primaryUser.age;
      user.gender = primaryUser.gender;
      await user.save();
    }

    // 2. Check slot availability for that date
    const totalNewBookings = members.length + 1; // Primary user + additional members
    const slot = await Slot.findOne({ date: darshanDate });
    
    if (slot && (slot.booked + totalNewBookings > slot.total)) {
      return res.status(400).json({ message: 'Not enough slots available for this date' });
    }

    // 3. Create Booking
    // Find the highest sequence number used so far across all 2026 bookings
    const bookings2026 = await Booking.find({ referenceId: { $regex: /^MATA\/2026\// } });
    let maxSeq = 0;

    bookings2026.forEach(b => {
      if (b.members && b.members.length > 0) {
        b.members.forEach(m => {
          if (m.regNo) {
            const parts = m.regNo.split('/');
            if (parts.length >= 3) {
              const seqNum = parseInt(parts[2]);
              if (!isNaN(seqNum) && seqNum > maxSeq) {
                maxSeq = seqNum;
              }
            }
          }
        });
      }
    });

    let currentSeq = maxSeq;
    if (currentSeq < 100000) {
      currentSeq = 100000;
    }

    // Assign sequential regNo to each member
    const allMembers = [];
    
    // Primary member first
    currentSeq++;
    const primaryRegNo = `MATA/2026/${currentSeq.toString().padStart(6, '0')}`;
    allMembers.push({
      name: user.name,
      age: user.age,
      mobile: user.mobile,
      gender: user.gender,
      photo: user.photo,
      regNo: primaryRegNo
    });

    // Co-pilgrims
    members.forEach((m) => {
      currentSeq++;
      allMembers.push({
        ...m,
        regNo: `MATA/2026/${currentSeq.toString().padStart(6, '0')}`
      });
    });

    const referenceId = primaryRegNo; // Booking reference is the primary user's regNo

    const newBooking = new Booking({
      referenceId,
      primaryUserMobile: user.mobile,
      darshanDate,
      members: allMembers,
      totalMembers: allMembers.length
    });
    await newBooking.save();

    // 4. Update Slot Count
    if (slot) {
      slot.booked += totalNewBookings;
      await slot.save();
    } else {
      const newSlot = new Slot({ date: darshanDate, total: 6000, booked: totalNewBookings });
      await newSlot.save();
    }

    res.json({ success: true, referenceId, members: allMembers, message: 'Booking confirmed' });

  } catch (err) {
    res.status(500).json({ message: 'Error processing booking', error: err.message });
  }
});

// Endpoint: Delete Booking
router.delete('/admin/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Update slot count (release slots)
    const slot = await Slot.findOne({ date: booking.darshanDate });
    if (slot) {
      slot.booked = Math.max(0, slot.booked - booking.totalMembers);
      await slot.save();
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting booking', error: err.message });
  }
});

// --- API CLIENT MANAGEMENT (ADMIN) ---

// Get all API Clients
router.get('/admin/api-clients', async (req, res) => {
  try {
    const clients = await ApiClient.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching API clients', error: err.message });
  }
});

// Create new API Client
router.post('/admin/api-clients', async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const apiKey = crypto.randomBytes(24).toString('hex'); // Secure random key
    
    const client = new ApiClient({
      name,
      apiKey,
      permissions: permissions || ['read'],
      isActive: true
    });
    
    await client.save();
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating API client', error: err.message });
  }
});

// Toggle API Client status
router.patch('/admin/api-clients/:id', async (req, res) => {
  try {
    const client = await ApiClient.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    
    client.isActive = !client.isActive;
    await client.save();
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating client', error: err.message });
  }
});

// Delete/Revoke API Client
router.delete('/admin/api-clients/:id', async (req, res) => {
  try {
    await ApiClient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting client', error: err.message });
  }
});

module.exports = router;

