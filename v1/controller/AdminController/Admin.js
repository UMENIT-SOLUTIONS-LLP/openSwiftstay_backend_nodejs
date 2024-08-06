const Model = require("./../../../models/");
const Auth = require("../../../common/authenticate");
const Validation = require("../../validations");
const mongoose = require("mongoose");
const constants = require("../../../common/constants");
const functions = require("../../../common/functions");
const emailService = require("../../../services/EmalService");
const moment = require("moment-timezone");
const services = require("../../../services/index");
const XLSX = require("xlsx");
const ObjectId = mongoose.Types.ObjectId;
const fs = require('fs');
const path = require('path');
const aws = require("aws-sdk");
const XlsxPopulate = require('xlsx-populate');


aws.config.update({
    secretAccessKey: process.env.AWS_SECRET,
    accessKeyId: process.env.AWS_KEY
});
var s3 = new aws.S3();


//Signup the admin using email.
module.exports.register = async (req, res, next) => {
    try {
        await Validation.Admin.register.validateAsync(req.body);
        if (req.body.email) {
            const checkEmail = await Model.Admin.findOne({
                email: (req.body.email).toLowerCase(),
                isDeleted: false
            });
            if (checkEmail) throw new Error(constants.MESSAGES.EMAIL_ALREADY_IN_USE);
        }
        req.body.role = constants.ROLE.ADMIN;
        const create = await Model.Admin(req.body).save();
        //Convert password to hash using bcrypt.
        await create.setPassword(req.body.password);
        await create.save();
        delete create.password;
        return res.success(constants.MESSAGES.PROfILE_CREATED_SUCCESSFULLY, create);
    } catch (error) {
        next(error);
    }
};
//Login the admin using phoneNo/Email.
module.exports.login = async (req, res, next) => {
    try {
        await Validation.Admin.login.validateAsync(req.body);
        let doc = await Model.Admin.findOne({
            email: (req.body.email).toLowerCase(),
            isDeleted: false
        });
        if (!doc) {
            throw new Error(constants.MESSAGES.INVALID_CREDENTIALS);
        }
        await doc.authenticate(req.body.password);
        if (doc.isBlocked) {
            throw new Error(constants.MESSAGES.ACCOUNT_BLOCKED);
        }
        //Create a new JTI for single session timeout
        doc.loginCount += 1;
        doc.jti = functions.generateRandomStringAndNumbers(25);

        await doc.save();
        doc = JSON.parse(JSON.stringify(doc));
        doc.accessToken = await Auth.getToken({
            _id: doc._id,
            jti: doc.jti,
            role: "admin",
            secretId: req.headers.deviceId
        });

        delete doc.password;
        return res.success(constants.MESSAGES.LOGIN_SUCCESS, doc);
    } catch (error) {
        next(error);
    }
};
//Logout the current admin and change the JTI, Also remove the current device type and device token. 
module.exports.logout = async (req, res, next) => {
    try {
        await Model.Admin.updateOne({
            _id: req.admin._id
        }, {
            deviceType: "",
            deviceToken: "",
            jti: ""
        });
        return res.success(constants.MESSAGES.LOGOUT_SUCCESS);
    } catch (error) {
        next(error);
    }
};
//Get the complete profile of the current admin.
module.exports.getProfile = async (req, res, next) => {
    try {
        const doc = await Model.Admin.findOne({
            _id: req.admin._id
        }, {
            password: 0
        });
        if (!doc) throw new Error(constants.MESSAGES.ACCOUNT_NOT_FOUND);
        if (doc.isBlocked) throw new Error(constants.MESSAGES.ACCOUNT_BLOCKED);
        return res.success(constants.MESSAGES.DATA_FETCHED, doc);
    } catch (error) {
        next(error);
    }
};
//Update the admin details.
module.exports.updateProfile = async (req, res, next) => {
    try {
        await Validation.Admin.updateProfile.validateAsync(req.body);
        const nin = {
            $nin: [req.admin._id]
        };
        if (req.body.email) {
            const checkEmail = await Model.Admin.findOne({
                _id: nin,
                email: (req.body.email).toLowerCase(),
                isDeleted: false
            });
            if (checkEmail) throw new Error(constants.MESSAGES.EMAIL_ALREADY_IN_USE);
        }
        if (req.body.phoneNo) {
            const checkPhone = await Model.Admin.findOne({
                _id: nin,
                dialCode: req.body.dialCode,
                phoneNo: req.body.phoneNo,
                ISOCode: req.body.ISOCode,
                isDeleted: false
            });
            if (checkPhone) throw new Error(constants.MESSAGES.PHONE_ALREADY_IN_USE);
        }
        delete req.body.password;
        const updated = await Model.Admin.findOneAndUpdate({
            _id: req.admin._id
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
//Change the old password with the new one.
module.exports.changePassword = async (req, res, next) => {
    try {
        await Validation.Admin.changePassword.validateAsync(req.body);
        if (req.body.oldPassword == req.body.newPassword) {
            throw new Error(constants.MESSAGES.PASSWORDS_SHOULD_BE_DIFFERENT);
        }
        const doc = await Model.Admin.findOne({
            _id: req.admin._id
        });
        if (!doc) throw new Error(constants.MESSAGES.ACCOUNT_NOT_FOUND);

        await doc.authenticate(req.body.oldPassword);
        await doc.setPassword(req.body.newPassword);
        await doc.save();

        return res.success(constants.MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY);
    } catch (error) {
        next(error);
    }
};
//Reset password in case of forgot.
module.exports.resetPassword = async (req, res, next) => {
    try {
        await Validation.Admin.resetPassword.validateAsync(req.body);
        let id = req.body.id;
        let adminId = id.split("-");
        let flag = false;
        if (adminId[1]) {
            // let time = adminId[1];
            // let dif = moment().diff(moment(time), "m");
            // if(dif > 10){
            //     throw new Error("The reset password link has expired!");
            // }
            let otp = await Model.Otp.findOne({
                adminId: adminId[0],
                link: id
            });
            if (!otp) {
                throw new Error("The link is not valid anymore!");
            }
            if (otp) {
                await Model.Otp.findByIdAndRemove(otp._id);
            }
            if (otp.type == "Owner") {
                flag = true;
            }
        } else {
            throw new Error("Invalid link!");
        }
        const doc = await Model.Admin.findOne({
            _id: ObjectId(adminId[0]),
            isDeleted: false
        });
        if (!doc) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
        await doc.setPassword(req.body.newPassword);
        doc.status = constants.PROFILE_STATUS.ACCEPTED;
        await doc.save();
        if (flag) {
            return res.success("Password set successfully.");
        } else {
            return res.success(constants.MESSAGES.PASSWORD_RESET);
        }
    } catch (error) {
        next(error);
    }
};


module.exports.checkToken = async (req, res, next) => {
    try {
        await Validation.Admin.checkToken.validateAsync(req.body);
        let id = req.body.id;
        let adminId = id.split("-");
        if (adminId[1]) {
            // let time = adminId[1];
            // let dif = moment().diff(moment(time), "m");
            // if(dif > 10){
            //     throw new Error("The reset password link has expired!");
            // }
            let otp = await Model.Otp.findOne({
                adminId: adminId[0],
                link: id
            });
            if (!otp) {
                throw new Error("The link is not valid anymore!");
            }
        } else {
            throw new Error("Invalid link!");
        }
        const doc = await Model.Admin.findOne({
            _id: ObjectId(adminId[0]),
            isDeleted: false
        });
        if (!doc) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
        await doc.save();
        return res.success(constants.MESSAGES.PASSWORD_RESET);
    } catch (error) {
        next(error);
    }
};

//Send link to the admin on email to reset the password.
module.exports.forgotPassword = async (req, res, next) => {
    try {
        await Validation.Admin.forgotPassword.validateAsync(req.body);
        const check = await Model.Admin.findOne({
            email: (req.body.email).toLowerCase(),
            isDeleted: false
        });
        if (check == null) throw new Error(constants.MESSAGES.ACCOUNT_NOT_FOUND);
        let id = check._id + "-" + moment().valueOf();
        const link = `${process.env.BASE_PATH}/reset-password?id=${id}`;
        await Model.Otp.create({
            adminId: check._id,
            link: id,
            type: "admin"
        });
        let payload = {
            link: link,
            email: (req.body.email).toLowerCase()
        };
        await emailService.sendForgotLink(payload);
        return res.success(constants.MESSAGES.LINK_SENT);
    } catch (error) {
        next(error);
    }
};

//Location
module.exports.addLocation = async (req, res, next) => {
    try {
        await Validation.Admin.addLocation.validateAsync(req.body);
        let checkLocation = await Model.Location.findOne({
            address: req.body.address,
            isDeleted: false
        });
        if (checkLocation) {
            throw new Error("Location already exists for this address");
        }
        req.body.pendingSlots = req.body.totalSlots;
        let address = await Model.Location.create(req.body);
        return res.success("Location added successfully", address);
    } catch (error) {
        next(error);
    }
};
module.exports.getLocation = async (req, res, next) => {
    try {
        let page = null;
        let limit = null;
        page = req.query.page ? Number(req.query.page) : 1;
        limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = Number((page - 1) * limit);
        let id = req.params.id;
        let loggedInAdmin = req.admin;

        if (id == null) {
            let qry = {
                isDeleted: false
            };
            if (loggedInAdmin.role === constants.ROLE.CLIENT) {
                qry.clientIds = loggedInAdmin._id;
            }

            if (req.query.search) {
                const regex = new RegExp(req.query.search, "i");
                qry.$or = [{
                    name: regex
                }, {
                    address: regex
                }];
            }
            console.log(qry, "qry");
            let location = await Model.Location.find(qry).sort({
                createdAt: -1
            }).skip(skip).limit(limit);
            let totalLocation = await Model.Location.countDocuments(qry);
            return res.success(constants.MESSAGES.DATA_FETCHED, {
                location,
                totalLocation
            });
        } else {
            let location = await Model.Location.findOne({
                _id: ObjectId(req.params.id),
                isDeleted: false
            }).populate("clientIds");
            if (location == null) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
            // location = location.toObject();

            // location.ownerName = location?.clientIds?.name;
            // location.clientIds = location?.clientIds?.id;

            console.log(location);

            const modifiedLocation = {
                ...location.toObject(),
                clientIds: location.clientIds,
                // ownerName: location.clientIds.name
            };

            // Add owner name to location


            // Now, location object has clientIds and ownerName properties
            return res.success(constants.MESSAGES.DATA_FETCHED, modifiedLocation);
        }

    } catch (error) {
        next(error);
    }
};


module.exports.getFile = async (req, res, next) => {
    try {


        let {
            folderPath,
            filename
        } = req.body;

        let pemFolderPath = folderPath === 'pemEnter' ? './pemEnter/' : './pemExit/';
        // Check if the passed folder path is valid
        if (!fs.existsSync(pemFolderPath)) {
            throw new Error('Folder path does not exist.');
        }

        // Check if the file exists in the specified folder
        const filePath = path.join(pemFolderPath, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist in the specified folder.');
        }

        // Set appropriate headers for download
        // res.setHeader('Content-disposition', 'attachment; filename=private.pem.key');
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/octet-stream');

        // Pipe the file to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        next(error);
    }
};


module.exports.updateLocation = async (req, res, next) => {
    try {
        await Validation.Admin.updateLocation.validateAsync(req.body);
        let location = await Model.Location.findOne({
            _id: ObjectId(req.params.id)
        });
        if (req.body.totalSlots) {
            let occupied = await Model.Booking.countDocuments({
                bookingStatus: constants.BOOKING_STATUS.ACTIVE,
                locationId: location._id,
                parentId: null
                // checkInTime: {
                //     $gte: moment().startOf("day"),
                //     $lte: moment().endOf("day")
                // }
            });
            if (req.body.totalSlots < occupied) {
                throw new Error("Occupied slots are more than total slots");
            }
            req.body.occupiedSlots = occupied;
            req.body.pendingSlots = req.body.totalSlots - occupied;
        }
        const updatedAddress = await Model.Location.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: req.body
        }, {
            new: true
        });
        return res.success("Location updated successfully", updatedAddress);

    } catch (error) {
        next(error);
    }
};
module.exports.deleteLocation = async (req, res, next) => {
    try {
        let check = await Model.Location.findOne({
            _id: ObjectId(req.params.id),
            isDeleted: false
        });
        if (check == null) {
            throw new Error("Location not found");
        }
        await Model.Location.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: {
                isDeleted: true
            }
        }, {
            new: true
        });
        return res.success("Location deleted successfully");
    } catch (error) {
        next(error);
    }
};

