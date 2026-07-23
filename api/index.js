import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import surveyRoutes from '../backend/routes/surveyRoutes.js';
import authRoutes from '../backend/routes/authRoutes.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cached MongoDB Connection for Serverless Environments
let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;
  
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI environment variable is not defined!");
    return;
  }

  try {
    const db = await mongoose.connect(MONGO_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ Connected to MongoDB Cloud successfully.");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
  }
};

// Middleware to ensure DB is connected before handling routes
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    databaseConnected: mongoose.connection.readyState === 1,
    environment: 'vercel-serverless'
  });
});

app.use('/api', surveyRoutes);
app.use('/api/auth', authRoutes);

export default app;