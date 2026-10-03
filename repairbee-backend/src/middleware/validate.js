const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

/**
 * Middleware: Run express-validator checks and return errors if any.
 * Use after validator arrays in route definitions.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    throw ApiError.badRequest('Validation failed', formattedErrors);
  }
  next();
}

module.exports = { validate };
