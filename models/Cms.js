const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let cmsModel = new Schema({
    privacyPolicy: {
        type: String,
        default: ""
    },
    termsAndConditions: {
        type: String,
        default: ""
    },
    aboutUs: {
        type: String,
        default: ""
    },
    contactUs: {
        dialCode: {
            type: String,
            default: ""
        },
        phoneNo: {
            type: String,
            default: ""
        },
        ISOCode: {
          type: String,
          default: ""
        },
        email: {
            type: String,
            default: ""
        },
        address: {
            type: String,
            default: ""
        }
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

module.exports = mongoose.model('cms', cmsModel);