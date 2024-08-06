const router = require("express").Router();
const UsersRoutes = require("./User");
const AdminRoutes = require("./Admin");


router.use("/Admin", AdminRoutes);
router.use("/User", UsersRoutes);


module.exports = router;