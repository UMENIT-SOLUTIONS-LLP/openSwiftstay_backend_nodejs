const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let faqModel = new Schema({
    question: {
        type: String,
        default: ""
    },
    answer: {
        type: String,
        default: ""
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

module.exports = mongoose.model('faq', faqModel);