const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

require("dotenv").config();

const express = require("express");

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const connectionRoutes = require("./routes/connectionRoutes");

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
app.use("/api/connections", connectionRoutes);

const onlineUsers = new Map();
const Message = require("./models/Message");
const User = require("./models/userModel");
const Connection = require("./models/Connection");

const hasAcceptedConnection = async (userA, userB) => {
    if (!userA || !userB || String(userA) === String(userB)) return false;
    const pairKey = Connection.makePairKey(userA, userB);
    return Boolean(await Connection.exists({ pairKey, status: "accepted" }));
};

const rejectSocketAction = (socket, message = "You must be connected to perform this action") => {
    socket.emit("actionRejected", { message });
};

// Authenticate every socket during the handshake. Never trust a userId sent by the browser.
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Authentication required"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("_id");
        if (!user) return next(new Error("User account not found"));
        socket.userId = String(user._id);
        next();
    } catch (error) {
        next(new Error("Invalid or expired socket token"));
    }
});

io.on("connection", (socket) => {

    console.log("Authenticated socket connected:", socket.id, "user:", socket.userId);
    socket.join(`user:${socket.userId}`);

    // Register the authenticated identity immediately; clients cannot choose this ID.
    (async () => {
        try {
            const userKey = String(socket.userId);
            if (!onlineUsers.has(userKey)) onlineUsers.set(userKey, new Set());
            onlineUsers.get(userKey).add(socket.id);
            await User.findByIdAndUpdate(userKey, { status: "online" });
            await sendOnlineUsers();
        } catch (error) {
            console.error("Socket presence registration error:", error);
        }
    })();

    // ------------------new--------------------------

    socket.on("typing", async ({ recipientId } = {}) => {
        try {
            if (!(await hasAcceptedConnection(socket.userId, recipientId))) return rejectSocketAction(socket);
            io.to(`user:${String(recipientId)}`).emit("user-typing", { senderId: socket.userId });
        } catch (error) { console.error("Typing authorization error:", error); }
    });

    socket.on("stop-typing", async ({ recipientId } = {}) => {
        try {
            if (!(await hasAcceptedConnection(socket.userId, recipientId))) return rejectSocketAction(socket);
            io.to(`user:${String(recipientId)}`).emit("user-stop-typing", { senderId: socket.userId });
        } catch (error) { console.error("Stop typing authorization error:", error); }
    });

    socket.on("mark-messages-read", async ({ senderId } = {}) => {
        try {
            if (!(await hasAcceptedConnection(socket.userId, senderId))) return rejectSocketAction(socket);
            await Message.updateMany(
                { sender: senderId, receiver: socket.userId, isRead: false },
                { $set: { isRead: true } }
            );
            io.to(`user:${String(senderId)}`).emit("messages-read", { readerId: socket.userId });
        } catch (error) { console.error("Mark messages read socket error:", error); }
    });

    // -----------------------------------------------------
    socket.on("activeChat", async ({ userId } = {}) => {
        if (userId && !(await hasAcceptedConnection(socket.userId, userId))) {
            socket.activeChat = null;
            return rejectSocketAction(socket);
        }
        socket.activeChat = userId ? String(userId) : null;

        console.log(
            "Active chat:",
            socket.userId,
            "→",
            socket.activeChat
        );

    });

    // Identity is established by io.use() above. Ignore legacy userConnected events.

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
            if (!(await hasAcceptedConnection(socket.userId, receiverIdString))) {
                return rejectSocketAction(socket, "Connect with this user before sending messages");
            }

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
                isRead: newMessage.isRead,
                createdAt: newMessage.createdAt
            };

            // Send to sender
            socket.emit("messageSent", messageData);

            if (newMessage.isRead) {
                const senderSockets = onlineUsers.get(
                    String(socket.userId)
                );

                if (senderSockets) {
                    for (const socketId of senderSockets) {
                        io.to(socketId).emit("messages-read", {
                            readerId: receiverIdString
                        });
                    }
                }
            }

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

    // /----------------------------

    socket.on(
        "callUser",
        async ({
            receiverId,
            callType,
            offer
        } = {}) => {
            if (!(await hasAcceptedConnection(socket.userId, receiverId))) {
                return rejectSocketAction(socket, "Connect with this user before calling");
            }
            const callerId = socket.userId;
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

    socket.on("callAccepted", async ({ callerId, answer } = {}) => {
        if (!(await hasAcceptedConnection(socket.userId, callerId))) return rejectSocketAction(socket);
        io.to(`user:${String(callerId)}`).emit("callAnswered", { answer });
    });

    socket.on("endCall", async ({ targetUserId } = {}) => {
        if (!(await hasAcceptedConnection(socket.userId, targetUserId))) return rejectSocketAction(socket);
        io.to(`user:${String(targetUserId)}`).emit("callEnded");
    });

    socket.on("iceCandidate", async ({ targetUserId, candidate } = {}) => {
        if (!(await hasAcceptedConnection(socket.userId, targetUserId))) return rejectSocketAction(socket);
        io.to(`user:${String(targetUserId)}`).emit("iceCandidate", { candidate });
    });

    // -------restart offer--------restart answer---------

    socket.on("iceRestartOffer", async ({ targetUserId, offer } = {}) => {
        if (!(await hasAcceptedConnection(socket.userId, targetUserId))) return rejectSocketAction(socket);
        io.to(`user:${String(targetUserId)}`).emit("iceRestartOffer", { callerId: socket.userId, offer });
    });

    socket.on("iceRestartAnswer", async ({ targetUserId, answer } = {}) => {
        if (!(await hasAcceptedConnection(socket.userId, targetUserId))) return rejectSocketAction(socket);
        io.to(`user:${String(targetUserId)}`).emit("iceRestartAnswer", { answer });
    });

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
        const onlineUserIds = [...onlineUsers.keys()];
        const visibleOnlineUsers = await User.find({
            _id: { $in: onlineUserIds },
            "preferences.showOnlineStatus": { $ne: false }
        }).select("_id username profilePicture").lean();
        const visibleById = new Map(visibleOnlineUsers.map((user) => [String(user._id), {
            userId: String(user._id), username: user.username, profilePicture: user.profilePicture || "", status: "online"
        }]));

        for (const [currentUserId, socketIds] of onlineUsers.entries()) {
            const accepted = await Connection.find({
                status: "accepted",
                $or: [{ requester: currentUserId }, { recipient: currentUserId }]
            }).select("requester recipient").lean();
            const connectedOnlineUsers = accepted.map((connection) =>
                String(connection.requester) === currentUserId ? String(connection.recipient) : String(connection.requester)
            ).map((id) => visibleById.get(id)).filter(Boolean);

            for (const socketId of socketIds) io.to(socketId).emit("onlineUsers", connectedOnlineUsers);
        }
    } catch (error) {
        console.error("Send online users error:", error);
    }
};

// Expose the online-list refresh function to authenticated controllers.
app.locals.io = io;
app.locals.refreshOnlineUsers = sendOnlineUsers;
app.locals.disconnectUserSockets = async (userId) => {
    const userKey = String(userId);
    const socketIds = onlineUsers.get(userKey);

    if (socketIds) {
        // Remove the map entry first so disconnect handlers cannot mark a deleted user offline.
        onlineUsers.delete(userKey);
        for (const socketId of socketIds) {
            const userSocket = io.sockets.sockets.get(socketId);
            if (userSocket) {
                userSocket.userId = null;
                userSocket.disconnect(true);
            }
        }
    }

    await sendOnlineUsers();
};

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
});