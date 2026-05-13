const express = require('express');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const DEFAULT_GOALS = {
  steps:     { target: 10000, unit: 'steps' },
  calories:  { target: 2000,  unit: 'kcal' },
  water:     { target: 2500,  unit: 'ml' },
  sleep:     { target: 8,     unit: 'hours' },
  weight:    { target: 70,    unit: 'kg' },
  heartRate: { target: 70,    unit: 'bpm' },
  exercise:  { target: 30,    unit: 'minutes' },
};

// @GET /api/goals
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).lean();
    const goalsMap = {};
    goals.forEach((g) => (goalsMap[g.type] = { target: g.target, unit: g.unit }));

    // Fill in defaults for missing types
    Object.keys(DEFAULT_GOALS).forEach((type) => {
      if (!goalsMap[type]) goalsMap[type] = DEFAULT_GOALS[type];
    });

    res.json({ success: true, data: goalsMap });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @PUT /api/goals/:type — upsert a goal
router.put('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { target, unit } = req.body;

    const goal = await Goal.findOneAndUpdate(
      { user: req.user._id, type },
      { target: Number(target), unit },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
