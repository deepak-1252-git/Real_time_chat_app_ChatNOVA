const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        profilePicture: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            default: "offline"
        },

        preferences: {
            theme: { type: String, enum: ["light", "dark"], default: "light" },
            notificationSound: { type: Boolean, default: true },
            showOnlineStatus: { type: Boolean, default: true }
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;