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
const PORT = process.env.PORT || 5000;

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

    socket.on("activeChat", ({ userId }) => {

        socket.activeChat = userId
            ? String(userId)
            : null;

        console.log(
            "Active chat:",
            socket.userId,
            "→",
            socket.activeChat
        );

    });

    socket.on("userConnected", async (userId) => {

        try {

            socket.userId = String(userId);

            onlineUsers.set(
                String(userId),
                socket.id
            );

            await User.findByIdAndUpdate(
                userId,
                {
                    status: "online"
                }
            );

            // Get all currently online users
            const onlineUserList = [];

            for (const [id] of onlineUsers.entries()) {

                const onlineUser = await User.findById(id)
                    .select("_id username");

                if (onlineUser) {

                    onlineUserList.push({
                        userId: String(onlineUser._id),
                        username: onlineUser.username
                    });

                }

            }

            // Send personalized list to every connected user
            for (const [onlineUserId, socketId] of onlineUsers.entries()) {

                const usersForThisSocket =
                    onlineUserList.filter(
                        (onlineUser) =>
                            String(onlineUser.userId) !==
                            String(onlineUserId)
                    );

                io.to(socketId).emit(
                    "onlineUsers",
                    usersForThisSocket
                );

            }

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
            // Send message to receiver
            const receiverSocketId = onlineUsers.get(String(receiverId));

            const receiverSocket = receiverSocketId
                ? io.sockets.sockets.get(receiverSocketId)
                : null;

            const isReceiverInChat =
                receiverSocket &&
                String(receiverSocket.activeChat) ===
                String(socket.userId);

            const newMessage = await Message.create({
                sender: socket.userId,
                receiver: receiverId,
                message: message.trim(),
                isRead: Boolean(isReceiverInChat)
            });

            console.log("Message saved:", newMessage._id);

            socket.emit("messageSent", {
                _id: newMessage._id,
                senderId: socket.userId,
                receiverId: receiverId,
                message: newMessage.message,
                createdAt: newMessage.createdAt
            });

            const messageData = {
                _id: newMessage._id,
                senderId: socket.userId,
                receiverId: receiverId,
                message: newMessage.message,
                createdAt: newMessage.createdAt
            };

            if (receiverSocketId) {

                io.to(receiverSocketId).emit(
                    "receiveMessage",
                    messageData
                );

            }

            // Send message back to sender
            socket.emit(
                "messageSent",
                messageData
            );

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

            let disconnectedUserId = null;

            for (
                const [userId, socketId]
                of onlineUsers.entries()
            ) {

                if (socketId === socket.id) {

                    disconnectedUserId = userId;

                    onlineUsers.delete(userId);

                    await User.findByIdAndUpdate(
                        userId,
                        {
                            status: "offline"
                        }
                    );

                    console.log(
                        "User went offline:",
                        userId
                    );

                    break;
                }
            }

            // Get remaining online users
            const onlineUserList = [];

            for (const [id] of onlineUsers.entries()) {

                const onlineUser = await User.findById(id)
                    .select("_id username");

                if (onlineUser) {

                    onlineUserList.push({
                        userId: String(onlineUser._id),
                        username: onlineUser.username
                    });

                }

            }

            // Send personalized list to each remaining user
            for (const [onlineUserId, socketId] of onlineUsers.entries()) {

                const usersForThisSocket =
                    onlineUserList.filter(
                        (onlineUser) =>
                            String(onlineUser.userId) !==
                            String(onlineUserId)
                    );

                io.to(socketId).emit(
                    "onlineUsers",
                    usersForThisSocket
                );

            }

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