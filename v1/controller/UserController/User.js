/* eslint-disable no-case-declarations */
const Model = require("../../../models/index");
const Validation = require("../../validations");
const Auth = require("../../../common/authenticate");
const constants = require("../../../common/constants");
const services = require("../../../services/index");
const functions = require("../../../common/functions");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
// const moment = require("moment");
const moment = require("moment-timezone");
const stripe = require('stripe')(process.env.STRIPE_KEY);
const awsIot = require('aws-iot-device-sdk');

//Stripe repeat Payment
module.exports.startStripeRecurring = async (payload, user, cardId, backDate) => {
    try {
        console.log(backDate, "backDate");
        console.log(payload, "payload");
        let booking = await Model.Booking.findOne({
            _id: payload._id
        });
        if (booking == null) {
            throw new Error("Booking not found");
        }
        const price = await stripe.prices.create({
            currency: 'USD',
            unit_amount: parseInt(Number((payload.total).toFixed(2)) * 100),
            recurring: {
                interval: 'month'
            },
            product_data: {
                name: 'Monthly booking ' + booking.bookingId
            },
            metadata: {
                order_id: booking.bookingId.toString(),
                _id: booking._id.toString(),
                userId: booking.userId.toString()
            }
        });
        let dataToSave = {
            customer: user.stripeId,
            items: [{
                price: price.id
            }],
            metadata: {
                order_id: booking.bookingId.toString(),
                _id: booking._id.toString(),
                userId: booking.userId.toString()
            },
            description: "Subscription update for " + booking.bookingId,
            default_payment_method: cardId,
            trial_period_days: Number(moment(booking.checkOutTime).diff(moment(booking.checkInTime), "days"))
        };
        if (backDate) {
            dataToSave.backdate_start_date = backDate;
            dataToSave.billing_cycle_anchor_config = {
                day_of_month: moment(backDate).date()
            };
            // dataToSave.trial_period_days = Number(moment(backDate).diff(moment(), "days"));
        }
        console.log(dataToSave, "dataToSave");
        const subscription = await stripe.subscriptions.create(dataToSave);
        console.log(subscription, "subscription");
        await Model.Booking.updateOne({
            _id: booking._id
        }, {
            $set: {
                priceId: price.id,
                subscriptionId: subscription.id,
                isRecurring: true,
                subscriptionStatus: constants.SUBSCRIPTION_STATUS.ACTIVE
            }
        });
    } catch (error) {
        console.error(error);
    }
};
module.exports.startStripeDailyRecurring = async (payload, user, cardId, backDate) => {
    try {
        console.log("startStripeDailyRecurring=========");
        console.log(backDate, "backDate");
        console.log(payload, "payload");
        let booking = await Model.Booking.findOne({
            _id: payload._id
        });
        if (booking == null) {
            throw new Error("Booking not found");
        }
        const price = await stripe.prices.create({
            currency: 'USD',
            unit_amount: parseInt(Number((payload.total).toFixed(2)) * 100),
            recurring: {
                interval: 'day'
            },
            product_data: {
                name: 'Daily booking ' + booking.bookingId
            },
            metadata: {
                order_id: booking.bookingId.toString(),
                _id: booking._id.toString(),
                userId: booking.userId.toString()
            }
        });
        let dataToSave = {
            customer: user.stripeId,
            items: [{
                price: price.id
            }],
            metadata: {
                order_id: booking.bookingId.toString(),
                _id: booking._id.toString(),
                userId: booking.userId.toString()
            },
            description: "Subscription update for " + booking.bookingId,
            default_payment_method: cardId,
            trial_period_days: Number(moment(booking.checkOutTime).diff(moment(booking.checkInTime), "days"))
        };
        if (backDate) {
            dataToSave.backdate_start_date = backDate;
            dataToSave.billing_cycle_anchor_config = {
                day_of_month: moment(backDate).date()
            };
            // dataToSave.trial_period_days = Number(moment(backDate).diff(moment(), "days"));
        }
        console.log(dataToSave, "dataToSave");
        const subscription = await stripe.subscriptions.create(dataToSave);
        console.log(subscription, "subscription");
        await Model.Booking.updateOne({
            _id: booking._id
        }, {
            $set: {
                priceId: price.id,
                subscriptionId: subscription.id,
                isRecurring: true,
                subscriptionStatus: constants.SUBSCRIPTION_STATUS.ACTIVE
            }
        });
    } catch (error) {
        console.error(error);
    }
};
module.exports.stopStripeRecurring = async (req, res, next) => {
    try {
        let booking = await Model.Booking.findOne({
            _id: ObjectId(req.body._id)
        });
        if (!booking) {
            throw new Error("Booking not found");
        }
        await Model.Booking.deleteMany({
            parentId: booking._id
        });
        await stripe.subscriptions.cancel(
            booking.subscriptionId
        );
        await Model.Booking.updateOne({
            _id: booking._id
        }, {
            $set: {
                isRecurring: false,
                subscriptionStatus: constants.SUBSCRIPTION_STATUS.CANCELLED
            }
        });
        return res.success("Success", booking);
    } catch (error) {
        next(error);
    }
};
module.exports.stopRecurring = async (payload) => {
    try {
        let booking = await Model.Booking.findOne({
            _id: ObjectId(payload._id)
        });
        if (!booking) {
            throw new Error("Booking not found");
        }
        await Model.Booking.deleteMany({
            parentId: booking._id
        });
        await stripe.subscriptions.cancel(
            booking.subscriptionId
        );
        await Model.Booking.updateOne({
            _id: booking._id
        }, {
            $set: {
                isRecurring: false,
                subscriptionStatus: constants.SUBSCRIPTION_STATUS.CANCELLED
            }
        });
        return true;
    } catch (error) {
        console.error(error);
    }
};

