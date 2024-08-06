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

module.exports.register = Joi.object({
    email: Joi.string().email().required().error(new Error("Please Enter a valid email")),
    password: Joi.string().required(),
    name: Joi.string().optional(),
    dialCode: Joi.string().optional(),
    phoneNo: Joi.string().optional(),
    ISOCode: Joi.string().optional(),
    address: Joi.string().optional(),
    image: Joi.string().optional()
});
module.exports.login = Joi.object({
    email: Joi.string().email().required().error(new Error("Please Enter a valid email")),
    password: Joi.string().required()
});
module.exports.updateProfile = Joi.object({
    email: Joi.string().email().optional().error(new Error("Please Enter a valid email")),
    phoneNo: Joi.string().optional(),
    ISOCode: Joi.string().optional(),
    dialCode: Joi.string().optional(),
    name: Joi.string().optional(),
    image: Joi.string().optional(),
    address: Joi.string().optional(),
    isBlocked: Joi.boolean().optional(),
    isDeleted: Joi.boolean().optional()
});
module.exports.changePassword = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required()
});
module.exports.resetPassword = Joi.object({
    id: Joi.string().required(),
    newPassword: Joi.string().required()
});
module.exports.checkToken = Joi.object({
    id: Joi.string().required()
});
module.exports.forgotPassword = Joi.object({
    email: Joi.string().email().required()
});
module.exports.inviteOwner = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required()
});

module.exports.addLocation = Joi.object({
    name: Joi.string().required(),
    address: Joi.string().required(),
    mapLink: Joi.string().required(),
    amenities: Joi.string().optional().allow(""),
    image: Joi.string().required(),
    currency: Joi.string().optional(),
    totalSlots: Joi.number().required(),
    creditCardFee: Joi.number().required(),
    salesTax: Joi.number().required(),
    convenienceFee: Joi.number().required(),
    dailySlot: Joi.object().required(),
    monthlySlot: Joi.object().required(),
    hourlySlot: Joi.object().required(),
    overNightSlot: Joi.object().required(),
    clientIds: Joi.array().items(Joi.string().required()).required()
});

module.exports.updateLocation = Joi.object({
    name: Joi.string().optional(),
    address: Joi.string().optional(),
    mapLink: Joi.string().optional(),
    amenities: Joi.string().optional().allow(""),
    image: Joi.string().optional(),
    totalSlots: Joi.number().optional(),
    creditCardFee: Joi.number().optional(),
    salesTax: Joi.number().optional(),
    convenienceFee: Joi.number().optional(),
    currency: Joi.string().optional(),
    dailySlot: Joi.object().optional(),
    monthlySlot: Joi.object().optional(),
    hourlySlot: Joi.object().required(),
    overNightSlot: Joi.object().required(),
    clientIds: Joi.array().items(Joi.string().required()).required()
});

module.exports.addUser = Joi.object({
    name: Joi.string().required(),
    phoneNo: Joi.string().required(),
    dialCode: Joi.string().required(),
    ISOCode: Joi.string().required(),
    image: Joi.string().required().allow("")
});

module.exports.updateUser = Joi.object({
    name: Joi.string().optional(),
    phoneNo: Joi.string().optional(),
    dialCode: Joi.string().optional(),
    ISOCode: Joi.string().optional(),
    image: Joi.string().optional().allow(""),
    isBlocked: Joi.boolean().optional()
});

module.exports.updateOwner = Joi.object({
    name: Joi.string().optional(),
    phoneNo: Joi.string().optional().allow(""),
    ISOCode: Joi.string().optional().allow(""),
    dialCode: Joi.string().optional().allow(""),
    image: Joi.string().optional().allow(""),
    email: Joi.string().optional().allow("")
});

module.exports.changeOwnerPassword = Joi.object({
    id: Joi.string().required(),
    password: Joi.string().required()
});

module.exports.addFAQ = Joi.object({
    question: Joi.string().required(),
    answer: Joi.string().required()
});

module.exports.editFAQ = Joi.object({
    question: Joi.string().optional(),
    answer: Joi.string().optional()
});

module.exports.addCompany = Joi.object({
    email: Joi.string().email().required().error(new Error("Please Enter a valid email")),
    name: Joi.string().required(),
    dialCode: Joi.string().optional(),
    phoneNo: Joi.string().optional(),
    ISOCode: Joi.string().optional(),
    person: Joi.string().optional(),
    image: Joi.string().optional().allow("")
});

module.exports.updateCompany= Joi.object({
    email: Joi.string().email().required().error(new Error("Please Enter a valid email")),
    name: Joi.string().required(),
    dialCode: Joi.string().optional(),
    phoneNo: Joi.string().optional(),
    ISOCode: Joi.string().optional(),
    person: Joi.string().optional(),
    image: Joi.string().optional().allow("")
});

module.exports.blockDrivers= Joi.object({
    companyId: Joi.string().required(),
    userId: Joi.string().required(),
    isBlocked: Joi.boolean().required()
});
