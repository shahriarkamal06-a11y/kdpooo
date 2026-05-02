const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team');
const Review = require('./models/Review');

// Current team data
const teamData = [
    {
        name: "মোঃ রাকিব মিয়া",
        position: "সহকর্মী ও অংশীদার",
        image: "/emply2.jpeg",
        description: "আমি মোঃ রাকিব মিয়া ডিজিটাল সেবা খাতে দীর্ঘ ৬ বছরের অধিক অভিজ্ঞতা নিয়ে আমি নির্ভুলতা, দক্ষতা ও বিশ্বস্ততার সাথে বিভিন্ন কম্পিউটারভিত্তিক সেবা প্রদান করে আসছি। Microsoft Word, Excel ও PowerPoint-এ পেশাদার মানের নথি প্রস্তুত, ডাটা বিশ্লেষণ ও প্রেজেন্টেশন তৈরিতে আমার রয়েছে সুদক্ষতা।",
        color: "cyan",
        experience: "৮ বছর",
        education: ["SSC (Science)", "HSC(Science)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop"],
        phone: "01922-519921, 01981-260082",
        email: "mdrakibmia200305@gmail.com",
        order: 1
    },
    {
        name: "মোঃ সাগর মিয়া",
        position: "সহকর্মী (সাবেক)",
        image: "/sagor.jpeg",
        description: "আমি মোঃ সাগর মিয়া, তথ্য ও যোগাযোগ প্রযুক্তি (ICT) বিষয়ে প্রশিক্ষিত ও দক্ষ একজন কম্পিউটার অপারেটর, যার ৬ বছরের বাস্তব কাজের অভিজ্ঞতা রয়েছে। আমি Institute of ICT (SIT Foundation) থেকে ১ বছর মেয়াদি 'Diploma in Computer Science & ICT' সম্পন্ন করেছি।",
        color: "cyan",
        experience: "৬ বছর",
        education: ["SSC (Science)","HSC(Science)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop"],
        phone: "01840-858148",
        email: "mdsagarmia952004@gmail.com",
        order: 2
    },
    {
        name: "জুলহাস উদ্দিন",
        position: "অপারেশনাল কনসালট্যান্ট",
        image: "/mdjulhasuddin.jpeg",
        description: "আমি জাতীয় বিশ্ববিদ্যালয়ের অধীনে সমাজকর্ম (Social Work) বিভাগ থেকে স্নাতক (সম্মান) সম্পন্ন করেছি। একাডেমিক শিক্ষার অংশ হিসেবে আমি ৬০ দিনের নিবিড় মাঠকর্ম (Fieldwork) সফলভাবে শেষ করেছি।",
        color: "cyan",
        experience: "৬ বছর",
        education: ["SSC (Humanities)","HSC (Humanities)","BSS Honours (Social Work)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop","Cyber Hygiene","Strengthening Inclusion, Interfaith & Sustaining Peace"],
        phone: "01914-091151",
        email: "julhasuddin1072@gmail.com",
        order: 3
    },
    {
        name: "মোঃ জাহিদুল ইসলাম",
        position: "সহকর্মী ও অংশীদার",
        image: "/chacchu.jpeg",
        description: "আমি মোঃ জাহিদুল ইসলাম, একজন দক্ষ ও অভিজ্ঞ Computer Operator, আমার রয়েছে কম্পিউটারভিত্তিক ডাটা এন্ট্রি ও ডিজিটাল কার্যক্রমে ৭+ বছরের বাস্তব অভিজ্ঞতা। ডাটা প্রক্রিয়াকরণ, নথি প্রস্তুত ও ডিজিটাল কাজ দ্রুত এবং নির্ভুলভাবে সম্পন্ন করাই আমার প্রধান দক্ষতা।",
        color: "cyan",
        experience: "৭ বছর",
        education: ["SSC (Science)", "HSC(Accounting)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop","Canva"],
        phone: "01771367204",
        email: "freelancing017713@gmail.com",
        order: 4
    },
    {
        name: "মোঃ আইয়ুব আলী",
        position: "সহকর্মী (সাবেক)",
        image: "/janinasd.jpeg",
        description: "আমি মোঃ আইয়ুব আলী, তথ্য ও যোগাযোগ প্রযুক্তি (ICT) বিষয়ে প্রশিক্ষিত ও দক্ষ একজন কম্পিউটার অপারেটর, যার ৬ বছরের বাস্তব কাজের অভিজ্ঞতা রয়েছে। আমি Katbowla Digital Post Office থেকে ৬ মাস মেয়াদি 'Diploma in Software Application' সফলভাবে সম্পন্ন করেছি।",
        color: "cyan",
        experience: "৫ বছর",
        education: ["SSC (Science)", "HSC(Accounting)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop"],
        phone: "01924-808302, 01616361389",
        email: "mdayubali212526@gmail.com",
        order: 5
    },
    {
        name: "মোঃ হামিদুল ইসলাম",
        position: "সহকর্মী (সাবেক)",
        image: "/abcd.jpeg",
        description: "আমি মোঃ হামিদুল ইসলাম, গ্রাম: কোকাডাঙ্গা। আমি পূর্বে 'কাটবওলা ডিজিটাল পোস্ট অফিস'-এ সহকর্মী হিসেবে কাজ করেছি। পাশাপাশি আমি এই প্রতিষ্ঠান থেকে ৬ মাস মেয়াদি কম্পিউটার কোর্স সম্পন্ন করেছি। এখানে আমি Microsoft Word, Excel, PowerPoint, Photoshop, অনলাইনে চাকরির আবেদন, ফটো ও ফটোকপি কাজের উপর ভালো দক্ষতা অর্জন করেছি। প্রতিষ্ঠানটির সার্বিক সেবা ও পরিবেশে আমি সন্তুষ্ট।",
        color: "cyan",
        experience: "৬ বছর",
        education: ["FAZIL (Islamic Studies)", "KAMIL (Hadith)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop"],
        phone: "01732-361357",
        email: "hamidulislam732001@gmail.com",
        order: 6
    },
    {
        name: "মোঃ সজিব মিয়া",
        position: "সহকর্মী",
        image: "/employ1.jpeg",
        description: "আমি মোঃ সজিব মিয়া, একজন দক্ষ ও অভিজ্ঞ Computer Operator, আমার রয়েছে কম্পিউটারভিত্তিক ডাটা এন্ট্রি ও ডিজিটাল কার্যক্রমে ৫+ বছরের বাস্তব অভিজ্ঞতা। ডাটা প্রক্রিয়াকরণ, নথি প্রস্তুত ও ডিজিটাল কাজ দ্রুত এবং নির্ভুলভাবে সম্পন্ন করাই আমার প্রধান দক্ষতা।",
        color: "cyan",
        experience: "৫ বছর",
        education: ["SSC (Science)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop"],
        phone: "01865461055",
        email: "mdsojibmiamsm2006@gmail.com",
        order: 7
    },
    {
        name: "মোঃ শরিফুল ইসলাম",
        position: "সহকর্মী (সাবেক)",
        image: "/employ54.jpeg",
        description: "আমি মোঃ শরিফুল ইসলাম, তথ্য ও যোগাযোগ প্রযুক্তি (ICT) বিষয়ে প্রশিক্ষিত ও দক্ষ একজন কম্পিউটার অপারেটর, যার ৬ বছরের বাস্তব কাজের অভিজ্ঞতা রয়েছে। আমি Institute of ICT (SIT Foundation) থেকে ১ বছর মেয়াদি 'Diploma in Computer Science & ICT' এবং Katbowla Digital Post Office থেকে ৬ মাস মেয়াদি 'Diploma in Software Application' সফলভাবে সম্পন্ন করেছি, যা আমার প্রযুক্তিগত দক্ষতাকে শক্তিশালী করেছে।  আমার কম্পিউটার পরিচালনা, ডাটা এন্ট্রি, ডাটা প্রসেসিং এবং বিভিন্ন ডিজিটাল কাজের উপর দৃঢ় দক্ষতা রয়েছে। আমি Microsoft Word, Excel, Access, PowerPoint, adobe photoshope ব্যবহার করে প্রফেশনাল ডকুমেন্ট তৈরি, ডাটা বিশ্লেষণ এবং প্রেজেন্টেশন তৈরিতে পারদর্শী। এছাড়াও ইন্টারনেট ব্রাউজিং, ইমেইল ব্যবস্থাপনা, সফটওয়্যার ব্যবহারে এবং বেসিক গ্রাফিক্স ডিজাইনে আমার ভালো অভিজ্ঞতা রয়েছে। আমি দায়িত্বশীলতা, নির্ভুলতা ও সময়নিষ্ঠার সাথে কাজ করতে অভ্যস্ত এবং প্রতিটি কাজ সর্বোচ্চ মান বজায় রেখে সম্পন্ন করার প্রতি প্রতিশ্রুতিবদ্ধ।",
        color: "cyan",
        experience: "৬ বছর",
        education: ["SSC (Science)"],
        skills: ["Microsoft Word","Excel","PowerPoint","Adobe Photoshop"],
        phone: "01315-778373",
        email: "shariful19022002@gmail.com",
        order: 8
    }
];