//Check user
module.exports.checkUser = async (req, res, next) => {
    try {
        await Validation.User.sendOtp.validateAsync(req.body);
        console.log("req.body.............", req.body);
        let isUser = false;
        let dataToSend = {
            phoneNo: req.body.phoneNo,
            dialCode: req.body.dialCode,
            ISOCode: req.body.ISOCode
        };
        let checkUser = await Model.User.findOne({
            phoneNo: req.body.phoneNo,
            dialCode: req.body.dialCode,
            isDeleted: false,
            ISOCode: req.body.ISOCode
        });
        if (checkUser && checkUser.isBlocked) {
            throw new Error("Your account is blocked.");
        }
        services.SmsService.sendPhoneVerification(dataToSend);
        if (checkUser) {
            isUser = true;
        }
        return res.success(constants.MESSAGES.OTP_SENT, {
            isUser: isUser
        });

    } catch (error) {
        next(error);
    }
};
//Verify and create the user otp with email/phoneNo.
module.exports.createUser = async (req, res, next) => {
    try {
        console.log(req.body, "createUser.................");
        await Validation.User.createUser.validateAsync(req.body);
        let qry = {
            otp: req.body.otp
        };
        if (req.body.phoneNo) {
            qry.phoneNo = req.body.phoneNo;
        }
        if (req.body.dialCode) {
            qry.dialCode = req.body.dialCode;
            qry.ISOCode = req.body.ISOCode;
        }
        //Check if user has sent any otp for verification.
        let otp = await Model.Otp.findOne(qry);
        if (!otp) {
            throw new Error(constants.MESSAGES.INVALID_OTP);
        }
        if (otp)
            await Model.Otp.findByIdAndRemove(otp._id);

        let checkUser = await Model.User.findOne({
            phoneNo: req.body.phoneNo,
            dialCode: req.body.dialCode,
            ISOCode: req.body.ISOCode,
            isDeleted: false
        });
        if (checkUser) {
            throw new Error("User already exists with this number");
        }
        let data = await Model.User.create({
            phoneNo: req.body.phoneNo,
            dialCode: req.body.dialCode,
            name: req.body.name,
            isPhoneVerified: true,
            ISOCode: req.body.ISOCode
        });
        if (data == null) {
            throw new Error("Account not created.");
        }
        data.jti = functions.generateRandomStringAndNumbers(25);
        await data.save();
        data = JSON.parse(JSON.stringify(data));
        data.accessToken = await Auth.getToken({
            _id: data._id,
            role: "user",
            jti: data.jti
        });
        return res.success(constants.MESSAGES.ACCOUNT_PHONE, data);
    } catch (error) {
        next(error);
    }
};
//SendOtp
module.exports.sendOtp = async (req, res, next) => {
    try {
        await Validation.User.sendOtp.validateAsync(req.body);
        console.log("req.body.............", req.body);
        if (req.body.phoneNo) {
            let dataToSend = {
                phoneNo: req.body.phoneNo,
                dialCode: req.body.dialCode,
                ISOCode: req.body.ISOCode
            };
            services.SmsService.sendPhoneVerification(dataToSend);
        }
        return res.success(constants.MESSAGES.OTP_SENT);
    } catch (error) {
        next(error);
    }
};
//Verify the user otp with email/phoneNo.
module.exports.verifyOtp = async (req, res, next) => {
    try {
        console.log(req.body, "verifyOtp.................");
        await Validation.User.verifyOTP.validateAsync(req.body);
        let qry = {
            otp: req.body.otp,
            userId: null
        };
        if (req.body.phoneNo) {
            qry.phoneNo = req.body.phoneNo;
        }
        if (req.body.dialCode) {
            qry.dialCode = req.body.dialCode;
            qry.ISOCode = req.body.ISOCode;
        }
        if (req.user && req.user._id) {
            qry.userId = req.user._id;
        }
        //Check if user has sent any otp for verification.
        let otp = await Model.Otp.findOne(qry);
        if (!otp) {
            throw new Error(constants.MESSAGES.INVALID_OTP);
        }
        const currentDateTime = new Date();
        if (otp.expiredAt < currentDateTime) {
            throw new Error(constants.MESSAGES.EXPIRED_OTP);
        }
        if (otp) {
            await Model.Otp.findByIdAndRemove(otp._id);
        }
        let data = null;
        if (req.user && req.user._id) {
            data = await Model.User.findOneAndUpdate({
                _id: req.user._id,
                isDeleted: false
            }, {
                $set: {
                    phoneNo: otp.phoneNo,
                    dialCode: otp.dialCode,
                    isPhoneVerified: true,
                    ISOCode: req.body.ISOCode
                }
            }, {
                new: true
            });
        } else {
            data = await Model.User.findOneAndUpdate({
                phoneNo: req.body.phoneNo,
                dialCode: req.body.dialCode,
                isDeleted: false,
                ISOCode: req.body.ISOCode
            }, {
                $set: {
                    isPhoneVerified: true
                }
            }, {
                new: true
            });
        }
        if (data == null) {
            throw new Error("Account not found.");
        }
        if (data && data.isBlocked) {
            throw new Error("Your account has been blocked");
        }
        data.jti = functions.generateRandomStringAndNumbers(25);
        await data.save();
        data = JSON.parse(JSON.stringify(data));
        data.accessToken = await Auth.getToken({
            _id: data._id,
            role: "user",
            jti: data.jti
        });
        return res.success(constants.MESSAGES.ACCOUNT_PHONE, data);
    } catch (error) {
        next(error);
    }
};
//Logout the current user and change the JTI, Also remove the current device type and device token. 
module.exports.logout = async (req, res, next) => {
    try {
        let jti = functions.generateRandomStringAndNumbers(25);
        await Model.User.updateOne({
            _id: req.user._id,
            isDeleted: false
        }, {
            deviceType: "",
            deviceToken: "",
            jti: jti
        });
        return res.success(constants.MESSAGES.LOGOUT_SUCCESS);
    } catch (error) {
        next(error);
    }
};
//Get the complete profile of the current user.
module.exports.getProfile = async (req, res, next) => {
    try {
        let doc = await Model.User.findOne({
            _id: req.user._id,
            isDeleted: false
        }, {
            password: 0
        });
        return res.success(constants.MESSAGES.DATA_FETCHED, doc);
    } catch (error) {
        next(error);
    }
};
//Delete the profile of the current user.
module.exports.deleteProfile = async (req, res, next) => {
    try {
        await Model.User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: {
                isDeleted: true
            }
        }, {
            new: true
        });
        return res.success(constants.MESSAGES.ACCOUNT_DELETED);
    } catch (error) {
        next(error);
    }
};
//Update the user details.
module.exports.updateProfile = async (req, res, next) => {
    try {
        await Validation.User.updateProfile.validateAsync(req.body);
        console.log(req.body, "updateProfile.............");
        // const nin = {
        //     $nin: [req.user._id]
        // };
        // if (req.body.phoneNo) {
        //     let checkPhone = await Model.User.findOne({
        //         _id: nin,
        //         dialCode: req.body.dialCode,
        //         phoneNo: req.body.phoneNo,
        //         isDeleted: false
        //     });
        //     if (checkPhone) {
        //         throw new Error(constants.MESSAGES.PHONE_ALREADY_IN_USE);
        //     } else {
        //         checkPhone = await Model.User.findOne({
        //             _id: req.user._id,
        //             dialCode: req.body.dialCode,
        //             phoneNo: req.body.phoneNo,
        //             isDeleted: false,
        //             isPhoneVerified: true
        //         });
        //         if (checkPhone == null) {
        //             req.body.isPhoneVerified = false;
        //             let dataToSend = {
        //                 phoneNo: req.body.phoneNo,
        //                 dialCode: req.body.dialCode
        //             };
        //             services.SmsService.sendPhoneVerification(dataToSend);
        //         }
        //     }
        // }
        if (req.body.image == "") {
            delete req.body.image;
        }
        const userData = await Model.User.findOne({
            _id: req.user._id,
            isDeleted: false
        });
        if (userData == null) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
        // if (req.body.dialCode && !req.body.dialCode.includes("+")) {
        //     req.body.dialCode = "+" + req.body.dialCode;
        // }
        let updated = await Model.User.findOneAndUpdate({
            _id: req.user._id,
            isDeleted: false
        }, {
            $set: req.body
        }, {
            new: true
        });
        return res.success(constants.MESSAGES.PROFILE_UPDATED_SUCCESSFULLY, updated);

    } catch (error) {
        next(error);
    }
};
//Update the user number.
module.exports.updateNumber = async (req, res, next) => {
    try {
        await Validation.User.updateNumber.validateAsync(req.body);
        const nin = {
            $nin: [req.user._id]
        };
        let checkPhone = await Model.User.findOne({
            _id: nin,
            dialCode: req.body.dialCode,
            phoneNo: req.body.phoneNo,
            isDeleted: false,
            ISOCode: req.body.ISOCode
        });
        if (checkPhone) {
            throw new Error(constants.MESSAGES.PHONE_ALREADY_IN_USE);
        } else {
            checkPhone = await Model.User.findOne({
                _id: req.user._id,
                dialCode: req.body.dialCode,
                phoneNo: req.body.phoneNo,
                isDeleted: false,
                isPhoneVerified: true,
                ISOCode: req.body.ISOCode
            });
            if (checkPhone == null) {
                let dataToSend = {
                    phoneNo: req.body.phoneNo,
                    dialCode: req.body.dialCode,
                    userId: req.user._id,
                    ISOCode: req.body.ISOCode
                };
                services.SmsService.sendPhoneVerification(dataToSend);
            }
        }
        return res.success("Success");

    } catch (error) {
        next(error);
    }
};

