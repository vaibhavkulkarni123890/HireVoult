const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const JobRole = require('../models/JobRole');

// GET /api/roles — list all for company
router.get('/', auth, async (req, res) => {
  try {
    const roles = await JobRole.find({ company: req.company._id }).sort('-createdAt');
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/roles — create new role
router.post('/', auth, async (req, res) => {
  try {
    const { title, jd, salary, experienceYears, skills, questionConfig } = req.body;
    if (!title || !jd) return res.status(400).json({ error: 'Title and JD are required' });

    // Rate Limiting: Max 2 roles per hour per company
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCount = await JobRole.countDocuments({
      company: req.company._id,
      createdAt: { $gte: oneHourAgo }
    });

    if (hourlyCount >= 2) {
      return res.status(429).json({
        error: 'Rate limit exceeded. You can create up to 2 roles per hour for this company to prevent excessive AI budget usage.'
      });
    }

    // Additional daily limit for broader protection
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyCount = await JobRole.countDocuments({
      company: req.company._id,
      createdAt: { $gte: twentyFourHoursAgo }
    });

    if (dailyCount >= 5) {
      return res.status(429).json({
        error: 'Daily generation limit reached. You can create up to 5 roles every 24 hours to ensure system stability.'
      });
    }

    const role = await JobRole.create({
      company: req.company._id,
      title, jd, salary, experienceYears, skills,
      questionConfig: questionConfig || {},
      status: 'draft'
    });
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/roles/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const role = await JobRole.findOne({ _id: req.params.id, company: req.company._id });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/roles/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const role = await JobRole.findOneAndUpdate(
      { _id: req.params.id, company: req.company._id },
      req.body,
      { new: true }
    );
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await JobRole.deleteOne({ _id: req.params.id, company: req.company._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
