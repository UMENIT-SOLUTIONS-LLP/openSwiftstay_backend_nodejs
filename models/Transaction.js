const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const TransactionModel = new Schema({
    bookingId: {
        type: ObjectId,
        ref: "Booking",
        index: true
    },
    clientId: {
        type: ObjectId,
        ref: "Admins",
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    invoice: {
        type: String,
        default: ""
    },
    extendBookingId: {
        type: ObjectId,
        ref: "ExtendBooking",
        index: true
    },
    userId: {
        type: ObjectId,
        ref: "User",
        index: true
    },
    charge: {
        type: Object
    },
    amount: {
        type: Number,
        default: 0,
        index: true
    }
}, {
    timestamps: true,
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

const Transaction = mongoose.model('Transaction', TransactionModel);
module.exports = Transaction;