//Cms
module.exports.getCms = async (req, res, next) => {
    try {
        const cmsData = await Model.Cms.findOne({});
        return res.success(constants.MESSAGES.DATA_FETCHED, cmsData);
    } catch (error) {
        next(error);
    }
};

//Location
module.exports.getLocation = async (req, res, next) => {
    try {
        let page = null;
        let limit = null;
        page = req.body.page ? Number(req.body.page) : 1;
        limit = req.body.limit ? Number(req.body.limit) : 10;
        let skip = Number((page - 1) * limit);
        let id = req.params.id;
        if (id == null) {
            let location = await Model.Location.find({
                isDeleted: false
            }).sort({
                createdAt: -1
            }).skip(skip).limit(limit);
            let totalLocation = await Model.Location.countDocuments({
                isDeleted: false
            });
            return res.success(constants.MESSAGES.DATA_FETCHED, {
                location,
                totalLocation
            });
        } else {
            let location = await Model.Location.findOne({
                _id: ObjectId(req.params.id),
                isDeleted: false
            });
            if (location == null) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
            return res.success(constants.MESSAGES.DATA_FETCHED, location);
        }

    } catch (error) {
        next(error);
    }
};

//Payment
module.exports.addCard = async (req, res, next) => {
    try {
        await Validation.User.addCard.validateAsync(req.body);
        let user = await Model.User.findOne({
            _id: req.user._id
        });
        if (user) {
            if (!user.stripeId) {
                const customerCreate = await stripe.customers.create({
                    phone: user.phone,
                    name: user.name
                });
                user = await Model.User.findOneAndUpdate({
                    _id: req.user._id
                }, {
                    stripeId: customerCreate.id
                }, {
                    new: true
                });
            }
            let customer = await stripe.customers.retrieve(user.stripeId);
            let card = await stripe.customers.createSource(customer.id, {
                source: req.body.token
            });
            if (card) {
                let checkCard = await Model.UserCard.findOne({
                    userId: user._id,
                    fingerprint: card.fingerprint
                });
                if (checkCard == null) {
                    await Model.UserCard.create({
                        userId: req.user._id,
                        fingerprint: card.fingerprint,
                        cardId: card.id
                    });
                } else {
                    await stripe.customers.deleteSource(
                        customer.id,
                        card.id
                    );
                    card = await stripe.customers.retrieveSource(
                        customer.id,
                        checkCard.cardId
                    );
                }
                return res.success("Card added successfully.", card);
            }
            throw new Error("Card not added.");
        }
    } catch (error) {
        next(error);
    }
};
module.exports.getCard = async (req, res, next) => {
    try {
        let user = await Model.User.findOne({
            _id: ObjectId(req.user._id)
        });
        let cards = {};
        if (user && user.stripeId) {
            let customer = await stripe.customers.retrieve(user.stripeId);
            cards = await stripe.customers.listSources(customer.id);
        }
        let data = cards.data;
        if (data === undefined) {
            data = [];
        }
        return res.success(constants.MESSAGES.DATA_FETCHED, data);
    } catch (error) {
        next(error);
    }
};
module.exports.deleteCard = async (req, res, next) => {
    try {
        await Validation.User.deleteCard.validateAsync(req.body);
        let user = await Model.User.findOne({
            _id: ObjectId(req.user._id)
        });
        if (user && user.stripeId) {
            let customer = await stripe.customers.retrieve(user.stripeId);
            let deleted = await stripe.customers.deleteSource(
                customer.id,
                req.body.cardId
            );
            return res.success(constants.MESSAGES.DELETED_SUCCESSFULLY, deleted);
        }
    } catch (error) {
        next(error);
    }
};
module.exports.createToken = async (req, res, next) => {
    try {
        await Validation.User.createToken.validateAsync(req.body);
        const token = await stripe.tokens.create({
            card: {
                "number": req.body.number,
                "exp_month": req.body.month,
                "exp_year": req.body.year,
                "cvc": req.body.cvc
            }
        });
        return res.success("Token created successfully.", token);
    } catch (error) {
        next(error);
    }
};

