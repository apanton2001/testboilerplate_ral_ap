/**
 * Role-based authorization middleware
 * Checks if the authenticated user has the required role(s)
 * 
 * @param {string|string[]} roles - Required role(s) to access the route
 * @returns {function} Middleware function
 */
const roleAuth = (roles) => {
  // Convert single role to array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // Auth middleware should be used before this middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user has any of the required roles
    const hasRole = req.user.roles.some(role => roles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        message: 'Access denied: Insufficient permissions',
        requiredRoles: roles,
        userRoles: req.user.roles
      });
    }

    next();
  };
};

module.exports = roleAuth;