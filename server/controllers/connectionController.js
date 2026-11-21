const mongoose = require("mongoose");
const User = require("../models/userModel");
const Connection = require("../models/Connection");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatUser = (user, relation = "none", currentUserId) => ({
    userId: String(user._id),
    username: user.username,
    profilePicture: user.profilePicture || "",
    status: user.preferences?.showOnlineStatus === false ? "offline" : (user.status || "offline"),
    relation
});

const emitToUser = (req, userId, event, payload) => {
    req.app.locals.io?.to(`user:${String(userId)}`).emit(event, payload);
};
const refreshPresence = (req) => req.app.locals.refreshOnlineUsers?.();

const discoverUsers = async (req, res) => {
    try {
        const currentUserId = String(req.user.userId);
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
        const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
        const filter = { _id: { $ne: currentUserId } };
        if (q) filter.username = { $regex: escapeRegex(q), $options: "i" };

        const [users, total] = await Promise.all([
            User.find(filter).select("_id username profilePicture status preferences.showOnlineStatus")
                .sort({ username: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            User.countDocuments(filter)
        ]);

        const ids = users.map((user) => user._id);
        const connections = ids.length ? await Connection.find({
            pairKey: { $in: ids.map((id) => Connection.makePairKey(currentUserId, id)) }
        }).select("requester recipient status pairKey").lean() : [];
        const byPair = new Map(connections.map((connection) => [connection.pairKey, connection]));

        return res.json({
            success: true,
            users: users.map((user) => {
                const connection = byPair.get(Connection.makePairKey(currentUserId, user._id));
                let relation = "none";
                if (connection?.status === "accepted") relation = "connected";
                else if (connection?.status === "pending") {
                    relation = String(connection.requester) === currentUserId ? "request_sent" : "request_received";
                }
                return formatUser(user, relation);
            }),
            pagination: { page, limit, total, hasMore: page * limit < total }
        });
    } catch (error) {
        console.error("Discover users error:", error);
        return res.status(500).json({ success: false, message: "Failed to discover users" });
    }
};

const sendRequest = async (req, res) => {
    try {
        const requesterId = String(req.user.userId);
        const recipientId = String(req.params.userId);
        if (!isValidId(recipientId)) return res.status(400).json({ success: false, message: "Invalid user ID" });
        if (requesterId === recipientId) return res.status(400).json({ success: false, message: "You cannot connect with yourself" });
        const recipient = await User.findById(recipientId).select("_id");
        if (!recipient) return res.status(404).json({ success: false, message: "User not found" });

        const pairKey = Connection.makePairKey(requesterId, recipientId);
        const existing = await Connection.findOne({ pairKey });
        if (existing?.status === "accepted") return res.status(409).json({ success: false, message: "You are already connected" });
        if (existing?.status === "pending") {
            if (String(existing.requester) === recipientId) {
                existing.status = "accepted";
                await existing.save();
                const payload = { connectionId: String(existing._id), userId: requesterId, acceptedBy: requesterId };
                emitToUser(req, requesterId, "connectionAccepted", payload);
                emitToUser(req, recipientId, "connectionAccepted", { ...payload, userId: recipientId });
                await refreshPresence(req);
                return res.json({ success: true, message: "Connection request accepted", connection: { id: String(existing._id), status: "accepted" }, autoAccepted: true });
            }
            return res.status(409).json({ success: false, message: "Connection request already sent" });
        }

        const pendingCount = await Connection.countDocuments({ requester: requesterId, status: "pending" });
        if (pendingCount >= 50) return res.status(429).json({ success: false, message: "You have reached the limit of 50 pending requests" });

        try {
            const connection = await Connection.create({ requester: requesterId, recipient: recipientId, pairKey, status: "pending" });
            emitToUser(req, recipientId, "connectionRequestReceived", { connectionId: String(connection._id), requesterId });
            return res.status(201).json({ success: true, message: "Connection request sent", connection: { id: String(connection._id), status: connection.status } });
        } catch (error) {
            if (error?.code === 11000) {
                const raced = await Connection.findOne({ pairKey });
                if (raced?.status === "pending" && String(raced.requester) === recipientId) {
                    raced.status = "accepted";
                    await raced.save();
                    emitToUser(req, requesterId, "connectionAccepted", { connectionId: String(raced._id), userId: requesterId });
                    emitToUser(req, recipientId, "connectionAccepted", { connectionId: String(raced._id), userId: recipientId });
                    await refreshPresence(req);
                    return res.json({ success: true, message: "Connection request accepted", connection: { id: String(raced._id), status: "accepted" }, autoAccepted: true });
                }
                return res.status(409).json({ success: false, message: "A connection request already exists" });
            }
            throw error;
        }
    } catch (error) {
        console.error("Send connection request error:", error);
        return res.status(500).json({ success: false, message: "Failed to send connection request" });
    }
};

const acceptRequest = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid connection ID" });
        const connection = await Connection.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.userId, status: "pending" },
            { $set: { status: "accepted" } }, { new: true }
        );
        if (!connection) return res.status(404).json({ success: false, message: "Pending request not found" });
        emitToUser(req, connection.requester, "connectionAccepted", { connectionId: String(connection._id), userId: String(connection.recipient) });
        emitToUser(req, connection.recipient, "connectionAccepted", { connectionId: String(connection._id), userId: String(connection.requester) });
        await refreshPresence(req);
        return res.json({ success: true, message: "Connection request accepted", connection: { id: String(connection._id), status: connection.status } });
    } catch (error) {
        console.error("Accept connection error:", error);
        return res.status(500).json({ success: false, message: "Failed to accept connection request" });
    }
};