// Current review data
const reviewData = [
    {
        name: "মোঃ আরিফুর রহমান",
        position: "গ্রাহক (চাকুরিজীবী)",
        image: "/ee2.jpeg",
        rating: 5,
        comment: "আমি মোঃ আরিফুর রহমান, জামালপুর সদর থেকে। কমলাপুর রাবার বাগানে চাকরি করা অবস্থায় আমি নিয়মিত এই প্রতিষ্ঠানের কাছ থেকে বিভিন্ন ডিজিটাল সেবা ও পরামর্শ নিয়েছি। তাদের সেবার মান, আন্তরিকতা এবং সঠিক দিকনির্দেশনা আমাকে সবসময় মুগ্ধ করেছে। উক্ত প্রতিষ্ঠানের সার্ভিস প্রদানের ক্ষেত্রে যে বিষয়টি আমাকে সবচেয়ে বেশি মুগ্ধ করেছে, তা হলো—গ্রাহকের প্রতিটি সমস্যা ও চাহিদাকে তারা নিজেদের সমস্যার মতো করে দেখেন এবং সেই অনুযায়ী অত্যন্ত যত্ন ও দায়িত্বের সাথে সমাধানের চেষ্টা করেন। আমি ব্যক্তিগতভাবে অত্যন্ত সন্তুষ্ট এবং সবার জন্য এই প্রতিষ্ঠানকে সুপারিশ করছি।",
        order: 1
    },
    {
        name: "মনিরুজ্জামান মনির",
        position: "গ্রাহক",
        image: "/ee1.jpeg",
        rating: 5,
        comment: "আমি মনিরুজ্জামান মনির, এই প্রতিষ্ঠানের সাথে প্রায় ১১ বছর ধরে যুক্ত একজন নিয়মিত কাস্টমার। দীর্ঘ এই সময়ে তাদের সেবার মান, আন্তরিকতা ও দায়িত্বশীলতা আমাকে সবসময় মুগ্ধ করেছে। সবচেয়ে অবাক করার বিষয়—এত বছরেও কখনো কোনো ঝামেলা বা অসন্তোষের সম্মুখীন হইনি। নিশ্চিন্তে সবার জন্য রিকমেন্ড করছি।",
        order: 2
    },
    {
        name: "গোলাম কিবরিয়া",
        position: "গ্রাহক (চাকরিজীবী)",
        image: "/ee3.jpeg",
        rating: 5,
        comment: "আমি গোলাম কিবরিয়া, গোদাপাড়া থেকে। আমি এই প্রতিষ্ঠানের একজন সাবেক ছাত্র। বর্তমানে আমি কাটবওলা বাজার ফাজিল মাদ্রাসায় NTRCA কর্তৃক নিয়োগপ্রাপ্ত শিক্ষক হিসেবে কর্মরত আছি। এই প্রতিষ্ঠানে পড়ালেখার সময় থেকে শুরু করে এখন পর্যন্ত তাদের সেবার মান, আন্তরিকতা এবং দায়িত্বশীলতা আমাকে সবসময় মুগ্ধ করেছে। তারা শিক্ষার্থীদের প্রতি খুব যত্নশীল এবং মানসম্মত সেবা প্রদান করে। আমি ব্যক্তিগতভাবে অত্যন্ত সন্তুষ্ট এবং সবার জন্য এই প্রতিষ্ঠানকে আন্তরিকভাবে সুপারিশ করছি।",
        order: 3
    },
    {
        name: "মোঃ কামরুজ্জামান",
        position: "গ্রাহক",
        image: "/ee6.jpeg",
        rating: 5,
        comment: "আমি মোঃ কামরুজ্জামান, আমার ছাত্রজীবনের শুরু থেকে আজ গ্র্যাজুয়েশন সম্পন্ন করা পর্যন্ত  যাবতীয় অনলাইনের কাজের জন্য এই 'কাটবওলা ডিজিটাল পোস্ট অফিস' ই ছিলো আমার একমাত্র ভরসা। স্কুল, কলেজের ভর্তি ফরম ফিলাপ থেকে শুরু করে চাকুরীর আবেদন, ফটোকপি, কিংবা মোবাইল ব্যাংকিং সবকিছুই এখান থেকে অত্যন্ত নিখুঁতভাবে করেছি। বিশেষ করে তাদের জন্মনিবন্ধন সংক্রান্ত বিভিন্ন আবেদনের কাজ এবং নির্ভূলভাবে ফরম পুরনের দক্ষতা প্রশংসনীয়। অনলাইন ভিত্তিক যেকোন কাজের জন্য সেরা এবং বিশ্বস্ত প্রতিষ্ঠানের নাম 'কাটবওলা ডিজিটাল পোস্ট অফিস'",
        order: 4
    },
    {
        name: "আক্তার সুলতানা",
        position: "গ্রাহক",
        image: "/eee.jpeg",
        rating: 5,
        comment: "আমি আক্তার সুলতানা, গ্রাম- কাটবওলা। কাটবওলা ডিজিটাল পোস্ট অফিস থেকে ৬ মাস মেয়াদী কম্পিউটার কোর্স সম্পন্ন করেছি। কোর্স চলাকালীন এবং বিশ্ববিদ্যালয়ে অধ্যয়নকালীন সময়ে এখানে থেকে বিভিন্ন গুরুত্বপূর্ণ পরামর্শ পেয়ে আমি অনেক উপকৃত হয়েছি। বর্তমানে আমি একটি এনজিওতে কর্মরত আছি, যেখানে এই প্রতিষ্ঠানে শেখা দক্ষতাগুলো কাজে লাগছে। এছাড়াও অনলাইনে বিভিন্ন আবেদন, ফটো ও ফটোকপির সেবা নিয়েও আমি সন্তুষ্ট।  প্রতিষ্ঠানটির সেবার মান ভালো এবং আমি এটি সবার কাছে সুপারিশ করি।",
        order: 5
    }
];

async function migrateData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kdpo');
        console.log('Connected to MongoDB');

        // Clear existing data
        await Team.deleteMany({});
        await Review.deleteMany({});
        console.log('Cleared existing data');

        // Insert team data
        const teamResult = await Team.insertMany(teamData);
        console.log(`Inserted ${teamResult.length} team members`);

        // Insert review data
        const reviewResult = await Review.insertMany(reviewData);
        console.log(`Inserted ${reviewResult.length} reviews`);

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateData();