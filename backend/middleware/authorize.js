// backend/middleware/authorize.js
    module.exports = function(roles) {
      return (req, res, next) => {
        // req.user.role comes from the authMiddleware
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ msg: 'Forbidden: You do not have the required role to access this resource.' });
        }
        next();
      };
    };