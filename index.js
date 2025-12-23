const createServer = require("./app");
const { logger } = require("./shared/logger");
const dbConnect = require("./config/db");
const app = createServer();

const port = process.env.PORT || 3000;
try {
  //Setup connection to the database
  dbConnect()
    .then(() => {
      logger.info("Database connection successful");

      app.listen(port, () => {
        logger.info(`Connected successfully on port ${port}`);
      });
    })
    .catch((error) => {
      logger.info("Error connecting to the database", error);
      return;
    });
} catch (error) {
  logger.error(`Error occured: ${error.message}`);
}
