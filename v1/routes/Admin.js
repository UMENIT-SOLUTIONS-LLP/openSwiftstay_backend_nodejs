const router = require("express").Router();
const Auth = require("../../common/authenticate");
const Controller = require("../controller");

// ONBOARDING API'S
router.post("/register", Controller.AdminController.register);
router.post("/login", Controller.AdminController.login);
router.get("/logout", Auth.verify("admin"), Controller.AdminController.logout);
router.get("/getProfile", Auth.verify("admin"), Controller.AdminController.getProfile);
router.put("/updateProfile", Auth.verify("admin"), Controller.AdminController.updateProfile);
router.post("/changePassword", Auth.verify("admin"), Controller.AdminController.changePassword);
router.post("/resetPassword", Controller.AdminController.resetPassword);
router.post("/forgotPassword", Controller.AdminController.forgotPassword);
router.post("/checkToken", Controller.AdminController.checkToken);

//Location
router.post("/addLocation", Auth.verify("admin"), Controller.AdminController.addLocation);
router.get("/getLocation/:id?", Auth.verify("admin"), Controller.AdminController.getLocation);
router.post("/getFile/",Auth.verify("admin"), Controller.AdminController.getFile);
router.put("/updateLocation/:id", Auth.verify("admin"), Controller.AdminController.updateLocation);
router.delete("/deleteLocation/:id", Auth.verify("admin"), Controller.AdminController.deleteLocation);

//Comapny 
router.post("/addComapny", Auth.verify("admin"), Controller.AdminController.addComapny);
router.get("/getCompany/:id?", Auth.verify("admin"), Controller.AdminController.getComapny);
router.put("/updateComapny/:id", Auth.verify("admin"), Controller.AdminController.updateComapny);
router.delete("/deleteComapny/:id", Auth.verify("admin"), Controller.AdminController.deleteComapny);

//Company User
router.post("/assignDriver", Auth.verify("admin"), Controller.AdminController.assignDriver);
router.post("/checkUser", Auth.verify("admin"), Controller.AdminController.checkUser);
router.post("/createUser", Auth.verify("admin"), Controller.AdminController.createUser);
router.get("/comapnyDriver/:id?", Auth.verify("admin"), Controller.AdminController.getComapnyDriver);
router.delete("/deletedriver/:id", Auth.verify("admin"), Controller.AdminController.deleteDriver);
router.post("/blockDrivers", Auth.verify("admin"), Controller.AdminController.blockDrivers);

//Company booking
router.post("/createCopmanyBooking", Auth.verify("admin"), Controller.AdminController.createCopmanyBooking);
router.post("/editCopmanyBooking", Auth.verify("admin"), Controller.AdminController.editCopmanyBooking);
router.get("/drivers", Auth.verify("admin"), Controller.AdminController.drivers);
router.post("/getCompanyReports", Auth.verify("admin"), Controller.AdminController.getCompanyReports);

//user
router.post("/addUser", Auth.verify("admin"), Controller.AdminController.addUser);
router.get("/getUser/:id?", Auth.verify("admin"), Controller.AdminController.getUser);
router.put("/updateUser/:id", Auth.verify("admin"), Controller.AdminController.updateUser);
router.delete("/deleteUser/:id", Auth.verify("admin"), Controller.AdminController.deleteUser);

// CMS
router.get("/getCms", Controller.AdminController.getCms);
router.post("/addCms", Auth.verify("admin"), Controller.AdminController.addCms);

//Booking
router.get("/getBooking/:id?", Auth.verify("admin"), Controller.AdminController.getBooking);
router.get("/firstBooking", Auth.verify("admin"), Controller.AdminController.getFirstBooking);
router.post("/getReports", Auth.verify("admin"), Controller.AdminController.getReports);

//Transactions
router.get("/getTransactions/:id?", Auth.verify("admin"), Controller.AdminController.getTransactions);
router.get("/exportTransactions", Auth.verify("admin"), Controller.AdminController.exportTransactions);

//user
router.post("/inviteOwner", Auth.verify("admin"), Controller.AdminController.inviteOwner);
router.get("/getOwners/:id?", Auth.verify("admin"), Controller.AdminController.getOwners);
router.get("/getAllOwners", Auth.verify("admin"), Controller.AdminController.getOwners);
router.put("/updateOwner/:id", Auth.verify("admin"), Controller.AdminController.updateOwner);
router.delete("/deleteOwner/:id", Auth.verify("admin"), Controller.AdminController.deleteOwner);
router.post("/changeOwnerPassword", Auth.verify("admin"), Controller.AdminController.changeOwnerPassword);

//Faq
router.post("/addFAQ", Auth.verify("admin"), Controller.AdminController.addFAQ);
router.get("/getFAQ", Controller.AdminController.getFAQ);
router.put("/editFAQ/:id", Auth.verify("admin"), Controller.AdminController.editFAQ);
router.delete("/deleteFAQ/:id", Auth.verify("admin"), Controller.AdminController.deleteFAQ);


//company

router.post("/addComapny", Auth.verify("admin"), Controller.AdminController.addComapny);
router.get("/getFAQ", Controller.AdminController.getFAQ);
router.put("/editFAQ/:id", Auth.verify("admin"), Controller.AdminController.editFAQ);
router.delete("/deleteFAQ/:id", Auth.verify("admin"), Controller.AdminController.deleteFAQ);

//dashboard
router.get("/dashboard", Auth.verify("admin"), Controller.AdminController.dashboard);
router.get("/exportDashboard", Auth.verify("admin"), Controller.AdminController.exportDashboard);

module.exports = router;