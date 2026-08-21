const express = require("express");

const router = express.Router();

const {
    getUser,
    // createUser,
    searchUsers
} = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");

router.get("/", protect, getUser);
// router.post("/", protect, createUser);
router.get("/search", protect, searchUsers);

router.get("/profile", protect, async (req, res) => {
    res.json({
        success: true,
        message: "Protected profile route",
        userId: req.user.userId
    });
});

module.exports = router;