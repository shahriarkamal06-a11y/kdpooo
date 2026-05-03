const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://kdpobd.com', 'http://localhost:5173', 'http://localhost:5000',"https://kdpobd.com", "https://www.kdpobd.com", "http://kdpobd.com", "http://www.kdpobd.com"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
// Remove course routes
// app.use('/api/courses', require('./routes/courses'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/services', require('./routes/services'));
app.use('/api/service-sales', require('./routes/serviceSales'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/student-fees', require('./routes/studentFees'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/mfs', require('./routes/mfs'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/salaries', require('./routes/salaries'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/team', require('./routes/team'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/uploads', require('./routes/uploads'));

// Serve frontend
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
