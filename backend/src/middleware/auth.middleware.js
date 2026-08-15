const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital_mgmt_jwt_secret_key_2026';

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. Token missing.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const authenticatePatient = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Access denied. Patient privileges required.' });
    }
    next();
  });
};

const authenticateDoctor = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Access denied. Doctor privileges required.' });
    }
    next();
  });
};

module.exports = { authenticateUser, authenticatePatient, authenticateDoctor };
