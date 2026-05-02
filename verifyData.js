const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team');
const Review = require('./models/Review');

async function verifyData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kdpo');
        console.log('Connected to MongoDB');

        // Get all team members
        const teamMembers = await Team.find({ isActive: true }).sort({ order: 1 });
        console.log(`\n✅ Found ${teamMembers.length} team members in database:`);
        teamMembers.forEach((member, index) => {
            console.log(`${index + 1}. ${member.name} - ${member.position} (Order: ${member.order})`);
        });

        // Get all reviews
        const reviews = await Review.find({ isActive: true }).sort({ order: 1 });
        console.log(`\n✅ Found ${reviews.length} reviews in database:`);
        reviews.forEach((review, index) => {
            console.log(`${index + 1}. ${review.name} - ${review.rating} stars (Order: ${review.order})`);
        });

        console.log('\n🎉 Data verification completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyData();