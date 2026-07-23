import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import surveyRoutes from './routes/surveyRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digitalsurvey';

// Enable CORS for all incoming connections
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// INCREASE PAYLOAD LIMIT TO 50MB FOR BASE64 PICTURE UPLOADS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint for debugging
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'online',
    databaseConnected: dbState === 1,
    dbStateCode: dbState // 1 = Connected, 0 = Disconnected
  });
});

// Mount API routes
app.use('/api', surveyRoutes);
app.use('/api/auth', authRoutes);

// Database Connection with Auto-Retry
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB successfully.");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("🔄 Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn("⚠️ MongoDB connection lost. Attempting to reconnect...");
});

// Start Express Server FIRST so Port 5000 is always online when running locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Express API Server executing smoothly on http://localhost:${PORT}`);
    connectDB();
  });
}

export default app;