const router = require("express").Router();
const uploadService = require("../../services/uploadServices");
const Controller = require('../controller');

router.post('/uploadFile', uploadService.uploadSingle.single('file'), Controller.UploadController.uploadFile);
router.post('/uploadFiles', uploadService.uploadMany.single('file'), Controller.UploadController.uploadManyFile);


module.exports = router;