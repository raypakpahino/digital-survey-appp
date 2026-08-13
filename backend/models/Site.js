import mongoose from 'mongoose';

const SiteSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Site || mongoose.model('Site', SiteSchema);