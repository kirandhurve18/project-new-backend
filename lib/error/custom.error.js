const ERRORS = require("./errors");

class CustomError extends Error {
    constructor(
            message = ERRORS.BAD_REQUEST_PARAMETER_ERROR.message, 
            status = ERRORS.BAD_REQUEST_PARAMETER_ERROR.status,
            name = ERRORS.BAD_REQUEST_PARAMETER_ERROR.name
        ) {
        super(message);
        this.name = name;
        this.status = status;
    }
}

module.exports = CustomError;