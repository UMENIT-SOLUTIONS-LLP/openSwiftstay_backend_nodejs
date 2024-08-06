const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let userSchema = new Schema({
  name: {
    type: String,
    default: ""
  },
  phoneNo: {
    type: String,
    default: ""
  },
  dialCode: {
    type: String,
    default: ""
  },
  ISOCode: {
    type: String,
    default: ""
  },
  stripeId: {
    type: String,
    default: ""
  },
  image: {
    type: String,
    default: ""
  },
  isNotification: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String,
    default: ""
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  jti: {
    type: String,
    default: "",
    select: false,
    index: true
  },
  deviceType: {
    type: String,
    default: "",
    enum: ["", "WEB", "ANDROID", "IOS"]
  },
  deviceToken: {
    type: String,
    default: "",
    index: true
  },
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);