const rejectRequest = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid connection ID" });
        const deleted = await Connection.findOneAndDelete({ _id: req.params.id, recipient: req.user.userId, status: "pending" });
        if (!deleted) return res.status(404).json({ success: false, message: "Incoming request not found" });
        emitToUser(req, deleted.requester, "connectionRemoved", { connectionId: String(deleted._id), userId: String(deleted.recipient), reason: "rejected" });
        return res.json({ success: true, message: "Connection request rejected" });
    } catch (error) {
        console.error("Reject connection error:", error);
        return res.status(500).json({ success: false, message: "Failed to reject connection request" });
    }
};

const removeConnection = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid connection ID" });
        const deleted = await Connection.findOneAndDelete({
            _id: req.params.id,
            $or: [{ requester: req.user.userId }, { recipient: req.user.userId }]
        });
        if (!deleted) return res.status(404).json({ success: false, message: "Connection not found" });
        const currentUserId = String(req.user.userId);
        const otherUserId = String(deleted.requester) === currentUserId ? String(deleted.recipient) : String(deleted.requester);
        const payload = { connectionId: String(deleted._id), reason: "removed" };
        emitToUser(req, currentUserId, "connectionRemoved", { ...payload, userId: otherUserId });
        emitToUser(req, otherUserId, "connectionRemoved", { ...payload, userId: currentUserId });
        await refreshPresence(req);
        return res.json({ success: true, message: "Connection removed" });
    } catch (error) {
        console.error("Remove connection error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove connection" });
    }
};

const getConnections = async (req, res) => {
    try {
        const currentUserId = String(req.user.userId);
        const connections = await Connection.find({
            status: "accepted",
            $or: [{ requester: currentUserId }, { recipient: currentUserId }]
        }).sort({ updatedAt: -1 }).lean();
        const otherIds = connections.map((item) => String(item.requester) === currentUserId ? item.recipient : item.requester);
        const users = await User.find({ _id: { $in: otherIds } })
            .select("_id username profilePicture status preferences.showOnlineStatus").lean();
        const userMap = new Map(users.map((user) => [String(user._id), user]));
        const result = connections.map((connection) => {
            const otherId = String(connection.requester) === currentUserId ? connection.recipient : connection.requester;
            const user = userMap.get(String(otherId));
            return user ? { ...formatUser(user, "connected"), connectionId: String(connection._id), connectedAt: connection.updatedAt } : null;
        }).filter(Boolean);
        return res.json({ success: true, connections: result });
    } catch (error) {
        console.error("Get connections error:", error);
        return res.status(500).json({ success: false, message: "Failed to load connections" });
    }
};

const getConnectionRequests = async (req, res) => {
    try {
        const currentUserId = String(req.user.userId);
        const records = await Connection.find({ status: "pending", $or: [{ requester: currentUserId }, { recipient: currentUserId }] })
            .sort({ createdAt: -1 }).lean();
        const ids = records.map((item) => String(item.requester) === currentUserId ? item.recipient : item.requester);
        const users = await User.find({ _id: { $in: ids } }).select("_id username profilePicture status preferences.showOnlineStatus").lean();
        const userMap = new Map(users.map((user) => [String(user._id), user]));
        const incoming = [], outgoing = [];
        for (const record of records) {
            const isIncoming = String(record.recipient) === currentUserId;
            const otherId = isIncoming ? record.requester : record.recipient;
            const user = userMap.get(String(otherId));
            if (!user) continue;
            const item = { ...formatUser(user, isIncoming ? "request_received" : "request_sent"), connectionId: String(record._id), requestedAt: record.createdAt };
            (isIncoming ? incoming : outgoing).push(item);
        }
        return res.json({ success: true, incoming, outgoing, pendingCount: incoming.length });
    } catch (error) {
        console.error("Get connection requests error:", error);
        return res.status(500).json({ success: false, message: "Failed to load connection requests" });
    }
};

module.exports = { discoverUsers, sendRequest, acceptRequest, rejectRequest, removeConnection, getConnections, getConnectionRequests };