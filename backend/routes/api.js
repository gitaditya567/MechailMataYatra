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
      .flatten({ background: '#ffffff' }) // Ensure transparent pixels (like PNGs) are flattened to white
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
    // Validate it is a valid base64 image data URL before processing
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.error("[PHOTO-STORAGE] Invalid base64 format");
      return null;
    }

    const mimeType = matches[1]; // e.g. "image/png" or "image/jpeg"
    if (!mimeType.startsWith('image/')) {
      console.error(`[PHOTO-STORAGE] Blocked non-image upload attempt with mime-type: ${mimeType}`);
      return null;
    }

    const compressedBase64 = await compressImageBase64(base64Str);
    const compressedMatches = compressedBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!compressedMatches || compressedMatches.length !== 3) return null;

    const compressedMimeType = compressedMatches[1];
    let ext = 'jpg';
    if (compressedMimeType === 'image/png') ext = 'png';
    else if (compressedMimeType === 'image/webp') ext = 'webp';
    else if (compressedMimeType === 'image/gif') ext = 'gif';

    const buffer = Buffer.from(compressedMatches[2], 'base64');
    const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
    
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

// Helper to get start of today in IST (Asia/Kolkata)
const getStartOfTodayIST = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
};

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

    // Today's Stats aligned to India Standard Time (IST)
    const startOfToday = getStartOfTodayIST();

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
      // Calculate actual booked slots for initialization
      const bookingsCountAgg = await Booking.aggregate([
        { $match: { darshanDate: date } },
        { $group: { _id: null, count: { $sum: "$totalMembers" } } }
      ]);
      const actualBooked = bookingsCountAgg.length > 0 ? bookingsCountAgg[0].count : 0;
      slot = new Slot({ date, total, booked: actualBooked });
      await slot.save();
    }
    // Invalidate stats cache on slot updates
    statsCache = { data: null, lastFetch: 0 };
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ message: 'Error updating slot', error: err.message });
  }
});

