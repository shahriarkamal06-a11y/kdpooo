// Day name translations between Bengali and English
const dayTranslations = {
  // Bengali to English
  'রবিবার': 'Sunday',
  'সোমবার': 'Monday', 
  'মঙ্গলবার': 'Tuesday',
  'বুধবার': 'Wednesday',
  'বৃহস্পতিবার': 'Thursday',
  'শুক্রবার': 'Friday',
  'শনিবার': 'Saturday',
  
  // English to Bengali
  'Sunday': 'রবিবার',
  'Monday': 'সোমবার',
  'Tuesday': 'মঙ্গলবার', 
  'Wednesday': 'বুধবার',
  'Thursday': 'বৃহস্পতিবার',
  'Friday': 'শুক্রবার',
  'Saturday': 'শনিবার'
};

// Convert Bengali days to English for database storage
const convertBengaliToEnglish = (days) => {
  if (!Array.isArray(days)) return days;
  return days.map(day => {
    const trimmedDay = day.trim();
    return dayTranslations[trimmedDay] || trimmedDay;
  });
};

// Convert English days to Bengali for frontend display
const convertEnglishToBengali = (days) => {
  if (!Array.isArray(days)) return days;
  return days.map(day => {
    const trimmedDay = day.trim();
    return dayTranslations[trimmedDay] || trimmedDay;
  });
};

module.exports = {
  dayTranslations,
  convertBengaliToEnglish,
  convertEnglishToBengali
};