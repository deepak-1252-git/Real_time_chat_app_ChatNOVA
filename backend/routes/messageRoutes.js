const mongoose = require("mongoose");
const express = require("express");
const Message = require("../models/Message");
const protect = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/:userId", protect, async (req, res) => {

    try {

        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const currentUserId = req.user.userId;

        const messages = await Message.find({
            $or: [
                {
                    sender: currentUserId,
                    receiver: userId
                },
                {
                    sender: userId,
                    receiver: currentUserId
                }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(50);
        messages.reverse();

        const formattedMessages = messages.map((msg) => ({
            _id: msg._id,
            senderId: msg.sender,
            receiverId: msg.receiver,
            message: msg.message,
            createdAt: msg.createdAt
        }));

        res.json({
            success: true,
            messages: formattedMessages
        });

    } catch (error) {

        console.error("Message history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load messages"
        });

    }

});

module.exports = router;