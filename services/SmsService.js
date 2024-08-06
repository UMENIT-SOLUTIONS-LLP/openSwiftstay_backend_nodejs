const twilio = require("twilio");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
let accountSid = process.env.TWILIO_SID; 
let authToken = process.env.TWILIO_AUTH;
const client = twilio(accountSid, authToken, {
  lazyLoading: true
});
const fromNumber = process.env.FROM_NUMBER;
const constants = require('../common/constants');
const functions = require('../common/functions');
const Model = require('../models/index');

const sendSMSTwillo = async ({dialCode, phoneNo, message, id}) => {
    return new Promise((resolve) => {
        dialCode = dialCode.replace("+","");
        dialCode = "+" + dialCode;
        console.log(dialCode,"dialCode");
        console.log(phoneNo,"phoneNo");
        const smsOptions = {
            from: fromNumber,
            to: dialCode + (phoneNo ? phoneNo.toString() : ""),
            body: message
        };
        client.messages.create(smsOptions)
        .then(async (message) => {
            console.log(message.sid);
            await Model.Otp.updateOne({
                _id: ObjectId(id)
            },{
                $set: {sid: message.sid}
            });
            resolve(message.sid);
        }).catch(err => {
            console.log(err);
        });
    });
};
const sendSMS = async (payload) => {
    return new Promise((resolve) => {
        console.log("sms send ", payload);
        sendSMSTwillo(payload);
        return resolve(payload.message);
    });
};

//Send Verification otp. 
exports.sendPhoneVerification = async (payload) => {
    try {
        console.log(payload);
        if (!payload.dialCode) throw new Error(constants.MESSAGES.DIAL_CODE_MISSING);
        if (!payload.phoneNo) throw new Error(constants.MESSAGES.PHONE_MISSING);
        if(process.env.NODE_ENV == "live"){
            payload.otp = functions.generateNumber(4);
        }else{
            payload.otp = 1234;
        }
        payload.expiredAt =  new Date(Date.now() + 15 * 60 * 1000);

        await Model.Otp.deleteMany({
            dialCode : payload.dialCode,
            phoneNo : payload.phoneNo
        });
        let id = await Model.Otp.create(payload);
        let payloadData = {
            phoneNo: payload.phoneNo,
            dialCode: payload.dialCode,
            message: `Your SwiftStay verification code is ${payload.otp}. This OTP is valid for 15 minutes.`,
            id: id._id
        };
        console.log("OTP----------------->",payloadData.message,"<------------------");
        await sendSMS(payloadData);
        return true;
    } catch (error) {
        console.error("sendPhoneVerification", error);
    }
};
exports.expireSms = async (payload) => {
    try {
        console.log(payload);
        if (!payload.dialCode) throw new Error(constants.MESSAGES.DIAL_CODE_MISSING);
        if (!payload.phoneNo) throw new Error(constants.MESSAGES.PHONE_MISSING);
        
        let payloadData = {
            phoneNo: payload.phoneNo,
            dialCode: payload.dialCode,
            message: `Your SwiftStay parking is expiring in 15 min. Kindly extend your booking. Booking: ${process.env.WEB_URL}/profile/bookings`
        };
        await sendSMS(payloadData);
        return true;
    } catch (error) {
        console.error("sendPhoneVerification", error);
    }
};
exports.extendSms = async (payload) => {
    try {
        console.log(payload);
        if (!payload.dialCode) throw new Error(constants.MESSAGES.DIAL_CODE_MISSING);
        if (!payload.phoneNo) throw new Error(constants.MESSAGES.PHONE_MISSING);
        
        let payloadData = {
            phoneNo: payload.phoneNo,
            dialCode: payload.dialCode,
            message: `Your booking is completed either checkout or extend your booking. Booking: ${process.env.WEB_URL}/profile/bookings`
        };
        await sendSMS(payloadData);
        return true;
    } catch (error) {
        console.error("sendPhoneVerification", error);
    }
};
