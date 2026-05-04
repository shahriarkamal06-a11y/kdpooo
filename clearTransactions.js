/**
 * Clear all transaction data from the database.
 * Collections cleared:
 *   - mfstransactions
 *   - mfsdues
 *   - mfscustomers
 *   - transactions
 *   - handcashes
 *
 * Usage: node clearTransactions.js
 * Add --confirm flag to skip the prompt: node clearTransactions.js --confirm
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const COLLECTIONS = [
  'mfstransactions',
  'mfsdues',
  'mfscustomers',
  'transactions',
  'handcashes',
];

async function clear() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Show counts before clearing
  console.log('📊 Current record counts:');
  for (const col of COLLECTIONS) {
    const count = await mongoose.connection.db.collection(col).countDocuments();
    console.log(`   ${col.padEnd(20)} ${count} records`);
  }

  console.log('\n⚠️  This will permanently delete ALL records in the above collections.\n');

  const confirmed = process.argv.includes('--confirm');

  if (!confirmed) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise((resolve) => {
      rl.question('Type "yes" to confirm: ', async (answer) => {
        rl.close();
        if (answer.trim().toLowerCase() !== 'yes') {
          console.log('❌ Cancelled.');
          await mongoose.disconnect();
          process.exit(0);
        }
        resolve();
      });
    });
  }

  console.log('\n🗑️  Clearing collections...');
  for (const col of COLLECTIONS) {
    const result = await mongoose.connection.db.collection(col).deleteMany({});
    console.log(`   ✔ ${col.padEnd(20)} ${result.deletedCount} records deleted`);
  }

  console.log('\n✅ Done. All transaction data cleared.');
  await mongoose.disconnect();
}

clear().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
