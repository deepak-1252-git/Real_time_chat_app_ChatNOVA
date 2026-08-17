const User = require("../models/userModel");

const getUser = async (req, res) => {
    try {
        const users = await User.find();

        res.json({
            success: true,
            users: users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};


const createUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const newUser = await User.create({
            username,
            email,
            password
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: newUser
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create user",
            error: error.message
        });
    }
};


module.exports = {
    getUser,
    createUser
};