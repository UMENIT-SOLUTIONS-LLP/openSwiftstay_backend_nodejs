const _ = require("lodash");
const crypto = require('crypto');
const constants = require("../common/constants");
const Handlebars = require("handlebars");

//Helper functions
module.exports.toHex = (val) => Buffer.from(val, "utf8").toString("hex");
module.exports.toStr = (val) => Buffer.from(val, "hex").toString("utf8");
module.exports.generateRandomStringAndNumbers = function (len) {
    let text = "";
    let possible = "abcdefghijklmnopqrstuvwxyz1234567890";
    for (let i = 0; i < len; i++)
        text += possible.charAt(Math.floor(crypto.randomInt(0, possible.length)));
    return text;
};
module.exports.generateNumber = function (len) {
    let text = "";
    let possible = "123456789";
    for (let i = 0; i < len; i++)
        text += possible.charAt(Math.floor(crypto.randomInt(0, possible.length)));
    return text;
};
module.exports.setPrecision = async (no, precision) => {
    precision = precision || 2;
    if (!isNaN(no)) {
        return (+(Math.round(+(no + 'e' + precision)) + 'e' + -precision)).toFixed(precision);
    }
    return 0;
};
module.exports.prettyCase = (str) => {
    if (typeof str == "string" && /^[A-Z_]+$/.test(str)) {
        str = _.lowerCase(str);
        str = _.startCase(str);
    }
    return str;
};
module.exports.toDecimals = (val, decimal = 2) => {
    const base = Math.pow(10, decimal);
    return Math.round(val * base) / base;
};
module.exports.toObject = (data, key, val) => {
    if (!Array.isArray(data)) throw new Error("INVALID_DATA");
    if (!key || typeof key != "string") throw new Error("INVALID_KEY");

    const newObj = {};
    if (data.length > 0) {
        for (const item of data) {
            newObj[item[key] + ""] = val ? item[val] : item;
        }
    }
    return newObj;
};

//Render function to frame message and title for notifications
module.exports.renderTemplateField = async (inputKeysObj, values, lang, payloadData) => {
    lang = lang || "en";
    let sendObj = {};
    sendObj.driverId = payloadData.driverId ? payloadData.driverId : null;
    sendObj.vendorId = payloadData.vendorId ? payloadData.vendorId : null;
    sendObj.orderId = payloadData.orderId ? payloadData.orderId : null;
    sendObj.userId = payloadData.userId ? payloadData.userId : null;
    sendObj.receiverId = payloadData.receiverId ? payloadData.receiverId : null;
    sendObj.role = payloadData.role ? payloadData.role : constants.ROLE.USER;
    sendObj.isNotificationSave = payloadData.isNotificationSave ? payloadData.isNotificationSave : false;
    sendObj.pushType = payloadData.pushType ? payloadData.pushType : 0;
    if (values) values = JSON.parse(JSON.stringify(values));

    let keys = inputKeysObj.keys || [];
    for (let i = 0; i < keys.length; i++) {
        keys[i].value = values[keys[i].key];
    }
    let source = inputKeysObj.message[lang] || null;
    let template = Handlebars.compile(source) || null;
    
    let message = template(values) || payloadData.message;
    console.log(message,"message");
    source = inputKeysObj.title[lang] || null;
    template = Handlebars.compile(source) || null;
    let title = template(values) || payloadData.title;
    sendObj.message = message;
    sendObj.title = title;
    sendObj.keys = keys;
    sendObj.data = values;
    return sendObj;
};

