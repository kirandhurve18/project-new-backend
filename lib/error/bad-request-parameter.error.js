const ERRORS = require("./errors");

class BadRequestParameterError extends Error {
  status;
  constructor(message = ERRORS.BAD_REQUEST_PARAMETER_ERROR.message) {
    super(message);
    this.name = ERRORS.BAD_REQUEST_PARAMETER_ERROR.name;
    this.status = ERRORS.BAD_REQUEST_PARAMETER_ERROR.status;
  }
}

module.exports = BadRequestParameterError;
