const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const CompanyDriverSchema = new Schema({
    userId: {
        type: ObjectId,
        ref: "User",
        required: true
    },
    companyId: {
        type: ObjectId,
        ref: "Company",
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
CompanyDriverSchema.set("toJSON", {
    getters: true,
    virtuals: true
});

module.exports = mongoose.model("CompanyDrivers", CompanyDriverSchema);