//Add CMS data.
module.exports.addCms = async (req, res, next) => {
    try {
        //Add Cms pages data
        let dataObject = {};
        if (req.body.privacyPolicy != null && req.body.privacyPolicy != "") dataObject.privacyPolicy = req.body.privacyPolicy;
        if (req.body.termsAndConditions != null && req.body.termsAndConditions != "") dataObject.termsAndConditions = req.body.termsAndConditions;
        if (req.body.aboutUs != null && req.body.aboutUs != "") dataObject.aboutUs = req.body.aboutUs;
        if (req.body.contactUs != null && req.body.contactUs != "") dataObject.contactUs = req.body.contactUs;

        let addCms = await Model.Cms.findOneAndUpdate({}, dataObject, {
            upsert: true,
            new: true
        });
        return res.success(constants.MESSAGES.SUCCESS, addCms);

    } catch (error) {
        next(error);
    }
};
module.exports.getCms = async (req, res, next) => {
    try {
        const cmsData = await Model.Cms.findOne({});
        return res.success(constants.MESSAGES.DATA_FETCHED, cmsData);
    } catch (error) {
        next(error);
    }
};

//User
module.exports.addUser = async (req, res, next) => {
    try {
        await Validation.Admin.addUser.validateAsync(req.body);
        if (req.body.phoneNo) {
            let checkPhone = await Model.User.findOne({
                dialCode: req.body.dialCode,
                phoneNo: req.body.phoneNo,
                isPhoneVerified: true,
                isDeleted: false,
                ISOCode: req.body.ISOCode
            });
            if (checkPhone) {
                throw new Error(constants.MESSAGES.PHONE_ALREADY_IN_USE);
            } else {
                await Model.User.deleteMany({
                    dialCode: req.body.dialCode,
                    phoneNo: req.body.phoneNo,
                    isPhoneVerified: false,
                    isDeleted: false,
                    ISOCode: req.body.ISOCode
                });
            }
            req.body.isPhoneVerified = true;
        }
        let addUser = await Model.User.create(req.body);
        return res.success(constants.MESSAGES.USER_CREATED_SUCCESSFULLY, addUser);
    } catch (error) {
        next(error);
    }
};
module.exports.getUser = async (req, res, next) => {
    try {
        let id = req.params.id;
        let page = null;
        let limit = null;
        page = req.query.page ? Number(req.query.page) : 1;
        limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = Number((page - 1) * limit);
        let loggedInAdmin = req.admin;

        if (id == null) {
            let qry = {};
            if (req.query.search) {
                const regex = new RegExp(req.query.search, "i");
                qry._search = regex;
            }
            let criteria = {
                isDeleted: false
            };
            let pipeline = [];
            if (loggedInAdmin.role === constants.ROLE.CLIENT) {
                let locations = await Model.Location.distinct("_id", {
                    clientIds: loggedInAdmin._id
                });
                let company = [],
                    driver = [];
                let comapnies = await Model.Company.distinct("_id", {
                    clientIds: loggedInAdmin._id
                });
                comapnies.map((u) => company.push(ObjectId(u)));
                let comapnyDrivers = await Model.CompanyDrivers.distinct("userId", {
                    companyId: {
                        $in: company
                    }
                });
                comapnyDrivers.map((u) => driver.push(ObjectId(u)));
                pipeline = [{
                        $match: {
                            clientIds: loggedInAdmin._id
                        }
                    }, {
                        $lookup: {
                            "from": "bookings",
                            "let": {
                                "locationId": "$_id"
                            },
                            "pipeline": [{
                                "$match": {
                                    "$expr": {
                                        $and: [{
                                            "$eq": ["$locationId", "$$locationId"]
                                        }, {
                                            "$eq": ["$parentId", null]
                                        }]
                                    }
                                }
                            }, {
                                $project: {
                                    userId: 1,
                                    _id: 0
                                }
                            }],
                            "as": "bookings"
                        }
                    },
                    {
                        $unwind: "$bookings"
                    },
                    {
                        $group: {
                            _id: "$bookings.userId"
                        }
                    },
                    {
                        $addFields: {
                            id: {
                                $concatArrays: [
                                    ["$_id"], comapnyDrivers
                                ]
                            }
                        }
                    },
                    {
                        "$unwind": "$id"
                    },
                    {
                        "$group": {
                            "_id": "$id"
                        }
                    },
                    {
                        $lookup: {
                            "from": "users",
                            "let": {
                                "id": "$_id"
                            },
                            "pipeline": [{
                                "$match": {
                                    "$expr": {
                                        $and: [{
                                            "$eq": ["$_id", "$$id"]
                                        }, {
                                            "$eq": ["$isDeleted", false]
                                        }]
                                    }
                                }
                            }],
                            "as": "user"
                        }
                    }, {

                        $unwind: "$user"
                    }, {

                        $replaceRoot: {
                            newRoot: "$user"
                        }
                    },
                    {
                        $addFields: {
                            _search: {
                                "$concat": [{
                                        "$ifNull": ["$name", ""]
                                    },
                                    "-",
                                    {
                                        "$ifNull": ["$email", ""]
                                    },
                                    "-",
                                    {
                                        "$ifNull": ["$phoneNo", ""]
                                    }
                                ]
                            }
                        }
                    },
                    {
                        $match: qry
                    }, {
                        "$lookup": {
                            "from": "bookings",
                            "let": {
                                "userId": "$_id"
                            },
                            "pipeline": [{
                                "$match": {
                                    "$expr": {
                                        $and: [{
                                            "$eq": ["$userId", "$$userId"]
                                        }, {
                                            "$in": ["$bookingStatus", [constants.BOOKING_STATUS.UPCOMING, constants.BOOKING_STATUS.ACTIVE]]
                                        }, {
                                            "$in": ["$locationId", locations]
                                        }, {
                                            "$eq": ["$parentId", null]
                                        }]
                                    }
                                }
                            }],
                            "as": "activeBookingCount"
                        }
                    }, {
                        "$lookup": {
                            "from": "bookings",
                            "let": {
                                "userId": "$_id"
                            },
                            "pipeline": [{
                                "$match": {
                                    "$expr": {
                                        $and: [{
                                            "$eq": ["$userId", "$$userId"]
                                        }, {
                                            "$in": ["$bookingStatus", [constants.BOOKING_STATUS.COMPLETED]]
                                        }, {
                                            "$in": ["$locationId", locations]
                                        }, {
                                            "$eq": ["$parentId", null]
                                        }]
                                    }
                                }
                            }],
                            "as": "pastBookingCount"
                        }
                    }, {
                        $addFields: {
                            activeBookings: {
                                $size: "$activeBookingCount"
                            },
                            pastBookings: {
                                $size: "$pastBookingCount"
                            }
                        }
                    }, {
                        $project: {
                            pastBookingCount: 0,
                            activeBookingCount: 0
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
                ];
                console.log(JSON.stringify(pipeline), "pipeline");
                let user = await Model.Location.aggregate(pipeline);
                pipeline = pipeline.splice(0, pipeline.length - 3);
                let totalUser = await Model.Location.aggregate(pipeline);
                totalUser = totalUser.length;
                return res.success(constants.MESSAGES.DATA_FETCHED, {
                    user,
                    totalUser
                });
            } else {
                pipeline = [{
                        $match: criteria
                    },
                    {
                        $addFields: {
                            _search: {
                                "$concat": [{
                                        "$ifNull": ["$name", ""]
                                    },
                                    "-",
                                    {
                                        "$ifNull": ["$email", ""]
                                    },
                                    "-",
                                    {
                                        "$ifNull": ["$phoneNo", ""]
                                    }
                                ]
                            }
                        }
                    },
                    {
                        $match: qry
                    }, {
                        "$lookup": {
                            "from": "bookings",
                            "let": {
                                "userId": "$_id"
                            },
                            "pipeline": [{
                                "$match": {
                                    "$expr": {
                                        $and: [{
                                            "$eq": ["$userId", "$$userId"]
                                        }, {
                                            "$in": ["$bookingStatus", [constants.BOOKING_STATUS.UPCOMING, constants.BOOKING_STATUS.ACTIVE]]
                                        }, {
                                            "$eq": ["$parentId", null]
                                        }]
                                    }
                                }
                            }],
                            "as": "activeBookingCount"
                        }
                    }, {
                        "$lookup": {
                            "from": "bookings",
                            "let": {
                                "userId": "$_id"
                            },
                            "pipeline": [{
                                "$match": {
                                    "$expr": {
                                        $and: [{
                                            "$eq": ["$userId", "$$userId"]
                                        }, {
                                            "$in": ["$bookingStatus", [constants.BOOKING_STATUS.COMPLETED]]
                                        }, {
                                            "$eq": ["$parentId", null]
                                        }]
                                    }
                                }
                            }],
                            "as": "pastBookingCount"
                        }
                    }, {
                        $addFields: {
                            activeBookings: {
                                $size: "$activeBookingCount"
                            },
                            pastBookings: {
                                $size: "$pastBookingCount"
                            }
                        }
                    }, {
                        $project: {
                            pastBookingCount: 0,
                            activeBookingCount: 0
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
                ];
                console.log(JSON.stringify(pipeline), "pipeline");
                let user = await Model.User.aggregate(pipeline);
                pipeline = pipeline.splice(0, pipeline.length - 3);
                let totalUser = await Model.User.aggregate(pipeline);
                totalUser = totalUser.length;
                return res.success(constants.MESSAGES.DATA_FETCHED, {
                    user,
                    totalUser
                });
            }
        } else {
            let user = await Model.User.findOne({
                _id: ObjectId(id),
                isDeleted: false
            }).lean();
            if (user == null) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
            user.activeBookings = await Model.Booking.countDocuments({
                userId: user._id,
                bookingStatus: {
                    $in: [constants.BOOKING_STATUS.ACTIVE, constants.BOOKING_STATUS.UPCOMING]
                },
                parentId: null
            });
            user.pastBookings = await Model.Booking.countDocuments({
                userId: user._id,
                bookingStatus: {
                    $in: [constants.BOOKING_STATUS.COMPLETED]
                },
                parentId: null
            });
            return res.success(constants.MESSAGES.DATA_FETCHED, user);
        }
    } catch (error) {
        next(error);
    }
};
module.exports.updateUser = async (req, res, next) => {
    try {
        await Validation.Admin.updateUser.validateAsync(req.body);
        if (req.body.phoneNo) {
            let checkPhone = await Model.User.findOne({
                _id: {
                    $nin: [ObjectId(req.params.id)]
                },
                dialCode: req.body.dialCode,
                phoneNo: req.body.phoneNo,
                isPhoneVerified: true,
                isDeleted: false,
                ISOCode: req.body.ISOCode
            });
            if (checkPhone) {
                throw new Error(constants.MESSAGES.PHONE_ALREADY_IN_USE);
            } else {
                await Model.User.deleteMany({
                    dialCode: req.body.dialCode,
                    phoneNo: req.body.phoneNo,
                    isPhoneVerified: false,
                    isDeleted: false,
                    ISOCode: req.body.ISOCode
                });
            }
            checkPhone = await Model.User.findOne({
                _id: ObjectId(req.params.id)
            });
            if (JSON.stringify(req.body.phoneNo) != JSON.stringify(checkPhone.phoneNo)) {
                await Model.User.updateOne({
                    _id: ObjectId(req.params.id)
                }, {
                    $set: {
                        jti: ""
                    }
                });
            }
        }

        const doc = await Model.User.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: req.body
        }, {
            new: true
        });
        return res.success(constants.MESSAGES.PROFILE_UPDATED_SUCCESSFULLY, doc);

    } catch (error) {
        next(error);
    }
};
module.exports.deleteUser = async (req, res, next) => {
    try {
        let check = await Model.User.findOne({
            _id: ObjectId(req.params.id),
            isDeleted: false
        });
        if (check == null) {
            throw new Error("User not found");
        }
        const doc = await Model.User.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: {
                isDeleted: true
            }
        }, {
            new: true
        });
        return res.success(constants.MESSAGES.PROFILE_DELETED_SUCCESSFULLY, doc);
    } catch (error) {
        next(error);
    }
};

