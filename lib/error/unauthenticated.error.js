const ERRORS = require("./errors");

class UnauthenticatedError extends Error {
  status;
  constructor(message = ERRORS.UNAUTHENTICATED_ERROR.message) {
    super(message);
    this.name = ERRORS.UNAUTHENTICATED_ERROR.name;
    this.status = ERRORS.UNAUTHENTICATED_ERROR.status;
  }
}

module.exports = UnauthenticatedError;
