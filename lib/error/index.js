const UnauthenticatedError = require("./unauthenticated.error");
const UnauthorisedError = require("./unauthorised.error");
const NoRecordFoundError = require("./no-record-found.error");
const BadRequestParameterError = require("./bad-request-parameter.error");

module.exports = { BadRequestParameterError, UnauthenticatedError, UnauthorisedError, NoRecordFoundError };
