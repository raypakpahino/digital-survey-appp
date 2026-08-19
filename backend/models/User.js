import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'site_leader', 'kiosk_operator', 'user'],
    default: 'kiosk_operator'
  },
  assignedSite: {
    type: String,
    default: ''
  },
  assignedSites: {
    type: [String],
    default: []
  },
  assignedDevices: {
    type: [String],
    default: []
  },
  allowedDevices: {
    type: [String],
    default: []
  }
}, {
  timestamps: true,
  strict: false
});

export default mongoose.models.User || mongoose.model('User', UserSchema);