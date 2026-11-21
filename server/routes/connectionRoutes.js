const express = require("express");
const protect = require("../middleware/authMiddleware");
const connectionRequestRateLimit = require("../middleware/connectionRequestRateLimit");
const {
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeConnection,
    getConnections,
    getConnectionRequests
} = require("../controllers/connectionController");

const router = express.Router();
router.use(protect);
router.get("/requests", getConnectionRequests);
router.get("/", getConnections);
router.post("/request/:userId", connectionRequestRateLimit, sendRequest);
router.put("/:id/accept", acceptRequest);
router.put("/:id/reject", rejectRequest);
router.delete("/:id", removeConnection);
module.exports = router;
