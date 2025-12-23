const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// ✅ Upload File Locally
async function uploadToServer(file, folder = "uploads/public/all") {
  try {
    // Ensure the folder exists
    const uploadPath = path.join(__dirname, "..", folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Generate unique filename
    const fileName = `${uuidv4()}_${file.originalname}`;
    const filePath = path.join(uploadPath, fileName);

    // Write file buffer to disk
    fs.writeFileSync(filePath, file.buffer);

    // Return relative path to store in DB
    return `${folder}/${fileName}`;
  } catch (e) {
    console.error("Local Upload Error:", e);
    return "";
  }
}

module.exports = {
  uploadToServer,
};
