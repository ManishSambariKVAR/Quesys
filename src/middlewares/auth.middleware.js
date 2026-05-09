const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

module.exports = {
  isAuthenticated,
  authenticateToken,
};
