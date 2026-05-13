const mongoose = require('mongoose');

const coordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Number }, // Unix ms
  altitude: { type: Number },
}, { _id: false });

const routeSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:         { type: String, default: 'My Route', maxlength: 100 },
    activityType: { type: String, enum: ['run', 'walk', 'cycle', 'hike'], default: 'run' },
    coordinates:  [coordinateSchema],
    distance:     { type: Number, default: 0 },  // metres
    duration:     { type: Number, default: 0 },  // seconds
    avgPace:      { type: Number, default: 0 },  // sec/km
    avgSpeed:     { type: Number, default: 0 },  // km/h
    calories:     { type: Number, default: 0 },
    elevationGain:{ type: Number, default: 0 },  // metres
    date:         { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

routeSchema.index({ user: 1, date: -1 });
module.exports = mongoose.model('Route', routeSchema);
