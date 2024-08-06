const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const CardSchema = new mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: "User",
        default: null
    },
    fingerprint: {
      type: String,
      default: "",
      index: true
    },
    cardId: {
      type: String,
      default: "",
      index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Card", CardSchema);