const { validationResult } = require('express-validator');

// Middleware to handle validation errors from express-validator
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log the validation errors
    // Consider using the logger instance from index.js if needed globally
    console.error('Validation Errors:', errors.array());

    // Format errors for the response
    const extractedErrors = errors.array().map(err => ({
        field: err.param, // Use 'param' instead of 'path' for consistency
        message: err.msg,
        value: err.value, // Optionally include the invalid value
    }));

    // Return a 422 Unprocessable Entity status code with error details
    return res.status(422).json({
      error: true,
      message: 'Input validation failed',
      details: extractedErrors,
    });
  }
  // If no errors, proceed to the next middleware or route handler
  next();
};

module.exports = {
  handleValidationErrors,
};