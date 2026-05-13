const express = require('express');
const RouteModel = require('../models/Route');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/routes
router.get('/', async (req, res) => {
  try {
    const routes = await RouteModel.find({ user: req.user._id })
      .select('-coordinates') // exclude heavy coords from list
      .sort({ date: -1 })
      .limit(20);
    res.json({ success: true, data: routes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/routes/:id — full route with coordinates
router.get('/:id', async (req, res) => {
  try {
    const route = await RouteModel.findOne({ _id: req.params.id, user: req.user._id });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/routes — save a completed GPS route
router.post('/', async (req, res) => {
  try {
    const { name, activityType, coordinates, distance, duration, avgPace, avgSpeed, calories, elevationGain } = req.body;

    const route = await RouteModel.create({
      user: req.user._id,
      name: name || `${activityType || 'Run'} — ${new Date().toLocaleDateString()}`,
      activityType: activityType || 'run',
      coordinates: coordinates || [],
      distance:     Number(distance)     || 0,
      duration:     Number(duration)     || 0,
      avgPace:      Number(avgPace)      || 0,
      avgSpeed:     Number(avgSpeed)     || 0,
      calories:     Number(calories)     || 0,
      elevationGain:Number(elevationGain)|| 0,
    });

    res.status(201).json({ success: true, data: route });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/routes/:id
router.delete('/:id', async (req, res) => {
  try {
    await RouteModel.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
