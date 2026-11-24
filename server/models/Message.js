const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

           isDelivered: {
            type: Boolean,
            default: false
        },

        deliveredAt: {
            type: Date,
            default: null
        },

        isRead: {
            type: Boolean,
            default: false
        },

        reactions: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            emoji: {
                type: String,
                required: true,
                enum: ["👍", "❤️", "😂", "😮", "😢", "🔥"]
            }
        }]
    },
    {
        timestamps: true
    }
);

messageSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 86400 }
);

module.exports = mongoose.model("Message", messageSchema);