router.get('/slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Dynamically calculate actual booked slots from Booking collection
    const bookingsCountAgg = await Booking.aggregate([
      { $match: { darshanDate: date } },
      { $group: { _id: null, count: { $sum: "$totalMembers" } } }
    ]);
    const actualBooked = bookingsCountAgg.length > 0 ? bookingsCountAgg[0].count : 0;

    let slot = await Slot.findOne({ date });
    if (!slot) {
      slot = new Slot({ date, total: 6000, booked: actualBooked });
      await slot.save();
    } else if (slot.booked !== actualBooked) {
      // Self-heal the slot booked count if it gets out of sync
      slot.booked = actualBooked;
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

router.get('/admin/search-reg/:regNo', async (req, res) => {
  try {
    const regNo = decodeURIComponent(req.params.regNo).toUpperCase();
    const booking = await Booking.findOne({
      $or: [
        { referenceId: regNo },
        { "members.regNo": regNo }
      ]
    }).lean();
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Registration number not found' });
    }
    
    const user = await User.findOne({ mobile: booking.primaryUserMobile }).lean();
    res.json({
      success: true,
      booking,
      primaryUser: user
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error searching registration', error: err.message });
  }
});

// New Endpoint: Global Search (Search by mobile, name, or registration number)
router.get('/admin/global-search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const cleanQuery = decodeURIComponent(query).trim();
    // We want a regex search that is case-insensitive
    const regex = new RegExp(cleanQuery, 'i');

    // Find bookings where referenceId, primaryUserMobile, members.name, members.mobile or members.regNo matches
    const bookings = await Booking.find({
      $or: [
        { referenceId: regex },
        { primaryUserMobile: regex },
        { "members.name": regex },
        { "members.mobile": regex },
        { "members.regNo": regex }
      ]
    }).sort({ createdAt: -1 }).limit(50).lean();

    // Map bookings to fetch primary user information for each
    const mobiles = bookings.map(b => b.primaryUserMobile);
    const users = await User.find({ mobile: { $in: mobiles } }).select('-photo').lean();
    const userMap = users.reduce((acc, user) => {
      acc[user.mobile] = user;
      return acc;
    }, {});

    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}/uploads/`;

    // Process bookings and attach primaryUser object details
    const detailedBookings = bookings.map(b => {
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

    res.json({
      success: true,
      results: detailedBookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error performing global search', error: err.message });
  }
});

router.post('/send-otp', (req, res) => {
  const { mobile } = req.body;
  res.json({ message: 'OTP sent successfully', otp: '123456' });
});

router.post('/book', async (req, res) => {
  try {
    const { primaryUser, darshanDate, members, websiteSource } = req.body;

    // Honeypot bot protection
    if (websiteSource && websiteSource.trim() !== "") {
      console.warn(`[BOT-ALERT] Blocked request from IP ${req.ip} due to honeypot fill: ${websiteSource}`);
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Save photos in parallel to avoid CPU blocking and request timeouts
    const photoPromises = [];

    if (primaryUser && primaryUser.photo) {
      photoPromises.push((async () => {
        primaryUser.photo = await saveBase64Image(primaryUser.photo, 'user');
      })());
    }

    if (members && members.length > 0) {
      members.forEach((m) => {
        if (m.photo) {
          photoPromises.push((async () => {
            m.photo = await saveBase64Image(m.photo, 'member');
          })());
        }
      });
    }

    await Promise.all(photoPromises);

    let user = await User.findOne({ mobile: primaryUser.mobile });
    if (!user) {
      user = new User(primaryUser);
      await user.save();
    } else {
      user.name = primaryUser.name;
      if (primaryUser.email) user.email = primaryUser.email;
      if (primaryUser.photo) user.photo = primaryUser.photo;
      if (primaryUser.address) user.address = primaryUser.address;
      user.age = primaryUser.age;
      user.gender = primaryUser.gender;
      await user.save();
    }

    const existingBooking = await Booking.findOne({ primaryUserMobile: primaryUser.mobile, darshanDate });
    if (existingBooking) {
      return res.status(400).json({ message: 'A booking already exists for this mobile number on this date.' });
    }

    const totalNewBookings = members.length + 1;
    
    // Check available slots dynamically from the source of truth (Booking collection)
    const bookingsCountAgg = await Booking.aggregate([
      { $match: { darshanDate } },
      { $group: { _id: null, count: { $sum: "$totalMembers" } } }
    ]);
    const actualBooked = bookingsCountAgg.length > 0 ? bookingsCountAgg[0].count : 0;

    let slot = await Slot.findOne({ date: darshanDate });
    const slotTotal = slot ? slot.total : 6000;

    if (actualBooked + totalNewBookings > slotTotal) {
      return res.status(400).json({ message: 'Not enough slots available for this date' });
    }

    // Fetch only the single latest booking document (sorted descending by createdAt) to get the max sequence number instantly
    const latestBooking = await Booking.findOne({ referenceId: { $regex: /^MATA\/2026\// } })
      .sort({ createdAt: -1 })
      .select('referenceId members.regNo');

    let maxSeq = 0;
    if (latestBooking) {
      if (latestBooking.referenceId) {
        const parts = latestBooking.referenceId.split('/');
        if (parts.length >= 3) {
          const seqNum = parseInt(parts[2]);
          if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
        }
      }
      
      if (latestBooking.members) {
        latestBooking.members.forEach(m => {
          if (m.regNo) {
            const parts = m.regNo.split('/');
            if (parts.length >= 3) {
              const seqNum = parseInt(parts[2]);
              if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
            }
          }
        });
      }
    }

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
      // If member mobile is empty or not provided, use primary user's mobile
      const memberMobile = m.mobile || user.mobile;
      allMembers.push({ 
        ...m, 
        mobile: memberMobile,
        regNo: `MATA/2026/${currentSeq.toString().padStart(6, '0')}` 
      });
    });

    const newBooking = new Booking({
      referenceId: primaryRegNo,
      primaryUserMobile: user.mobile,
      darshanDate,
      members: allMembers,
      totalMembers: allMembers.length
    });
    await newBooking.save();

    const finalBooked = actualBooked + totalNewBookings;
    if (slot) {
      slot.booked = finalBooked;
      await slot.save();
    } else {
      const newSlot = new Slot({ date: darshanDate, total: 6000, booked: finalBooked });
      await newSlot.save();
    }

    // Invalidate stats cache on new bookings
    statsCache = { data: null, lastFetch: 0 };

    res.json({ success: true, referenceId: primaryRegNo, members: allMembers, message: 'Booking confirmed' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing booking', error: err.message });
  }
});

router.delete('/admin/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    // Calculate the new booked slot count dynamically after deleting this booking
    const bookingsCountAgg = await Booking.aggregate([
      { $match: { darshanDate: booking.darshanDate, _id: { $ne: booking._id } } },
      { $group: { _id: null, count: { $sum: "$totalMembers" } } }
    ]);
    const nextBookedCount = bookingsCountAgg.length > 0 ? bookingsCountAgg[0].count : 0;

    const slot = await Slot.findOne({ date: booking.darshanDate });
    if (slot) {
      slot.booked = nextBookedCount;
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
    // Invalidate stats cache on deletions
    statsCache = { data: null, lastFetch: 0 };
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
