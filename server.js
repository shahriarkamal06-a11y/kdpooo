const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://kdpobd.com',
    'https://www.kdpobd.com',
    'http://localhost:5173',
    'http://localhost:5000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// MongoDB Connection (SAFE FOR VERCEL)
// --------------------
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing in environment variables");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// --------------------
// Routes
// --------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
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

// --------------------
// Serve frontend static files
// --------------------
const distPath = path.join(__dirname, 'dist');

// Serve static assets with proper MIME types
app.use('/assets', express.static(path.join(distPath, 'assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Serve other static files
app.use(express.static(distPath));

// Handle React Router - send all non-API, non-asset requests to index.html
app.get('*', (req, res) => {
  // Don't serve index.html for API routes or assets
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// --------------------
// Start Server AFTER DB CONNECT
// --------------------
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });