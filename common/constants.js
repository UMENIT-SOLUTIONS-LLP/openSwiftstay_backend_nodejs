module.exports = {
    MESSAGES: {
        USER_DATA_MISSING: "Data not found.",
        PROfILE_CREATED_SUCCESSFULLY: "Profile created successfully.",
        EMAIL_MISSING: "Email Id is missing.",
        PHONE_MISSING: "Phone number is missing.",
        DIAL_CODE_MISSING: "Dial code missing.",
        ACCOUNT_CREATED_SUCCESSFULLY: "Account created successfully.",
        EMAIL_ALREADY_IN_USE: "Email Id already in use.",
        UPLOAD_SUCCESS: "Uploaded successfully.",
        PHONE_ALREADY_IN_USE: "Phone number already in use.",
        INVALID_CREDENTIALS: "Invalid credentials.",
        ACCOUNT_BLOCKED: "Your account has been blocked.",
        LOGIN_SUCCESS: "Logged in successfully.",
        LOGOUT_SUCCESS: "Logged out successfully.",
        DATA_FETCHED: "Data fetched successfully.",
        EMAIL_ALREADY_EXISTS: "Email already in use.",
        PHONE_ALREADY_EXISTS: "Phone number already in use.",
        UPLOADING_ERROR: "Uploading error.",
        IMAGE_UPLOADED: "Image uploaded successfully.",
        ACCOUNT_DELETED: "Account deleted successfully.",
        NO_DATA_SUCCESS: "No data success.",
        OTP_SENT: "OTP sent successfully.",
        OTP_EXPIRED: "OTP expired.",
        INVALID_OTP: "Invalid OTP .",
        ACCOUNT_VERIFIED: "Account verified successfully.",
        ACCOUNT_PHONE: "Phone number verified successfully.",
        PROFILE_UPDATED_SUCCESSFULLY: "Profile updated successfully.",
        PROFILE_DELETED_SUCCESSFULLY: "Profile deleted successfully.",
        ADMIN_NOT_FOUND: "Admin data not found.",
        ACCOUNT_NOT_FOUND: "Account doesn't exist.",
        PASSWORD_CHANGED_SUCCESSFULLY: "Password changed successfully.",
        PASSWORDS_SHOULD_BE_DIFFERENT: "New password should be different from the old password.",
        SUCCESS: "Success.",
        LINK_SENT: "Forgot password link sent successfully.",
        PASSWORD_RESET: "Password reset successfully.",
        SUBADMIN_CREATED_SUCCESSFULLY: "Sub-admin created successfully.",
        PASSWORD_LINK_SENT: "Password link sent successfully.",
        ADDRESS_UPDATED_SUCCESSFULLY: "Address updated successfully.",
        ADDRESS_REQUIRED: "Address is required.",
        DELETED_SUCCESSFULLY: "Deleted successfully.",
        UPDATED_SUCCESSFULLY: "Updated successfully.",
        DUPLICATE_DATE: "Slot for this date already exists.",
        SOMETHING_WENT_WRONG: "Something went wrong.",
        DISCOUNT_AMOUNT_CANNOT_BE_MORE_THAN_100: "Discount amount cannot be more than 100%.",
        BANNER_ALREADY_EXISTS: "Banner already exists.",
        ACCESS_DENIED: "Access Denied.",
        ENTER_VALID_CODE: "Please enter a valid referral code.",
        COUPON_ALREADY_EXISTS: "Coupon already exists.",
        GIFT_CARD_ALREADY_EXISTS: "Gift Card already exists.",
        Package_ALREADY_EXISTS: "Package already exists.",
        PRODUCT_ALREADY_EXISTS: "Product already exists.",
        USER_NOT_VERIFIED: "User not verified.",
        LANDING_PAGE_ALREADY_EXISTS: "Landing page already exists.",
        ITEM_ALREADY_EXISTS: "Item already exists.",
        GEOFENCE_EXISTS_IN_CATEGORY: "This geofence exists in category.",
        USER_CREATED_SUCCESSFULLY: "User created successfully. ",
        VENDOR_CREATED_SUCCESSFULLY: "Vendor created successfully. ",
        Vendor_CREATED_SUCCESSFULLY: "Vendor_CREATED_SUCCESSFULLY",
        ASAP_CRED_DETAILS: "ASAP_CRED_DETAILS",
        DRIVER_UPDATED_SUCCESSFULLY: "Driver updated successfully. ",
        TOKEN_VALID: "Token Valid",
        EXPIRED_OTP: "Your OTP has expired. Please request a new OTP to proceed.",
        DATA_NOT_FOUND: "No data found for the specified criteria.",
      CANCELLED  :  "Your subscription has been cancelled."
    },
    ROLE: {
        ADMIN: 1,
        CLIENT: 2,
        USER: 3,
        ALL: 4
    },
    PROFILE_STATUS: {
        PENDING: 1,
        ACCEPTED: 2
    },
    ADDRESS_TYPE: {
        HOME: 1,
        WORK: 2,
        OTHER: 3
    },
    PRICING_TYPE: {
        DAY: 0,
        WEEK: 1,
        MONTH: 2
    },
    NOTIFICATION_TYPE: {
        SOCKET: 1,
        PUSH: 2,
        BROADCAST: 3
    },
    DOCUMENTS_FOR: {
        DRIVER: 1,
        VENDOR: 2
    },
    DISCOUNT_TYPE: {
        PERCENTAGE: 1,
        FLAT: 2,
        BOTH: 3
    },
    MESSAGE_TYPE: {
        MESSAGE: 1,
        VIDEO: 2,
        IMAGE: 3
    },
    PUSH_TYPE: {
        0: {
            keys: [],
            message: {
                en: "Default Message"
            },
            title: {
                en: "Default Title"
            }
        },
        1: {
            keys: [],
            message: {
                en: "You have a new booking {{orderNo}} from {{userId.firstName}}."
            },
            title: {
                en: "New Booking"
            }
        },
        2: {
            keys: [],
            message: {
                en: "Your booking {{orderNo}} has been accepted."
            },
            title: {
                en: "Booking accepted"
            }
        },
        3: {
            keys: [],
            message: {
                en: "Your booking {{orderNo}} has been started."
            },
            title: {
                en: "Booking started"
            }
        },
        4: {
            keys: [],
            message: {
                en: "Your booking {{orderNo}} has been picked."
            },
            title: {
                en: "Booking picked"
            }
        },
        5: {
            keys: [],
            message: {
                en: "Your booking {{orderNo}} is on the way."
            },
            title: {
                en: "Booking on the way"
            }
        },
        6: {
            keys: [],
            message: {
                en: "Your booking {{orderNo}} has been completed."
            },
            title: {
                en: "Booking completed"
            }
        },
        7: {
            keys: [],
            message: {
                en: "Your booking {{orderNo}} has been cancelled."
            },
            title: {
                en: "Booking cancelled"
            }
        },
        8: {
            keys: [],
            message: {
                en: "Your booking {{orderNo}} has been undelivered."
            },
            title: {
                en: "Booking undelivered"
            }
        },
        9: {
            keys: [],
            message: {
                en: "New message received."
            },
            title: {
                en: "New message"
            }
        }
    },
    ORDER_STATUS: {
        PENDING: 1,
        ACCEPTED: 2,
        STARTED: 3,
        PICKED: 4,
        ONTHEWAY: 5,
        COMPLETED: 6,
        CANCELLED: 7,
        REJECTED: 8,
        UNDELIVERED: 9,
        UNASSIGNED: 10
    },
    PUSH_TYPE_KEYS: {
        DEFAULT: 0,
        NEW_BOOKING: 1,
        BOOKING_ACCEPTED: 2,
        BOOKING_STARTED: 3,
        BOOKING_PICKED: 4,
        BOOKING_ONTHEWAY: 5,
        BOOKING_COMPLETED: 6,
        BOOKING_CANCELLED: 7,
        BOOKING_UNDELIVERED: 9,
        CHAT_MESSAGE: 10
    },
    LOCATION_SLOT: {
        DAILY: 0,
        MONTHLY: 1,
        OVERNIGHTSLOT:3,
        HOURLY:4
    },
    locationTypeMap: {
        0: "Daily",
        1: "Monthly",
        3: "Overnight Slot",
        4: "Hourly"
    },
    BOOKING_TYPE: {
        INSTANT: 1,
        SCHEDULE: 2,
        FLEET:3,
        RECURRING:4
    },
    BOOKING_STATUS: {
        UPCOMING: 1,
        ACTIVE: 2,
        COMPLETED: 3
    },
    UPDATE_TYPE: {
        CHEKIN: 1,
        CHECKOUT: 2,
        COMPLETE: 3
    },
    SUBSCRIPTION_STATUS: {
        ACTIVE: 1,
        CANCELLED: 2,
        NOT_ACTIVE: 3
    }
};