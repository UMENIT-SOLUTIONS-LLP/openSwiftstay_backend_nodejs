const Joi = require("joi").defaults((schema) => {
    switch (schema.type) {
        case "string":
            return schema.replace(/\s+/, " ");
        default:
            return schema;
    }
});

Joi.objectId = () => Joi.string().pattern(/^[0-9a-f]{24}$/, "valid ObjectId");

module.exports.identify = Joi.object({
    id: Joi.objectId().required()
});

module.exports.sendOtp = Joi.object({
    phoneNo: Joi.string().required(),
    dialCode: Joi.string().required(),
    ISOCode: Joi.string().required()
});

module.exports.verifyOTP = Joi.object({
    otp: Joi.number().required(),
    phoneNo: Joi.string().required(),
    dialCode: Joi.string().required(),
    ISOCode: Joi.string().required()
});

module.exports.createUser = Joi.object({
    otp: Joi.number().required(),
    phoneNo: Joi.string().required(),
    dialCode: Joi.string().required(),
    ISOCode: Joi.string().required(),
    name: Joi.string().required()
});

module.exports.updateProfile = Joi.object({
    // phoneNo: Joi.string().optional(),
    // dialCode: Joi.string().optional(),
    image: Joi.string().optional(),
    name: Joi.string().optional()
});

module.exports.updateNumber = Joi.object({
    phoneNo: Joi.string().required(),
    dialCode: Joi.string().required(),
    ISOCode: Joi.string().required()
});

module.exports.getPricingByLocation = Joi.object({
    slot: Joi.number().required()
});

module.exports.addCard = Joi.object({
    token: Joi.string().required()
});

module.exports.deleteCard = Joi.object({
    cardId: Joi.string().required()
});

module.exports.createToken = Joi.object({
    number: Joi.number().required(),
    month: Joi.number().required(),
    year: Joi.number().required(),
    cvc: Joi.number().required()
});

module.exports.createBooking = Joi.object({
    locationId: Joi.string().required(),
    bookingType: Joi.number().required(),
    locationType: Joi.number().required(),
    checkInTime: Joi.date().required(),
    checkOutTime: Joi.date().required(),
    sourceId: Joi.string().required(),
    isRecurring: Joi.boolean().optional()
});

module.exports.updateBooking = Joi.object({
    bookingId: Joi.string().required(),
    updateType: Joi.number().optional(),
    isRecurring: Joi.boolean().optional(),
    sourceId: Joi.string().optional()
});

module.exports.extendBooking = Joi.object({
    bookingId: Joi.string().required(),
    locationType: Joi.number().required(),
    sourceId: Joi.string().required()
});
