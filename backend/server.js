const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

require("dotenv").config();

const express = require("express");

const http = require("http");
const { Server } = require("socket.io");

const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ChatNOVA Backend is Running!");
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Hello from ChatNOVA Backend!"
    });
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const onlineUsers = new Map();
const Message = require("./models/Message");
const User = require("./models/userModel");

io.on("connection", (socket) => {

    console.log("Socket connected:", socket.id);

    socket.on("userConnected", async (userId) => {

        try {

            socket.userId = userId;

            onlineUsers.set(userId, socket.id);

            const onlineUserList = [];

            for (const [id] of onlineUsers.entries()) {

                const onlineUser = await User.findById(id)
                    .select("_id username");

                if (onlineUser) {

                    onlineUserList.push({
                        userId: onlineUser._id,
                        username: onlineUser.username
                    });

                }
            } 

            io.emit("onlineUsers", onlineUserList);

        } catch (error) {

            console.error(
                "User connection error:",
                error
            );

        }

    });

    socket.on("sendMessage", async (data) => {
        try {
            const { receiverId, message } = data;

            if (!socket.userId) {
                return;
            }

            if (!receiverId || !message?.trim()) {
                return;
            }

            const newMessage = await Message.create({
                sender: socket.userId,
                receiver: receiverId,
                message: message.trim()
            });

            console.log("Message saved:", newMessage._id);

            const receiverSocketId = onlineUsers.get(receiverId);

            if (receiverSocketId) {

                io.to(receiverSocketId).emit(
                    "receiveMessage",
                    {
                        _id: newMessage._id,
                        senderId: socket.userId,
                        receiverId: receiverId,
                        message: newMessage.message,
                        createdAt: newMessage.createdAt
                    }
                );

            }


        } catch (error) {

            console.error(
                "Message save error:",
                error
            );

        }
    });

    socket.on(
        "callUser",
        ({
            receiverId,
            callerId,
            callType,
            offer
        }) => {

            const receiverSocketId = onlineUsers.get(receiverId);

            if (!receiverSocketId) {
                return;
            }

            io.to(receiverSocketId).emit("incomingCall", {
                callerId,
                callType,
                offer
            });

        });

    socket.on(
        "callAccepted",
        ({ callerId, answer }) => {

            const callerSocketId = onlineUsers.get(callerId);

            console.log(
                "Sending call answer to:",
                callerId
            );

            console.log(
                "Caller socket:",
                callerSocketId
            );

            if (!callerSocketId) {
                console.log(
                    "Caller socket not found"
                );
                return;
            }

            io.to(callerSocketId).emit(
                "callAnswered",
                {
                    answer
                }
            );

        }
    );

    socket.on(
        "endCall",
        ({ targetUserId }) => {

            const targetSocketId = onlineUsers.get(targetUserId);

            if (!targetSocketId) {
                return;
            }

            io.to(targetSocketId).emit(
                "callEnded"
            );

        }
    );

    socket.on(
        "iceCandidate",
        ({ targetUserId, candidate }) => {

            const targetSocketId = onlineUsers.get(targetUserId);

            if (!targetSocketId) {
                return;
            }

            io.to(targetSocketId).emit(
                "iceCandidate",
                {
                    candidate
                }
            );

        }
    );

    socket.on("hello", (message) => {

        console.log("Message from frontend:", message);

        socket.emit("helloResponse", "Hello from backend!");

    });

    socket.on("disconnect", async () => {

        try {

            for (const [userId, socketId] of onlineUsers.entries()) {

                if (socketId === socket.id) {

                    onlineUsers.delete(userId);

                    console.log(
                        "User went offline:",
                        userId
                    );

                    break;
                }
            }

            const onlineUserList = [];

            for (const [id] of onlineUsers.entries()) {

                const onlineUser = await User.findById(id)
                    .select("_id username");

                if (onlineUser) {

                    onlineUserList.push({
                        userId: onlineUser._id,
                        username: onlineUser.username
                    });

                }
            }

            io.emit(
                "onlineUsers",
                onlineUserList
            );

        } catch (error) {

            console.error(
                "Disconnect error:",
                error
            );

        }

    });

});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
});