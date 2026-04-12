const jwt = require('jsonwebtoken');
const Company = require('../models/Company');

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const company = await Company.findById(decoded.id).select('-password');
    if (!company) return res.status(401).json({ error: 'Company not found' });
    req.company = company;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
