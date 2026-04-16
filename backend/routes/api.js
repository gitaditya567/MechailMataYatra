const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Admin = require('../models/Admin');
const ApiClient = require('../models/ApiClient');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.log('Sharp module not found, image compression temporarily bypassed. Please run "npm install sharp" in the backend directory.');
}

const compressImageBase64 = async (base64Str) => {
  if (!base64Str || !sharp) return base64Str;
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Str;
    const type = matches[1];
    if (!type.startsWith('image/')) return base64Str;

    const data = Buffer.from(matches[2], 'base64');
    const compressedBuffer = await sharp(data)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 50 })
      .toBuffer();

    return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
  } catch (error) {
    console.error("Image compression error:", error);
    return base64Str; // Return original perfectly unharmed if error happens
  }
};

const saveBase64Image = async (base64Str, prefix = 'photo') => {
  if (!base64Str) return null;
  
  // If it's already a filename (doesn't start with data:), return it
  if (!base64Str.startsWith('data:')) return base64Str;

  try {
    const compressedBase64 = await compressImageBase64(base64Str);
    const matches = compressedBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
    
    // Use absolute path relative to process.cwd() or similar to be safe
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filepath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    console.log(`[PHOTO-STORAGE] Successfully saved: ${filename}`);
    return filename; // Return only the filename to store in DB
  } catch (error) {
    console.error("[PHOTO-STORAGE] Error saving image:", error);
    return null;
  }
};

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

let statsCache = { data: null, lastFetch: 0 };

