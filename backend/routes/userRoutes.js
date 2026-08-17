const express = require("express");

const router = express.Router();

const {
    getUser,
    createUser
} = require("../controllers/userController");

router.get("/", getUser);
router.post("/", createUser);

const protect = require("../middleware/authMiddleware");

router.get("/profile", protect, async (req, res) => {
    res.json({
        success: true,
        message: "Protected profile route",
        userId: req.user.userId
    });
});

module.exports = router;