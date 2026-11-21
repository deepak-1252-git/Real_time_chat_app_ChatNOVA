const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 10;
const buckets = new Map();

const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [userId, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(userId);
    }
}, 60 * 1000);

if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();

const connectionRequestRateLimit = (req, res, next) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const key = String(userId);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + WINDOW_MS };
        buckets.set(key, bucket);
    }

    if (bucket.count >= MAX_REQUESTS) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        res.set("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({
            success: false,
            code: "CONNECTION_REQUEST_RATE_LIMITED",
            message: `Too many connection requests. Try again in ${retryAfterSeconds} seconds.`,
            retryAfterSeconds
        });
    }

    bucket.count += 1;
    return next();
};

module.exports = connectionRequestRateLimit;
