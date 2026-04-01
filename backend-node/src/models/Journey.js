import mongoose from 'mongoose';

const letterSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, default: '' },
  theme: { type: String, default: '' },
  content: { type: String, default: '' },
  spotifyUrl: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
});

const journeySchema = new mongoose.Schema(
  {
    creatorName: { type: String, required: true },
    viewerName: { type: String, required: true },
    creatorKey: { type: String, required: true },
    password: { type: String, default: '' },
    shareId: { type: String, unique: true, required: true },
    backgroundMusicUrl: { type: String, default: '' },
    isPublished: { type: Boolean, default: false },
    letters: { type: [letterSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Journey', journeySchema);