router.get('/admin/stats', async (req, res) => {
  try {
    const now = Date.now();
    // Cache stats for 60 seconds to prevent DB DDOS from admin polling
    if (statsCache.data && (now - statsCache.lastFetch < 60000)) {
       return res.json(statsCache.data);
    }

    const totalBookings = await Booking.countDocuments();
    const totalMembersAgg = await Booking.aggregate([
      { $group: { _id: null, count: { $sum: "$totalMembers" } } }
    ]);
    const totalMembers = totalMembersAgg.length > 0 ? totalMembersAgg[0].count : 0;
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
    const recentBookings = await Booking.find()
      .select('-members.photo') 
      .sort({ _id: -1 })
      .limit(5);

    // Chart Data: Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const chartStats = await Booking.aggregate([
      { $match: { 
        createdAt: { $exists: true, $ne: null, $gte: sevenDaysAgo } 
      } },
      { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          bookings: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    const chartData = chartStats.map(s => ({
      name: s._id,
      bookings: s.bookings || 0
    }));

    const responseData = {
      totalBookings,
      totalMembers,
      totalUsers,
      todaysBookings,
      todaysPilgrims,
      recentBookings,
      chartData
    };

    statsCache.data = responseData;
    statsCache.lastFetch = Date.now();

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});

router.get('/admin/bookings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const skip = parseInt(req.query.skip) || 0;

    const bookings = await Booking.find()
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const mobiles = bookings.map(b => b.primaryUserMobile);
    const users = await User.find({ mobile: { $in: mobiles } }).select('-photo').lean();
    const userMap = users.reduce((acc, user) => {
      acc[user.mobile] = user;
      return acc;
    }, {});

    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}/uploads/`;

    const detailedBookings = bookings.map(b => {
      // Transform member photos into full URLs
      if (b.members) {
        b.members = b.members.map(m => {
          if (m.photo && !m.photo.startsWith('data:')) {
            m.photo = `${baseUrl}${m.photo}`;
          }
          return m;
        });
      }
      return {
        ...b,
        primaryUser: userMap[b.primaryUserMobile] || null
      };
    });

    res.json(detailedBookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err.message });
  }
});

router.get('/admin/slots', async (req, res) => {
  try {
    const slots = await Slot.find().sort({ date: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching slots', error: err.message });
  }
});

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

router.get('/slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    let slot = await Slot.findOne({ date });
    if (!slot) {
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

router.get('/check-user/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const user = await User.findOne({ mobile });
    if (user) return res.json({ registered: true, user });
    res.json({ registered: false });
  } catch (err) {
    res.status(500).json({ message: 'Error checking user', error: err.message });
  }
});

router.post('/send-otp', (req, res) => {
  const { mobile } = req.body;
  res.json({ message: 'OTP sent successfully', otp: '123456' });
});

router.post('/book', async (req, res) => {
  try {
    const { primaryUser, darshanDate, members } = req.body;

    // Save photos as files instead of storing full base64 in DB
    if (primaryUser && primaryUser.photo) {
      primaryUser.photo = await saveBase64Image(primaryUser.photo, 'user');
    }
    if (members && members.length > 0) {
      for (let i = 0; i < members.length; i++) {
        if (members[i].photo) {
          members[i].photo = await saveBase64Image(members[i].photo, 'member');
        }
      }
    }

    let user = await User.findOne({ mobile: primaryUser.mobile });
    if (!user) {
      user = new User(primaryUser);
      await user.save();
    } else {
      user.name = primaryUser.name;
      if (primaryUser.email) user.email = primaryUser.email;
      if (primaryUser.photo) user.photo = primaryUser.photo;
      user.age = primaryUser.age;
      user.gender = primaryUser.gender;
      await user.save();
    }

    const existingBooking = await Booking.findOne({ primaryUserMobile: primaryUser.mobile, darshanDate });
    if (existingBooking) {
      return res.status(400).json({ message: 'A booking already exists for this mobile number on this date.' });
    }

    const totalNewBookings = members.length + 1;
    const slot = await Slot.findOne({ date: darshanDate });
    if (slot && (slot.booked + totalNewBookings > slot.total)) {
      return res.status(400).json({ message: 'Not enough slots available for this date' });
    }

    const bookings2026 = await Booking.find({ referenceId: { $regex: /^MATA\/2026\// } }).select('referenceId members.regNo');
    let maxSeq = 0;
    bookings2026.forEach(b => {
      // Check primary reference ID sequence
      if (b.referenceId) {
        const parts = b.referenceId.split('/');
        if (parts.length >= 3) {
          const seqNum = parseInt(parts[2]);
          if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
        }
      }
      
      // Check members sequences
      if (b.members) {
        b.members.forEach(m => {
          if (m.regNo) {
            const parts = m.regNo.split('/');
            if (parts.length >= 3) {
              const seqNum = parseInt(parts[2]);
              if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
            }
          }
        });
      }
    });

    let currentSeq = maxSeq < 100000 ? 100000 : maxSeq;
    const allMembers = [];
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

    members.forEach((m) => {
      currentSeq++;
      allMembers.push({ ...m, regNo: `MATA/2026/${currentSeq.toString().padStart(6, '0')}` });
    });

    const newBooking = new Booking({
      referenceId: primaryRegNo,
      primaryUserMobile: user.mobile,
      darshanDate,
      members: allMembers,
      totalMembers: allMembers.length
    });
    await newBooking.save();

    if (slot) {
      slot.booked += totalNewBookings;
      await slot.save();
    } else {
      const newSlot = new Slot({ date: darshanDate, total: 6000, booked: totalNewBookings });
      await newSlot.save();
    }

    res.json({ success: true, referenceId: primaryRegNo, members: allMembers, message: 'Booking confirmed' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing booking', error: err.message });
  }
});

router.delete('/admin/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const slot = await Slot.findOne({ date: booking.darshanDate });
    if (slot) {
      slot.booked = Math.max(0, slot.booked - booking.totalMembers);
      await slot.save();
    }

    // Delete associated photo files
    if (booking.members) {
      booking.members.forEach(m => {
        if (m.photo && !m.photo.startsWith('data:')) {
          const filePath = path.join(__dirname, '../uploads', m.photo);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });
    }
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting booking', error: err.message });
  }
});

router.get('/admin/api-clients', async (req, res) => {
  try {
    const clients = await ApiClient.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching API clients', error: err.message });
  }
});

router.post('/admin/api-clients', async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const apiKey = crypto.randomBytes(24).toString('hex');
    const client = new ApiClient({ name, apiKey, permissions: permissions || ['read'], isActive: true });
    await client.save();
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating API client', error: err.message });
  }
});

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

router.delete('/admin/api-clients/:id', async (req, res) => {
  try {
    await ApiClient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting client', error: err.message });
  }
});

module.exports = router;
