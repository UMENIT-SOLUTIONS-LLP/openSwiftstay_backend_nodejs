const mongoose = require("mongoose");
const constants = require('../common/constants');
const ObjectId = mongoose.Schema.Types.ObjectId;

const NotificationSchema = new mongoose.Schema({
    role: {
        type: Number,
        enum: Object.values(constants.ROLE),
        default: constants.ROLE.USER
    },
    pushType: {
        type: Number,
        enum: Object.values(constants.PUSH_TYPE_KEYS)
    },
    title: {
        type: String,
        default: ""
    },
    message: {
        type: String,
        default: ""
    },
    userId: {
        type: ObjectId,
        ref: "User"
    },
    receiverId: {
        type: ObjectId
    },
    orderId: {
        type: ObjectId,
        ref: "Order"
    },
    driverId: {
        type: ObjectId,
        ref: "Driver"
    },
    vendorId: {
        type: ObjectId,
        ref: "Vendor"
    },
    isUserRead: {
        type: Boolean,
        default: false
    },
    isDriverRead: {
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

module.exports = mongoose.model("Notification", NotificationSchema);