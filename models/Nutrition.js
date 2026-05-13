const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mealName: { type: String, required: true, trim: true, maxlength: 100 },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'drink'], default: 'snack' },
    calories: { type: Number, required: true, min: 0 },
    protein:  { type: Number, default: 0, min: 0 },   // grams
    carbs:    { type: Number, default: 0, min: 0 },   // grams
    fats:     { type: Number, default: 0, min: 0 },   // grams
    fiber:    { type: Number, default: 0, min: 0 },   // grams
    note:     { type: String, maxlength: 200, default: '' },
    date:     { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

nutritionSchema.index({ user: 1, date: -1 });
module.exports = mongoose.model('Nutrition', nutritionSchema);
