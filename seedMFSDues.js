/**
 * Seed script: Creates MFS due customers and their due entries.
 * Usage: node seedMFSDues.js
 *
 * Requirements:
 *  - MongoDB must be running
 *  - At least one admin User must exist in DB
 *  - At least one active MFSAccount must exist in DB
 *    (script picks the first active one automatically)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MFSCustomer = require('./models/MFSCustomer');
const MFSDue = require('./models/MFSDue');
const MFSAccount = require('./models/MFSAccount');
const User = require('./models/User');

const DUE_DATA = [
  { name: 'জাকির',           amount: 27727 },
  { name: 'রাকিব',           amount: 19730 },
  { name: 'সিয়াম',           amount: 9586  },
  { name: 'মকবুল হোসেন',     amount: 3595  },
  { name: 'বাদল',            amount: 2560  },
  { name: 'হুমায়ূন',         amount: 2940  },
  { name: 'মোশারফ',          amount: 100   },
  { name: 'সুহাগ',           amount: 5380  },
  { name: 'নোমান ভাই',       amount: 5320  },
  { name: 'মাসুদ',           amount: 1495  },
  { name: 'এমদাদ নানা',      amount: 2800  },
  { name: 'বকুল কাকা',       amount: 945   },
  { name: 'জাকির সিএনজি',    amount: 300   },
  { name: 'মুশা মিন্টু',     amount: 300   },
  { name: 'সুজন ভাই',        amount: 40500 },
  { name: 'হুছেন মসজিদ',     amount: 14280 },
  { name: 'মাবেল',           amount: 270   },
  { name: 'সিয়াম সরকার',    amount: 1535  },
  { name: 'হোস্টিং',         amount: 1400  },
  { name: 'হাসান',           amount: 1000  },
  { name: 'জিয়ার ভাই',      amount: 2130  },
  { name: 'ইকবাল কাকা',      amount: 1500  },
  { name: 'জাহিদ ভাই',       amount: 3000  },
  { name: 'সাকিব',           amount: 500   },
  { name: 'মামুন ভাই',       amount: 10000 },
  { name: 'শফি ভাই',         amount: 4000  },
  { name: 'মুঞ্জু ভাই',      amount: 1000  },
  { name: 'কামরুজ্জামান',    amount: 1000  },
  { name: 'মিলন ভাই',        amount: 1580  },
  { name: 'সুহেল ভাই নগদ',   amount: 500   },
  { name: 'নতুন দোকান বাবদ', amount: 101095},
  { name: 'রফি ভাই',         amount: 4000  },
  { name: 'বিল্লাল কিস্তি',  amount: 4200  },
  { name: 'ময়জদ্দি মামা',    amount: 200   },
  { name: 'স্ট্যাম্প বাবদ',  amount: 10900 },
  { name: 'কিস্তি',          amount: 15000 },
  { name: 'হামজা কাকা',      amount: 2500  },
  { name: 'জাফর ভাই',        amount: 1440  },
  { name: 'রফিকুল ভাই',      amount: 30    },
  { name: 'খলিল ভাই',        amount: 3000  },
  { name: 'সোহেল ভাই বাড়ী', amount: 220   },
  { name: 'ফখরুল ভাই',       amount: 1000  },
  { name: 'উজ্জল ভাই',       amount: 6000  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Get admin user
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('❌ No admin user found. Create an admin first.');
    process.exit(1);
  }
  console.log(`👤 Using admin: ${admin.name}`);

  // Get first active MFS account
  const account = await MFSAccount.findOne({ isActive: true });
  if (!account) {
    console.error('❌ No active MFS account found. Create one first.');
    process.exit(1);
  }
  console.log(`🏦 Using account: ${account.provider} - ${account.accountNumber}`);

  let created = 0;
  let skipped = 0;
  const totalAmount = DUE_DATA.reduce((s, d) => s + d.amount, 0);

  for (const entry of DUE_DATA) {
    // Check if customer already exists (by name)
    let customer = await MFSCustomer.findOne({ name: entry.name });

    if (!customer) {
      customer = await MFSCustomer.create({
        name: entry.name,
        creditLimit: entry.amount,
        currentDue: entry.amount,
        totalDueAmount: entry.amount,
        totalTransactions: 1,
        lastTransactionDate: new Date(),
        status: 'active',
        createdBy: admin._id,
      });
    } else {
      // Update existing customer's due
      customer.currentDue += entry.amount;
      customer.totalDueAmount += entry.amount;
      customer.totalTransactions += 1;
      customer.lastTransactionDate = new Date();
      await customer.save();
      skipped++;
    }

    // Create the due entry
    await MFSDue.create({
      mfsAccount: account._id,
      customer: customer._id,
      transactionType: 'cash_out',
      amount: entry.amount,
      customerName: entry.name,
      customerPhone: '',
      paidAmount: 0,
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      handledBy: admin._id,
    });

    console.log(`  ✔ ${entry.name.padEnd(20)} ৳${entry.amount.toLocaleString()}`);
    created++;
  }

  console.log('\n─────────────────────────────────────');
  console.log(`✅ Done! ${created} entries created (${skipped} customers already existed)`);
  console.log(`💰 Total due amount: ৳${totalAmount.toLocaleString()}`);
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
