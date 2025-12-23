// middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  // console.error("Error caught:", err);

  const status = err.status || 500;
  const name = err.name || "INTERNAL_SERVER_ERROR";
  const message = err.message || "Something went wrong";

  res.status(status).json({
    success: false,
    status,
    name,
    message,
  });
}

module.exports = errorHandler;
