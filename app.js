const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const loadEnvVariables = require("./utils/envHelper");
const errorHandler = require("./middlewares/errorHandler.middleware");
const routes = require("./routes");

const createServer = () => {
  const app = express();

  // initialize environment variables
  loadEnvVariables();
  // initializeFirebase();

  // Body parsing Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(bodyParser.json());
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cors());

  // // Serve Angular static files
  // const angularDistPath = path.join(__dirname, "dist/hrms/browser");
  // app.use(express.static(angularDistPath));

  //Routes
  if (process.env.NODE_ENV == "development") {
    app.use("/api/v1", routes);
    app.use("/api/hrms", routes);
  } else if (process.env.NODE_ENV == "preprod") {
    app.use("/api/hrms", routes);
  } else {
    app.use("/api/hrms", routes);
  }

  app.use("/images", express.static("images"));
  app.use("/uploads", express.static("uploads"));
  app.use("/public", express.static("uploads"));

  // Angular fallback (after APIs)
  // app.get("*", (req, res) => {
  //   res.sendFile(path.join(angularDistPath, "index.html"));
  // });

  // eslint-disable-next-line no-unused-vars
  app.get("/", async (_req, res) => {
    return res.status(200).send({
      success: true,
      message: "The HRMS service is running",
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.get("/health", async (_req, res) => {
    return res.status(200).send({
      success: true,
      message: "The server is running",
    });
  });

  // global error handler (must be last)
  app.use(errorHandler);

  return app;
};

module.exports = createServer;
