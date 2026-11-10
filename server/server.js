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

            const userKey = String(userId);

            socket.userId = userKey;

            if (!onlineUsers.has(userKey)) {

                onlineUsers.set(
                    userKey,
                    new Set()
                );

            }

            onlineUsers
                .get(userKey)
                .add(socket.id);


            await User.findByIdAndUpdate(
                userId,
                {
                    status: "online"
                }
            );

            await sendOnlineUsers();

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

            const receiverIdString = String(receiverId);

            const receiverSocketIds = onlineUsers.get(receiverIdString);

            let isReceiverInChat = false;

            if (
                receiverSocketIds &&
                receiverSocketIds.size > 0
            ) {

                for (
                    const socketId
                    of receiverSocketIds
                ) {

                    const receiverSocket =
                        io.sockets.sockets.get(
                            socketId
                        );

                    if (
                        receiverSocket &&
                        String(
                            receiverSocket.activeChat
                        ) ===
                        String(socket.userId)
                    ) {

                        isReceiverInChat = true;
                        break;

                    }

                }

            }

            const newMessage =
                await Message.create({
                    sender: socket.userId,
                    receiver: receiverId,
                    message: message.trim(),
                    isRead: isReceiverInChat

                });

            const messageData = {
                _id: newMessage._id,
                senderId: socket.userId,
                receiverId: receiverId,
                message: newMessage.message,
                createdAt: newMessage.createdAt
            };

            // Send to sender
            socket.emit(
                "messageSent",
                messageData
            );

            // Send to ALL sockets of receiver
            if (
                receiverSocketIds &&
                receiverSocketIds.size > 0
            ) {

                for (
                    const socketId
                    of receiverSocketIds
                ) {

                    io.to(socketId).emit(
                        "receiveMessage",
                        messageData
                    );
                }

            } else {

                console.log(
                    "❌ Receiver is NOT online"
                );

            }

        } catch (error) {

            console.error(
                "Message save error:",
                error
            );

        }

    });
    // --------------------------------
    // socket.on(
    //     "callUser",
    //     ({
    //         receiverId,
    //         callerId,
    //         callType,
    //         offer
    //     }) => {

    //         const receiverSockets = onlineUsers.get(String(receiverId));

    //         console.log("📞 CALL REQUEST:", {
    //             receiverId,
    //             receiverSockets
    //         });

    //         if (!receiverSockets || receiverSockets.size === 0) {

    //             console.log(
    //                 "❌ Receiver socket not found:",
    //             );

    //             return;
    //         }

    //         console.log(
    //             "📞 Sending incoming call to:",
    //             receiverSockets
    //         );

    //         for (const socketId of receiverSockets) {

    //             io.to(socketId).emit(
    //                 "incomingCall",
    //                 {
    //                     callerId,
    //                     callType,
    //                     offer
    //                 }
    //             );

    //         }

    //     });

    // socket.on(
    //     "callAccepted",
    //     ({ callerId, answer }) => {

    //         const callerSocketId = onlineUsers.get(callerId);

    //         console.log(
    //             "Sending call answer to:",
    //             callerId
    //         );

    //         console.log(
    //             "Caller socket:",
    //             callerSocketId
    //         );

    //         if (!callerSocketId) {
    //             console.log(
    //                 "Caller socket not found"
    //             );
    //             return;
    //         }

    //         io.to(callerSocketId).emit(
    //             "callAnswered",
    //             {
    //                 answer
    //             }
    //         );

    //     }
    // );

    // socket.on(
    //     "endCall",
    //     ({ targetUserId }) => {

    //         const targetSocketId = onlineUsers.get(targetUserId);

    //         if (!targetSocketId) {
    //             return;
    //         }

    //         io.to(targetSocketId).emit(
    //             "callEnded"
    //         );

    //     }
    // );

    // socket.on(
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
    // );
    // /----------------------------

    socket.on(
        "callUser",
        ({
            receiverId,
            callerId,
            callType,
            offer
        }) => {

            const receiverSockets =
                onlineUsers.get(String(receiverId));

            console.log("📞 CALL REQUEST:", {
                receiverId: String(receiverId),
                callerId: String(callerId),
                callType,
                receiverSockets
            });

            if (!receiverSockets || receiverSockets.size === 0) {
                console.log(
                    "❌ Receiver socket not found:",
                    receiverId
                );
                return;
            }

            console.log(
                "📞 Sending incoming call to:",
                receiverSockets
            );

            for (const socketId of receiverSockets) {

                io.to(socketId).emit(
                    "incomingCall",
                    {
                        callerId: String(callerId),
                        callType,
                        offer
                    }
                );

            }
        }
    );

    socket.on(
        "callAccepted",
        ({ callerId, answer }) => {

            const callerSockets =
                onlineUsers.get(String(callerId));

            console.log(
                "📞 CALL ACCEPTED:",
                {
                    callerId: String(callerId),
                    callerSockets
                }
            );

            if (!callerSockets || callerSockets.size === 0) {
                console.log(
                    "❌ Caller socket not found:",
                    callerId
                );
                return;
            }

            for (const socketId of callerSockets) {

                io.to(socketId).emit(
                    "callAnswered",
                    {
                        answer
                    }
                );

            }

            console.log(
                "✅ Call answer sent to caller"
            );
        }
    );

    socket.on(
        "endCall",
        ({ targetUserId }) => {

            const targetId = String(targetUserId);

            const targetSockets =
                onlineUsers.get(targetId);

            console.log(
                "📴 END CALL:",
                {
                    targetUserId: targetId,
                    targetSockets
                }
            );

            if (!targetSockets || targetSockets.size === 0) {
                console.log(
                    "❌ Target socket not found:",
                    targetId
                );
                return;
            }

            for (const socketId of targetSockets) {

                io.to(socketId).emit(
                    "callEnded"
                );

            }

            console.log(
                "✅ callEnded sent to target"
            );
        }
    );

    socket.on(
        "iceCandidate",
        ({ targetUserId, candidate }) => {

            const targetId = String(targetUserId);

            const targetSockets =
                onlineUsers.get(targetId);

            if (!targetSockets || targetSockets.size === 0) {
                return;
            }

            for (const socketId of targetSockets) {

                io.to(socketId).emit(
                    "iceCandidate",
                    {
                        candidate
                    }
                );

            }
        }
    );
    // ----------------------------

    socket.on("hello", (message) => {

        console.log("Message from frontend:", message);

        socket.emit("helloResponse", "Hello from backend!");

    });

    socket.on("disconnect", async () => {

        try {

            const userId = socket.userId;

            if (!userId) {
                return;
            }

            const socketSet =
                onlineUsers.get(userId);

            if (!socketSet) {
                return;
            }

            socketSet.delete(socket.id);

            // User still has another active connection
            if (socketSet.size > 0) {

                console.log(
                    "User still online:",
                    userId
                );

                await sendOnlineUsers();

                return;
            }

            // No active sockets remaining
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

            await sendOnlineUsers();

        } catch (error) {

            console.error(
                "Disconnect error:",
                error
            );

        }

    });


});

const sendOnlineUsers = async () => {

    try {

        const onlineUserIds = [
            ...onlineUsers.keys()
        ];

        const onlineUsersData = await User.find({
            _id: {
                $in: onlineUserIds
            }
        }).select("_id username");

        const onlineUserList =
            onlineUsersData.map((user) => ({
                userId: String(user._id),
                username: user.username
            }));

        for (
            const [onlineUserId, socketIds]
            of onlineUsers.entries()
        ) {

            const usersForThisSocket =
                onlineUserList.filter(
                    (onlineUser) =>
                        String(onlineUser.userId) !==
                        String(onlineUserId)
                );

            for (const socketId of socketIds) {

                io.to(socketId).emit(
                    "onlineUsers",
                    usersForThisSocket
                );

            }

        }

    } catch (error) {

        console.error(
            "Send online users error:",
            error
        );

    }

};

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
});