const multer = require("multer");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const uploadProfileImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return callback(new Error("Only JPG, PNG, and WEBP images are allowed"));
        }
        callback(null, true);
    }
});
module.exports = uploadProfileImage;
