const express = require('express');
const Metric = require('../models/Metric');
const Nutrition = require('../models/Nutrition');
const Mood = require('../models/Mood');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

function toCSV(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

// GET /api/export/metrics.csv
router.get('/metrics.csv', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { user: req.user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }
    const metrics = await Metric.find(filter).sort({ date: -1 }).limit(1000);
    const csv = toCSV(
      ['Date', 'Type', 'Value', 'Unit', 'Note'],
      metrics.map((m) => [m.date.toISOString(), m.type, m.value, m.unit, m.note])
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="health-metrics.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/export/nutrition.csv
router.get('/nutrition.csv', async (req, res) => {
  try {
    const meals = await Nutrition.find({ user: req.user._id }).sort({ date: -1 }).limit(500);
    const csv = toCSV(
      ['Date', 'Meal', 'Type', 'Calories', 'Protein(g)', 'Carbs(g)', 'Fats(g)', 'Fiber(g)', 'Note'],
      meals.map((m) => [m.date.toISOString(), m.mealName, m.mealType, m.calories, m.protein, m.carbs, m.fats, m.fiber, m.note])
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nutrition.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/export/mood.csv
router.get('/mood.csv', async (req, res) => {
  try {
    const entries = await Mood.find({ user: req.user._id }).sort({ date: -1 }).limit(500);
    const csv = toCSV(
      ['Date', 'Emotion', 'Stress Score', 'Energy', 'Tags', 'Note'],
      entries.map((m) => [m.date.toISOString(), m.emotion, m.score, m.energy, (m.tags || []).join(';'), m.note])
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mood.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/export/full.csv — everything in one file
router.get('/full.csv', async (req, res) => {
  try {
    const [metrics, meals, moods] = await Promise.all([
      Metric.find({ user: req.user._id }).sort({ date: -1 }).limit(1000),
      Nutrition.find({ user: req.user._id }).sort({ date: -1 }).limit(500),
      Mood.find({ user: req.user._id }).sort({ date: -1 }).limit(500),
    ]);

    let csv = '=== HEALTH METRICS ===\n';
    csv += toCSV(['Date', 'Type', 'Value', 'Unit', 'Note'],
      metrics.map((m) => [m.date.toISOString(), m.type, m.value, m.unit, m.note]));
    csv += '\n\n=== NUTRITION ===\n';
    csv += toCSV(['Date', 'Meal', 'Type', 'Calories', 'Protein(g)', 'Carbs(g)', 'Fats(g)'],
      meals.map((m) => [m.date.toISOString(), m.mealName, m.mealType, m.calories, m.protein, m.carbs, m.fats]));
    csv += '\n\n=== MOOD & STRESS ===\n';
    csv += toCSV(['Date', 'Emotion', 'Stress Score', 'Energy', 'Note'],
      moods.map((m) => [m.date.toISOString(), m.emotion, m.score, m.energy, m.note]));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="healthtracker-full-export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
