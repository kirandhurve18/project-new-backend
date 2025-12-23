const express = require("express");
const router = express.Router();

const mainMiddleware = require("../middlewares/main.middleware");

const hrmsController = require("../controllers/hrms.controller");

router.get(
  "/get_s3_file",
  mainMiddleware.protect,
  // mainMiddleware.authorizePermission([{ menuKey: "employee-info", actions: ["read"] }]),
  hrmsController.getDocumentsFromS3
);
router.get(
  "/server_download_file",
  // mainMiddleware.protect,
  // mainMiddleware.authorizePermission([{ menuKey: "employee-info", actions: ["read"] }]),
  hrmsController.getDocumentFromServerDownload
);
router.get(
  "/server_preview_file",
  // mainMiddleware.protect,
  // mainMiddleware.authorizePermission([{ menuKey: "employee-info", actions: ["read"] }]),
  hrmsController.getDocumentFromServerPreview
);

module.exports = router;
