const dotenv = require("dotenv");
const path = require("path");
const { logger } = require("../shared/logger");

const loadEnvVariables = () => {

  if (process.env.NODE_ENV == "development") {
    logger.info("Development Environment !!!");
    dotenv.config({
      path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}`),
    });
  } else if (process.env.NODE_ENV == "preprod") {
    logger.info("Preprod Environment !!!");
    dotenv.config({
      path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}`),
    });
  } else {

    dotenv.config({
      path: path.resolve(process.cwd(), `.env`),
    });
  }
};

module.exports = loadEnvVariables;
