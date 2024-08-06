const mongoose = require("mongoose");
const Schema = mongoose.Schema;
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
    dialCode: {
        type: String,
        default: ""
    },
    person: {
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
    clientId: {
        type: ObjectId,
        ref: "Admins",
        default: null
    }
}, {
    timestamps: true
});
DocSchema.set("toJSON", {
    getters: true,
    virtuals: true
});

module.exports = mongoose.model("Company", DocSchema);