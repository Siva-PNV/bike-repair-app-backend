import mongoose from 'mongoose';

const mechanicSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopName: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  address: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

mechanicSchema.index({ location: '2dsphere' });

export default mongoose.model('Mechanic', mechanicSchema);
