const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Booking = require('./models/Booking');
    const b = await Booking.findOne({ referenceId: 'MATA/2026/116865' }).lean();
    if (!b) {
        console.log("Booking not found");
    } else {
        console.log(`Booking Ref: ${b.referenceId}`);
        for (const member of b.members) {
            console.log(`- Member: ${member.name}`);
            console.log(`  Photo: ${member.photo ? member.photo.substring(0, 100) : 'null'}`);
        }
    }
    process.exit(0);
}).catch(console.error);
