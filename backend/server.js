import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import surveyRoutes from './routes/surveyRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digitalsurvey';

// Enable CORS for all incoming connections
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', surveyRoutes);

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully.");
    // Listening on '0.0.0.0' allows incoming Wi-Fi network requests from mobile devices
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Express API Server executing smoothly on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err.message);
  });