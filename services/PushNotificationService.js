const FCM = require('fcm-node');
const Model = require('../models/index');
const constants = require("../common/constants");
const axios = require("axios");

exports.preparePushNotifiction = preparePushNotifiction;
exports.sendPushNotifiction = sendPushNotifiction;
exports.broadcastNotifications = broadcastNotifications;

//Push notification for android.
async function sendPushNotifiction(userData, payload) {
  let fcm = new FCM(process.env.FCM_TOKEN);
  let message = {
    to: userData.deviceToken || '',
    collapse_key: '',
    data: payload
  };
  if (payload.isNotificationSave) {
    new Model.Notification(payload).save();
  }
  fcm.send(message, (err) => {
    if (err) {
      console.error('Something has gone wrong!', err, "Token -->", userData.deviceToken);
    } else {
      let payload1 = {
        userId: payload.userId,
        driverId: payload.driverId
      };
      setTimeout(() => {
        process.emit("getNotification", payload1);
      }, 500);
      console.log('Push successfully sent!', userData.firstName, "Token -->", userData.deviceToken);
    }
  });
}
//Fetch user token and device type and prepare notification.
async function preparePushNotifiction(payloadData, userType) {
  let payload = JSON.parse(JSON.stringify(payloadData));
  if (payload && payload.data)
    delete payload.data;
  if (payload && payload.keys)
    delete payload.keys;
  if (userType == constants.ROLE.USER) {
    const deviceData = await Model.User.findOne({
      _id: payload.userId,
      isNotification: true
    },{
        firstName: 1,
        deviceToken: 1
    });
    if (deviceData) {
       sendPushNotifiction(deviceData, payload);
    } else {
      console.log('No user device data found.');
    }
  } else if (userType == constants.ROLE.DRIVER) {
    const deviceData = await Model.Driver.findOne({
      _id: payload.driverId
    },{
        firstName: 1,
        deviceToken: 1
    });
    if (deviceData && deviceData.deviceToken) {
       sendPushNotifiction(deviceData, payload);
    } else {
      console.error('No user device data found.');
    }
  }
}
//Broadcast notification.
async function broadcastNotifications(payload, role) {
  // notification object with title and text
  let notification = payload;
  let token = [];
  let userIds = [];
  if (role == constants.ROLE.USER) {
    userIds = await Model.User.find({
      isDeleted: false,
      isNotification: true,
      deviceToken: {
        $nin: [null, ""]
      }
    }, {
      deviceToken: 1,
      deviceType: 1
    });
  } else if (role == constants.ROLE.DRIVER) {
    userIds = await Model.Driver.find({
      isDeleted: false,
      deviceToken: {
        $nin: [null, ""]
      }
    }, {
      deviceToken: 1,
      deviceType: 1
    });
  } else if (role == constants.ROLE.VENDOR) {
    userIds = await Model.Vendor.find({
      isDeleted: false,
      deviceToken: {
        $nin: [null, ""]
      }
    }, {
      deviceToken: 1,
      deviceType: 1
    });
  } else if (role == constants.ROLE.ALL) {
    let users = await Model.User.find({
      isDeleted: false,
      isNotification: true,
      deviceToken: {
        $nin: [null, ""]
      }
    }, {
      deviceToken: 1,
      deviceType: 1
    });
    let drivers = await Model.Driver.find({
      isDeleted: false,
      deviceToken: {
        $nin: [null, ""]
      }
    }, {
      deviceToken: 1,
      deviceType: 1
    });
    let Vendor = await Model.Vendor.find({
      isDeleted: false,
      deviceToken: {
        $nin: [null, ""]
      }
    }, {
      deviceToken: 1,
      deviceType: 1
    });
    userIds = userIds.concat(users);
    userIds = userIds.concat(drivers);
    userIds = userIds.concat(Vendor);
  }
  console.log(userIds.length,"role",role);
  for (let i = 0; i < userIds.length; i++) {
    if (userIds[i] != null) {
        token.push(JSON.parse(JSON.stringify(userIds[i].deviceToken)));
    }
  }
  let size = 800;
  let tokenData = [];
  for (let i = 0; i < size - 1; i++) {
    if (token.slice(0, size).length > 0) {
      tokenData.push(token.slice(0, size));
      token.splice(0, size);
    }
  }
  for (let i = 0; i < tokenData.length; i++) {
    let fcm_tokens = tokenData[i];
    let notification_body = {
      'data': notification,
      'registration_ids': fcm_tokens
    };

    await axios.post(
        `https://fcm.googleapis.com/fcm/send`, JSON.stringify(notification_body), {
          headers: {
            'Authorization': 'key=' + `${process.env.FCM_TOKEN}`,
            'Content-Type': 'application/json'
          }
        })
      .then((res) => {
        console.log(res.data.results);
      })
      .catch((error) => {
        console.error("Error---->", error);
      });
  }
}