//Booking
module.exports.createBooking = async (req, res, next) => {
    try {
        let nextMonthcheckOutTime = "";
        let timezone = req.headers.timezone || "Asia/Kolkata";
        await Validation.User.createBooking.validateAsync(req.body);
        let checkLocation = await Model.Location.findOne({
            _id: ObjectId(req.body.locationId),
            isDeleted: false
        });
        if (checkLocation == null) {
            throw new Error("Please select a valid location");
        }
        let checkAvailable = await Model.Slots.countDocuments({
            locationId: checkLocation._id,
            "$or": [
                //centre
                {
                    "checkInTime": {
                        "$lte": req.body.checkInTime
                    },
                    "checkOutTime": {
                        "$gte": req.body.checkOutTime
                    }
                },
                //end
                {
                    "checkInTime": {
                        "$lte": req.body.checkInTime
                    },
                    "checkOutTime": {
                        "$lte": req.body.checkOutTime,
                        "$gte": req.body.checkInTime
                    }
                },
                //start
                {
                    "checkInTime": {
                        "$lte": req.body.checkOutTime,
                        "$gte": req.body.checkInTime
                    },
                    "checkOutTime": {
                        "$gte": req.body.checkOutTime
                    }
                },
                //global
                {
                    "checkInTime": {
                        "$gte": req.body.checkInTime
                    },
                    "checkOutTime": {
                        "$lte": req.body.checkOutTime
                    }
                }
            ]
        });

        if (checkAvailable >= checkLocation.totalSlots) {
            throw new Error("No more slots available for this location");
        }
        if (req.body.locationType == constants.LOCATION_SLOT.MONTHLY && req.body.isRecurring) {

            const currentCheckOutTime = new Date(req.body.checkOutTime);

            // Add one month to the current checkOutTime
            currentCheckOutTime.setMonth(currentCheckOutTime.getMonth() + 1);

            // Update req.body.checkOutTime with the new value
            nextMonthcheckOutTime = currentCheckOutTime;

            let checkNextMonthAvailable = await Model.Slots.countDocuments({
                locationId: checkLocation._id,
                "$or": [
                    //centre
                    {
                        "checkInTime": {
                            "$lte": req.body.checkInTime
                        },
                        "checkOutTime": {
                            "$gte": nextMonthcheckOutTime
                        }
                    },
                    //end
                    {
                        "checkInTime": {
                            "$lte": req.body.checkInTime
                        },
                        "checkOutTime": {
                            "$lte": nextMonthcheckOutTime,
                            "$gte": req.body.checkInTime
                        }
                    },
                    //start
                    {
                        "checkInTime": {
                            "$lte": nextMonthcheckOutTime,
                            "$gte": req.body.checkInTime
                        },
                        "checkOutTime": {
                            "$gte": nextMonthcheckOutTime
                        }
                    },
                    //global
                    {
                        "checkInTime": {
                            "$gte": req.body.checkInTime
                        },
                        "checkOutTime": {
                            "$lte": nextMonthcheckOutTime
                        }
                    }
                ]
            });

            if (checkNextMonthAvailable >= checkLocation.totalSlots) {
                throw new Error("No more slots available for this location for next month");
            }
        }


        // if (checkLocation.pendingSlots < 1 && req.body.bookingType == constants.BOOKING_TYPE.INSTANT) {
        //     throw new Error("No more slots available for this location");
        // }else{
        // let time = moment(req.body.checkInTime);
        // let checkSlots = await Model.Booking.countDocuments({
        //     bookingType: constants.BOOKING_TYPE.SCHEDULE,
        //     checkInTime: {
        //         $gte: 
        //     }
        // });
        // }
        let payload = {
            userId: req.user._id,
            locationId: checkLocation._id,
            bookingType: req.body.bookingType,
            locationType: req.body.locationType,
            checkInTime: req.body.checkInTime,
            checkOutTime: req.body.checkOutTime,
            creditCardFee: checkLocation.creditCardFee,
            salesTax: checkLocation.salesTax,
            isRecurring: req.body.isRecurring,
            convenienceFee: checkLocation.convenienceFee,
            bookingStatus: constants.BOOKING_STATUS.UPCOMING
        };
        if (req.body.locationType == constants.LOCATION_SLOT.DAILY) {
            let diff = moment(req.body.checkOutTime).diff(moment(req.body.checkInTime), "minutes");

            if (diff > 12 * 60) {
                const multiplier = Math.ceil(diff / (24 * 60));
                payload.subTotal = checkLocation.dailySlot.price * multiplier;
            } else {
                payload.subTotal = checkLocation.dailySlot.price;
            }

        } else if (req.body.locationType == constants.LOCATION_SLOT.OVERNIGHTSLOT) {
            // let diff = moment(req.body.checkOutTime).diff(moment(req.body.checkInTime), "M");
            // if (diff > 1) {
            //     throw new Error("Invalid checkIn checkOut time");
            // }
            payload.subTotal = checkLocation.overNightSlot.price;
        } else if (req.body.locationType == constants.LOCATION_SLOT.HOURLY) {
            let diff = moment(req.body.checkOutTime).diff(moment(req.body.checkInTime), "minutes");
            if (diff > 60) {
                const multiplier = Math.ceil(diff / (60));
                payload.subTotal = checkLocation.hourlySlot.price * multiplier;
            } else {
                payload.subTotal = checkLocation.hourlySlot.price;
            }

        } else if (req.body.locationType == constants.LOCATION_SLOT.MONTHLY) {
            let diff = moment(req.body.checkOutTime).diff(moment(req.body.checkInTime), "M");
            if (diff > 1) {
                throw new Error("Invalid checkIn checkOut time");
            }
            payload.subTotal = checkLocation.monthlySlot.price;
        } else {
            throw new Error("Invalid time slot");
        }
        payload.convenienceFee = Number((Number(payload.subTotal) * (Number(payload.convenienceFee) / 100)).toFixed(2));
        payload.salesTax = Number((Number(Number(payload.subTotal) + Number(payload.convenienceFee)) * (Number(payload.salesTax) / 100)).toFixed(2));
        payload.creditCardFee = Number((Number(Number(payload.subTotal) + Number(payload.convenienceFee) + Number(payload.salesTax)) * (Number(payload.creditCardFee) / 100)).toFixed(2));
        payload.total = Number((Number(payload.subTotal) + Number(payload.creditCardFee) + Number(payload.salesTax) + Number(payload.convenienceFee)).toFixed(2));

        if (!req.user.stripeId) {
            const customerCreate = await stripe.customers.create({
                phone: req.user.phoneNo,
                name: req.user.name
            });
            req.user = await Model.User.findOneAndUpdate({
                _id: req.user._id
            }, {
                stripeId: customerCreate.id
            }, {
                new: true
            });
        }
        console.log(payload.total, "payload.total");
        const customerId = req.user.stripeId;
        let amount = parseFloat((payload.total).toFixed(2));
        console.log(amount, "1111111");
        amount = Math.round(amount * 100);
        console.log(amount, "22222");
        let currency = "USD";
        let charge = null;
        if (req.body.sourceId.includes("tok")) {
            charge = await stripe.charges.create({
                amount: amount,
                currency: currency,
                source: req.body.sourceId,
                description: `Payment initiated from ${req.user.phoneNo}`
            });
        } else {
            charge = await stripe.charges.create({
                amount: amount,
                currency: currency,
                source: req.body.sourceId,
                customer: customerId,
                description: `Payment initiated from ${req.user.phoneNo}`
            });
        }
        console.log(charge, "charge");
        if (charge.status != 'succeeded') {
            throw new Error("Payment not completed");
        }
        amount = amount / 100;

        let sendObj = {};
        sendObj.userId = req.user._id;
        sendObj.amount = amount;
        sendObj.charge = charge;
        sendObj.clientId = checkLocation ? checkLocation.clientId : null;

        let transaction = await Model.Transaction.create(sendObj);
        payload.transactionId = transaction._id;
        if (req.body.bookingType == constants.BOOKING_TYPE.INSTANT) {
            payload.isCheckIn = true;
            payload.bookingStatus = constants.BOOKING_STATUS.ACTIVE;
        }
        payload.timezone = timezone;
        let booking = await Model.Booking.create(payload);
        let type = constants.locationTypeMap[booking.locationType];

        if (booking.locationType == constants.LOCATION_SLOT.MONTHLY && req.body.isRecurring) {
            console.log("Monthly subscription work start");
            let dataToSend = payload;
            dataToSend.parentId = booking._id;
            dataToSend.checkInTime = req.body.checkOutTime;
            dataToSend.checkOutTime = nextMonthcheckOutTime;
            let data = await Model.Booking.create(dataToSend);
            process.emit("repeatPayment", data);
            //Stripe repeat

            await this.startStripeRecurring(booking, req.user, req.body.sourceId);
        }
        console.log(booking.locationType,"booking.locationType");
        // if (booking.locationType == constants.LOCATION_SLOT.DAILY) {
        //     console.log("Daily subscription work start");
        //     await Model.Booking.updateOne({
        //         _id: booking._id
        //     },{
        //         $set: {
        //             isRecurring: true
        //         }
        //     });
        //     let dataToSend = payload;
        //     dataToSend.parentId = booking._id;
        //     dataToSend.checkInTime = req.body.checkOutTime;
        //     dataToSend.checkOutTime = moment(req.body.checkOutTime).add(1, "d");
        //     let data = await Model.Booking.create(dataToSend);
        //     process.emit("repeatDailyPayment", data);
        //     //Stripe repeat

        //     await this.startStripeDailyRecurring(booking, req.user, req.body.sourceId);
        // }
        if (charge && charge.source && charge.source.last4 && req.body.sourceId) {
            await Model.Booking.updateOne({
                _id: booking._id
            }, {
                $set: {
                    last4: charge ? charge.source.last4 : "",
                    cardId: req.body.sourceId
                }
            });
        }
        services.ScreenShot.screenShot({
            random: type + " Invoice - Booking - " + booking.bookingId,
            transactionId: transaction._id,
            userName: req.user.name,
            dialCode: req.user.dialCode,
            phoneNo: req.user.phoneNo,
            location: checkLocation.name,
            bookingId: booking.bookingId,
            card: charge.source.last4,
            createdAt: moment(booking.createdAt).tz(timezone).format("MM-DD-YYYY HH:mm:ss"),
            bookingType: type,
            extendBooking: "No",
            subTotal: Number(booking.subTotal),
            creditCardFee: booking.creditCardFee,
            salesTax: booking.salesTax,
            convenienceTax: booking.convenienceFee,
            total: booking.total,
            creditFee: checkLocation.creditCardFee,
            salesFee: checkLocation.salesTax,
            convenienceFee: checkLocation.convenienceFee
        });
        process.emit("updateCheckIn", booking);
        process.emit("completeBooking", booking);
        process.emit("notifyUser2", booking);
        process.emit("notifyUser", booking);

        console.log(req.body);

        await Model.Transaction.updateOne({
            _id: transaction._id
        }, {
            $set: {
                bookingId: booking._id
            }
        });
        await stripe.charges.update(charge.id, {
            description: `Payment captured for booking Id ${booking.bookingId} from user ${req.user.phoneNo}`
        });
        if (booking) {
            await Model.Slots.create({
                userId: req.user._id,
                locationId: booking.locationId,
                checkInTime: req.body.checkInTime,
                checkOutTime: req.body.checkOutTime
            });
        }
        return res.success("Booking created successfully", booking);
    } catch (error) {
        next(error);
    }
};
module.exports.getBooking = async (req, res, next) => {
    try {
        let id = req.params.id;
        let page = null;
        let limit = null;
        page = req.query.page ? Number(req.query.page) : 1;
        limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = Number((page - 1) * limit);
        if (id == null) {
            let status = Number(req.query.bookingStatus || 1);
            if (status == 1) {
                status = [1, 2];
            } else {
                status = [3];
            }
            let criteria = {
                userId: req.user._id,
                parentId: null,
                bookingStatus: {
                    $in: status
                }
            };
            let pipeline = [{
                    $match: criteria
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userId"
                    }
                },
                {
                    $unwind: {
                        path: "$userId",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "locations",
                        localField: "locationId",
                        foreignField: "_id",
                        as: "locationId"
                    }
                },
                {
                    $unwind: {
                        path: "$locationId",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "extendbookings",
                        localField: "extendBooking",
                        foreignField: "_id",
                        as: "extendBooking"
                    }
                },
                {
                    $unwind: {
                        path: "$extendBooking",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $skip: skip
                },
                {
                    $limit: limit
                }
                // Stage to match bookings with a specific company ID

            ];
            console.log(JSON.stringify(pipeline), "pipeline");
            let bookings = await Model.Booking.aggregate(pipeline);
            pipeline = pipeline.splice(0, pipeline.length - 3);
            let totalBookings = await Model.Booking.aggregate(pipeline);

            for (let i = 0; i < bookings.length; i++) {
                // eslint-disable-next-line no-prototype-builtins
                if (bookings[i] && bookings[i].hasOwnProperty('companyId')) {
                    const Booking = await Model.CompanyDrivers.findOne({
                        userId: ObjectId(req.user._id),
                        companyId: ObjectId(bookings[i].companyId),
                        isBlocked: true
                    });

                    if (Booking) {
                        bookings.splice(i, 1); // Remove the booking at index i
                        i--; // Adjust the index to account for the removed element
                    }
                }
            }


            totalBookings = bookings.length;
            console.log(status, "status");
            if (status.includes(1)) {
                for (let i = 0; i < bookings.length; i++) {
                    if (bookings[i].locationType == constants.LOCATION_SLOT.DAILY) {
                        if (bookings[i].extendedCheckOutTime) {
                            bookings[i].pendingTime = moment(bookings[i].extendedCheckOutTime).diff(moment(), "s");
                            // Add 2 hours
                            if (bookings[i].pendingTime > 50400) {
                                bookings[i].pendingTime = 50400;
                            }
                        } else {
                            bookings[i].pendingTime = moment(bookings[i].checkOutTime).diff(moment(), "s");
                            if (bookings[i].pendingTime > 43200) {
                                bookings[i].pendingTime = 43200;
                            }
                        }
                    } else if (bookings[i].locationType == constants.LOCATION_SLOT.MONTHLY) {
                        if (bookings[i].extendedCheckOutTime) {
                            bookings[i].pendingTime = moment(bookings[i].extendedCheckOutTime).diff(moment(), "s");
                            // Add 2 hours
                            if (bookings[i].pendingTime > 2637200) {
                                bookings[i].pendingTime = 2637200;
                            }
                        } else {
                            bookings[i].pendingTime = moment(bookings[i].checkOutTime).diff(moment(), "s");
                            if (bookings[i].pendingTime > 2630000) {
                                bookings[i].pendingTime = 2630000;
                            }
                        }
                    }
                }
            }
            return res.success(constants.MESSAGES.DATA_FETCHED, {
                bookings,
                totalBookings
            });
        } else {
            let booking = await Model.Booking.findOne({
                _id: ObjectId(id),
                userId: req.user._id
            });
            if (booking == null) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
            return res.success(constants.MESSAGES.DATA_FETCHED, booking);
        }
    } catch (error) {
        next(error);
    }
};
// module.exports.updateBooking = async (req, res, next) => {
//     try {
//         await Validation.User.updateBooking.validateAsync(req.body);
//         let checkBooking = await Model.Booking.findOne({
//             _id: ObjectId(req.body.bookingId),
//             userId: req.user._id
//         });
//         if (checkBooking == null) {
//             throw new Error("Booking not found");
//         }
//         if (checkBooking.bookingStatus == constants.BOOKING_STATUS.COMPLETED) {
//             throw new Error("Booking is already completed");
//         }
//         console.log(String(checkBooking.locationId),"String(checkBooking.locationId)")
//         console.log((String(checkBooking.locationId) == "654a3f5209ef9891241d964a"),"String(checkBooking.locationId)")
//         if (req.body.updateType == constants.UPDATE_TYPE.CHEKIN) {
//             if (checkBooking.bookingStatus == constants.BOOKING_STATUS.COMPLETED) {
//                 throw new Error("Booking already completed");
//             }
//             if (moment(checkBooking.checkInTime).format() > moment().format()) {
//                 throw new Error("CheckIn time is greter than current time");
//             }
//             if ((moment(checkBooking.checkOutTime).format() < moment().format()) && checkBooking.extendBooking == null) {
//                 throw new Error("Checkout time has passed");
//             }
//             if ((moment(checkBooking.extendedCheckOutTime).format() < moment().format()) && checkBooking.extendBooking != null) {
//                 throw new Error("Extended checkout time has passed");
//             }
//             if (!checkBooking.bookingStartAt) {
//                 await Model.Booking.updateOne({
//                     _id: checkBooking._id
//                 }, {
//                     $set: {
//                         bookingStartAt: moment()
//                     }
//                 });
//             }
//             await Model.Booking.findOneAndUpdate({
//                 _id: checkBooking._id
//             }, {
//                 $set: {
//                     bookingStatus: constants.BOOKING_STATUS.ACTIVE,
//                     isCheckIn: false,
//                     isCheckOut: true,
//                     isBookingEnabled: true
//                 },
//                 $push: {
//                     logs: {
//                         status: constants.UPDATE_TYPE.CHEKIN,
//                         changedAt: moment()
//                     }
//                 }
//             }, {
//                 new: true
//             });

