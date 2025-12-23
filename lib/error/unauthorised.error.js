const ERRORS = require("./errors");

class UnauthorisedError extends Error {
  status;
  constructor(message = ERRORS.UNAUTHORISED_ERROR.message) {
    super(message);
    this.name = ERRORS.UNAUTHORISED_ERROR.name;
    this.status = ERRORS.UNAUTHORISED_ERROR.status;
  }
}

module.exports = UnauthorisedError;
