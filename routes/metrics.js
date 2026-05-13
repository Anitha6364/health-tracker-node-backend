const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Metric = require('../models/Metric');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const UNITS = {
  steps: 'steps',
  calories: 'kcal',
  water: 'ml',
  sleep: 'hours',
  weight: 'kg',
  heartRate: 'bpm',
  exercise: 'minutes',
};

// @GET /api/metrics/:type — get paginated entries
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 30, page = 1, startDate, endDate } = req.query;

    const filter = { user: req.user._id, type };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const metrics = await Metric.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Metric.countDocuments(filter);

    res.json({ success: true, data: metrics, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @POST /api/metrics/:type — log a new entry
router.post(
  '/:type',
  [body('value').isNumeric().withMessage('Value must be a number')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { type } = req.params;
    const { value, note, date } = req.body;

    try {
      const metric = await Metric.create({
        user: req.user._id,
        type,
        value: Number(value),
        unit: UNITS[type] || 'units',
        note: note || '',
        date: date ? new Date(date) : new Date(),
      });

      res.status(201).json({ success: true, data: metric });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  }
);

// @PUT /api/metrics/:id — update a metric entry
router.put('/:id', async (req, res) => {
  try {
    const metric = await Metric.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { value: req.body.value, note: req.body.note },
      { new: true }
    );
    if (!metric) return res.status(404).json({ success: false, message: 'Metric not found' });
    res.json({ success: true, data: metric });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @DELETE /api/metrics/:id — delete a metric entry
router.delete('/:id', async (req, res) => {
  try {
    const metric = await Metric.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!metric) return res.status(404).json({ success: false, message: 'Metric not found' });
    res.json({ success: true, message: 'Metric deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
