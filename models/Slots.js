const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

let slotsModel = new Schema({
    locationId: {
        type: ObjectId,
        ref: "Location"
    },
    checkInTime: {
        type: Date
    },
    checkOutTime: {
        type: Date
    },
    userId: {
        type: ObjectId,
        ref: "User"
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

module.exports = mongoose.model('slots', slotsModel);