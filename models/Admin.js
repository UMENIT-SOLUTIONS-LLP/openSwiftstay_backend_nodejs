const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const constants = require('../common/constants');
const ObjectId = mongoose.Schema.Types.ObjectId;

const DocSchema = new Schema({
    email: {
        type: String,
        default: "",
        lowercase: true,
        index: true
    },
    phoneNo: {
        type: String,
        default: ""
    },
    ISOCode: {
      type: String,
      default: ""
    },
    socketId: {
      type: String
    },
    dialCode: {
        type: String,
        default: ""
    },
    role: {
        type: Number,
        enum: [constants.ROLE.ADMIN, constants.ROLE.CLIENT],
        default: constants.ROLE.CLIENT
    },
    status: {
        type: Number,
        enum: Object.values(constants.PROFILE_STATUS),
        default: constants.PROFILE_STATUS.PENDING
    },
    password: {
        type: String,
        default: ""
    },
    address: {
        type: String,
        default: ""
    },
    name: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    loginCount: {
        type: Number,
        default: 0
    },
    jti: {
        type: String,
        default: "",
        index: true
    },
    updateBy: {
        type: ObjectId,
        ref: "Admins",
        default: null
    },
    permission: [{
        label: {
            type: String,
            default: null
        },
        isView: {
            type: Boolean,
            default: false
        },
        isAdd: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});
DocSchema.set("toJSON", {
    getters: true,
    virtuals: true
});

DocSchema.methods.authenticate = function (password, callback) {
    const promise = new Promise((resolve, reject) => {
        if (!password) {
            reject(new Error("MISSING_PASSWORD"));
        }
        bcrypt.compare(password, this.password, (error, result) => {
            if (!result) reject(new Error("INVALID PASSWORD"));
            resolve(this);
        });
    });

    if (typeof callback != "function") return promise;
    promise.then((result) => callback(null, result)).catch((err) => callback(err));
};

DocSchema.methods.setPassword = function (password, callback) {
    const promise = new Promise((resolve, reject) => {
        if (!password) reject(new Error("Missing Password"));

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) reject(err);
            this.password = hash;
            resolve(this);
        });
    });

    if (typeof callback != "function") return promise;
    promise.then((result) => callback(null, result)).catch((err) => callback(err));
};
module.exports = mongoose.model("Admins", DocSchema);