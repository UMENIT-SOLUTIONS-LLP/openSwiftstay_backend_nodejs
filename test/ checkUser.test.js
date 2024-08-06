require("dotenv").config();
const request = require("supertest")
const app = require('../server'); // Assuming your app is exported from 'app.js'
const Model = require('../models'); // Assuming your model is exported from 'models.js'
const services = require('../services'); // Assuming your services are exported from 'services.js'
const constants = require('../common/constants');
const Validation = require('../v1/validations');  // Assuming your constants are exported from 'constants.js'
const functions = require('../common/functions');
const { createUser } = require('../v1/controller/UserController/User'); // Import the createUser function
const Auth = require('../common/authenticate'); // Import the Auth dependency




describe("checkUser function", () => {
  it("should send OTP and return success message", async () => {
      // Mock the Validation.User.sendOtp.validateAsync method
      Validation.User.sendOtp.validateAsync = jest.fn(() => Promise.resolve());
      
      // Mock the Model.User.findOne method
      const mockUser = {
        phoneNo: '8755116231',
        dialCode: '+91',
        ISOCode:"IN"
      };
      Model.User.findOne = jest.fn(() => mockUser);
      const response = await request(app)
          .post("/api/v1/user/checkUser")
          .send({
              phoneNo: '8755116231',
              dialCode: '+91',
              ISOCode: 'IN'
          });

          console.log("asdfadsf");
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(constants.MESSAGES.OTP_SENT);
      expect(response.body.data).toEqual({
          isUser: true
      });
  });
});



describe('POST createUser', () => {
    it('should create a new user and return success', async () => {
        const payload = {
            phoneNo: '8755116231',
            dialCode: '+91',
            ISOCode:"IN",
            name: 'Rishab',
            otp: 1234
        };

        // Send HTTP request
        const response = await request(app)
            .post('/api/v1/user/createUser')
            .send(payload);


            console.log(response,"asdfasdfasdfasdf");

        // Assert status code
        expect(response.status).toBe(200);

        // Assert response body
        expect(response.body.message).toBe('Account created successfully');
        expect(response.body.data.phoneNo).toBe(payload.phoneNo);
        // Add more assertions as needed
    });

    it('should return an error for invalid OTP', async () => {
        const payload = {
            phoneNo: '9876020239',
            dialCode: '+91',
            name: 'Rishab',
            ISOCode:"IN",
            otp: 9999 // Invalid OTP
        };

        // Send HTTP request
        const response = await request(app)
            .post('/api/v1/user/createUser')
            .send(payload);

        // Assert status code
        expect(response.status).toBe(400);

        // Assert response body
        expect(response.body.message).toBe('Invalid OTP .');
        // Add more assertions as needed
    });

    // Add more test cases for edge cases and boundary values
});

describe('POST /api/v1/user/resendOtp', () => {
    it('should resend OTP for existing user', async () => {
        const payload = {
            phoneNo: '8755116231',
            dialCode: '+91',
            ISOCode:"IN"
        };

        // Send HTTP request
        const response = await request(app)
            .post('/api/v1/user/resendOtp')
            .send(payload);

        // Assert status code
        expect(response.status).toBe(200);

        // Assert response body
        expect(response.body.message).toBe('OTP sent successfully.');
        // Add more assertions as needed
    });

    it('should return an error for non-existing user', async () => {
        const payload = {
            phoneNo: '8848484848', // Non-existing user
            dialCode: '+91',
            ISOCode:"IN"
        };

        // Send HTTP request
        const response = await request(app)
            .post('/api/v1/user/resendOtp')
            .send(payload);

        // console.log(response);

        // Assert status code
        expect(response.statusCode).toBe(200);

        // Assert response body
        expect(response.body.message).toBe('User not found');
        // Add more assertions as needed
    });

    // Add more test cases for edge cases and boundary values
});


describe('POST /api/v1/user/verifyOtp', () => {
    it('should verify OTP and return success for existing user', async () => {
        const payload = {
            phoneNo: '9876020239',
            dialCode: '+91',
            ISOCode:"IN",
            otp: 1234
        };
        const authToken = 'your-auth-token';
        // Send HTTP request
        const response = await request(app)
            .post('/api/v1/user/verifyOtp')
            .send(payload);

        // Assert status code
        expect(response.status).toBe(200);

        // Assert response body
        expect(response.body.message).toBe('Phone number verified successfully');
        // Add more assertions as needed
    });

    it('should return an error for invalid OTP', async () => {
        const payload = {
            phoneNo: '9876020239',
            dialCode: '+91',
            ISOCode:"IN",
            otp: 9999 // Invalid OTP
        };

        // Send HTTP request
        const response = await request(app)
            .post('/api/v1/user/verifyOtp')
            .send(payload);

        // Assert status code
        expect(response.status).toBe(200);

        // Assert response body
        expect(response.body.error).toBe('Invalid OTP');
        // Add more assertions as needed
    });

    // Add more test cases for edge cases and boundary values
});