//Booking
module.exports.getBooking = async (req, res, next) => {
    try {
        console.log("sadfafdsadfsdfsdf");
        let id = req.params.id;
        let page = null;
        let limit = null;
        page = req.query.page ? Number(req.query.page) : 1;
        limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = Number((page - 1) * limit);
        let loggedInAdmin = req.admin;

        if (id == null) {
            let criteria = {
                parentId: null
            };
            //Client can have multiple locations
            if (loggedInAdmin.role === constants.ROLE.CLIENT) {
                let locations = await Model.Location.distinct("_id", {
                    clientIds: loggedInAdmin._id
                });
                console.log(locations, "locations");
                criteria.locationId = {
                    $in: locations
                };
            }
            let status = Number(req.query.bookingStatus || 1);
            if (status == 1) {
                status = [1, 2];
            } else {
                status = [3];
            }
            criteria.bookingStatus = {
                $in: status

            };
            let qry = {};
            if (req.query.search) {
                const regex = new RegExp(req.query.search, "i");
                qry._search = regex;
            }
            if (req.query.userId) {
                criteria.userId = ObjectId(req.query.userId);
            }
            // criteria.companyId = null; //Ready for live
            if (req.query.companyId) {
                criteria.companyId = ObjectId(req.query.companyId);
            }
            // if (req.admin && req.admin.role === 2) {
            //     let location = await Model.Location.findOne({
            //         clientIds: ObjectId(req.admin.id),
            //         isDeleted: false
            //     })
            //     criteria.locationId = ObjectId(location.id)
            // }
            console.log(criteria, "criteria");
            let pipeline = [{
                    $match: criteria
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: {
                            userId: "$userId"
                        },
                        pipeline: [{
                            $match: {
                                "$expr": {
                                    $and: [{
                                        $eq: ["$_id", "$$userId"]
                                    }]
                                }
                            }
                        }],
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
                    $addFields: {
                        _search: {
                            "$concat": [{
                                    "$ifNull": ["$userId.name", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$userId.phoneNo", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$locationId.name", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$locationId.address", ""]
                                }
                            ]
                        }
                    }
                },
                {
                    $match: qry
                },
                {
                    $lookup: {
                        from: "transactions",
                        localField: "_id",
                        foreignField: "bookingId",
                        as: "transactions"
                    }
                },
                {
                    $unwind: {
                        path: "$transactions",
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
                    $skip: skip
                },
                {
                    $limit: limit
                }
            ];
            console.log(JSON.stringify(pipeline), "pipeline");
            let bookings = await Model.Booking.aggregate(pipeline);
            // let data = JSON.parse(JSON.stringify(bookings));
            // bookings = [];
            // for(let i = 0 ; i < data.length ; i++){
            //     if(data[i] && data[i].userId != null && data[i].bookingType == constants.BOOKING_TYPE.FLEET){
            //         bookings.push(data[i]);
            //     }
            // }
            pipeline = pipeline.splice(0, pipeline.length - 6);
            let totalBookings = await Model.Booking.aggregate(pipeline);
            totalBookings = totalBookings.length;

            return res.success(constants.MESSAGES.DATA_FETCHED, {
                bookings,
                totalBookings
            });
        } else {
            let booking = await Model.Booking.findOne({
                _id: ObjectId(id)
            }).populate("userId locationId extendBooking transactionId").lean();
            if (booking == null) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
            if (booking.bookingStatus != constants.BOOKING_STATUS.COMPLETED) {
                if (booking.extendedCheckOutTime) {
                    booking.pendingTime = moment(booking.extendedCheckOutTime).diff(moment(), "s");
                    if (booking.pendingTime > 50400) {
                        booking.pendingTime = 50400;
                    }
                } else {
                    booking.pendingTime = moment(booking.checkOutTime).diff(moment(), "s");
                    if (booking.pendingTime > 43200) {
                        booking.pendingTime = 43200;
                    }
                }
            }
            return res.success(constants.MESSAGES.DATA_FETCHED, booking);
        }
    } catch (error) {
        console.log(error);
        next(error);
    }
};

module.exports.getFirstBooking = async (req, res, next) => {
    try {
        let loggedInAdmin = req.admin;

        // if (id == null) {
        let criteria = {
            parentId: null
        };
        //Client can have multiple locations
        if (loggedInAdmin.role === constants.ROLE.CLIENT) {
            let locations = await Model.Location.distinct("_id", {
                clientIds: loggedInAdmin._id
            });
            criteria.locationId = {
                $in: locations
            };
        }
        let qry = {};
        if (req.query.userId) {
            criteria.userId = ObjectId(req.query.userId);
        }
        console.log(criteria, "criteria");
        let pipeline = [{
                $match: criteria
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        userId: "$userId"
                    },
                    pipeline: [{
                        $match: {
                            "$expr": {
                                $and: [{
                                    $eq: ["$_id", "$$userId"]
                                }, {
                                    $eq: ["$isDeleted", false]
                                }]
                            }
                        }
                    }],
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
                $addFields: {
                    _search: {
                        "$concat": [{
                                "$ifNull": ["$userId.name", ""]
                            },
                            "-",
                            {
                                "$ifNull": ["$userId.phoneNo", ""]
                            },
                            "-",
                            {
                                "$ifNull": ["$locationId.name", ""]
                            },
                            "-",
                            {
                                "$ifNull": ["$locationId.address", ""]
                            }
                        ]
                    }
                }
            },
            {
                $match: qry
            },
            {
                $sort: {
                    createdAt: 1
                }
            },
            {
                $limit: 1
            }
        ];
        // console.log(JSON.stringify(pipeline), "pipeline");
        let bookings = await Model.Booking.aggregate(pipeline);
        let data = JSON.parse(JSON.stringify(bookings));

        bookings = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i] && data[i].userId != null && data[i].bookingType == constants.BOOKING_TYPE.FLEET) {
                bookings.push(data[i]);
            }
        }
        return res.success(constants.MESSAGES.DATA_FETCHED, {
            bookings
        });
        // } 
    } catch (error) {
        next(error);
    }
};

