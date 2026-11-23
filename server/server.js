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
            await refreshPresenceForUser(userKey);
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

    socket.on("toggleMessageReaction", async ({ messageId, emoji } = {}, acknowledge = () => { }) => {
        const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

        try {
            if (!messageId || !/^[a-fA-F0-9]{24}$/.test(String(messageId))) {
                return acknowledge({ success: false, message: "Invalid message" });
            }
            if (!allowedEmojis.includes(emoji)) {
                return acknowledge({ success: false, message: "Invalid reaction" });
            }

            const targetMessage = await Message.findById(messageId).select("sender receiver");
            if (!targetMessage) {
                return acknowledge({ success: false, message: "Message not found" });
            }

            const senderId = String(targetMessage.sender);
            const receiverId = String(targetMessage.receiver);
            const currentUserId = String(socket.userId);

            if (![senderId, receiverId].includes(currentUserId) ||
                !(await hasAcceptedConnection(senderId, receiverId))) {
                return acknowledge({ success: false, message: "Not authorized to react to this message" });
            }

            const existing = await Message.findOne({
                _id: messageId,
                "reactions.user": socket.userId
            }).select("reactions");

            const currentReaction = existing?.reactions?.find(
                (item) => String(item.user) === currentUserId
            );

            let updatedMessage;
            if (currentReaction?.emoji === emoji) {
                updatedMessage = await Message.findByIdAndUpdate(
                    messageId,
                    { $pull: { reactions: { user: socket.userId } } },
                    { new: true }
                ).select("_id reactions");
            } else if (currentReaction) {
                updatedMessage = await Message.findOneAndUpdate(
                    { _id: messageId, "reactions.user": socket.userId },
                    { $set: { "reactions.$.emoji": emoji } },
                    { new: true }
                ).select("_id reactions");
            } else {
                updatedMessage = await Message.findByIdAndUpdate(
                    messageId,
                    { $push: { reactions: { user: socket.userId, emoji } } },
                    { new: true }
                ).select("_id reactions");
            }

            const reactionData = {
                messageId: String(updatedMessage._id),
                reactions: updatedMessage.reactions.map((reaction) => ({
                    userId: String(reaction.user),
                    emoji: reaction.emoji
                }))
            };

            io.to(`user:${senderId}`).emit("messageReactionUpdated", reactionData);
            io.to(`user:${receiverId}`).emit("messageReactionUpdated", reactionData);
            acknowledge({ success: true, ...reactionData });
        } catch (error) {
            console.error("Message reaction error:", error);
            acknowledge({ success: false, message: "Could not update reaction" });
        }
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
                reactions: [],
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

            const lastSeen = new Date();
            await User.findByIdAndUpdate(
                userId,
                {
                    $set: { status: "offline", lastSeen }
                }
            );

            console.log(
                "User went offline:",
                userId
            );

            await sendOnlineUsers();
            await refreshPresenceForUser(userId);

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
        }).select("_id username profilePicture bio").lean();
        const visibleById = new Map(visibleOnlineUsers.map((user) => [String(user._id), {
            userId: String(user._id), username: user.username, profilePicture: user.profilePicture || "",
            bio: user.bio || "", status: "online"
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

// Notify only accepted connections about a user's current presence and privacy-filtered last seen.
const refreshPresenceForUser = async (userId) => {
    try {
        const user = await User.findById(userId)
            .select("_id status bio lastSeen preferences.showOnlineStatus preferences.showLastSeen")
            .lean();
        if (!user) return;

        const connections = await Connection.find({
            status: "accepted",
            $or: [{ requester: userId }, { recipient: userId }]
        }).select("requester recipient").lean();

        const payload = {
            userId: String(user._id),
            status: user.preferences?.showOnlineStatus === false ? "offline" : (user.status || "offline"),
            bio: user.bio || "",
            lastSeen: user.preferences?.showLastSeen === false ? null : (user.lastSeen || null)
        };

        for (const connection of connections) {
            const otherUserId = String(connection.requester) === String(userId)
                ? connection.recipient
                : connection.requester;
            io.to(`user:${String(otherUserId)}`).emit("presenceUpdated", payload);
        }
    } catch (error) {
        console.error("Refresh user presence error:", error);
    }
};

// Expose refresh functions to authenticated controllers.
app.locals.io = io;
app.locals.refreshOnlineUsers = sendOnlineUsers;
app.locals.refreshPresenceForUser = refreshPresenceForUser;
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