const mongoose = require("mongoose");
const constants = require('../common/constants');
const autoIncrement = require('mongoose-sequence')(mongoose);
const ObjectId = mongoose.Schema.Types.ObjectId;

let docSchema = new mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: "User",
        index: true
    },
    locationId: {
        type: ObjectId,
        ref: "Location",
        index: true
    },
    companyId: {
        type: ObjectId,
        ref: "Company"
    },
    extendBooking: {
        type: ObjectId,
        ref: "ExtendBooking",
        default: null
    },
    parentId: {
        type: ObjectId,
        ref: "Booking",
        default: null
    },
    refId: {
        type: ObjectId,
        ref: "Booking",
        default: null
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    bookingType: {
        type: Number,
        enum: Object.values(constants.BOOKING_TYPE)
    },
    locationType: {
        type: Number,
        enum: Object.values(constants.LOCATION_SLOT)
    },
    logs: [{
        status: {
            type: Number,
            enum: Object.values(constants.UPDATE_TYPE)
        },
        changedAt: {
            type: Date
        }
    }],
    //Keys for status
    isCheckIn: {
        type: Boolean,
        default: false
    },
    isCheckOut: {
        type: Boolean,
        default: false
    },
    isExtend: {
        type: Boolean,
        default: false
    },
    //Values for booking
    checkInTime: {
        type: Date
    },
    checkOutTime: {
        type: Date
    },
    extendedCheckOutTime: {
        type: Date
    },
    //Booking details
    bookingStartAt: {
        type: Date
    },
    bookingEndAt: {
        type: Date
    },
    transactionId: {
        type: ObjectId,
        ref: "Transaction",
        index: true
    },
    timezone: {
        type: String,
        default: ""
    },
    last4: {
        type: String,
        default: ""
    },
    cardId: {
        type: String,
        select: false,
        default: ""
    },
    //Key to be used if booking is extended for cron
    isBooking: {
        type: Boolean,
        default: false
    },
    isBookingEnabled: {
        type: Boolean,
        default: false
    },
    bookingId: {
        type: Number,
        default: 1000,
        index: true
    },
    subTotal: {
        type: Number,
        default: 0,
        index: true
    },
    creditCardFee: {
        type: Number,
        default: 0
    },
    salesTax: {
        type: Number,
        default: 0
    },
    convenienceFee: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0,
        index: true
    },
    priceId: {
        type: String,
        default: ""
    },
    subscriptionId: {
        type: String,
        default: ""
    },
    bookingStatus: {
        type: Number,
        enum: Object.values(constants.BOOKING_STATUS)
    },
    subscriptionStatus: {
        type: Number,
        enum: Object.values(constants.SUBSCRIPTION_STATUS),
        default: constants.SUBSCRIPTION_STATUS.NOT_ACTIVE
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
docSchema.plugin(autoIncrement, {inc_field: 'bookingId'});

module.exports = mongoose.model('Booking', docSchema);