const mongoose = require("mongoose");
const constants = require('../common/constants');
const ObjectId = mongoose.Schema.Types.ObjectId;

let docSchema = new mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: "User"
    },
    bookingId: {
        type: ObjectId,
        ref: "Booking",
        default: null
    },
    locationType: {
        type: Number,
        enum: Object.values(constants.LOCATION_SLOT)
    },
    transactionId: {
        type: ObjectId
    },
    subTotal: {
        type: Number,
        default: 1000
    },
    creditCardFee: {
        type: Number,
        default: 1000
    },
    salesTax: {
        type: Number,
        default: 1000
    },
    convenienceFee: {
        type: Number,
        default: 1000
    },
    total: {
        type: Number,
        default: 1000
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
});

module.exports = mongoose.model('ExtendBooking', docSchema);