//             if(String(checkBooking.locationId) == "6595786aefff08b998ecfa21"){
//                 //  Dont  Touch 
//                 const locationId = '654a3f5209ef9891241d964a'; // Assuming you get the location ID from the request parameters
//                 const location = await Model.Location.findById(locationId);
//                 if (!location) {
//                     return res.status(404).json({
//                         message: 'Location not found.'
//                     });
//                 }
//                 const pemFolderPath = './pemEnter/';
//                 console.log(pemFolderPath);
//                 const device = awsIot.device({
//                     keyPath: pemFolderPath + 'private.pem.key',
//                     certPath: pemFolderPath + 'device.pem.crt',
//                     caCert: pemFolderPath + 'Amazon-root-CA-1.pem',
//                     clientId: 'my-device-001',
//                     host: 'a2l9udmjqvgflv-ats.iot.us-east-2.amazonaws.com',
//                     debug: true
//                 });
//                 device.on('connect', function () {
//                     console.log('Connected to AWS IoT');

//                     // After connecting, publish the command to the desired topic
//                     const topic = location.deviceIn.deviceId;
//                     const message = JSON.stringify({
//                         command: 'checkIn',
//                         deviceId: topic
//                     });
//                     console.log(topic, "topic in");
//                     device.publish("enter", message, function (err) {
//                         if (err) {
//                             console.error('Error publishing message:', err);
//                             next(err);
//                         } else {
//                             console.log('Gate opening command sent successfully.');
//                             // res.status(200).json({ message: 'Gate opening command sent successfully.' });
//                         }