module.exports.getReports = async (req, res, next) => {
    try {
        let timezone = req.headers.timezone || "Asia/Kolkata";
        let sheetName = "bookings";
        let loggedInAdmin = req.admin;

        let criteria = {
            parentId: null
        };
        //Client can have multiple locations
        if (loggedInAdmin.role === constants.ROLE.CLIENT) {
            let locations = await Model.Location.distinct("_id", {
                clientIds: loggedInAdmin._id
            });
            criteria.locationId = {
                $in: locations
            };
        }
        console.log(moment(req.body.startDate), "123", moment(req.body.startDate).format("YYYY-MM-DD HH:mm:ss"), "723ye23ehiu23b")
        console.log(new Date(moment(req.body.startDate).format("YYYY-MM-DD HH:mm:ss")), "1234", new Date(moment(req.body.endDate).format("YYYY-MM-DD HH:mm:ss")), "111111")
        let pipeline = [{
                $match: criteria
            },
            {
                $match: {
                    createdAt: {
                        $gte: new Date(moment(req.body.startDate).format("YYYY-MM-DD HH:mm:ss")),
                        $lte: new Date(moment(req.body.endDate).format("YYYY-MM-DD HH:mm:ss"))
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        userId: "$userId"
                    },
                    pipeline: [{
                        $match: {
                            "$expr": {
                                $and: [{
                                    $eq: ["$_id", "$$userId"]
                                }, {
                                    $eq: ["$isDeleted", false]
                                }]
                            }
                        }
                    }, {
                        $project: {
                            name: 1,
                            email: 1,
                            dialCode: 1,
                            phoneNo: 1
                        }
                    }],
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
                    "from": "locations",
                    "let": {
                        "locationId": "$locationId"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    "$eq": ["$_id", "$$locationId"]
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1
                            }
                        },
                        {
                            $lookup: {
                                from: "admins",
                                localField: "clientIds",
                                foreignField: "_id",
                                as: "clientIds"
                            }
                        },
                        // {
                        //     "$unwind": "$clientIds"
                        // }
                    ],
                    "as": "locationId"
                }
            },
            {
                $unwind: {
                    path: "$locationId",
                    preserveNullAndEmptyArrays: true
                }
            }, {
                "$lookup": {
                    "from": "transactions",
                    "let": {
                        "id": "$_id"
                    },
                    "pipeline": [{
                        "$match": {
                            "$expr": {
                                "$and": [{
                                    "$eq": ["$bookingId", "$$id"]
                                }]

                            },
                            extendBookingId: null
                        }
                    }, {
                        $project: {
                            _id: 1
                        }
                    }],
                    "as": "transactions"
                }
            },
            {
                $unwind: {
                    path: "$transactions",
                    preserveNullAndEmptyArrays: false
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
            }, {
                $addFields: {
                    isExtended: {
                        $ifNull: ["$extendBooking", false]
                    }
                }
            }, {
                $project: {
                    _id: 0,
                    BookingId: "$bookingId",
                    CreatedAt: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$createdAt",
                            timezone: timezone
                        }
                    },
                    BookingType: {
                        $cond: {
                            if: {
                                $eq: ["$locationType", constants.LOCATION_SLOT.DAILY]
                            },
                            then: "Daily",
                            else: {
                                $cond: {
                                    if: {
                                        $eq: ["$locationType", constants.LOCATION_SLOT.MONTHLY]
                                    },
                                    then: "Monthly",
                                    else: {
                                        $cond: {
                                            if: {
                                                $eq: ["$locationType", constants.LOCATION_SLOT.HOURLY]
                                            },
                                            then: "Hourly",
                                            else: "Overnight"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    BookingStatus: {
                        $cond: {
                            if: {
                                $eq: ["$bookingStatus", constants.BOOKING_STATUS.ACTIVE]
                            },
                            then: "Active",
                            else: {
                                $cond: {
                                    if: {
                                        $eq: ["$bookingStatus", constants.BOOKING_STATUS.UPCOMING]
                                    },
                                    then: "Upcoming",
                                    else: "Completed"
                                }
                            }
                        }
                    },
                    CheckInTime: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$checkInTime",
                            timezone: timezone
                        }
                    },
                    ChekOutTime: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$checkOutTime",
                            timezone: timezone
                        }
                    },
                    ParkingFee: "$subTotal",
                    ConvenienceFee: "$convenienceFee",
                    SalesTax: "$salesTax",
                    CreditCardFee: "$creditCardFee",
                    Total: "$total",
                    DriverName: "$userId.name",
                    DriverDialCode: "$userId.dialCode",
                    DriverPhoneNo: "$userId.phoneNo",
                    Location: "$locationId.name",
                    Owner: {
                        "$reduce": {
                            "input": "$locationId.clientIds.name",
                            "initialValue": "",
                            "in": {
                                "$cond": {
                                    "if": {
                                        "$eq": [{
                                            "$indexOfArray": ["$values", "$$this"]
                                        }, 0]
                                    },
                                    "then": {
                                        "$concat": ["$$value", "$$this"]
                                    },
                                    "else": {
                                        "$concat": ["$$value", ",", "$$this"]
                                    }
                                }
                            }
                        }
                    },
                    Extended: {
                        $cond: {
                            if: {
                                $eq: ["$isExtended", false]
                            },
                            then: false,
                            else: true
                        }
                    },
                    ExtendedCheckInTime: {
                        $cond: {
                            if: {
                                $eq: ["$isExtended", false]
                            },
                            then: "",
                            else: {
                                $dateToString: {
                                    format: "%Y-%m-%d %H:%M",
                                    date: "$checkOutTime",
                                    timezone: timezone
                                }
                            }
                        }
                    },
                    ExtendedCheckOutTime: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$extendedCheckOutTime",
                            timezone: timezone
                        }
                    },
                    ExtendedParkingFee: "$extendBooking.subTotal",
                    ExtendedConvenienceFee: "$extendBooking.convenienceFee",
                    ExtendedSalesTax: "$extendBooking.salesTax",
                    ExtendedCreditCardFee: "$extendBooking.creditCardFee",
                    ExtendedTotal: "$extendBooking.total",
                    BookingTotal: {
                        $sum: ["$extendBooking.total", "$total"]
                    }
                }
            }
        ];
        console.log(JSON.stringify(pipeline), "pipeline");
        let bookings = await Model.Booking.aggregate(pipeline).exec();
        console.log(bookings.length, "111111");
        if (bookings.length === 0) {
            throw new Error(constants.MESSAGES.DATA_NOT_FOUND);
        }

        var ws = XLSX.utils.json_to_sheet(bookings, {
            header: ["BookingId", "CreatedAt", "BookingType", "BookingStatus", "CheckInTime", "ChekOutTime", "ParkingFee", "ConvenienceFee", "SalesTax", "CreditCardFee",
                "Total", "DriverName", "DriverDialCode", "DriverPhoneNo", "Location", "Owner", "Extended", "ExtendedCheckInTime", "ExtendedCheckOutTime",
                "ExtendedParkingFee", "ExtendedConvenienceFee", "ExtendedSalesTax", "ExtendedCreditCardFee", "ExtendedTotal", "BookingTotal"
            ]
        });
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, (sheetName).replace(/ /g, ''));
        let sendFileName = (sheetName).replace(/ /g, '') + ".xlsx";
        XLSX.writeFile(wb, "./public/" + sendFileName);

        // return res.redirect(process.env.BASE_URL + "/" + sendFileName);
        return res.success(constants.MESSAGES.SUCCESS, {
            redirection: process.env.BASE_URL + "/" + sendFileName
        });
    } catch (error) {
        next(error);
    }
};
//Transaction
module.exports.getTransactions = async (req, res, next) => {
    try {
        let id = req.params.id;
        let page = null;
        let limit = null;
        page = req.query.page ? Number(req.query.page) : 1;
        limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = Number((page - 1) * limit);
        if (id == null) {
            let criteria = {};
            if (req.query.userId) {
                criteria.userId = ObjectId(req.query.userId);
            }
            let qry = {};
            if (req.query.search) {
                const regex = new RegExp(req.query.search, "i");
                qry._search = regex;
            }
            let pipeline = [{
                    $match: criteria
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: {
                            userId: "$userId"
                        },
                        pipeline: [{
                            $match: {
                                "$expr": {
                                    $and: [{
                                        $eq: ["$_id", "$$userId"]
                                    }, {
                                        $eq: ["$isDeleted", false]
                                    }]
                                }
                            }
                        }],
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
                        from: "bookings",
                        let: {
                            bookingId: "$bookingId"
                        },
                        pipeline: [{
                                $match: {
                                    "$expr": {
                                        $and: [{
                                            $eq: ["$_id", "$$bookingId"]
                                        }, {
                                            $eq: ["$parentId", null]
                                        }]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: "locations",
                                    let: {
                                        locationId: "$locationId"
                                    },
                                    pipeline: [{
                                        $match: {
                                            "$expr": {
                                                $and: [{
                                                    $eq: ["$_id", "$$locationId"]
                                                }]
                                            }
                                        }
                                    }],
                                    as: "locationId"
                                }
                            },
                            {
                                $unwind: {
                                    path: "$locationId",
                                    preserveNullAndEmptyArrays: false
                                }
                            }
                        ],
                        as: "bookingId"
                    }
                },
                {
                    $unwind: {
                        path: "$bookingId",
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $addFields: {
                        bookingNumber: {
                            $substr: ["$bookingId.bookingId", 0, -1]
                        }
                    }
                },
                {
                    $addFields: {
                        _search: {
                            "$concat": [{
                                    "$ifNull": ["$userId.name", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$userId.phoneNo", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$bookingNumber", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$charge.id", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$bookingId.locationId.name", ""]
                                }
                            ]
                        }
                    }
                },
                {
                    $match: qry
                },
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $lookup: {
                        from: "extendbookings",
                        localField: "extendBookingId",
                        foreignField: "_id",
                        as: "extendBookingId"
                    }
                },
                {
                    $unwind: {
                        path: "$extendBooking",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ];
            console.log(JSON.stringify(pipeline), "pipeline");
            let transactions = await Model.Transaction.aggregate(pipeline);
            pipeline = pipeline.splice(0, pipeline.length - 4);
            let totalTransactions = await Model.Transaction.aggregate(pipeline);
            totalTransactions = totalTransactions.length;

            return res.success(constants.MESSAGES.DATA_FETCHED, {
                transactions,
                totalTransactions
            });
        } else {
            let transactions = await Model.Transaction.findOne({
                _id: ObjectId(id)
            }).populate("userId bookingId extendBookingId");
            if (transactions == null) throw new Error(constants.MESSAGES.USER_DATA_MISSING);
            return res.success(constants.MESSAGES.DATA_FETCHED, transactions);
        }
    } catch (error) {
        next(error);
    }
};
module.exports.exportTransactions = async (req, res, next) => {
    try {
        let timezone = req.headers.timezone || "Asia/Kolkata";
        let sheetName = "transactions";
        let loggedInAdmin = req.admin;

        let criteria = {};
        //Client can have multiple locations
        if (loggedInAdmin.role === constants.ROLE.CLIENT) {
            criteria.clientIds = loggedInAdmin._id;
        }
        if (req.query.startDate && req.query.endDate) {
            criteria.createdAt = {
                $gte: new Date(moment(req.query.startDate).format("YYYY-MM-DD HH:mm:ss")),
                $lte: new Date(moment(req.query.endDate).format("YYYY-MM-DD HH:mm:ss"))
            }
        }
        let pipeline = [{
                $match: criteria
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        userId: "$userId"
                    },
                    pipeline: [{
                        $match: {
                            "$expr": {
                                $and: [{
                                    $eq: ["$_id", "$$userId"]
                                }, {
                                    $eq: ["$isDeleted", false]
                                }]
                            }
                        }
                    }],
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
                    from: "bookings",
                    let: {
                        bookingId: "$bookingId"
                    },
                    pipeline: [{
                            $match: {
                                "$expr": {
                                    $and: [{
                                        $eq: ["$_id", "$$bookingId"]
                                    }, {
                                        $eq: ["$parentId", null]
                                    }]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "locations",
                                let: {
                                    locationId: "$locationId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$locationId"]
                                            }]
                                        }
                                    }
                                }],
                                as: "locationId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$locationId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    as: "bookingId"
                }
            },
            {
                $unwind: {
                    path: "$bookingId",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $sort: {
                    _id: -1
                }
            },
            {
                $lookup: {
                    from: "extendbookings",
                    localField: "extendBookingId",
                    foreignField: "_id",
                    as: "extendBookingId"
                }
            },
            {
                $unwind: {
                    path: "$extendBooking",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    bookingNumber: {
                        $substr: ["$bookingId.bookingId", 0, -1]
                    }
                }
            },
            {
                $project: {
                    BookingId: "$bookingId.bookingId",
                    DriverName: "$userId.name",
                    DriverDialCode: "$userId.dialCode",
                    DriverPhoneNo: "$userId.phoneNo",
                    CreatedAt: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$createdAt",
                            timezone: timezone
                        }
                    },
                    Amount: "$amount",
                    Status: "Paid",
                    BookingType: {
                        $cond: {
                            if: {
                                $eq: ["$bookingId.locationType", constants.LOCATION_SLOT.DAILY]
                            },
                            then: "Daily",
                            else: {
                                $cond: {
                                    if: {
                                        $eq: ["$bookingId.locationType", constants.LOCATION_SLOT.MONTHLY]
                                    },
                                    then: "Monthly",
                                    else: {
                                        $cond: {
                                            if: {
                                                $eq: ["$bookingId.locationType", constants.LOCATION_SLOT.HOURLY]
                                            },
                                            then: "Hourly",
                                            else: "Overnight"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    Location: "$bookingId.locationId.name",
                    _id: 0
                }
            }
        ];
        console.log(JSON.stringify(pipeline), "pipeline");
        let transactions = await Model.Transaction.aggregate(pipeline).exec();
        console.log(JSON.stringify(transactions), "111111");
        if (transactions.length === 0) {
            throw new Error(constants.MESSAGES.DATA_NOT_FOUND);
        }

        var ws = XLSX.utils.json_to_sheet(transactions, {
            header: ["BookingId", "DriverName", "DriverDialCode", "DriverPhoneNo", "CreatedAt", "Amount", "Status", "BookingType", "Location"]
        });
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, (sheetName).replace(/ /g, ''));
        let sendFileName = (sheetName).replace(/ /g, '') + moment().format("DD-MM-YYYY") + "_sheet" + ".xlsx";
        XLSX.writeFile(wb, "./public/" + sendFileName);

        // return res.redirect(process.env.BASE_URL + "/" + sendFileName);
        return res.success(constants.MESSAGES.SUCCESS, {
            redirection: process.env.BASE_URL + "/" + sendFileName
        });

    } catch (error) {
        next(error);
    }
};

//Owner
module.exports.inviteOwner = async (req, res, next) => {
    try {
        await Validation.Admin.inviteOwner.validateAsync(req.body);
        if (req.body.email) {
            const checkEmail = await Model.Admin.findOne({
                email: (req.body.email).toLowerCase(),
                // role: constants.ROLE.CLIENT,
                isDeleted: false
            });
            if (checkEmail) throw new Error(constants.MESSAGES.EMAIL_ALREADY_IN_USE);
        }
        req.body.role = constants.ROLE.CLIENT;
        req.body.permission = [];
        req.body.permission = [{
            label: "Dashboard",
            isView: true,
            isAdd: true
        }, {
            label: "Locations",
            isView: true,
            isAdd: false
        }, {
            label: "Booking",
            isView: true,
            isAdd: true
        }, {
            label: "Drivers",
            isView: true,
            isAdd: true
        }, {
            label: "fleetmanager",
            isView: true,
            isAdd: true
        }];
        const create = await Model.Admin(req.body).save();

        let id = create._id + "-" + moment().valueOf();
        const link = `${process.env.BASE_PATH}/set-password?id=${id}`;
        await Model.Otp.create({
            adminId: create._id,
            link: id,
            type: "Owner"
        });
        let payload = {
            link: link,
            name: create.name,
            email: (req.body.email).toLowerCase()
        };
        await emailService.sendInviteLink(payload);
        return res.success("Invitation sent successfully");
    } catch (error) {
        next(error);
    }
};
module.exports.getOwners = async (req, res, next) => {
    try {
        let id = req.params.id;
        let page = null;
        let limit = null;
        page = req.query.page ? Number(req.query.page) : 1;
        limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = Number((page - 1) * limit);
        if (id == null) {
            let qry = {};
            if (req.query.search) {
                const regex = new RegExp(req.query.search, "i");
                qry._search = regex;
            }
            let criteria = {
                isDeleted: false,
                role: constants.ROLE.CLIENT
            };
            let pipeline = [{
                    $match: criteria
                },
                {
                    $addFields: {
                        _search: {
                            "$concat": [{
                                    "$ifNull": ["$name", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$email", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$phoneNo", ""]
                                }
                            ]
                        }
                    }
                },
                {
                    $match: qry
                },
                {
                    "$lookup": {
                        "from": "locations",
                        "let": {
                            "clientId": "$_id"
                        },
                        "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                            "$in": ["$$clientId", {
                                                "$ifNull": ["$clientIds", []]
                                            }]
                                        },
                                        {
                                            "$eq": ["$isDeleted", false]
                                        }
                                    ]
                                }
                            }
                        }],
                        "as": "locations"
                    }
                },
                {
                    $addFields: {
                        totalLocations: {
                            $size: "$locations"
                        }

                    }
                }, {
                    $project: {
                        locations: 0
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
            ];
            let SubAdmin = await Model.Admin.aggregate(pipeline);
            console.log(SubAdmin);

            pipeline = pipeline.splice(0, pipeline.length - 2);
            if (req.url.includes("all")) {
                SubAdmin = await Model.Admin.aggregate(pipeline);
            }
            let totalSubAdmin = await Model.Admin.aggregate(pipeline);
            totalSubAdmin = totalSubAdmin.length;

            return res.success(constants.MESSAGES.DATA_FETCHED, {
                SubAdmin,
                totalSubAdmin
            });
        } else {
            let data = await Model.Admin.findOne({
                _id: ObjectId(id),
                role: constants.ROLE.CLIENT,
                isDeleted: false
            }).lean();
            data.totalLocations = await Model.Location.countDocuments({
                isDeleted: false,
                clientIds: data._id
            });
            if (data == null) throw new Error("Owner data not found");
            return res.success(constants.MESSAGES.DATA_FETCHED, data);
        }
    } catch (error) {
        console.log(error, "Asdfasdfasdf");
        next(error);
    }
};
module.exports.updateOwner = async (req, res, next) => {
    try {
        console.log(req.body.id);
        await Validation.Admin.updateOwner.validateAsync(req.body);
        if (req.body.phoneNo) {
            let checkPhone = await Model.Admin.findOne({
                _id: {
                    $ne: ObjectId(req.params.id)
                },
                // role: constants.ROLE.CLIENT,
                dialCode: req.body.dialCode,
                phoneNo: req.body.phoneNo,
                ISOCode: req.body.ISOCode,
                isDeleted: false
            });
            if (checkPhone) {
                throw new Error(constants.MESSAGES.PHONE_ALREADY_IN_USE);
            }
        }
        if (req.body.email) {
            let checkEmail = await Model.Admin.findOne({
                _id: {
                    $ne: ObjectId(req.params.id)
                },
                // role: constants.ROLE.CLIENT,
                email: (req.body.email).toLowerCase(),
                isDeleted: false
            });
            if (checkEmail) {
                throw new Error(constants.MESSAGES.EMAIL_ALREADY_IN_USE);
            }
        }
        const doc = await Model.Admin.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: {
                ...req.body,
                updateBy: req.admin
            }
        }, {
            new: true
        });
        return res.success(constants.MESSAGES.PROFILE_UPDATED_SUCCESSFULLY, doc);


    } catch (error) {
        next(error);
    }
};
module.exports.deleteOwner = async (req, res, next) => {
    try {
        let check = await Model.Location.findOne({
            clientIds: ObjectId(req.params.id),
            isDeleted: false
        });
        if (check != null) {
            throw new Error("A location is associated with this owner");
        }
        const doc = await Model.Admin.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: {
                isDeleted: true
            }
        }, {
            new: true
        });
        return res.success(constants.MESSAGES.PROFILE_DELETED_SUCCESSFULLY, doc);
    } catch (error) {
        next(error);
    }
};
module.exports.changeOwnerPassword = async (req, res, next) => {
    try {
        await Validation.Admin.changeOwnerPassword.validateAsync(req.body);
        const doc = await Model.Admin.findOne({
            _id: ObjectId(req.body.id)
        });
        if (!doc) throw new Error(constants.MESSAGES.ACCOUNT_NOT_FOUND);
        await doc.setPassword(req.body.password);
        await doc.save();

        return res.success(constants.MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY);
    } catch (error) {
        next(error);
    }
};

