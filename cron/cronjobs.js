const mongoose = require("mongoose");
const Agenda = require("agenda");
const moment = require("moment");
const Model = require("../models/index");
const CronJob = require('cron').CronJob;
const constants = require("../common/constants");
const ObjectId = mongoose.Types.ObjectId;
const services = require("../services/index");
const userController = require("../v1/controller/UserController/User");

//Agenda initialization.
let agenda;
agenda = new Agenda({
  mongo: mongoose.connection
});

module.exports.startCronJobs = async () => {
  console.log("Agenda Started");
  await agenda.start();
};

module.exports.updateLocation = new CronJob('0 0 1 * *', async function () {
  try {
    let data = await Model.Location.find({
      isDeleted: false
    });
    for (let i = 0; i < data.length; i++) {
      await Model.Location.findOneAndUpdate({
        _id: data[i]._id
      }, {
        $set: {
          lastTotalSlots: data[i].totalSlots,
          lastOccupiedSlots: data[i].occupiedSlots,
          lastPendingSlots: data[i].pendingSlots
        }
      }, {
        new: true
      });
    }
  } catch (err) {
    console.log(err);
  }
});

module.exports.completeFaultyBookings = new CronJob('30 1 * * *', async function () {
  try {
    console.log("completeFaultyBookings");
    let data = await Model.Booking.find({
      parentId:null,
      bookingStatus: {
        $ne: constants.BOOKING_STATUS.COMPLETED
      },
      $or: [{
        extendBooking: null,
        checkOutTime: {
          $lt: moment()
        }
      }, {
        extendBooking: {
          $ne: null
        },
        extendedCheckOutTime: {
          $lt: moment()
        }
      }]
    });
    for (let i = 0; i < data.length; i++) {
      let booking = await Model.Booking.findOneAndUpdate({
        _id: data[i]._id
      }, {
        $set: {
          isCheckIn: false,
          isCheckOut: false,
          isExtend: false,
          bookingStatus: constants.BOOKING_STATUS.COMPLETED,
          isBookingEnabled: false
        },
        $push: {
          logs: {
            changedAt: moment(),
            status: constants.UPDATE_TYPE.COMPLETE
          }
        }
      }, {
        new: true
      });
      if (booking) {
        let location = await Model.Location.findOne({
          _id: booking.locationId
        });
        let qry = {};
        let occupied = await Model.Booking.countDocuments({
          bookingStatus: constants.BOOKING_STATUS.ACTIVE,
          locationId: booking.locationId,
          parentId: null
          // checkInTime: {
          //   $gte: moment().startOf("day"),
          //   $lte: moment().endOf("day")
          // }
        });
        qry.occupiedSlots = occupied;
        qry.pendingSlots = location.totalSlots - occupied;
        if (qry.pendingSlots < 0) {
          qry.pendingSlots = 0;
        }
        console.log(qry, "qry", booking.locationId);
        await Model.Location.findOneAndUpdate({
          _id: booking.locationId
        }, {
          $set: qry
        }, {
          new: true
        });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

//Agenda for checkIn update. 
agenda.define("checkIn", async (job) => {
  let jobData = job.attrs.data;
  const check = await Model.Booking.findOne({
    _id: ObjectId(jobData._id)
  });
  if (check != null) {
    await Model.Booking.findOneAndUpdate({
      _id: ObjectId(jobData._id)
    }, {
      $set: {
        isCheckIn: true,
        bookingStatus: constants.BOOKING_STATUS.ACTIVE
      }
    }, {
      new: true
    });
    let qry = {};
    let occupied = await Model.Booking.countDocuments({
      bookingStatus: constants.BOOKING_STATUS.ACTIVE,
      locationId: check.locationId,
      parentId: null
      // checkInTime: {
      //   $gte: moment().startOf("day"),
      //   $lte: moment().endOf("day")
      // }
    });
    let checkLocation = await Model.Location.findOne({
      _id: check.locationId,
      isDeleted: false
    });
    qry.occupiedSlots = occupied;
    qry.pendingSlots = checkLocation.totalSlots - occupied;
    if (qry.pendingSlots < 0) {
      qry.pendingSlots = 0;
    }
    await Model.Location.findOneAndUpdate({
      _id: check.locationId
    }, {
      $set: qry
    }, {
      new: true
    });
    console.log(qry, "qry", check.locationId);
  }
  job.remove(function (err) {
    if (!err)
      console.log("Successfully removed job from collection");
  });
});
agenda.define("enableExtend", async (job) => {
  let jobData = job.attrs.data;
  const check = await Model.Booking.findOne({
    _id: ObjectId(jobData._id)
  });
  if (check != null) {
    await Model.Booking.findOneAndUpdate({
      _id: ObjectId(jobData._id)
    }, {
      $set: {
        isExtend: true
      }
    }, {
      new: true
    });
  }
  job.remove(function (err) {
    if (!err)
      console.log("Successfully removed job from collection");
  });
});
process.on("updateCheckIn", async (payload) => {
  payload = JSON.parse(JSON.stringify(payload));
  await agenda.schedule(
    new Date(moment(payload.checkInTime)),
    "checkIn",
    payload
  );
  await agenda.schedule(
    new Date(moment(payload.checkOutTime).add(-2, "h")),
    "enableExtend",
    payload
  );

});

//Agenda for complete order. 
agenda.define("updateStatus", async (job) => {
  let jobData = job.attrs.data;
  const check = await Model.Booking.findOne({
    _id: ObjectId(jobData._id)
  });
  if (check != null && check.isBooking == false) {
    let booking = await Model.Booking.findOneAndUpdate({
      _id: ObjectId(jobData._id)
    }, {
      $set: {
        isCheckIn: false,
        isCheckOut: false,
        isExtend: false,
        bookingStatus: constants.BOOKING_STATUS.COMPLETED,
        isBookingEnabled: false
      },
      $push: {
        logs: {
          changedAt: moment(),
          status: constants.UPDATE_TYPE.COMPLETE
        }
      }
    }, {
      new: true
    });
    if (booking) {
      let location = await Model.Location.findOne({
        _id: booking.locationId
      });
      let qry = {};
      let occupied = await Model.Booking.countDocuments({
        bookingStatus: constants.BOOKING_STATUS.ACTIVE,
        locationId: booking.locationId,
        parentId: null
        // checkInTime: {
        //   $gte: moment().startOf("day"),
        //   $lte: moment().endOf("day")
        // }
      });
      qry.occupiedSlots = occupied;
      qry.pendingSlots = location.totalSlots - occupied;
      if (qry.pendingSlots < 0) {
        qry.pendingSlots = 0;
      }
      console.log(qry, "qry", booking.locationId);
      await Model.Location.findOneAndUpdate({
        _id: booking.locationId
      }, {
        $set: qry
      }, {
        new: true
      });
    }
  } else if (check != null && check.isBooking) {
    process.emit("completeBooking", check);
    await Model.Booking.updateOne({
      _id: check._id
    }, {
      $set: {
        isBooking: false
      }
    });
  }
  job.remove(function (err) {
    if (!err)
      console.log("Successfully removed job from collection");
  });
});
process.on("completeBooking", async (payload) => {
  payload = JSON.parse(JSON.stringify(payload));
  const check = await Model.Booking.findOne({
    _id: ObjectId(payload._id)
  });
  if (check && check.extendBooking == null && check.bookingType == constants.BOOKING_TYPE.FLEET) {
    await agenda.schedule(
      new Date(moment(payload.checkOutTime)),
      "updateStatus",
      payload
    );
  } else if (check && check.extendBooking == null && check.bookingType != constants.BOOKING_TYPE.FLEET) {
    await agenda.schedule(
      new Date(moment(payload.checkOutTime).add(15, "m")),
      "updateStatus",
      payload
    );
  } else if (check != null && check.extendBooking != null) {
    await agenda.schedule(
      new Date(moment(payload.extendedCheckOutTime)),
      "updateStatus",
      payload
    );
  }
});

//Agenda for Notification. 
agenda.define("expireNotification", async (job) => {
  console.log("expireNotification");
  let jobData = job.attrs.data;
  const check = await Model.Booking.findOne({
    _id: ObjectId(jobData._id)
  }).populate("userId");
  if (check != null && (check.extendBooking == null || jobData.isBooked)) {
    services.SmsService.expireSms({
      dialCode: check.userId.dialCode,
      phoneNo: check.userId.phoneNo
    });
  } else if (check != null && check.extendBooking != null) {
    console.log("--");
    process.emit("notifyUser", check);
  }
  job.remove(function (err) {
    if (!err)
      console.log("Successfully removed job from collection");
  });
});
agenda.define("extendNotification", async (job) => {
  console.log("extendNotification");
  let jobData = job.attrs.data;
  const check = await Model.Booking.findOne({
    _id: ObjectId(jobData._id)
  }).populate("userId");
  if (check != null && check.extendBooking == null) {
    services.SmsService.extendSms({
      dialCode: check.userId.dialCode,
      phoneNo: check.userId.phoneNo
    });
  }
  job.remove(function (err) {
    if (!err)
      console.log("Successfully removed job from collection");
  });
});
process.on("notifyUser", async (payload) => {
  console.log("00000");
  payload = JSON.parse(JSON.stringify(payload));
  const check = await Model.Booking.findOne({
    _id: ObjectId(payload._id)
  });
  if (check && check.extendBooking == null) {
    console.log("wehodsc", payload.checkOutTime);
    await agenda.schedule(
      new Date(moment(payload.checkOutTime).add(-15, "m")),
      "expireNotification",
      payload
    );
  } else if (check != null && check.extendBooking != null) {
    payload.isBooked = true;
    await agenda.schedule(
      new Date(moment(payload.extendedCheckOutTime).add(-15, "m")),
      "expireNotification",
      payload
    );
  }
});
process.on("notifyUser2", async (payload) => {
  console.log("2222222");
  payload = JSON.parse(JSON.stringify(payload));
  const check = await Model.Booking.findOne({
    _id: ObjectId(payload._id)
  });
  if (check && check.extendBooking == null) {
    console.log(payload.checkOutTime, "payload.checkOutTime");
    await agenda.schedule(
      new Date(moment(payload.checkOutTime)),
      "extendNotification",
      payload
    );
  }
});

//Agenda for complete order. 
agenda.define("makePayment", async (job) => {
  let jobData = job.attrs.data;
  const check = await Model.Booking.findOne({
    _id: ObjectId(jobData.parentId)
  });
  if(check != null && check.isRecurring){
    userController.makeRePayment(jobData._id);
  }else if(check != null && check.isRecurring == false){
    await Model.Booking.deleteMany({
      _id: ObjectId(jobData._id)
    });
  }
  job.remove(function (err) {
    if (!err)
      console.log("Successfully removed job from collection");
  });
});
process.on("repeatPayment", async (payload) => {
  payload = JSON.parse(JSON.stringify(payload));
  await agenda.schedule(
    new Date(moment(payload.checkInTime).startOf("day").add(1, "month")),
    "makePayment",
    payload
  );
});

 
agenda.define("makeDailyPayment", async (job) => {
  let jobData = job.attrs.data;
  const check = await Model.Booking.findOne({
    _id: ObjectId(jobData.parentId)
  });
  if(check != null && check.isRecurring){
    userController.makeRePayment(jobData._id);
  }else if(check != null && check.isRecurring == false){
    await Model.Booking.deleteMany({
      _id: ObjectId(jobData._id)
    });
  }
  job.remove(function (err) {
    if (!err)
      console.log("Successfully removed job from collection");
  });
});
process.on("repeatDailyPayment", async (payload) => {
  payload = JSON.parse(JSON.stringify(payload));
  await agenda.schedule(
    new Date(moment(payload.checkInTime).startOf("day").add(1, "day")),
    "makeDailyPayment",
    payload
  );
});