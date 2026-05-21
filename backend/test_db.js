const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = require('./models/Booking');
    const b = await Booking.findOne({referenceId: 'MATA/2026/100371'}).lean();
    if (!b) {
        console.log("Booking not found");
    } else {
        const member = b.members[0];
        console.log("Member Keys:", Object.keys(member));
        if (member.photo) {
            console.log("Photo length:", member.photo.length);
        } else {
            console.log("Photo field does NOT exist or is empty.");
        }
    }
    process.exit(0);
}).catch(console.error);