//FAQ
module.exports.addFAQ = async (req, res, next) => {
    try {
        await Validation.Admin.addFAQ.validateAsync(req.body);
        let check = await Model.Faq.findOne({
            question: req.body.question
        });
        if (check != null) {
            throw new Error("Question already exists");
        }
        const data = await Model.Faq.create(req.body);
        return res.success("FAQ added successfully", data);
    } catch (error) {
        next(error);
    }
};
module.exports.editFAQ = async (req, res, next) => {
    try {
        await Validation.Admin.editFAQ.validateAsync(req.body);
        let check = await Model.Faq.findOne({
            _id: ObjectId(req.params.id)
        });
        if (check == null) {
            throw new Error("Question not found");
        }
        const data = await Model.Faq.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: req.body
        }, {
            new: true
        });
        return res.success("FAQ edited successfully", data);
    } catch (error) {
        next(error);
    }
};
module.exports.deleteFAQ = async (req, res, next) => {
    try {
        let check = await Model.Faq.findOne({
            _id: ObjectId(req.params.id)
        });
        if (check == null) {
            throw new Error("Question not found");
        }
        await Model.Cms.deleteOne({
            _id: ObjectId(req.params.id)
        });
        return res.success("FAQ deleted successfully");

    } catch (error) {
        next(error);
    }
};
module.exports.getFAQ = async (req, res, next) => {
    try {
        let check = await Model.Faq.find();
        return res.success("FAQ fetched successfully", check);
    } catch (error) {
        next(error);
    }
};




module.exports.addFAQ = async (req, res, next) => {
    try {
        await Validation.Admin.addFAQ.validateAsync(req.body);
        let check = await Model.Faq.findOne({
            question: req.body.question
        });
        if (check != null) {
            throw new Error("Question already exists");
        }
        const data = await Model.Faq.create(req.body);
        return res.success("FAQ added successfully", data);
    } catch (error) {
        next(error);
    }
};

