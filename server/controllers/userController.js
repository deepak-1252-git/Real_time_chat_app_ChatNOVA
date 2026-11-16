const User = require("../models/userModel");
const cloudinary = require("../config/cloudinary");

const getUser = async (req, res) => {
    try {

        const currentUserId = req.user.userId;

        const users = await User.find({
            _id: { $ne: currentUserId }
        })
            .select("_id username profilePicture status preferences.showOnlineStatus");

        res.json({
            success: true,
            users: users.map((user) => ({
                _id: user._id,
                username: user.username,
                profilePicture: user.profilePicture || "",
                status: user.preferences?.showOnlineStatus === false ? "offline" : user.status
            }))
        });

    } catch (error) {

        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("_id username email profilePicture status createdAt preferences");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            user: {
                id: String(user._id),
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture || "",
                status: user.status,
                createdAt: user.createdAt,
                preferences: user.preferences || { theme: "light", notificationSound: true, showOnlineStatus: true }
            }
        });
    } catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile"
        });
    }
};


const updateMe = async (req, res) => {
    try {
        const rawUsername = req.body?.username;
        if (typeof rawUsername !== "string") {
            return res.status(400).json({ success: false, message: "Username must be a string" });
        }

        const username = rawUsername.trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3–20 characters and contain only letters, numbers, or underscores"
            });
        }

        const currentUserId = req.user.userId;
        const duplicateUser = await User.findOne({
            username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            _id: { $ne: currentUserId }
        }).select("_id");

        if (duplicateUser) {
            return res.status(409).json({ success: false, message: "This username is already taken" });
        }

        const user = await User.findByIdAndUpdate(
            currentUserId,
            { $set: { username } },
            { returnDocument: "after", runValidators: true }
        ).select("_id username email profilePicture status createdAt preferences");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Refresh each connected user's online list so the new username appears immediately.
        if (typeof req.app.locals.refreshOnlineUsers === "function") {
            await req.app.locals.refreshOnlineUsers();
        }

        return res.json({
            success: true,
            message: "Username updated successfully",
            user: {
                id: String(user._id),
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture || "",
                status: user.status,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ success: false, message: "This username is already taken" });
        }
        console.error("Update profile error:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};

const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
            return res.status(400).json({ success: false, message: "Please choose an image to upload" });
        }

        const buffer = req.file.buffer;
        const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
        if (!isJpeg && !isPng && !isWebp) {
            return res.status(400).json({ success: false, message: "The selected file is not a valid JPG, PNG, or WEBP image" });
        }

        const configured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
        if (!configured) {
            return res.status(503).json({ success: false, message: "Cloudinary is not configured. Add its credentials to server/.env." });
        }

        const imageUrl = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                folder: "chatnova/profile-pictures",
                resource_type: "image",
                transformation: [
                    { width: 512, height: 512, crop: "limit" },
                    { quality: "auto", fetch_format: "auto" }
                ]
            }, (error, result) => error ? reject(error) : resolve(result.secure_url));
            stream.end(buffer);
        });

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: { profilePicture: imageUrl } },
            { returnDocument: "after", runValidators: true }
        ).select("_id username email profilePicture status createdAt preferences");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (typeof req.app.locals.refreshOnlineUsers === "function") {
            await req.app.locals.refreshOnlineUsers();
        }

        return res.json({
            success: true,
            message: "Profile picture updated successfully",
            user: {
                id: String(user._id), username: user.username, email: user.email,
                profilePicture: user.profilePicture || "", status: user.status, createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error("Profile picture upload error:", error);
        return res.status(500).json({ success: false, message: "Unable to upload profile picture" });
    }
};

const updateMySettings = async (req, res) => {
    try {
        const body = req.body || {};
        const updates = {};

        if (Object.prototype.hasOwnProperty.call(body, "theme")) {
            if (typeof body.theme !== "string" || !["light", "dark"].includes(body.theme.trim())) {
                return res.status(400).json({ success: false, message: "Theme must be light or dark" });
            }
            updates["preferences.theme"] = body.theme.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, "notificationSound")) {
            if (typeof body.notificationSound !== "boolean") {
                return res.status(400).json({ success: false, message: "Notification sound must be a boolean" });
            }
            updates["preferences.notificationSound"] = body.notificationSound;
        }

        if (Object.prototype.hasOwnProperty.call(body, "showOnlineStatus")) {
            if (typeof body.showOnlineStatus !== "boolean") {
                return res.status(400).json({ success: false, message: "Show online status must be a boolean" });
            }
            updates["preferences.showOnlineStatus"] = body.showOnlineStatus;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: "No valid settings were provided" });
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { returnDocument: "after", runValidators: true }
        ).select("_id preferences");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (Object.prototype.hasOwnProperty.call(updates, "preferences.showOnlineStatus") && typeof req.app.locals.refreshOnlineUsers === "function") {
            await req.app.locals.refreshOnlineUsers();
        }

        return res.json({
            success: true,
            message: "Settings updated successfully",
            preferences: user.preferences
        });
    } catch (error) {
        console.error("Update settings error:", error);
        return res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};

const createUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { username },
                { email }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        const bcrypt = require("bcryptjs");

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                status: newUser.status,
                profilePicture: newUser.profilePicture
            }
        });

    } catch (error) {

        console.error("Create user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create user"
        });
    }
};

const searchUsers = async (req, res) => {
    try {

        const { q } = req.query;

        if (!q || !q.trim()) {
            return res.json({
                success: true,
                users: []
            });
        }

        const currentUserId = req.user.userId;

        const users = await User.find({
            _id: { $ne: currentUserId },
            username: {
                $regex: q.trim(),
                $options: "i"
            }
        })
            .select("_id username profilePicture status preferences.showOnlineStatus")
            .limit(20);

        res.json({
            success: true,
            users: users.map((user) => ({
                _id: user._id,
                username: user.username,
                profilePicture: user.profilePicture || "",
                status: user.preferences?.showOnlineStatus === false ? "offline" : user.status
            }))
        });

    } catch (error) {

        console.error("User search error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to search users"
        });

    }
};
module.exports = {
    getUser,
    getMe,
    updateMe,
    uploadProfilePicture,
    updateMySettings,
    createUser,
    searchUsers
};