const express = require('express');
const Nutrition = require('../models/Nutrition');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/nutrition?date=2026-05-10&limit=30
router.get('/', async (req, res) => {
  try {
    const { limit = 50, date } = req.query;
    const filter = { user: req.user._id };

    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const meals = await Nutrition.find(filter).sort({ date: -1 }).limit(Number(limit));

    // Daily totals
    const today = new Date();
    const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(today); todayEnd.setHours(23, 59, 59, 999);

    const todayMeals = await Nutrition.find({
      user: req.user._id,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    const totals = todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein:  acc.protein  + m.protein,
        carbs:    acc.carbs    + m.carbs,
        fats:     acc.fats     + m.fats,
        fiber:    acc.fiber    + m.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );

    res.json({ success: true, data: meals, todayTotals: totals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/nutrition
router.post('/', async (req, res) => {
  try {
    const { mealName, mealType, calories, protein, carbs, fats, fiber, note, date } = req.body;
    const meal = await Nutrition.create({
      user: req.user._id,
      mealName, mealType,
      calories: Number(calories) || 0,
      protein:  Number(protein)  || 0,
      carbs:    Number(carbs)    || 0,
      fats:     Number(fats)     || 0,
      fiber:    Number(fiber)    || 0,
      note: note || '',
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json({ success: true, data: meal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/nutrition/:id
router.delete('/:id', async (req, res) => {
  try {
    const meal = await Nutrition.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!meal) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/nutrition/weekly — last 7 days macro trend
router.get('/weekly', async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const meals = await Nutrition.find({
      user: req.user._id,
      date: { $gte: weekAgo },
    }).sort({ date: 1 });

    // Group by date
    const byDate = {};
    meals.forEach((m) => {
      const key = m.date.toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      byDate[key].calories += m.calories;
      byDate[key].protein  += m.protein;
      byDate[key].carbs    += m.carbs;
      byDate[key].fats     += m.fats;
    });

    res.json({ success: true, data: byDate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
