const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, country, website } = req.body;
    if (!name || !email || !password || !country)
      return res.status(400).json({ error: 'Name, email, password, and country are required' });

    const existing = await Company.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const company = await Company.create({ name, email, password, country, website });
    const token = signToken(company._id);
    res.status(201).json({ token, company: { id: company._id, name: company.name, email: company.email, country: company.country, plan: company.plan, freeAssessmentsUsed: company.freeAssessmentsUsed } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const company = await Company.findOne({ email });
    if (!company || !(await company.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(company._id);
    res.json({ token, company: { id: company._id, name: company.name, email: company.email, country: company.country, plan: company.plan, freeAssessmentsUsed: company.freeAssessmentsUsed } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({ company: req.company });
});

module.exports = router;