//                         device.end();
//                     });
//                 });
//             }
//         }
//         if (req.body.updateType == constants.UPDATE_TYPE.CHECKOUT) {
//             if (checkBooking.bookingStatus == constants.BOOKING_STATUS.COMPLETED) {
//                 throw new Error("Booking already completed");
//             }
//             await Model.Booking.findOneAndUpdate({
//                 _id: checkBooking._id
//             }, {
//                 $set: {
//                     bookingEndAt: moment(),
//                     isCheckIn: true,
//                     isCheckOut: false
//                 },
//                 $push: {
//                     logs: {
//                         status: constants.UPDATE_TYPE.CHECKOUT,
//                         changedAt: moment()
//                     }
//                 }
//             }, {
//                 new: true
//             });

//             if(String(checkBooking.locationId) == "6595786aefff08b998ecfa21"){
//                 //  Dont  Touch 
//                 const locationId = '6595786aefff08b998ecfa21'; // Assuming you get the location ID from the request parameters
//                 const location = await Model.Location.findById(locationId);
//                 if (!location) {
//                     return res.status(404).json({
//                         message: 'Location not found.'
//                     });
//                 }
//                 const pemFolderPath = './pemExit/';
//                 console.log(pemFolderPath);
//                 const device = awsIot.device({
//                     keyPath: pemFolderPath + 'private.pem.key',
//                     certPath: pemFolderPath + 'device.pem.crt',
//                     caCert: pemFolderPath + 'Amazon-root-CA-1.pem',
//                     clientId: 'my-device-001',
//                     host: 'a2l9udmjqvgflv-ats.iot.us-east-2.amazonaws.com',
//                     debug: true
//                 });
//                 device.on('connect', function () {
//                     console.log('Connected to AWS IoT');

//                     // After connecting, publish the command to the desired topic
//                     const topic = location.deviceOut.deviceId;
//                     const message = JSON.stringify({
//                         command: 'checkOut',
//                         deviceId: topic
//                     });
//                     console.log(topic, "topic out");
//                     device.publish("exit", message, function (err) {
//                         if (err) {
//                             console.error('Error publishing message:', err);
//                             next(err);
//                         } else {
//                             console.log('Gate opening command sent successfully.');
//                             // res.status(200).json({ message: 'Gate opening command sent successfully.' });
//                         }

//                         device.end();
//                     });
//                 });
//             }
//         }
//         return res.success("Booking updated successfully");
//     } catch (error) {
//         next(error);
//     }
// };

