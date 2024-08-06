const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const OtpModel = new Schema({
    otp: {
        type: String,
        default: "",
        trim: true
    },
    sid: {
        type: String,
        default: "",
        trim: true
    },
    userId: {
        type: ObjectId,
        ref: "User",
        default: null
    },
    adminId: {
        type: ObjectId,
        ref: "Admins",
        default: null
    },
    link: {
        type: String,
        trim: true,
        default: ""
    },
    phoneNo: {
        type: String,
        trim: true,
        default: ""
    },
    dialCode: {
        type: String,
        default: "",
        trim: true
    },
    ISOCode: {
        type: String,
        default: "",
        trim: true
    },
    type: {
        type: String,
        default: ""
    },
    expiredAt: {
        type: Date,
        default: new Date()
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
const Otp = mongoose.model('Otp', OtpModel);
module.exports = Otp;