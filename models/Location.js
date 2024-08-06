const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const LocationSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "",
        index: true
    },
    address: {
        type: String,
        default: ""
    },
    mapLink: {
        type: String,
        default: ""
    },
    amenities: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    currency: {
        type: String,
        default: "USD"
    },
    totalSlots: {
        type: Number,
        default: 0,
        index: true
    },
    occupiedSlots: {
        type: Number,
        default: 0
    },
    pendingSlots: {
        type: Number,
        default: 0
    },
    lastTotalSlots: {
        type: Number,
        default: 0
    },
    lastOccupiedSlots: {
        type: Number,
        default: 0
    },
    lastPendingSlots: {
        type: Number,
        default: 0
    },
    creditCardFee: {
        type: Number,
        default: 0
    },
    salesTax: {
        type: Number,
        default: 0
    },
    convenienceFee: {
        type: Number,
        default: 0
    },
    dailySlot: {
        price: {
            type: Number,
            default: 0
        },
        extendPrice: {
            type: Number,
            default: 0
        }
    },
    // hoursSlot: {
    //     price: {
    //         type: Number,
    //         default: 0
    //     },
    //     extendPrice: {
    //         type: Number,
    //         default: 0
    //     }
    // },
    // overNightSlot: {
    //     price: {
    //         type: Number,
    //         default: 0
    //     },
    //     extendPrice: {
    //         type: Number,
    //         default: 0
    //     }
    // },
    monthlySlot: {
        price: {
            type: Number,
            default: 0
        },
        extendPrice: {
            type: Number,
            default: 0
        }
    },
    hourlySlot: {
        price: {
            type: Number,
            default: 0
        },
        extendPrice: {
            type: Number,
            default: 0
        }
    },
    overNightSlot: {
        price: {
            type: Number,
            default: 0
        },
        extendPrice: {
            type: Number,
            default: 0
        }
    },
    clientIds: [{
        type: ObjectId,
        ref: "Admins",
        default: []
    }],
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deviceIn: {
        deviceId: {
            type: String,
            default: "Dev-" + generateUniqueId() // Generating unique ID
        },
        deviceName: {
            type: String,
            default: ""
        },
        hostName: {
            type: String,
            default: ""
        },
        deviceUserName: {
            type: String,
            default: ""
        },
        isDeviceActive:{
            type: Boolean,
            default: false

        }
    },
    deviceOut: {
        deviceId: {
            type: String,
            default: "Dev-" + generateUniqueId() // Generating unique ID
        },
        deviceName: {
            type: String,
            default: ""
        },
        deviceUserName: {
            type: String,
            default: ""
        },
        hostName: {
            type: String,
            default: ""
        },
        isDeviceActive:{
            type: Boolean,
            default: false

        }
    }
},
    {
        timestamps: true
    });
function generateUniqueId() {
    const timestamp = Date.now().toString(36); // Convert current timestamp to base36 string
    const randomStr = Math.random().toString(36).substr(2, 5); // Generate a random string
    return timestamp + randomStr; // Concatenate timestamp and random string
}

module.exports = mongoose.model("Location", LocationSchema);