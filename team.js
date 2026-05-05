const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team'); // adjust path if needed

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log('MongoDB Connected');

    await Team.deleteMany({}); // optional: clear old data

    await Team.insertMany([
        {
            name: "মোঃ রাকিব মিয়া",
            position: "কম্পিউটার অপারেটর",
            image: "/images/team/rakib.jpg",
            description: `আমি মোঃ রাকিব মিয়া ডিজিটাল সেবা খাতে দীর্ঘ ৬ বছরের অধিক অভিজ্ঞতা নিয়ে আমি নির্ভুলতা, দক্ষতা ও বিশ্বস্ততার সাথে বিভিন্ন কম্পিউটারভিত্তিক সেবা প্রদান করে আসছি। Microsoft Word, Excel ও PowerPoint-এ পেশাদার মানের নথি প্রস্তুত, ডাটা বিশ্লেষণ ও প্রেজেন্টেশন তৈরিতে আমার রয়েছে সুদক্ষতা। পাশাপাশি ফটোকপি, ছবি প্রক্রিয়াকরণ এবং প্রয়োজনীয় দাপ্তরিক কাগজপত্র প্রস্তুতকরণে বাস্তবভিত্তিক অভিজ্ঞতা অর্জন করেছি। বিশেষ করে: নতুন জন্ম নিবন্ধন আবেদন, তথ্য সংশোধনসহ সংশ্লিষ্ট সকল অনলাইন সেবা দ্রুত, নির্ভুল ও ঝামেলামুক্তভাবে সম্পন্ন করতে আমি প্রতিশ্রুতিবদ্ধ। আমার মূল লক্ষ্য: গ্রাহকের প্রয়োজন অনুযায়ী সময়োপযোগী, নির্ভরযোগ্য ও মানসম্মত সেবা নিশ্চিত করা।`,
            experience: "৬+ বছর",
            education: [],
            skills: ["Microsoft Word", "Excel", "PowerPoint", "Data Analysis"],
            phone: "01922519921",
            email: "mdrakibmia200305@gmail.com",
            order: 1
        },

        {
            name: "মোঃ সাগর মিয়া",
            position: "কম্পিউটার অপারেটর",
            image: "/images/team/sagor.jpg",
            description: `আমি মোঃ সাগর মিয়া, তথ্য ও যোগাযোগ প্রযুক্তি (ICT) বিষয়ে প্রশিক্ষিত ও দক্ষ একজন কম্পিউটার অপারেটর, যার ৬ বছরের বাস্তব কাজের অভিজ্ঞতা রয়েছে। আমি Institute of ICT (SIT Foundation) থেকে ১ বছর মেয়াদি Diploma in Computer Science & ICT এবং Katbowla Digital Post Office থেকে ৬ মাস মেয়াদি Diploma in Software Application সম্পন্ন করেছি। আমি Microsoft Word, Excel ও PowerPoint ব্যবহার করে প্রফেশনাল ডকুমেন্ট তৈরি, ডাটা বিশ্লেষণ এবং প্রেজেন্টেশন তৈরিতে পারদর্শী।`,
            experience: "৬ বছর",
            education: [
                "Diploma in Computer Science & ICT",
                "Diploma in Software Application"
            ],
            skills: ["Word", "Excel", "PowerPoint", "Data Entry"],
            phone: "01840858148",
            email: "mdsagarmia952004@gmail.com",
            order: 2
        },

        {
            name: "মোঃ সুমন মিয়া",
            position: "কম্পিউটার অপারেটর",
            image: "/images/team/sumon.jpg",
            description: `আমি মোঃ সুমন মিয়া, তথ্য ও যোগাযোগ প্রযুক্তি (ICT) খাতে একজন দক্ষ ও অভিজ্ঞ কম্পিউটার অপারেটর। গত পাঁচ বছরের অভিজ্ঞতার মাধ্যমে ডাটা ম্যানেজমেন্ট ও বিভিন্ন আইটি সেবায় দক্ষতা অর্জন করেছি। Microsoft Office (Word, Excel, PowerPoint, Access), Adobe Photoshop ও Canva ব্যবহার করে কাজ করতে পারি। বিশ্ববিদ্যালয় ভর্তি আবেদন, চাকরির আবেদন, NID ও জন্ম নিবন্ধনসহ বিভিন্ন অনলাইন সেবা দ্রুত সম্পন্ন করতে পারি।`,
            experience: "৫ বছর",
            education: ["Diploma in Software Application"],
            skills: ["Word", "Excel", "Photoshop", "Canva"],
            phone: "01779661985",
            email: "mdsumonmondal801@gmail.com",
            order: 3
        },

        {
            name: "মোঃ শরিফুল ইসলাম",
            position: "কম্পিউটার অপারেটর",
            image: "/images/team/shariful.jpg",
            description: `আমি মোঃ শরিফুল ইসলাম, ICT বিষয়ে প্রশিক্ষিত একজন কম্পিউটার অপারেটর। ৬ বছরের অভিজ্ঞতা রয়েছে। Microsoft Word, Excel, Access, PowerPoint এবং Adobe Photoshop ব্যবহার করে প্রফেশনাল কাজ করতে পারি।`,
            experience: "৬ বছর",
            education: [
                "Diploma in Computer Science & ICT",
                "Diploma in Software Application"
            ],
            skills: ["Word", "Excel", "Access", "Photoshop"],
            phone: "01315778373",
            email: "shariful19022002@gmail.com",
            order: 4
        },

        {
            name: "মোঃ আইয়ুব আলী",
            position: "কম্পিউটার অপারেটর",
            image: "/images/team/ayub.jpg",
            description: `আমি মোঃ আইয়ুব আলী, ICT বিষয়ে দক্ষ কম্পিউটার অপারেটর। ৬ বছরের অভিজ্ঞতা রয়েছে। Microsoft Word, Excel, PowerPoint এবং Adobe Photoshop ব্যবহার করে কাজ করতে পারি।`,
            experience: "৬ বছর",
            education: ["Diploma in Software Application"],
            skills: ["Word", "Excel", "Photoshop"],
            phone: "01924808302",
            email: "mdayubali212526@gmail.com",
            order: 5
        }

    ]);

    console.log('Data Inserted Successfully');
    process.exit();

})
.catch(err => console.log(err));