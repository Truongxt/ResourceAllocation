const { validationResult } = require('express-validator');

/**
 * Middleware: Validate request using express-validator results
 * Place after validation rules, before controller
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    
    return res.status(400).json({
      success: false,
      message: messages[0], // Return first error message
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  
  next();
};

module.exports = { validate };
