require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Connection = require("../models/Connection");

async function migrate() {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
    await mongoose.connect(process.env.MONGO_URI);

    const pairs = await Message.aggregate([
        { $group: { _id: { a: "$sender", b: "$receiver" } } },
        { $project: { a: "$_id.a", b: "$_id.b" } }
    ]);

    const uniquePairs = new Map();
    for (const { a, b } of pairs) {
        if (!a || !b || String(a) === String(b)) continue;
        const key = Connection.makePairKey(a, b);
        if (!uniquePairs.has(key)) uniquePairs.set(key, { a, b, key });
    }

    let migrated = 0;
    for (const { a, b, key } of uniquePairs.values()) {
        await Connection.updateOne(
            { pairKey: key },
            {
                $setOnInsert: {
                    requester: a,
                    recipient: b,
                    pairKey: key,
                    status: "accepted"
                }
            },
            { upsert: true }
        );
        migrated += 1;
    }

    console.log(`Existing chat migration complete. Pairs checked: ${migrated}`);
    await mongoose.disconnect();
}

migrate().catch(async (error) => {
    console.error("Existing chat migration failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
