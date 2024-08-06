const Controller = require('../controller');
const Auth = require("../../common/authenticate");
const router = require('express').Router();

//Onboarding
router.post("/checkUser", Controller.UserController.checkUser);
router.post("/createUser", Controller.UserController.createUser);
router.post("/resendOtp", Controller.UserController.sendOtp);
router.post("/verifyOtp", Auth.verify("Guest"), Controller.UserController.verifyOtp);
router.get("/logout", Auth.verify("User"), Controller.UserController.logout);
router.get("/getProfile", Auth.verify("User"), Controller.UserController.getProfile);
router.put("/updateProfile", Auth.verify("User"), Controller.UserController.updateProfile);
router.put("/updateNumber", Auth.verify("User"), Controller.UserController.updateNumber);
router.delete("/deleteProfile", Auth.verify("User"), Controller.UserController.deleteProfile);

//Dashboard
router.post("/getLocation/:id?", Controller.UserController.getLocation);

//Payment
router.post("/addCard", Auth.verify("User"), Controller.UserController.addCard);
router.get("/getCard", Auth.verify("User"), Controller.UserController.getCard);
router.delete("/deleteCard", Auth.verify("User"), Controller.UserController.deleteCard);
router.post("/createToken", Controller.UserController.createToken);

router.post("/createBooking", Auth.verify("User"), Controller.UserController.createBooking);
router.get("/getBooking/:id?", Auth.verify("User"), Controller.UserController.getBooking);
router.put("/updateBooking", Auth.verify("User"), Controller.UserController.updateBooking);
router.post("/extendBooking", Auth.verify("User"), Controller.UserController.extendBooking);
router.post("/payWebhook", Controller.UserController.payWebhook);
router.post("/stopSubscription", Controller.UserController.stopStripeRecurring);


router.post("/findExistingBooking", Auth.verify("User"),Controller.UserController.findExistingBookingForTimeRange);


//Transactions
router.get("/getPaymentHistory/:id?", Auth.verify("User"), Controller.UserController.getPaymentHistory);

// CMS
router.get("/getCms", Controller.UserController.getCms);
router.get("/getFAQ", Controller.AdminController.getFAQ);

module.exports = router;
