const express = require("express");
const router = express.Router();
const {
    getUser,
    getMe,
    updateMe,
    uploadProfilePicture,
    updateMySettings,
    searchUsers
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");
const uploadProfileImage = require("../middleware/profileUpload");

router.get("/", protect, getUser);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.post("/me/avatar", protect, (req, res, next) => {
    uploadProfileImage.single("avatar")(req, res, (error) => {
        if (error) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Image must be 2 MB or smaller"
                : error.message || "Invalid image upload";
            return res.status(400).json({ success: false, message });
        }
        next();
    });
}, uploadProfilePicture);
router.put("/me/settings", protect, updateMySettings);
router.get("/search", protect, searchUsers);

router.get("/profile", protect, async (req, res) => {
    res.json({
        success: true,
        message: "Protected profile route",
        userId: req.user.userId
    });
});

module.exports = router;