//Company
module.exports.addComapny = async (req, res, next) => {
    try {
        await Validation.Admin.addCompany.validateAsync(req.body);
        if (req.body.email) {
            let check = await Model.Company.findOne({
                email: req.body.email,
                isDeleted: false,
                clientIds: req.admin.id
            });
            if (check != null) {
                throw new Error("Company with the given email already exists");
            }
        }
        if (req.body.name) {
            let check = await Model.Company.findOne({
                isDeleted: false,
                clientIds: req.admin.id,
                name: req.body.name
            });
            if (check != null) {
                throw new Error("Company with the given name already exists");
            }
        }
        if (req.body.phoneNo) {
            let check = await Model.Company.findOne({
                isDeleted: false,
                clientIds: req.admin.id,
                email: req.body.email,
                phoneNo: req.body.phoneNo,
                ISOCode: req.body.ISOCode,
                dialCode: req.body.dialCode
            });
            if (check != null) {
                throw new Error("Company with the given phone already exists");
            }
        }
        req.body.clientId = req.admin.id;
        const newCompany = await Model.Company.create(req.body);
        return res.success("Company added successfully", newCompany);
    } catch (error) {
        next(error);
    }

};
// Ready for live
module.exports.getComapny = async (req, res, next) => {
    try {
        let page = req.query.page ? Number(req.query.page) : 1;
        let limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = (page - 1) * limit;
        let id = req.params.id;
        let loggedInAdmin = req.admin;

        if (id == null) {
            let pipeline = [];
            let qry = {
                isDeleted: false
            };
            if (loggedInAdmin.role === constants.ROLE.CLIENT) {
                qry.clientId = loggedInAdmin._id;
            }
            if (req.query.search) {
                const regex = new RegExp(req.query.search, "i");
                qry._search = regex;
            }

            pipeline.push({
                $addFields: {
                    _search: {
                        $concat: ["$email", "$phoneNo", "$name"]
                    }
                }
            }, {
                $match: qry
            }, {
                $sort: {
                    _id: -1
                }
            }, {
                "$lookup": {
                    "from": "bookings",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$in": ["$bookingStatus", [constants.BOOKING_STATUS.UPCOMING, constants.BOOKING_STATUS.ACTIVE]]
                                    }]
                                },
                                parentId: null
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "activeBookingCount"
                }
            }, {
                "$lookup": {
                    "from": "bookings",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$in": ["$bookingStatus", [constants.BOOKING_STATUS.UPCOMING]]
                                    }]
                                },
                                parentId: null
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "upcomingBookingCount"
                }
            }, {
                "$lookup": {
                    "from": "bookings",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$in": ["$bookingStatus", [constants.BOOKING_STATUS.COMPLETED]]
                                    }]
                                },
                                parentId: null
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "pastBookingCount"
                }
            }, {
                "$lookup": {
                    "from": "companydrivers",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$eq": ["$isDeleted", false]
                                    }, {
                                        "$eq": ["$isBlocked", false]
                                    }]
                                }
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "drivers"
                }
            }, {
                $addFields: {
                    activeBookingsCount: {
                        $size: "$activeBookingCount"
                    },
                    upcomingBookingsCount: {
                        $size: "$upcomingBookingCount"
                    },
                    completedBookingsCount: {
                        $size: "$pastBookingCount"
                    },
                    activeDriversCount: {
                        $size: "$drivers"
                    }
                }
            }, {
                $project: {
                    pastBookingCount: 0,
                    activeBookingCount: 0,
                    upcomingBookingCount: 0,
                    drivers: 0
                }
            }, {
                $lookup: {
                    from: "admins",
                    let: {
                        clientId: "$clientId"
                    },
                    pipeline: [{
                        $match: {
                            "$expr": {
                                $and: [{
                                    $eq: ["$_id", "$$clientId"]
                                }]
                            }
                        }
                    }],
                    as: "clientId"
                }
            }, {
                $unwind: {
                    path: "$clientId",
                    preserveNullAndEmptyArrays: false
                }
            }, {
                $skip: skip
            }, {
                $limit: 10
            });
            console.log(JSON.stringify(pipeline), "pipeline");
            let companiesWithBookingCounts = await Model.Company.aggregate(pipeline);

            pipeline = pipeline.splice(0, pipeline.length - 2);
            let totalCompanies = await Model.Company.aggregate(pipeline);

            return res.success(constants.MESSAGES.DATA_FETCHED, {
                companies: companiesWithBookingCounts,
                totalCompanies: totalCompanies.length || 0
            });
        } else {

            let pipeline = [];
            let qry = {
                _id: ObjectId(req.params.id),
                isDeleted: false
            };
            if (loggedInAdmin.role === constants.ROLE.CLIENT) {
                qry.clientId = loggedInAdmin._id;
            }
            pipeline.push({
                $match: qry
            }, {
                "$lookup": {
                    "from": "bookings",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$in": ["$bookingStatus", [constants.BOOKING_STATUS.UPCOMING, constants.BOOKING_STATUS.ACTIVE]]
                                    }]
                                },
                                parentId: null
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "activeBookingCount"
                }
            }, {
                "$lookup": {
                    "from": "bookings",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$in": ["$bookingStatus", [constants.BOOKING_STATUS.UPCOMING]]
                                    }]
                                },
                                parentId: null
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "upcomingBookingCount"
                }
            }, {
                "$lookup": {
                    "from": "bookings",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$in": ["$bookingStatus", [constants.BOOKING_STATUS.COMPLETED]]
                                    }]
                                },
                                parentId: null
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "pastBookingCount"
                }
            }, {
                "$lookup": {
                    "from": "companydrivers",
                    "let": {
                        "companyId": "$_id"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    $and: [{
                                        "$eq": ["$companyId", "$$companyId"]
                                    }, {
                                        "$eq": ["$isDeleted", false]
                                    }, {
                                        "$eq": ["$isBlocked", false]
                                    }]
                                }
                            }
                        }, {
                            $lookup: {
                                from: "users",
                                let: {
                                    userId: "$userId"
                                },
                                pipeline: [{
                                    $match: {
                                        "$expr": {
                                            $and: [{
                                                $eq: ["$_id", "$$userId"]
                                            }, {
                                                $eq: ["$isDeleted", false]
                                            }]
                                        }
                                    }
                                }],
                                as: "userId"
                            }
                        },
                        {
                            $unwind: {
                                path: "$userId",
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    "as": "drivers"
                }
            }, {
                $addFields: {
                    activeBookingsCount: {
                        $size: "$activeBookingCount"
                    },
                    upcomingBookingsCount: {
                        $size: "$upcomingBookingCount"
                    },
                    completedBookingsCount: {
                        $size: "$pastBookingCount"
                    },
                    activeDriversCount: {
                        $size: "$drivers"
                    }
                }
            }, {
                $project: {
                    pastBookingCount: 0,
                    activeBookingCount: 0,
                    upcomingBookingCount: 0,
                    drivers: 0
                }
            }, {
                $lookup: {
                    from: "admins",
                    let: {
                        clientId: "$clientId"
                    },
                    pipeline: [{
                        $match: {
                            "$expr": {
                                $and: [{
                                    $eq: ["$_id", "$$clientId"]
                                }]
                            }
                        }
                    }],
                    as: "clientId"
                }
            }, {
                $unwind: {
                    path: "$clientId",
                    preserveNullAndEmptyArrays: false
                }
            });
            console.log(JSON.stringify(pipeline), "pipeline");
            let [company] = await Model.Company.aggregate(pipeline);

            if (!company) {
                throw new Error(constants.MESSAGES.USER_DATA_MISSING);
            }

            return res.success(constants.MESSAGES.DATA_FETCHED, company);
        }
    } catch (error) {
        next(error);
    }
};
module.exports.updateComapny = async (req, res, next) => {
    try {
        await Validation.Admin.updateCompany.validateAsync(req.body);
        let company = await Model.Company.findOne({
            _id: ObjectId(req.params.id),
            isDeleted: false
        });
        if (!company) {
            throw new Error("Company not found");
        }
        if (req.body.email) {
            let check = await Model.Company.findOne({
                _id: {
                    $ne: ObjectId(req.params.id)
                },
                email: req.body.email,
                isDeleted: false,
                clientIds: req.admin.id
            });
            if (check != null) {
                throw new Error("Company with the given email already exists");
            }
        }
        if (req.body.name) {
            let check = await Model.Company.findOne({
                _id: {
                    $ne: ObjectId(req.params.id)
                },
                isDeleted: false,
                clientIds: req.admin.id,
                name: req.body.name
            });
            if (check != null) {
                throw new Error("Company with the given name already exists");
            }
        }
        if (req.body.phoneNo) {
            let check = await Model.Company.findOne({
                _id: {
                    $ne: ObjectId(req.params.id)
                },
                isDeleted: false,
                clientIds: req.admin.id,
                email: req.body.email,
                phoneNo: req.body.phoneNo,
                ISOCode: req.body.ISOCode,
                dialCode: req.body.dialCode
            });
            if (check != null) {
                throw new Error("Company with the given phone already exists");
            }
        }
        let setObj = {};
        setObj.email = req.body.email || company.email;
        setObj.phoneNo = req.body.phoneNo || company.phoneNo;
        setObj.ISOCode = req.body.ISOCode || company.ISOCode;
        setObj.name = req.body.name || company.name;
        setObj.image = req.body.image || company.image;
        setObj.dialCode = req.body.dialCode || company.dialCode;
        setObj.person = req.body.person || company.person;
        setObj.isBlocked = req.body.isBlocked || company.isBlocked;

        company = await Model.Company.findOneAndUpdate({
            _id: company._id
        }, {
            $set: setObj
        }, {
            new: true
        });

        return res.success("Company has been updated",
            company
        );

    } catch (error) {
        next(error);
    }
};
module.exports.deleteComapny = async (req, res, next) => {
    try {
        let check = await Model.Company.findOne({
            _id: ObjectId(req.params.id),
            isDeleted: false
        });
        if (check == null) {
            throw new Error("Company not found");
        }
        await Model.Company.findOneAndUpdate({
            _id: ObjectId(req.params.id)
        }, {
            $set: {
                isDeleted: true
            }
        }, {
            new: true
        });
        return res.success("Company deleted successfully");
    } catch (error) {
        next(error);
    }
};

//Company drivers
module.exports.assignDriver = async (req, res, next) => {
    try {
        //Validations to be added
        const existingDriver = await Model.CompanyDrivers.findOne({
            userId: ObjectId(req.body.userId),
            companyId: ObjectId(req.body.companyId),
            isDeleted: false
        });
        if (existingDriver) {
            if (existingDriver.isBlocked) {
                throw new Error("User is blocked in this company");
            }
            throw new Error("User is already assigned as a driver for this company");
        }
        const newDriver = await Model.CompanyDrivers.create({
            userId: ObjectId(req.body.userId),
            companyId: ObjectId(req.body.companyId)
        });
        return res.success("Driver Has Been Added", {
            newDriver
        });
    } catch (error) {
        next(error);
    }
};
module.exports.checkUser = async (req, res, next) => {
    try {
        //Validations to be added
        let isUser = false;
        // Check if the user exists
        let checkUser = await Model.User.findOne({
            phoneNo: req.body.phoneNo,
            ISOCode: req.body.ISOCode,
            dialCode: req.body.dialCode,
            isDeleted: false
        });
        // If the user exists, perform additional checks
        if (checkUser) {
            if (checkUser.isBlocked) {
                throw new Error("Your account is blocked.");
            }
            const existingDriver = await Model.CompanyDrivers.findOne({
                userId: ObjectId(checkUser._id),
                companyId: ObjectId(req.body.companyId)
            });

            if (existingDriver && existingDriver.isBlocked) {
                throw new Error("User is blocked in this company");
            }
            // If the user exists, set isUser to true
            isUser = true;
        }

        // Return an appropriate message based on whether the user exists
        if (isUser) {
            return res.success("User exists", {
                isUser: isUser,
                user: checkUser
            });
        } else {
            return res.success("User not exists", {
                isUser: isUser,
                user: null
            });
        }
    } catch (error) {
        next(error);
    }
};
module.exports.createUser = async (req, res, next) => {
    try {
        //Validations to be added
        let checkUser = await Model.User.findOne({
            phoneNo: req.body.phoneNo,
            ISOCode: req.body.ISOCode,
            dialCode: req.body.dialCode,
            isDeleted: false
        });
        if (checkUser) {
            throw new Error("User already exists with this number");
        }
        let loggedInAdmin = req.admin;
        let qry = {
            phoneNo: req.body.phoneNo,
            ISOCode: req.body.ISOCode,
            dialCode: req.body.dialCode,
            name: req.body.name,
            isPhoneVerified: true
        };
        if (loggedInAdmin.role === constants.ROLE.CLIENT) {
            qry.clientIds = loggedInAdmin._id;
        }
        let data = await Model.User.create(qry);
        if (data == null) {
            throw new Error("Account not created.");
        }
        await data.save();
        return res.success(constants.MESSAGES.PROfILE_CREATED_SUCCESSFULLY, data);
    } catch (error) {
        next(error);
    }
};
module.exports.blockDrivers = async (req, res, next) => {
    try {
        await Validation.Admin.blockDrivers.validateAsync(req.body);
        let checkCompany = await Model.Company.findOne({
            _id: ObjectId(req.body.companyId),
            isDeleted: false
        });
        if (!checkCompany) {
            throw new Error("Company not found");
        }
        let checkUser = await Model.User.findOne({
            _id: ObjectId(req.body.userId),
            isDeleted: false
        });
        if (!checkUser) {
            throw new Error("User not found");
        }
        let companyUser = await Model.CompanyDrivers.updateOne({
            userId: checkUser.userId,
            companyId: checkCompany._id
        });
        if (!companyUser) {
            throw new Error("User not registred with this company");
        }
        await Model.CompanyDrivers.updateOne({
            userId: ObjectId(req.body.userId),
            companyId: checkCompany._id
        }, {
            $set: {
                isBlocked: req.body.isBlocked
            }
        });
        let message = req.body.isBlocked ? "Driver has been blocked" : "Driver has been unblocked";
        return res.success(message);
    } catch (error) {
        next(error);
    }
};


