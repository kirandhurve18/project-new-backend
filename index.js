// ✅  Load environment variables FIRST
require("dotenv").config();

const createServer = require("./app");
const { logger } = require("./shared/logger");
const dbConnect = require("./config/db");

const app = createServer();
const port = process.env.PORT || 3005;

// ❌  try/catch is NOT useful with promises → removed
dbConnect()
  .then(() => {
    logger.info("✅  Database connection successful");

    app.listen(port, "0.0.0.0", () => {
      logger.info(`🚀  Connected successfully on port ${port}`);
    });
  })
  .catch((error) => {
    // ✅  SHOW REAL ERROR (this was missing)
    logger.error("❌  Error connecting to the database");
    logger.error(error.message);
    logger.error(error); // full stack trace

    // ✅  Exit so PM2 / Node doesn't loop silently
    process.exit(1);
  });
