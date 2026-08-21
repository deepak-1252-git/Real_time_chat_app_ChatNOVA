const User = require("../models/userModel");

const getUser = async (req, res) => {
    try {

        const currentUserId = req.user.userId;

        const users = await User.find({
            _id: { $ne: currentUserId }
        })
            .select("_id username profilePicture status");

        res.json({
            success: true,
            users: users
        });

    } catch (error) {

        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
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
            .select("_id username profilePicture status")
            .limit(20);

        res.json({
            success: true,
            users
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
    createUser,
    searchUsers
};