////////////////////////////////////////
module.exports.getComapnyDriver = async (req, res, next) => {
    try {
        let page = req.query.page ? Number(req.query.page) : 1;
        let limit = req.query.limit ? Number(req.query.limit) : 10;
        let skip = (page - 1) * limit;
        let id = req.params.id;

        if (id == null) {
            let qry = {
                isDeleted: false
            };


            if (req.query.companyId) {
                qry.companyId = ObjectId(req.query.companyId);
            }
            qry.userId = {
                $ne: null
            };
            let search = {};
            if (req.query.search) {
                const regex = new RegExp(req.query.search, "i");
                search._search = regex;
            }
            let pipeline = [{
                    $match: qry
                },
                {
                    $lookup: {
                        from: "users",
                        let: {
                            userId: "$userId"
                        },
                        pipeline: [{
                            $match: {
                                "$expr": {
                                    $and: [{
                                        $eq: ["$_id", "$$userId"]
                                    }, {
                                        $eq: ["$isDeleted", false]
                                    }]
                                }
                            }
                        }, {
                            $project: {
                                name: 1,
                                phoneNo: 1,
                                ISOCode: 1,
                                stripeId: 1,
                                image: 1,
                                isNotification: 1,
                                isPhoneVerified: 1,
                                isBlocked: 1,
                                socketId: 1,
                                isDeleted: 1,
                                deviceType: 1,
                                deviceToken: 1,
                                loginCount: 1,
                                _id: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                dialCode: 1
                            }
                        }],
                        as: "userId"
                    }
                }, {
                    $unwind: {
                        path: "$userId",
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $addFields: {
                        _search: {
                            "$concat": [{
                                    "$ifNull": ["$userId.name", ""]
                                },
                                "-",
                                {
                                    "$ifNull": ["$userId.phoneNo", ""]
                                }
                            ]
                        }
                    }
                },
                {
                    $match: search
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
            ];
            let drivers = await Model.CompanyDrivers.aggregate(pipeline);

            console.log(drivers);
            drivers = drivers ? drivers : [];
            let companiesWithBookingCounts = await Promise.all(
                drivers.map(async (driver) => {
                    let activeBookingsCount = await Model.Booking.countDocuments({
                        userId: driver.userId ? driver.userId._id : null,
                        bookingStatus: constants.BOOKING_STATUS.ACTIVE,
                        companyId: req.query.companyId,
                        parentId: null
                        // Add any additional conditions for your bookings query if needed
                    });

                    let completedBookingsCount = await Model.Booking.countDocuments({
                        userId: driver.userId ? driver.userId._id : null,
                        bookingStatus: constants.BOOKING_STATUS.COMPLETED,
                        companyId: req.query.companyId,
                        parentId: null
                        // Add any additional conditions for your bookings query if needed
                    });


                    let upcommingBookingsCount = await Model.Booking.countDocuments({
                        userId: driver.userId ? driver.userId._id : null,
                        bookingStatus: constants.BOOKING_STATUS.UPCOMING,
                        companyId: req.query.companyId,
                        parentId: null
                        // Add any additional conditions for your bookings query if needed
                    });


                    // Include the total bookings counts in the company object
                    return {
                        ...driver,
                        activeBookingsCount,
                        completedBookingsCount,
                        upcommingBookingsCount

                    };
                })
            );
            pipeline = pipeline.splice(0, pipeline.length - 2);


            let totalDriver = await Model.CompanyDrivers.aggregate(pipeline);
            totalDriver = totalDriver.length > 0 ? totalDriver.length : 0;
            return res.success(constants.MESSAGES.DATA_FETCHED, {
                driver: companiesWithBookingCounts,
                totalDriver
            });
        } else {
            let qry = {
                // isBlocked: false
            };

            if (req.query.companyId) {
                qry.companyId = req.query.companyId;
            }

            if (req.params.id) {
                qry._id = req.params.id;
            }
            // console.log(req.params.id,req.query.companyId)
            let driver = await Model.CompanyDrivers.findOne(qry).sort({
                createdAt: -1
            }).skip(skip).limit(limit).populate({
                path: 'userId',
                select: 'name phoneNo ISOCode dialCode  stripeId image isNotification isPhoneVerified isBlocked socketId isDeleted deviceType deviceToken loginCount _id createdAt updatedAt',
                populate: {
                    path: 'nestedFieldIfAny'
                }, // If there are nested fields in userId
                options: {
                    lean: true
                }, // Use lean() if you don't need Mongoose documents
                // Change the alias from userId to user
                as: 'user'
            });
            console.log(driver);

            if (driver == null) {
                throw new Error("Driver is not Found");
            }
            console.log(req.query.companyId);

            // Get the total bookings count for each status (UPCOMING, ACTIVE, COMPLETED) for the specific company
            let upcomingBookingsCount = await Model.Booking.countDocuments({
                userId: driver.userId ? driver.userId._id : null,
                bookingStatus: constants.BOOKING_STATUS.UPCOMING,
                companyId: req.query.companyId,
                parentId: null
                // Add any additional conditions for your bookings query if needed
            });

            let activeBookingsCount = await Model.Booking.countDocuments({
                userId: driver.userId ? driver.userId._id : null,
                bookingStatus: constants.BOOKING_STATUS.ACTIVE,
                companyId: req.query.companyId,
                parentId: null
                // Add any additional conditions for your bookings query if needed
            });

            let completedBookingsCount = await Model.Booking.countDocuments({
                userId: driver.userId ? driver.userId._id : null,
                bookingStatus: constants.BOOKING_STATUS.COMPLETED,
                companyId: req.query.companyId,
                parentId: null
                // Add any additional conditions for your bookings query if needed
            });

            // Include the total bookings counts in the response
            return res.success(constants.MESSAGES.DATA_FETCHED, {
                ...driver.toObject(),
                upcomingBookingsCount,
                activeBookingsCount,
                completedBookingsCount
            });
        }
    } catch (error) {
        next(error);
    }
};
module.exports.createCopmanyBooking = async (req, res, next) => {
    try {
        // let timezone = req.headers.timezone || "Asia/Kolkata";


        // await Validation.User.createBooking.validateAsync(req.body);

        const checkInTime = req.body.checkInTime;
        const checkoutTime = req.body.checkOutTime;

        // Check if checkoutTime is greater than checkInTime
        if (checkoutTime <= checkInTime) {
            throw new Error("Error: checkoutTime must be greater than checkInTime");
        }
        let checkLocation = await Model.Location.findOne({
            _id: ObjectId(req.body.locationId),
            isDeleted: false
        });
        if (checkLocation == null) {
            throw new Error("Please select a valid location");
        }

        let checkDriver = await Model.User.findOne({
            _id: ObjectId(req.body.driverId),
            isDeleted: false
        });
        if (checkDriver == null) {
            throw new Error("Please select a valid driver");
        }




        // let checkDriverCompany = await Model.User.findOne({
        //     userId: ObjectId(req.body.driverId),
        //     companyId: ObjectId(req.body.companyId),
        //     isDeleted: false
        // });
        // if (checkDriverCompany == null) {
        //     throw new Error("Please select a valid company");
        // }

        // let driver = await Model.CompanyDrivers.findOne({
        //     _id: req.body.driverId,
        //     isBlocked: true // Optionally check if the driver is not blocked
        // });

        // if (!driver) {
        //     throw new Error("Driver not found or is blocked");
        // }

        let checkAvailable = await Model.Slots.countDocuments({
            locationId: checkLocation._id,
            "$or": [{
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
        console.log(checkAvailable);
        if (checkAvailable >= checkLocation.totalSlots) {
            throw new Error("No more slots available for this location");
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
            userId: req.body.driverId, //DriverId
            locationId: checkLocation._id,
            bookingType: req.body.bookingType, //feet
            locationType: req.body.locationType,
            checkInTime: req.body.checkInTime,
            checkOutTime: req.body.checkOutTime,
            companyId: req.body.companyId,
            bookingStatus: constants.BOOKING_STATUS.UPCOMING
        };
        // if (req.body.locationType == constants.LOCATION_SLOT.DAILY) {
        //     let diff = moment(req.body.checkOutTime).diff(moment(req.body.checkInTime), "h");
        //     if (diff > 12) {
        //         throw new Error("Invalid checkIn checkOut time");
        //     }
        //     payload.subTotal = checkLocation.dailySlot.price;
        // } else if (req.body.locationType == constants.LOCATION_SLOT.MONTHLY) {
        //     let diff = moment(req.body.checkOutTime).diff(moment(req.body.checkInTime), "M");
        //     if (diff > 1) {
        //         throw new Error("Invalid checkIn checkOut time");
        //     }
        //     payload.subTotal = checkLocation.monthlySlot.price;
        // } else {
        //     throw new Error("Invalid time slot");
        // }

        console.log(payload.total, "payload.total");
        // let charge = null;

        let booking = await Model.Booking.create(payload);
        // let type = booking.locationType == 0 ? "Daily" : "Monthly";
        process.emit("updateCheckIn", booking);
        process.emit("completeBooking", booking);
        // process.emit("notifyUser2", booking);
        // process.emit("notifyUser", booking);

        if (booking) {
            await Model.Slots.create({
                userId: req.body.driverId,
                locationId: booking.locationId,
                checkInTime: req.body.checkInTime,
                checkOutTime: req.body.checkOutTime
            });
        }
        // let type = booking.locationType == 0 ? "Daily" : "Monthly";
        // services.ScreenShot.screenShot({
        //     random: type + " Invoice - Booking - " + booking.bookingId,
        //     transactionId: "",
        //     userName: checkDriver.name,
        //     dialCode: checkDriver.dialCode,
        //     phoneNo: checkDriver.phoneNo,
        //     location: checkLocation.name,
        //     bookingId: booking.bookingId,
        //     card: "",
        //     createdAt: moment(booking.createdAt).tz(timezone).format("MM-DD-YYYY HH:mm:ss"),
        //     bookingType: type,
        //     extendBooking: "No",
        //     subTotal: (Number(booking.subTotal) + Number(booking.convenienceFee) + Number(booking.salesTax)),
        //     creditCardFee: booking.creditCardFee,
        //     total: booking.total
        // });
        return res.success("Booking created successfully", booking);
    } catch (error) {
        next(error);
    }
};
module.exports.editCopmanyBooking = async (req, res, next) => {
    try {
        let timezone = req.headers.timezone || "Asia/Kolkata";
        let checkLocation = await Model.Location.findOne({
            _id: ObjectId(req.body.locationId),
            isDeleted: false
        });
        if (checkLocation == null) {
            throw new Error("Please select a valid location");
        }
        let checkDriver = await Model.User.findOne({
            _id: ObjectId(req.body.driverId),
            isDeleted: false
        });
        if (checkDriver == null) {
            throw new Error("Please select a valid driver");
        }
        // let checkDriverCompany = await Model.User.findOne({
        //     userId: ObjectId(req.body.driverId),
        //     companyId: ObjectId(req.body.companyId),
        //     isDeleted: false
        // });
        // if (checkDriverCompany == null) {
        //     throw new Error("Please select a valid company");
        // }
        let pastBooking = await Model.Booking.findOne({
            _id: ObjectId(req.body.bookingId)
        });
        if (pastBooking.bookingStatus != constants.BOOKING_STATUS.UPCOMING) {
            throw new Error("Only upcoming bookings can be edited");
        }
        let slot = null;
        if (pastBooking) {
            slot = await Model.Slots.findOne({
                userId: pastBooking.userId,
                locationId: pastBooking.locationId,
                checkInTime: pastBooking.checkInTime,
                checkOutTime: pastBooking.checkOutTime
            });
        }
        let qry = {
            locationId: checkLocation._id,
            $or: [{
                checkInTime: {
                    $gte: req.body.checkInTime
                },
                checkOutTime: {
                    $lte: req.body.checkOutTime
                }
            }, {
                checkInTime: {
                    $lte: req.body.checkInTime
                },
                checkOutTime: {
                    $lte: req.body.checkOutTime,
                    $gte: req.body.checkInTime
                }
            }, {
                checkInTime: {
                    $lte: req.body.checkInTime
                },
                checkOutTime: {
                    $gte: req.body.checkOutTime
                }
            }]
        };
        if (slot != null) {
            qry._id = {
                $ne: slot._id
            };
        }
        let checkAvailable = await Model.Slots.countDocuments(qry);
        console.log(checkAvailable);
        if (checkAvailable >= checkLocation.totalSlots) {
            throw new Error("No more slots available for this location");
        }
        let payload = {
            userId: req.body.driverId, //DriverId
            locationId: checkLocation._id,
            bookingType: req.body.bookingType, //feet
            locationType: req.body.locationType,
            checkInTime: req.body.checkInTime,
            checkOutTime: req.body.checkOutTime,
            companyId: req.body.companyId,
            bookingStatus: constants.BOOKING_STATUS.UPCOMING
        };

        console.log(payload.total, "payload.total");
        // let charge = null;

        let booking = await Model.Booking.create(payload);
        // let type = booking.locationType == 0 ? "Daily" : "Monthly";
        process.emit("updateCheckIn", booking);
        process.emit("completeBooking", booking);
        process.emit("notifyUser2", booking);
        process.emit("notifyUser", booking);

        if (booking) {
            await Model.Slots.create({
                userId: req.body.driverId,
                locationId: booking.locationId,
                checkInTime: req.body.checkInTime,
                checkOutTime: req.body.checkOutTime
            });
            if (pastBooking) {
                await Model.Booking.deleteOne({
                    _id: ObjectId(req.body.bookingId)
                });
                await Model.Slots.deleteOne({
                    userId: pastBooking.userId,
                    locationId: pastBooking.locationId,
                    checkInTime: pastBooking.checkInTime,
                    checkOutTime: pastBooking.checkOutTime
                });
            }
        }
        let type = booking.locationType == 0 ? "Daily" : "Monthly";
        services.ScreenShot.screenShot({
            random: type + " Invoice - Booking - " + booking.bookingId,
            transactionId: "",
            userName: checkDriver.name,
            dialCode: checkDriver.dialCode,
            phoneNo: checkDriver.phoneNo,
            location: checkLocation.name,
            bookingId: booking.bookingId,
            card: "",
            createdAt: moment(booking.createdAt).tz(timezone).format("MM-DD-YYYY HH:mm:ss"),
            bookingType: type,
            extendBooking: "No",
            subTotal: (Number(booking.subTotal) + Number(booking.convenienceFee) + Number(booking.salesTax)),
            creditCardFee: booking.creditCardFee,
            total: booking.total
        });
        return res.success("Booking created successfully", booking);
    } catch (error) {
        next(error);
    }
};
////////


module.exports.drivers = async (req, res, next) => {
    try {
        const companyId = ObjectId(req.query.companyId);
        let qry = {};
        if (req.query.search) {
            const regex = new RegExp(req.query.search, "i");
            qry.name = regex;
        }
        const drivers = await Model.CompanyDrivers.aggregate([{
            $match: {
                companyId: companyId,
                isBlocked: false,
                isDeleted: false
            }
        }, {
            $lookup: {
                from: "users",
                let: {
                    userId: "$userId"
                },
                pipeline: [{
                    $match: {
                        "$expr": {
                            $and: [{
                                $eq: ["$_id", "$$userId"]
                            }, {
                                $eq: ["$isDeleted", false]
                            }]
                        }
                    }
                }, {
                    $project: {
                        name: 1
                    }
                }],
                as: "userId"
            }
        }, {
            $unwind: {
                path: "$userId",
                preserveNullAndEmptyArrays: false
            }
        }, {
            $project: {
                _id: "$userId._id",
                name: "$userId.name"
            }
        }, {
            $match: qry
        }]);
        return res.success("Drivers retrieved successfully", drivers);

    } catch (error) {
        next(error);
    }
};
module.exports.deleteDriver = async (req, res, next) => {
    try {
        const id = ObjectId(req.params.id);
        const driver = await Model.CompanyDrivers.findOne({
            _id: id,
            isDeleted: false
        });
        if (!driver) {
            throw new Error("Driver not found.");
        }
        await Model.CompanyDrivers.updateOne({
            _id: id
        }, {
            $set: {
                isDeleted: true
            }
        });
        return res.success("Driver deleted successfully");
    } catch (error) {
        next(error);
    }
};
module.exports.getCompanyReports = async (req, res, next) => {
    try {
        let timezone = req.headers.timezone || "Asia/Kolkata";
        let sheetName = "bookings";
        let criteria = {
            companyId: ObjectId(req.query.companyId),
            parentId: null
        };


        //     console.log(new Date(req.body.startDate),"start day ");
        //     console.log(new Date(req.body.endDate),"end dat day ");

        //    console.log(new Date(moment(new Date(req.body.startDate)),"starts momebt"));
        //   console.log(  new Date(moment(new Date(req.body.endDate)),"end momber"));

        let pipeline = [{
                $match: criteria
            },
            {
                $match: {
                    createdAt: {
                        $gte: new Date(req.body.startDate),
                        $lte: new Date(req.body.endDate)
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: {
                        userId: "$userId"
                    },
                    pipeline: [{
                        $match: {
                            "$expr": {
                                $and: [{
                                    $eq: ["$_id", "$$userId"]
                                }, {
                                    $eq: ["$isDeleted", false]
                                }]
                            }
                        }
                    }],
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
                    from: "companies",
                    localField: "companyId",
                    foreignField: "_id",
                    as: "companyId"
                }
            },
            {
                $unwind: {
                    path: "$companyId",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    "from": "locations",
                    "let": {
                        "locationId": "$locationId"
                    },
                    "pipeline": [{
                            "$match": {
                                "$expr": {
                                    "$eq": ["$_id", "$$locationId"]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "admins",
                                localField: "clientIds",
                                foreignField: "_id",
                                as: "clientIds"
                            }
                        },
                        // {
                        //     "$unwind": "$clientIds"
                        // }
                    ],
                    "as": "locationId"
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
            }, {
                $addFields: {
                    isExtended: {
                        $ifNull: ["$extendBooking", false]
                    }
                }
            }, {
                $project: {
                    _id: 0,
                    BookingId: "$bookingId",
                    CreatedAt: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$createdAt",
                            timezone: timezone
                        }
                    },
                    BookingType: "Custom booking",
                    BookingStatus: {
                        $cond: {
                            if: {
                                $eq: ["$bookingStatus", constants.BOOKING_STATUS.ACTIVE]
                            },
                            then: "Active",
                            else: {
                                $cond: {
                                    if: {
                                        $eq: ["$bookingStatus", constants.BOOKING_STATUS.UPCOMING]
                                    },
                                    then: "Upcoming",
                                    else: "Completed"
                                }
                            }
                        }
                    },
                    CheckInTime: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$checkInTime",
                            timezone: timezone
                        }
                    },
                    ChekOutTime: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$checkOutTime",
                            timezone: timezone
                        }
                    },
                    ParkingFee: "$subTotal",
                    ConvenienceFee: "$convenienceFee",
                    SalesTax: "$salesTax",
                    CreditCardFee: "$creditCardFee",
                    Total: "$total",
                    DriverName: "$userId.name",
                    DriverDialCode: "$userId.dialCode",
                    DriverPhoneNo: "$userId.phoneNo",
                    Location: "$locationId.name",
                    Owner: {
                        "$reduce": {
                            "input": "$locationId.clientIds.name",
                            "initialValue": "",
                            "in": {
                                "$cond": {
                                    "if": {
                                        "$eq": [{
                                            "$indexOfArray": ["$values", "$$this"]
                                        }, 0]
                                    },
                                    "then": {
                                        "$concat": ["$$value", "$$this"]
                                    },
                                    "else": {
                                        "$concat": ["$$value", ",", "$$this"]
                                    }
                                }
                            }
                        }
                    },
                    Company: "$companyId.name"
                }
            }
        ];
        // console.log(JSON.stringify(pipeline), "pipeline");
        let bookings = await Model.Booking.aggregate(pipeline).exec();
        if (bookings.length === 0) {
            throw new Error(constants.MESSAGES.DATA_NOT_FOUND);
        }

        var ws = XLSX.utils.json_to_sheet(bookings, {
            header: ["BookingId", "CreatedAt", "BookingType", "BookingStatus", "CheckInTime", "ChekOutTime", "ParkingFee",
                "ConvenienceFee", "SalesTax", "CreditCardFee", "Total", "DriverName", "DriverDialCode",
                "DriverPhoneNo", "Location", "Owner", "Company"
            ]
        });
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, (sheetName).replace(/ /g, ''));
        let sendFileName = (sheetName).replace(/ /g, '') + ".xlsx";
        XLSX.writeFile(wb, "./public/" + sendFileName);

        // return res.redirect(process.env.BASE_URL + "/" + sendFileName);
        return res.success(constants.MESSAGES.SUCCESS, {
            redirection: process.env.BASE_URL + "/" + sendFileName
        });
    } catch (error) {
        next(error);
    }
};