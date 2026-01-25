require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixLinkedInUrls() {
  try {
    console.log('🔧 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/votingApp");
    console.log('✅ Connected to MongoDB\n');

    // Find all users with LinkedIn provider
    const linkedinUsers = await User.find({ provider: 'linkedin' });
    console.log(`📊 Found ${linkedinUsers.length} LinkedIn users\n`);

    let fixedCount = 0;
    let alreadyValidCount = 0;

    for (const user of linkedinUsers) {
      const linkedinUrl = user.linkedin;
      
      // Check if URL is invalid (contains UUID pattern or short random string instead of username)
      const isInvalidUrl = linkedinUrl && (
        // Pattern 1: UUIDs with dashes (abc-123-xyz)
        (linkedinUrl.includes('-') && linkedinUrl.match(/linkedin\.com\/in\/[0-9a-f-]{20,}/)) ||
        // Pattern 2: Short random strings without dashes (less than 15 chars, mix of upper/lower/numbers)
        (linkedinUrl.match(/linkedin\.com\/in\/[a-zA-Z0-9]{1,15}$/) && 
         linkedinUrl.match(/[A-Z]/) && linkedinUrl.match(/[a-z]/) && 
         !linkedinUrl.match(/linkedin\.com\/in\/[a-z][a-z0-9-]+$/)) // Valid profiles are usually lowercase with dashes
      );

      if (isInvalidUrl) {
        console.log(`❌ Invalid URL found for ${user.name}:`);
        console.log(`   Old: ${linkedinUrl}`);
        
        // Clear the invalid URL
        user.linkedin = '';
        await user.save();
        
        console.log(`   ✅ Cleared - user can add their real LinkedIn URL manually\n`);
        fixedCount++;
      } else if (linkedinUrl) {
        console.log(`✅ Valid URL for ${user.name}: ${linkedinUrl}`);
        alreadyValidCount++;
      } else {
        console.log(`⚠️  No URL set for ${user.name} - they can add it manually`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`Total LinkedIn users: ${linkedinUsers.length}`);
    console.log(`Fixed (invalid URLs cleared): ${fixedCount}`);
    console.log(`Already valid: ${alreadyValidCount}`);
    console.log(`No URL set: ${linkedinUsers.length - fixedCount - alreadyValidCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Done! Users with cleared URLs can now add their real LinkedIn profiles.');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixLinkedInUrls();
