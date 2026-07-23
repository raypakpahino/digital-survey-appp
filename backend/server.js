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

// Increase payload limit to 50MB for base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serverless-ready MongoDB Connection Manager
let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  const db = await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // Fast fail in 5s if URI/auth is bad
  });
  isConnected = db.connections[0].readyState === 1;
  console.log("✅ Connected to MongoDB successfully.");
};

// Middleware: Guarantees DB connection before hitting any API route
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB Connection Middleware Error:", err.message);
    res.status(500).json({ success: false, error: `Database Connection Error: ${err.message}` });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'online',
    databaseConnected: dbState === 1,
    dbStateCode: dbState
  });
});

// Mount API routes
app.use('/api', surveyRoutes);
app.use('/api/auth', authRoutes);

mongoose.connection.on('disconnected', () => {
  console.warn("⚠️ MongoDB connection lost.");
  isConnected = false;
});

// Run local listener only in development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Express API Server executing smoothly on http://localhost:${PORT}`);
  });
}

export default app;