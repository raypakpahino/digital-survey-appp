import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import surveyRoutes from './routes/surveyRoutes.js'; // Ensure correct router file name

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digitalsurvey';

// Loosened up CORS origins so devices scanning the QR code on the Wi-Fi network can connect safely
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Routes
app.use('/api', surveyRoutes);

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully.");
    // Added '0.0.0.0' to explicitly instruct the server to accept network connections from other hardware devices
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Express API Server executing smoothly on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err.message);
  });