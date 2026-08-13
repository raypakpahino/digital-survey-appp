import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import surveyRoutes from './routes/surveyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digitalsurvey';

// Disable query buffering globally so operations fail immediately if not connected
mongoose.set('bufferCommands', false);

// Enable CORS for all incoming connections
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Payload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serverless DB Manager
let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  if (!MONGO_URI || (process.env.NODE_ENV === 'production' && MONGO_URI.includes('127.0.0.1'))) {
    throw new Error("MONGO_URI is missing or pointing to localhost in production!");
  }

  const db = await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // Stop waiting after 5s
  });
  
  isConnected = db.connections[0].readyState === 1;
  console.log("✅ Connected to MongoDB successfully.");
};

// Middleware: Require active DB connection before handling API routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB Middleware Error:", err.message);
    return res.status(500).json({ 
      success: false, 
      error: `Database Connection Failed: ${err.message}` 
    });
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

// PERMANENTLY RENAME DEVICE ACROSS ALL HISTORICAL LOGS
app.post('/api/responses/rename-device', async (req, res) => {
  try {
    const { oldDeviceId, newDeviceId } = req.body;

    if (!oldDeviceId || !newDeviceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both oldDeviceId and newDeviceId are required.' 
      });
    }

    // Access Mongoose collection directly or via model instance
    const db = mongoose.connection.db;
    const result = await db.collection('responses').updateMany(
      { $or: [{ deviceId: oldDeviceId }, { deviceId: { $exists: false } }] },
      { $set: { deviceId: newDeviceId.trim() } }
    );

    console.log(`✅ Updated ${result.modifiedCount} response records from "${oldDeviceId}" to "${newDeviceId.trim()}"`);

    return res.status(200).json({
      success: true,
      message: `Device updated to ${newDeviceId.trim()}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error renaming device in database:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Internal database update error: ${error.message}` 
    });
  }
});

// Mount API routes
app.use('/api', surveyRoutes);
app.use('/api', userRoutes);
app.use('/api/auth', authRoutes);

mongoose.connection.on('disconnected', () => {
  console.warn("⚠️ MongoDB connection lost.");
  isConnected = false;
});

// Local listener
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running locally on http://localhost:${PORT}`);
  });
}

export default app;