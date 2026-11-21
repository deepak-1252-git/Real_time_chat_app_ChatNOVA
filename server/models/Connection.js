const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        // Stable, direction-independent key prevents A->B and B->A duplicates.
        pairKey: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted"],
            default: "pending",
            required: true
        }
    },
    { timestamps: true }
);

connectionSchema.index({ pairKey: 1 }, { unique: true });
connectionSchema.index({ recipient: 1, status: 1 });
connectionSchema.index({ requester: 1, status: 1 });

connectionSchema.statics.makePairKey = function (userA, userB) {
    return [String(userA), String(userB)].sort().join("_");
};

module.exports = mongoose.model("Connection", connectionSchema);
