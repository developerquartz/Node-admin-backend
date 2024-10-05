const User = require("../models/userTable");
const storeType = require("../models/storeTypeTable");
const Store = require("../models/storeTable");
const Category = require("../models/categoryTable");
const Product = require("../models/productsTable");
const Utils = require("../helper/utils");
const otpVerification = require("../lib/otpverification");
const ObjectId = require("objectid");
const Pricing = require("../helper/pricing");
const Address = require("../models/addressTable");
const Coupon = require("../models/couponTable");
const Cuisines = require("../models/cuisinesTable");
const emailService = require("../helper/emailService");
const orderService = require("../helper/orderService");
const FileTable = require("../models/fileTable");
const Promotion = require("../models/promotionTable");
const ContentPages = require("../models/contentPagesTable.js");
const geofencingFun = require("../helper/geofencing");
const promoUse = require("../models/promoCodeuseTable");
const Document = require("../models/documentsTable");
const DocumentTemplate = require("../models/documentTemplate.js");
const paymentLedger = require("../models/paymentLedgerTable");
const Transaction = require("../helper/transaction");
const notifyUser = require("../helper/adjustPayment");
var randomstring = require("randomstring");
const { calculteReferredCommission } = require("../helper/referralCommission");
const Config = require('../config/constants.json');
const terminologyModel = require('../models/terminologyTable');
const Otp = require("../models/otp.js");
const BusinessType = require('../models/businessType.js')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid');
const { config } = require("npm");
module.exports = {
  createUser: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      data.store = store.storeId;

      // if (!data.firstName) {
      //   return res.json(
      //     helper.showValidationErrorResponse("FIRSTNAME_IS_REQUIRED")
      //   );
      // }

      // if (!data.lastName) {
      //   return res.json(
      //     helper.showValidationErrorResponse("LASTNAME_IS_REQUIRED")
      //   );
      // }

      // if (!data.email && !data.mobileNumber) {
      //   return res.json(
      //     helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
      //   );
      // }

      // if (data.mobileNumber && !data.countryCode) {
      //   return res.json(
      //     helper.showValidationErrorResponse("CC_IS_REQUIRED")
      //   );
      // }

      if (!data.password) {
        return res.json(
          helper.showValidationErrorResponse("PASSWORD_IS_REQUIRED")
        );
      }

      // if (!data.gender) {
      //   return res.json(
      //     helper.showValidationErrorResponse("GENDER_IS_REQUIRED")
      //   );
      // }

      // if (!data.dob) {
      //   return res.json(
      //     helper.showValidationErrorResponse("DOB_IS_REQUIRED")
      //   );
      // }

      // if (!data.country) {
      //   return res.json(
      //     helper.showValidationErrorResponse("DOB_IS_REQUIRED")
      //   );
      // }

      // if (!data.city) {
      //   return res.json(
      //     helper.showValidationErrorResponse("DOB_IS_REQUIRED")
      //   );
      // }

      let check_exist = {
        store: ObjectId(data.store),
        role: "USER",
        status: { $ne: "archived" },
      }

      if (data.mobileNumber) check_exist.mobileNumber = data.mobileNumber;
      else if (data.email) check_exist['email'] = data.email;

      const getUser = await User.findOne(check_exist);
      if (getUser != null) return res.json(helper.showValidationErrorResponse("EMAIL_OR_MOBILE_NUMBER_ALREADY_EXISTS"));

      const getHash = await Utils.hashPassword(data.password);
      data.password = getHash.hashedPassword;
      data.salt = getHash.salt;
      data.status = "active";
      data.role = "USER";
      data.tokens = [];
      data.isKycCompleted = false
      data.isBankFieldsAdded = false
      if (data.firebaseToken) data.firebaseTokens = [{ token: data.firebaseToken }];
      let createUser = await User.create(data);
      if (!createUser) res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
      const token = Utils.generateToken(createUser, store.tokenExpiresIn);
      let update = {};
      if (createUser.tokens == null) update.tokens = token;
      else update.tokens = createUser.tokens.concat({ token });
      await emailService.userRegisterEmail(createUser);
      await User.findOneAndUpdate({ _id: createUser._id }, update, { new: true });
      let project = { _id: 1, firstName: 1, lastName: 1, email: 1, countryCode: 1, mobileNumber: 1, isKycCompleted: 1, isBankFieldsAdded: 1 }
      let response = await User.findOne({ _id: createUser._id }, project).lean();
      response.token = token;
      let resdata = await helper.showSuccessResponse("USER_REGISTER_SUCCESS", response);
      res.json(resdata);
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  userOTP: async (req, res) => {
    try {
      let data = req.body;
      console.log("data---------", data)
      let store = req.store;
      data.store = store.storeId;
      data.storeName = store.storeName;
      let exptime = new Date();
      exptime.setHours(exptime.getHours() + 1);
      data.OTPexp = exptime;
      let OTP = Utils.generateOTP(4);
      data.OTP = OTP;
      if (data.email) data.message = `Your ${data.storeName} verification code is: ${OTP}`
      let obj = {
        store: data.store,
        role: "USER",
        status: { $ne: "archived" },
      };
      if (data.mobileNumber != "" && data.mobileNumber != null) {
        let charAt = data.mobileNumber.charAt(0);
        if (charAt === "0") {
          obj["$or"] = [
            { mobileNumber: data.mobileNumber },
            { mobileNumber: data.mobileNumber.substring(1) },
          ];
        } else {
          obj["$or"] = [
            { mobileNumber: data.mobileNumber },
            { mobileNumber: "0" + data.mobileNumber },
          ];
        }
      } else if (data.email != "" && data.email != null) {
        obj.email = data.email
      } else {
        return res.json(helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED"));
      }
      const getUser = await User.findOne(obj);
      let twilioKey = {};
      if (getUser == null) {
        if (data.email) {
          let resData = helper.showSuccessResponse("NEW_USER", data);
          resData.exist = false;
          resData.isLoginFromSocial = false;
          await otpVerification.OtpSave(data)
          await emailService.userLoginOtpEmail(data, store);
          return res.json(resData);
        }
        if (!data.countryCode) {
          return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
        }
        if (!store.otpbypass) {
          let getStore = await Store.findById(data.store, "twilio");
          if (getStore && getStore.twilio) twilioKey = getStore.twilio;
          let result = await otpVerification.sendOtpSMSTwilio(twilioKey, data)
          if (result.status) {
            data.serviceSid = result.data.serviceSid || new Date().getTime();
            let resData = helper.showSuccessResponse("NEW_USER", data);
            resData.exist = false;
            resData.isLoginFromSocial = false;
            res.json(resData);
          } else {
            data.serviceSid = new Date().getTime()
            let resData = helper.showSuccessResponse("USER_EXISTS", data);
            resData.exist = false;
            res.json(resData);
          }
        } else {
          data.serviceSid = new Date().getTime()
          let resData = helper.showSuccessResponse("NEW_USER", data);
          resData.exist = false;
          resData.isLoginFromSocial = false;
          res.json(resData);
        }
      } else if (getUser != null && !getUser.password) {
        console.log("getUser.password-----------")
        if (data.email) {
          console.log("if email  getUser.password-----------")
          let resData = helper.showSuccessResponse("NEW_USER", data);
          resData.exist = false;
          resData.isLoginFromSocial = false;

          return res.json(resData);
        }
        if (!data.countryCode) {
          return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
        }
        if (!store.otpbypass) {
          let ressult = await otpVerification.sendOtpSMSTwilio(twilioKey, data)
          if (ressult.status) {
            data.serviceSid = ressult.data.serviceSid || new Date().getTime();
            let resData = helper.showSuccessResponse("NEW_USER", data);
            resData.exist = false;
            resData.isLoginFromSocial = true;
            res.json(resData);
          } else {
            data.serviceSid = new Date().getTime();
            let resData = helper.showSuccessResponse("USER_EXISTS", data);
            resData.exist = false;
            resData.isLoginFromSocial = true;
            res.json(resData);
          }
        } else {
          console.log("!store.otpbypass-----------")
          let resData = helper.showSuccessResponse("USER_EXISTS", data);
          resData.exist = true;
          resData.isLoginFromSocial = true;
          res.json(resData);
        }
      } else {
        if (getUser.status === "blocked") {
          return res.json(helper.showValidationErrorResponse("USER_BLOCKED"));
        }
        if (getUser.status === "rejected") {
          return res.json(helper.showValidationErrorResponse("USER_REJECTED"));
        }
        if (getUser.status === "inactive") {
          return res.json(helper.showValidationErrorResponse("USER_INACTIVE"));
        }
        // if (getUser.countryCode != data.countryCode) {
        //   return res.json(helper.showValidationErrorResponse("COUNTRY_CODE_INVALID"));
        // }
        let resData = helper.showSuccessResponse("USER_EXISTS", getUser);
        resData.exist = true;
        resData.password = "";
        resData.salt = "";
        resData.isLoginFromSocial = false;
        res.json(resData);
      }
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  // userOTPOld: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let store = req.store;

  //     data.store = store.storeId;
  //     data.storeName = store.storeName;

  //     if (!data.mobileNumber) {
  //       return res.json(
  //         helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
  //       );
  //     }

  //     let charAt = data.mobileNumber.charAt(0);

  //     let obj = {
  //       store: data.store,
  //       role: "USER",
  //       status: { $ne: "archived" },
  //     };

  //     if (charAt === "0") {
  //       obj["$or"] = [
  //         { mobileNumber: data.mobileNumber },
  //         { mobileNumber: data.mobileNumber.substring(1) },
  //       ];
  //     } else {
  //       obj["$or"] = [
  //         { mobileNumber: data.mobileNumber },
  //         { mobileNumber: "0" + data.mobileNumber },
  //       ];
  //     }

  //     const getUser = await User.findOne(obj);
  //     let getStore = await Store.findById(data.store, "twilio");
  //     let twilioKey = {};
  //     if (getStore && getStore.twilio) twilioKey = getStore.twilio;

  //     if (getUser == null) {
  //       if (!data.countryCode) {
  //         return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
  //       }
  //       if (!store.otpbypass) {
  //         otpVerification.sendOtpSMSCallback(
  //           twilioKey,
  //           data,
  //           (err, resdata) => {
  //             if (err) {
  //               return res.json(helper.showTwillioErrorResponse(err.message));
  //             }

  //             data.serviceSid = resdata.serviceSid;

  //             let resData = helper.showSuccessResponse("NEW_USER", data);
  //             resData.exist = false;
  //             resData.isLoginFromSocial = false;
  //             res.json(resData);
  //           }
  //         );
  //       } else {
  //         let resData = helper.showSuccessResponse("NEW_USER", data);
  //         resData.exist = false;
  //         resData.isLoginFromSocial = false;
  //         res.json(resData);
  //       }
  //     } else if (getUser != null && !getUser.password) {
  //       if (!data.countryCode) {
  //         return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
  //       }
  //       if (!store.otpbypass) {
  //         otpVerification.sendOtpSMSCallback(
  //           twilioKey,
  //           data,
  //           (err, resdata) => {
  //             if (err) {
  //               console.log("err---", err);
  //               return res.json(helper.showTwillioErrorResponse(err.message));
  //             }
  //             data.serviceSid = resdata.serviceSid;
  //             let resData = helper.showSuccessResponse("USER_EXISTS", data);
  //             resData.exist = true;
  //             resData.isLoginFromSocial = true;
  //             res.json(resData);
  //           }
  //         );
  //       } else {
  //         let resData = helper.showSuccessResponse("USER_EXISTS", data);
  //         resData.exist = true;
  //         resData.isLoginFromSocial = true;
  //         res.json(resData);
  //       }
  //     } else {
  //       if (getUser.status === "blocked") {
  //         return res.json(helper.showValidationErrorResponse("USER_BLOCKED"));
  //       }

  //       if (getUser.status === "rejected") {
  //         return res.json(helper.showValidationErrorResponse("USER_REJECTED"));
  //       }

  //       if (getUser.status === "inactive") {
  //         return res.json(helper.showValidationErrorResponse("USER_INACTIVE"));
  //       }
  //       if (getUser.countryCode != data.countryCode) {
  //         return res.json(
  //           helper.showValidationErrorResponse("COUNTRY_CODE_INVALID")
  //         );
  //       }
  //       let resData = helper.showSuccessResponse("USER_EXISTS", getUser);
  //       resData.exist = true;
  //       resData.password = "";
  //       resData.salt = "";
  //       resData.isLoginFromSocial = false;
  //       res.json(resData);
  //     }
  //   } catch (error) {
  //     console.log("err", error);
  //     res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
  //   }
  // },

  resendOTP: async (req, res) => {
    try {
      let data = req.body;
      let exptime = new Date();
      exptime.setHours(exptime.getHours() + 1);
      data.OTPexp = exptime;
      let OTP = Utils.generateOTP(4);
      data.OTP = OTP;
      data.message = `Your ${data.storeName} verification code is: ${OTP}`
      let store = req.store;
      data.store = store.storeId;
      data.storeName = store.storeName;
      let obj = {
        store: data.store,
        role: "USER",
        status: { $ne: "archived" },
      };
      if (data.mobileNumber && data.mobileNumber != "" && data.countryCode) {
        if (!store.otpbypass) {
          let ressult = await otpVerification.sendOtpSMSTwilio(data);
          if (!ressult.status) {
            //handling error
            data.serviceSid = new Date().getTime();
            res.json(helper.showSuccessResponse("OTP_SUCCESS", data));
          }
          else {
            data.serviceSid = ressult.data.serviceSid || new Date().getTime();
            res.json(helper.showSuccessResponse("OTP_SUCCESS", data));
          }

        } else {
          var resData = helper.showSuccessResponse("OTP_SUCCESS", data);
          res.json(resData);
        }
      } else if (data.email && data.email != "") {
        obj.email = data.email
        const getUser = await User.findOne(obj)
          .exec();
        if (getUser != null) {
          data._id = getUser._id;
          data.OTP = OTP;
          getUser.OTP = OTP;
          console.log("OTP----", OTP)
          emailService.userForgotPasswordEmail(getUser);
          User.updateOTP(data, (err, resdata) => {
            if (err) {
              res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
              let result = helper.showSuccessResponse('OTP_SUCCESS', resdata);
              res.json(result);
            }
          });
        } else {
          otpVerificationNew.OtpSave(data)
          emailService.userLoginOtpEmail(data, store);
          var resData = helper.showSuccessResponse("OTP_SUCCESS", data);
          res.json(resData);
        }

      }
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  // resendOTP: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let store = req.store;
  //     data.store = store.storeId;
  //     data.storeName = store.storeName;

  //     if (!data.mobileNumber) {
  //       return res.json(
  //         helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
  //       );
  //     }

  //     if (!data.countryCode) {
  //       return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
  //     }
  //     let getStore = await Store.findById(data.store, "twilio");

  //     let twilioKey = {};
  //     if (getStore && getStore.twilio) twilioKey = getStore.twilio;

  //     if (!store.otpbypass) {
  //       otpVerification.sendOtpSMSCallback(twilioKey, data, (err, resdata) => {
  //         if (err) {
  //           return res.json(helper.showTwillioErrorResponse(err.message));
  //         }

  //         data.serviceSid = resdata.serviceSid;

  //         var resData = helper.showSuccessResponse("OTP_SUCCESS", data);
  //         res.json(resData);
  //       });
  //     } else {
  //       var resData = helper.showSuccessResponse("OTP_SUCCESS", data);
  //       res.json(resData);
  //     }
  //   } catch (error) {
  //     console.log("err", error);
  //     res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
  //   }
  // },

  // userLogin: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let store = req.store;
  //     data.store = store.storeId;
  //     // if (!data.mobileNumber ) {
  //     //   return res.json(
  //     //     helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
  //     //   );
  //     // }

  //     if (!data.password) {
  //       return res.json(
  //         helper.showValidationErrorResponse("PASSWORD_IS_REQUIRED")
  //       );
  //     }
  //     let check_query = {
  //       store: data.store,
  //       role: "USER",
  //       status: { $ne: "archived" },
  //     }
  //     if (data.mobileNumber) check_query.mobileNumber = data.mobileNumber;
  //     else if (data.email) check_query.email = data.email;

  //     let getUser = await User.findOne(check_query);

  //     if (getUser == null) {
  //       return res.json(helper.showValidationErrorResponse("USER_NOT_EXISTS"));
  //     }

  //     const token = Utils.generateToken(getUser, store.tokenExpiresIn);

  //     if (getUser.tokens == null) {
  //       getUser.tokens = token;
  //     } else {
  //       getUser.tokens = getUser.tokens.concat({ token });
  //     }

  //     if (getUser.status === "blocked") {
  //       return res.json(helper.showValidationErrorResponse("USER_BLOCKED"));
  //     }

  //     if (getUser.status === "rejected") {
  //       return res.json(helper.showValidationErrorResponse("USER_REJECTED"));
  //     }

  //     if (getUser.status === "inactive") {
  //       return res.json(helper.showValidationErrorResponse("USER_INACTIVE"));
  //     }

  //     const validPassword = await Utils.verifyPassword(
  //       getUser.password,
  //       data.password
  //     );

  //     if (data.firebaseToken) {
  //       getUser.firebaseToken = data.firebaseToken;
  //     }
  //     if (validPassword) {
  //       if (getUser.firebaseTokens == null) {
  //         getUser.firebaseTokens = [{ token: getUser.firebaseToken }];
  //       } else {
  //         const _firebaseTokens = getUser.firebaseTokens.map(
  //           (element) => element.token
  //         );

  //         if (
  //           data.firebaseToken &&
  //           !_firebaseTokens.includes(data.firebaseToken)
  //         ) {
  //           getUser.firebaseTokens = getUser.firebaseTokens.concat({
  //             token: data.firebaseToken,
  //           });
  //         }
  //       }

  //       getUser.isLoginFromSocial = false;

  //       let response = await User.updateToken(getUser);
  //       response.token = token;
  //       let resdata = helper.showSuccessResponse("LOGIN_SUCCESS", response);
  //       res.json(resdata);

  //       // User.updateToken(getUser, (err, mytoken) => {
  //       //   if (err) {
  //       //     res.json(
  //       //       helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
  //       //     );
  //       //   } else {
  //       //     mytoken.set("token", token, { strict: false });
  //       //     let resdata = helper.showSuccessResponse("LOGIN_SUCCESS", mytoken);
  //       //     res.json(resdata);
  //       //   }
  //       // });
  //     } else {
  //       return res.json(helper.showValidationErrorResponse("WRONG_PASSWORD"));
  //     }
  //   } catch (error) {
  //     console.log("err", error);
  //     res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
  //   }
  // },
  userLogin: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      data.store = store.storeId;
      let qry = {
        store: data.store,
        role: "USER",
        status: { $ne: "archived" },
      }
      if (data.mobileNumber && data.mobileNumber != "" && data.mobileNumber != null) {
        qry.mobileNumber = data.mobileNumber
      } else if (data.email && data.email != "" && data.email != null) {
        qry.email = data.email
      } else {
        return res.json(helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED"));
      }
      if (!data.password) {
        return res.json(helper.showValidationErrorResponse("PASSWORD_IS_REQUIRED"));
      }
      let getUser = await User.findOne(qry);
      if (getUser == null) {
        return res.json(helper.showValidationErrorResponse("USER_NOT_EXISTS"));
      }
      const token = Utils.generateToken(getUser, store.tokenExpiresIn);
      if (getUser.tokens == null) {
        getUser.tokens = token;
      } else {
        getUser.tokens = getUser.tokens.concat({ token });
      }
      if (getUser.status === "blocked") {
        return res.json(helper.showValidationErrorResponse("USER_BLOCKED"));
      }
      if (getUser.status === "rejected") {
        return res.json(helper.showValidationErrorResponse("USER_REJECTED"));
      }
      if (getUser.status === "inactive") {
        return res.json(helper.showValidationErrorResponse("USER_INACTIVE"));
      }
      const validPassword = await Utils.verifyPassword(
        getUser.password,
        data.password
      );
      if (data.firebaseToken) {
        getUser.firebaseToken = data.firebaseToken;
      }
      if (validPassword) {
        if (getUser.firebaseTokens == null) {
          getUser.firebaseTokens = [{ token: getUser.firebaseToken }];
        } else {
          const _firebaseTokens = getUser.firebaseTokens.map(
            (element) => element.token
          );

          if (
            data.firebaseToken &&
            !_firebaseTokens.includes(data.firebaseToken)
          ) {
            getUser.firebaseTokens = getUser.firebaseTokens.concat({
              token: data.firebaseToken,
            });
          }
        }
        getUser.isLoginFromSocial = false;
        User.updateToken(getUser, (err, mytoken) => {
          if (err) {
            res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            mytoken.set("token", token, { strict: false });
            console.log("mytoken--------", mytoken)
            let resdata = helper.showSuccessResponse("LOGIN_SUCCESS", mytoken);
            res.json(resdata);
          }
        });
      } else {
        return res.json(helper.showValidationErrorResponse("WRONG_PASSWORD"));
      }
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  socialNediaLoginSignUp: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      data.store = store.storeId;

      let getUser = null;

      if (data.facebook_id && data.email) {
        getUser = await User.findOne({
          store: data.store,
          $or: [{ facebook_id: data.facebook_id }, { email: data.email }],
          role: "USER",
          status: { $ne: "archived" },
        });
      } else if (data.google_id && data.email) {
        getUser = await User.findOne({
          store: data.store,
          $or: [{ google_id: data.google_id }, { email: data.email }],
          role: "USER",
          status: { $ne: "archived" },
        });
      } else if (data.apple_id && data.email) {
        getUser = await User.findOne({
          store: data.store,
          $or: [{ apple_id: data.apple_id }, { email: data.email }],
          role: "USER",
          status: { $ne: "archived" },
        });
      } else {
        if (data.facebook_id) {
          getUser = await User.findOne({
            store: data.store,
            facebook_id: data.facebook_id,
            role: "USER",
            status: { $ne: "archived" },
          });
        } else if (data.google_id) {
          getUser = await User.findOne({
            store: data.store,
            google_id: data.google_id,
            role: "USER",
            status: { $ne: "archived" },
          });
        } else if (data.apple_id) {
          getUser = await User.findOne({
            store: data.store,
            apple_id: data.apple_id,
            role: "USER",
            status: { $ne: "archived" },
          });
        }
      }

      if (data.first_name && data.last_name) {
        data.name = data.first_name + " " + data.last_name;
      }

      if (data.profileImage && data.profileImage != "false") {
        let getProfile = await FileTable.create({ link: data.profileImage });
        data.profileImage = getProfile._id;
      } else {
        delete data.profileImage;
      }

      if (data.mobileNumber) {
        delete data.mobileNumber;
      }

      if (getUser == null) {
        data.status = "active";
        data.role = "USER";
        data.date_created_utc = new Date();
        getUser = await User.create(data);
      }

      if (data.profileImage) {
        getUser.profileImage = data.profileImage;
      }

      if (data.name && data.name != "false") {
        getUser.name = data.name;
      }

      if (data.email && data.email != "false") {
        getUser.email = data.email;
      }

      getUser.facebook_id = data.facebook_id ? data.facebook_id : null;
      getUser.google_id = data.google_id ? data.google_id : null;
      getUser.apple_id = data.apple_id ? data.apple_id : null;

      const token = Utils.generateToken(getUser, store.tokenExpiresIn);

      if (getUser.tokens == null) {
        getUser.tokens = [{ token }];
      } else {
        getUser.tokens = getUser.tokens.concat({ token });
        if (getUser.status === 'blocked') {
          return res.json(helper.showUnathorizedAppErrorWithErrorCode('USER_BLOCKED', '5013'));
        }
      }

      getUser.isLoginFromSocial = true;

      User.updateUserProfile(getUser, (err, mytoken) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          mytoken.set("token", token, { strict: false });
          let resdata = helper.showSuccessResponse("LOGIN_SUCCESS", mytoken);
          res.json(resdata);
        }
      });
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  userLogout: async (req, res) => {
    try {
      console.log("INSIDE ----- LOGOUT");
      let tokens = [];
      let obj = {};
      if (req.user.tokens) {
        tokens = req.user.tokens.filter((token) => {
          return token.token !== req.token;
        });

        obj.tokens = tokens;
      }

      let firebaseTokens = [];

      // if (req.user.firebaseTokens) {
      //     firebaseTokens = req.user.firebaseTokens.filter((token) => {
      //         return token.token !== req.body.firebaseToken
      //     });
      //     obj.firebaseTokens = firebaseTokens;
      // }

      obj.firebaseTokens = firebaseTokens;

      const resdata = await User.findByIdAndUpdate(req.user._id, obj, {
        new: true,
      });

      res.json(helper.showSuccessResponse("LOGOUT_SUCCESS",));
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  userVerifyOTP: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      console.log("data--------", data)
      data.store = store.storeId;
      data.storeName = store.storeName;

      if (!data.OTP) {
        return res.json(helper.showValidationErrorResponse("OTP_IS_REQUIRED"));
      }
      if (data.mobileNumber && data.mobileNumber != "" && data.countryCode) {
        if (!store.otpbypass) {
          if (!data.serviceSid) {
            return res.json(helper.showValidationErrorResponse("SERVICESID_IS_REQUIRED"));
          }

          let getStore = await Store.findById(data.store, "twilio");
          let twilioKey = {};
          if (getStore && getStore.twilio) twilioKey = getStore.twilio;
          // otpVerification.sendOtpSMSVerify(data, (resData) => {
          //   res.json(resData);
          // });
          let resData = await otpVerification.sendOtpSMSVerify(twilioKey, data);
          res.json(resData);
        } else {
          res.json(helper.showSuccessResponse("OTP_VALID", data));
        }
      } else if (data.email && data.email != "") {
        const getUser = await User.findOne({ store: store.storeId, email: data.email, role: "USER", status: { $ne: "archived" } });
        // const getOtp = await Otp.findOne({ store: store.storeId, email: data.email });
        console.log(" getOtp ======>",);
        if (getUser != null) {
          data._id = getUser._id;
          // var cDate = new Date();
          // var exptime = new Date(getUser.OTPexp);
          // if (!store.otpbypass) {
          // if (cDate.getTime() >= exptime.getTime()) {
          // return res.json(helper.showValidationErrorResponse('OTP_EXPIRED'));
          // }
          // console.log("getOtp.otp == data.OTP ", getOtp.otp == data.OTP);
          // console.log(` getOtp.otp ${getOtp.otp}  data.OTP , ${data.OTP}`);

          if (getUser.OTP == data.OTP) {
            res.json(helper.showSuccessResponse("OTP_VALID", data));
          } else {
            return res.json(helper.showValidationErrorResponse('OTP_NOT_MATCH'));
          }
          // }
          // else {
          //   res.json(helper.showSuccessResponse("OTP_VALID", data));
          // }
        }
        else {
          // if (!store.otpbypass) {
          let verification = await otpVerification.OtpVerify(data)
          console.log("verification-----", verification)
          if (verification) {
            res.json(helper.showSuccessResponse("OTP_VALID", data));
          } else {
            return res.json(helper.showValidationErrorResponse('OTP_NOT_MATCH'));
          }
          // } else {
          //   res.json(helper.showSuccessResponse("OTP_VALID", data));
          // }
        }
      } else {
        return res.json(
          helper.showValidationErrorResponse("REQUIRED_FIELD")
        );
      }
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  // userVerifyOTP_old: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let store = req.store;

  //     data.store = store.storeId;
  //     data.storeName = store.storeName;

  //     if (!data.OTP) {
  //       return res.json(helper.showValidationErrorResponse("OTP_IS_REQUIRED"));
  //     }
  //     if (!store.otpbypass) {
  //       if (!data.serviceSid) {
  //         return res.json(
  //           helper.showValidationErrorResponse("SERVICESID_IS_REQUIRED")
  //         );
  //       }
  //       let getStore = await Store.findById(data.store, "twilio");

  //       let twilioKey = {};
  //       if (getStore && getStore.twilio) twilioKey = getStore.twilio;

  //       otpVerification.sendOtpSMSVerifyCallback(
  //         twilioKey,
  //         data,
  //         (err, resdata) => {
  //           if (err) {
  //             return res.json(helper.showTwillioErrorResponse(err.message));
  //           } else {
  //             if (resdata.valid) {
  //               res.json(helper.showSuccessResponse("OTP_VALID", data));
  //             } else {
  //               return res.json(
  //                 helper.showValidationErrorResponse("OTP_NOT_MATCH")
  //               );
  //             }
  //           }
  //         }
  //       );
  //     } else {
  //       res.json(helper.showSuccessResponse("OTP_VALID", data));
  //     }
  //   } catch (error) {
  //     console.log("err", error);
  //     res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
  //   }
  // },

  userForgotPassword: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      data.store = store.storeId;
      data.storeName = store.storeName;
      let exptime = new Date();
      exptime.setHours(exptime.getHours() + 1);
      data.OTPexp = exptime;
      let OTP = Utils.generateOTP(4);
      if (data.email) data.OTP = Utils.generateOTP(4);
      else data.OTP = "1234";
      let obj = {
        store: data.store,
        role: "USER",
        status: { $ne: "archived" },
      };
      if (data.mobileNumber && data.mobileNumber != "") {
        let charAt = data.mobileNumber.charAt(0);
        if (charAt === "0") {
          obj["$or"] = [
            { mobileNumber: data.mobileNumber },
            { mobileNumber: data.mobileNumber.substring(1) },
          ];
        } else {
          obj["$or"] = [
            { mobileNumber: data.mobileNumber },
            { mobileNumber: "0" + data.mobileNumber },
          ];
        }
        if (!data.countryCode) {
          return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
        }
      } else if (data.email && data.email != "") {
        obj.email = data.email
        data.message = `Your ${data.storeName} verification code is: ${OTP}`;
      } else {
        if (!data.mobileNumber) {
          return res.json(
            helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
          );
        }
      }
      const getUser = await User.findOne(obj).populate("store", "twilio").exec();

      if (!getUser) return res.json(helper.showValidationErrorResponse("USER_NOT_EXIST"));
      data.isForgotPasswordRequested = true;
      // if (getUser != null) {
      if (data.mobileNumber && data.mobileNumber != "" && data.countryCode) {
        if (!store.otpbypass) {
          let ressult = await otpVerification.sendOtpSMSTwilio(data);
          if (!ressult.status) {
            //handling error
            data.serviceSid = new Date().getTime();
            await User.findOneAndUpdate(obj, { $set: { isForgotPasswordRequested: true } });
            res.json(helper.showSuccessResponse("OTP_SUCCESS", data));
          }
          else {
            data.serviceSid = ressult.data.serviceSid || new Date().getTime();
            await User.findOneAndUpdate(obj, { $set: { isForgotPasswordRequested: true } });
            res.json(helper.showSuccessResponse("OTP_SUCCESS", data));
          }
        } else {
          res.json(helper.showSuccessResponse("OTP_SUCCESS", data));
        }
      } else {
        data._id = getUser._id;
        data.OTP = OTP;
        getUser.OTP = OTP;
        console.log("OTP----", OTP)
        emailService.userForgotPasswordEmail(getUser);
        User.updateOTP(data, (err, resdata) => {
          if (err) {
            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
          } else {
            let result = helper.showSuccessResponse('OTP_SUCCESS', resdata);
            res.json(result);
          }
        });
      }

      // } else {
      //   return res.json(helper.showValidationErrorResponse("USER_NOT_EXIST"));
      // }
    } catch (err) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  // userForgotPassword_old: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let store = req.store;
  //     data.store = store.storeId;
  //     data.storeName = store.storeName;

  //     if (!data.mobileNumber && data.mobileNumber != "") {
  //       return res.json(
  //         helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
  //       );
  //     }

  //     let charAt = data.mobileNumber.charAt(0);

  //     let obj = {
  //       store: data.store,
  //       role: "USER",
  //       status: { $ne: "archived" },
  //     };

  //     if (charAt === "0") {
  //       obj["$or"] = [
  //         { mobileNumber: data.mobileNumber },
  //         { mobileNumber: data.mobileNumber.substring(1) },
  //       ];
  //     } else {
  //       obj["$or"] = [
  //         { mobileNumber: data.mobileNumber },
  //         { mobileNumber: "0" + data.mobileNumber },
  //       ];
  //     }

  //     if (!data.countryCode) {
  //       return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
  //     }

  //     const getUser = await User.findOne(obj)
  //       .populate("store", "twilio")
  //       .exec();

  //     let twilioKey = {};
  //     if (getUser && getUser.store && getUser.store.twilio)
  //       twilioKey = getUser.store.twilio;

  //     if (getUser != null) {
  //       if (!store.otpbypass) {
  //         otpVerification.sendOtpSMSCallback(
  //           twilioKey,
  //           data,
  //           (err, resdata) => {
  //             if (err) {
  //               return res.json(helper.showTwillioErrorResponse(err.message));
  //             }
  //             data.serviceSid = resdata.serviceSid;
  //             res.json(helper.showSuccessResponse("OTP_SUCCESS", data));
  //           }
  //         );
  //       } else {
  //         res.json(helper.showSuccessResponse("OTP_SUCCESS", data));
  //       }
  //     } else {
  //       return res.json(helper.showValidationErrorResponse("USER_NOT_EXIST"));
  //     }
  //   } catch (err) {
  //     res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
  //   }
  // },

  userResetPassword: async (req, res) => {
    try {
      let data = req.body;
      const passmain = data.password;
      let store = req.store;
      data.store = store.storeId;
      let hideThings = store.hideThings;
      let demo = hideThings.filter((element) => element.type == "isDemo");
      let is_demo = demo.length ? demo[0]["value"] : false;
      if (is_demo) {
        return res.json(helper.showValidationErrorResponse("DEMO_TYPE"));
      }
      // if (!data.mobileNumber) {
      //   return res.json(
      //     helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
      //   );
      // }
      if (!data.password) {
        return res.json(
          helper.showValidationErrorResponse("PASSWORD_IS_REQUIRED")
        );
      }
      if (!data.confirmPassword) {
        return res.json(
          helper.showValidationErrorResponse("CNF_PASSWORD_IS_REQUIRED")
        );
      }
      if (data.password != data.confirmPassword) {
        return res.json(
          helper.showValidationErrorResponse("PASSWORD_CNFPASSWORD_NOT_MATCH")
        );
      }
      let obj = {
        store: data.store,
        role: "USER",
        status: { $ne: "archived" },
      };
      if (data.mobileNumber && data.mobileNumber != "") {
        let charAt = data.mobileNumber.charAt(0);
        if (charAt === "0") {
          obj["$or"] = [
            { mobileNumber: data.mobileNumber },
            { mobileNumber: data.mobileNumber.substring(1) },
          ];
        } else {
          obj["$or"] = [
            { mobileNumber: data.mobileNumber },
            { mobileNumber: "0" + data.mobileNumber },
          ];
        }
      } else if (data.email && data.email != "") {
        obj.email = data.email
      } else {
        if (!data.mobileNumber) {
          return res.json(
            helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
          );
        }
      }
      const getUser = await User.findOne(obj);
      if (getUser != null) {
        const getHash = await Utils.hashPassword(data.password);
        data.password = getHash.hashedPassword;
        data.salt = getHash.salt;
        data._id = getUser._id;
        const upass = await User.updatePassword(data);
        const token = Utils.generateToken(getUser, store.tokenExpiresIn);
        if (getUser.tokens == null) {
          getUser.tokens = [{ token }];
        } else {
          getUser.tokens = getUser.tokens.concat({ token });
        }
        User.updateToken(getUser, async (err, mytoken) => {
          if (err) {
            res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            mytoken.set("token", token, { strict: false });
            let resdata = helper.showSuccessResponse(
              "PASSWORD_RESET_SUCCESS",
              mytoken
            );
            res.json(resdata);
            emailService.userResetPasswordEmail(getUser);
          }
        });
      } else {
        return res.json(helper.showValidationErrorResponse("USER_NOT_EXISTS"));
      }
    } catch (err) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  userResetPassword_old: async (req, res) => {
    try {
      let data = req.body;

      const passmain = data.password;
      let store = req.store;
      data.store = store.storeId;
      let hideThings = store.hideThings;
      let demo = hideThings.filter((element) => element.type == "isDemo");
      let is_demo = demo.length ? demo[0]["value"] : false;
      if (is_demo) {
        return res.json(helper.showValidationErrorResponse("DEMO_TYPE"));
      }
      if (!data.mobileNumber) {
        return res.json(
          helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
        );
      }

      if (!data.password) {
        return res.json(
          helper.showValidationErrorResponse("PASSWORD_IS_REQUIRED")
        );
      }

      if (!data.confirmPassword) {
        return res.json(
          helper.showValidationErrorResponse("CNF_PASSWORD_IS_REQUIRED")
        );
      }

      if (data.password != data.confirmPassword) {
        return res.json(
          helper.showValidationErrorResponse("PASSWORD_CNFPASSWORD_NOT_MATCH")
        );
      }

      let charAt = data.mobileNumber.charAt(0);

      let obj = {
        store: data.store,
        role: "USER",
        status: { $ne: "archived" },
      };

      if (charAt === "0") {
        obj["$or"] = [
          { mobileNumber: data.mobileNumber },
          { mobileNumber: data.mobileNumber.substring(1) },
        ];
      } else {
        obj["$or"] = [
          { mobileNumber: data.mobileNumber },
          { mobileNumber: "0" + data.mobileNumber },
        ];
      }

      const getUser = await User.findOne(obj);

      if (getUser != null) {
        const getHash = await Utils.hashPassword(data.password);
        data.password = getHash.hashedPassword;
        data.salt = getHash.salt;
        data._id = getUser._id;
        const upass = await User.updatePassword(data);
        const token = Utils.generateToken(getUser, store.tokenExpiresIn);
        if (getUser.tokens == null) {
          getUser.tokens = [{ token }];
        } else {
          getUser.tokens = getUser.tokens.concat({ token });
        }

        User.updateToken(getUser, async (err, mytoken) => {
          if (err) {
            res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            mytoken.set("token", token, { strict: false });
            let resdata = helper.showSuccessResponse(
              "PASSWORD_RESET_SUCCESS",
              mytoken
            );
            res.json(resdata);
            emailService.userResetPasswordEmail(getUser);
          }
        });
      } else {
        return res.json(helper.showValidationErrorResponse("USER_NOT_EXISTS"));
      }
    } catch (err) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  changeUserPassword: async (req, res) => {
    try {
      let data = req.body;
      let getUser = req.user;
      let store = req.store;
      let hideThings = store.hideThings;
      let demo = hideThings.filter((element) => element.type == "isDemo");
      let is_demo = demo.length ? demo[0]["value"] : false;
      if (is_demo) {
        return res.json(helper.showValidationErrorResponse("DEMO_TYPE"));
      } else {
        const validPassword = await Utils.verifyPassword(
          getUser.password,
          data.currentPassword
        );

        if (validPassword) {
          const token = Utils.generateToken(getUser, store.tokenExpiresIn);

          if (getUser.tokens == null) {
            getUser.tokens = token;
          } else {
            getUser.tokens = getUser.tokens.filter((token) => {
              return token.token !== req.token;
            });
            getUser.tokens = getUser.tokens.concat({ token });
            const getHash = await Utils.hashPassword(data.password);
            data.password = getHash.hashedPassword;
            data.salt = getHash.salt;
            data._id = getUser._id;
            const upass = await User.updatePassword(data);
            //console.log("upass :",upass);

            User.updateToken(getUser, async (err, mytoken) => {
              if (err) {
                res.json(
                  helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
                );
              } else {
                mytoken.set("token", token, { strict: false });
                let resdata = helper.showSuccessResponse(
                  "PASSWORD_CHANGED_SUCCESS",
                  mytoken
                );
                resdata.token = token;
                res.json(resdata);
                const passmain = data.confirmPassword;
                emailService.userChangePasswordEmail(upass);
              }
            });
          }
        } else {
          return res.json(helper.showValidationErrorResponse("WRONG_PASSWORD"));
        }
      }
    } catch (error) {
      console.log("error :", error);

      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  approveUser: async (req, res) => {
    try {
      let data = req.body;

      User.approveUser(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", resdata));
        }
      });
    } catch (error) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  updateUserStatus: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      data._id = user._id;

      User.updateUserStatus(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", resdata));
        }
      });
    } catch (error) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  updateUserProfile: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      data.store = store.storeId;
      let user = req.user;
      data._id = user._id;
      let hideThings = store.hideThings;
      let demo = hideThings.filter((element) => element.type == "isDemo");
      let is_demo = demo.length ? demo[0]["value"] : false;
      let query = {
        store: ObjectId(data.store),
        _id: { $ne: user._id },
        role: "USER",
        status: { $ne: "archived" },
      }
      if (data.email) {
        query.email = data.email.trim().toLowerCase();
        let emailCheck = await User.findOne(query);
        if (emailCheck) return res.json(helper.showValidationErrorResponse("EMAIL_ALREADY_EXISTS"));
      }
      else if (data.mobileNumber) {
        query.mobileNumber = data.mobileNumber.toString();
        let numberCheck = await User.findOne(query);
        if (numberCheck) return res.json(helper.showValidationErrorResponse("MOBILE_NUMBER_ALREADY_EXISTS"));
        if (!data.countryCode) {
          return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
        }
      };

      if (data.bankFields) {
        let bankFiledLength = data.bankFields.length;
        if (bankFiledLength == 0)
          return res.json(helper.showValidationErrorResponse('BANK_DETAILS_IS_REQUIRED'));

        let message = '';
        let flag = false;

        for (let index = 0; index < bankFiledLength; index++) {
          let value = data.bankFields[index].value;
          if (!value) {
            flag = true;
            message = data.bankFields[index].label + ' is required';
            break;
          }
        }
        data.isBankFieldsAdded = true;
        if (flag) {
          return res.json(helper.showParamsErrorResponse(message));
        }
      }

      User.updateUserProfile(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", resdata));
        }
      });
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  // updateUserProfile_old: async (req, res) => {
  //   try {
  //     let data = req.body;
  //     let store = req.store;
  //     data.store = store.storeId;
  //     let user = req.user;
  //     data._id = user._id;
  //     let hideThings = store.hideThings;
  //     let demo = hideThings.filter((element) => element.type == "isDemo");
  //     let is_demo = demo.length ? demo[0]["value"] : false;
  //     if (!data.name) {
  //       return res.json(
  //         helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
  //       );
  //     }

  //     if (!data.mobileNumber) {
  //       return res.json(
  //         helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
  //       );
  //     }

  //     if (user.email && data.email) {
  //       if (data.email.trim().toString() != user.email) {
  //         if (is_demo) {
  //           return res.json(helper.showValidationErrorResponse("DEMO_EMAIL"));
  //         }
  //         let emailCheck = await User.findOne({
  //           store: ObjectId(data.store),
  //           email: data.email,
  //           role: "USER",
  //           status: { $ne: "archived" },
  //         });

  //         if (emailCheck != null) {
  //           return res.json(
  //             helper.showValidationErrorResponse("EMAIL_ALREADY_EXISTS")
  //           );
  //         }
  //       }
  //     }

  //     if (user.mobileNumber) {
  //       if (data.mobileNumber.toString() != user.mobileNumber.toString()) {
  //         if (is_demo) {
  //           return res.json(helper.showValidationErrorResponse("DEMO_PHONE"));
  //         }
  //         const getUser = await User.findOne({
  //           store: data.store,
  //           mobileNumber: data.mobileNumber,
  //           role: "USER",
  //           status: { $ne: "archived" },
  //         });

  //         if (getUser != null) {
  //           return res.json(
  //             helper.showValidationErrorResponse("MOBILE_NUMBER_ALREADY_EXISTS")
  //           );
  //         }
  //       }
  //     } else {
  //       const getUser = await User.findOne({
  //         store: data.store,
  //         mobileNumber: data.mobileNumber,
  //         role: "USER",
  //         status: { $ne: "archived" },
  //       });

  //       if (getUser != null) {
  //         return res.json(
  //           helper.showValidationErrorResponse("MOBILE_NUMBER_ALREADY_EXISTS")
  //         );
  //       }
  //     }

  //     if (!data.countryCode) {
  //       return res.json(helper.showValidationErrorResponse("CC_IS_REQUIRED"));
  //     }

  //     if (!data.email) {
  //       return res.json(
  //         helper.showValidationErrorResponse("EMAIL_IS_REQUIRED")
  //       );
  //     }

  //     User.updateUserProfile(data, (err, resdata) => {
  //       if (err) {
  //         res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
  //       } else {
  //         res.json(helper.showSuccessResponse("UPDATE_SUCCESS", resdata));
  //       }
  //     });
  //   } catch (error) {
  //     console.log("error", error);
  //     res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
  //   }
  // },

  getUserProfileById: async (req, res) => {
    try {
      let user = req.user;
      console.log("user._id ", user._id);
      let project = { password: 0, salt: 0, tokens: 0, firebaseToken: 0 }

      let response = await User.findById(user._id, project)
        .populate({ path: "profileImage" })
        .populate({ path: "" });


      if (!response) res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));

      res.json(helper.showSuccessResponse("DATA_SUCCESS", response));
      // User.getUserById(user._id, (err, resdata) => {
      //   if (err) {
      //     res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
      //   } else {
      //     let isPasswordSet = true;
      //     if (!resdata.password) {
      //       isPasswordSet = false;
      //     }
      //     resdata.set("isPasswordSet", isPasswordSet, { strict: false });
      //     resdata.password = "";
      //     resdata.salt = "";
      //     resdata.tokens = [];
      //     res.json(helper.showSuccessResponse("DATA_SUCCESS", resdata));
      //   }
      // });
    } catch (err) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  addKycDocuments: async (req, res) => {
    try {
      let user = req.user;
      let req_body = req.body;
      let files_data;
      if (req_body.files && req_body.files.length > 0) {
        files_data = req_body.files.map(file => ({
          file_name: file.file_name.trim(),
          file_id: file.file_id.trim(),
          user: user._id
        }));
      } else res.json(helper.showDatabaseErrorResponse("REQUEST_DATA_ERROR", err));

      await Document.deleteMany({ user: user._id });
      let response = await Document.insertMany(files_data);
      if (!response) res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));

      await User.findOneAndUpdate({ _id: user._id }, { $set: { isKycCompleted: true } }, { new: true });
      res.json(helper.showSuccessResponse("DATA_SUCCESS", response));
    } catch (err) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  removeUserByMobileNumber: async (req, res) => {
    try {
      let data = req.body;

      if (!data.mobileNumber) {
        return res.json(
          helper.showValidationErrorResponse("MOBILE_NUMBER_IS_REQUIRED")
        );
      }

      const us = await User.remove({ mobileNumber: data.mobileNumber });

      res.json(helper.showSuccessResponse("DATA_SUCCESS", us));
    } catch (err) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  removeUserById: async (req, res) => {
    try {
      let data = req.body;

      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }

      const us = await User.remove({ _id: data._id });

      res.json(helper.showSuccessResponse("DATA_SUCCESS", us));
    } catch (err) {
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  storeHomePageDataNew: async (req, res) => {
    try {
      let store = req.store;
      let version = req.headers.version;
      let contentData = [];
      let data = req.body;
      if (!data.customerLocation) {
        return res.json(
          helper.showValidationErrorResponse("CUSTOMER_LOCATION_IS_REQUIRED")
        );
      }
      let obj = {};
      obj.onlineStatus = "online";
      obj.status = "approved";
      obj.role = "VENDOR";
      let radius = Number(env.SEARCH_RADIUS);
      let unit = store.distanceUnit ? store.distanceUnit : "km";
      radius = helper.getDeliveryArea(radius, unit);
      const customerLocation = {
        type: "Point",
        coordinates: [
          Number(data.customerLocation.lng),
          Number(data.customerLocation.lat),
        ],
      };
      let userfid = await User.aggregate([
        {
          $geoNear: {
            near: customerLocation,
            distanceField: "distance",
            key: "userLocation",
            spherical: true,
            maxDistance: radius,
            query: obj,
          },
        },
        { $project: { _id: 1 } },
      ]);
      let [resdata] = await Promise.all([
        storeType.getStoreTypeByStoreIdAsync(store.storeId),
      ]);
      let storeTypeId = resdata.map((item) => ObjectId(item._id));
      if (data.isDeliveryService) {
        let deliveryService = await resdata.filter((item) => {
          return item.storeType == "FOOD" || item.storeType == "BAKERY" || item.storeType == "GROCERY" || item.storeType == "MEDICINE"
        })
        storeTypeId = deliveryService.map((item) => ObjectId(item._id));
      } else if (data.isTranpotationService) {
        let transapotationService = await resdata.filter((item) => {
          return item.storeType == "TAXI" || item.storeType == "CARRENTAL"
        })
        storeTypeId = transapotationService.map((item) => ObjectId(item._id));
      }
      let promotionQry = {
        store: store.storeId,
        status: "active",
        storeTypeId: { $in: storeTypeId }
      }
      let [newresult, topMerchant, promotionData] = await Promise.all([
        homepageFunction(resdata, data),
        topMerchants(data, storeTypeId, store, resdata),
        Promotion.find(promotionQry)
          .populate("category")
          .populate({ path: "storeTypeId", select: "storeType label" })
          .populate("vendor", "name isVendorAvailable timeSlot")
          .populate("promotionImage")
          .exec(),
      ]);
      if (promotionData.length > 0) {
        promotionData = promotionData.filter((elementdata) => {
          if (elementdata.vendor) {
            if (data.customerLocation.lng && data.customerLocation.lat) {
              let deliverTo = userfid.find(
                (ele) => String(ele._id) == String(elementdata.vendor._id)
              );
              return (
                deliverTo &&
                String(deliverTo._id) == String(elementdata.vendor._id)
              );
            } else {
              return elementdata;
            }
          } else {
            return elementdata;
          }
        });
        if (promotionData.length > 0) {
          await Promise.all(
            promotionData.map((item2) => {
              let categoryId = "";
              let name = "";
              if (item2.vendor) {
                if (item2.category) {
                  name = item2.category.catName;
                  categoryId = item2.category._id;
                }
                let OpenClosedata = helper.getVendorOpenCloseStatus(
                  item2.vendor.isVendorAvailable,
                  item2.vendor.timeSlot,
                  new Date(),
                  store.timezone
                );
                item2.set("label", name, { strict: false });
                item2.set("categoryId", categoryId, { strict: false });
                item2.set("vendorOpenClose", OpenClosedata.status, {
                  strict: false,
                });
              } else {
                item2.set("label", name, { strict: false });
                item2.set("categoryId", categoryId, { strict: false });
                item2.set("vendorOpenClose", "Close", { strict: false });
              }
            })
          );
        }
      }
      let finalData = {
        resdata: newresult,
        promotionData: promotionData,
        contentData: contentData,
        topMerchants: topMerchant
      };
      res.json(helper.showSuccessResponse("DATA_SUCCESS", finalData));
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  storeHomePageData: async (req, res) => {
    try {
      let store = req.store;
      let version = req.headers.version;
      let plan = store.plan;
      let cuisinesData;
      let vendorData;
      let productsData;
      let bestSellerProduct;

      let [promotionData, resdata] = await Promise.all([
        Promotion.find({ store: store.storeId, status: "active" })
          .populate({ path: "storeTypeId", select: "storeType label" })
          .populate("vendor", "name isVendorAvailable timeSlot")
          .populate("promotionImage")
          .exec(),
        storeType.getStoreTypeByStoreIdAsync(store.storeId),
      ]);

      let storeTypeId = resdata.map((item) => item._id);

      if (promotionData.length > 0) {
        promotionData.map((item) => {
          let webViewUrl = null;
          if (item.vendor) {
            let OpenClosedata = helper.getVendorOpenCloseStatus(
              item.vendor.isVendorAvailable,
              item.vendor.timeSlot,
              new Date(),
              store.timezone
            );
            item.set("vendorOpenClose", OpenClosedata.status, {
              strict: false,
            });
            webViewUrl =
              "https://" +
              store.domain +
              "/listingview?&type=" +
              item.storeTypeId.storeType.toLowerCase() +
              "&store=" +
              item.storeTypeId._id.toString() +
              "&id=" +
              item.vendor._id;
          } else {
            item.set("webViewUrl", webViewUrl, { strict: false });
            item.set("vendorOpenClose", "Close", { strict: false });
          }
        });
      }

      if (
        plan &&
        plan.billingPlan &&
        plan.billingPlan.type &&
        plan.billingPlan.type === "basic"
      ) {
        vendorData = await User.findOne({
          storeType: { $in: [resdata[0]._id] },
          role: "VENDOR",
          status: "approved",
        });

        productsData = await Product.find({
          storeType: resdata[0]._id,
          vendor: vendorData._id,
          status: "active",
          stock_status: "instock",
          bestSeller: true,
        }).limit(20);

        if (resdata[0].storeType === "FOOD")
          cuisinesData = await Cuisines.find({
            store: store.storeId,
            storeType: resdata[0]._id,
            status: "active",
          }).populate("image");
        else
          cuisinesData = await Category.find({
            vendor: vendorData._id,
            storeType: resdata[0]._id,
            status: "active",
          });
      } else {
        bestSellerProduct = await Product.find(
          {
            storeType: { $in: storeTypeId },
            status: "active",
            stock_status: "instock",
            bestSeller: true,
          },
          "featured_image price compare_price name"
        )
          .limit(25)
          .populate("featured_image", "link")
          .populate("storeType", "storeType label")
          .populate("vendor", "_id");
        if (bestSellerProduct.length > 0) {
          bestSellerProduct.map((item) => {
            let webViewUrl = null;
            if (item.vendor) {
              webViewUrl =
                "https://" +
                store.domain +
                "/listingview?&type=" +
                item.storeType.storeType.toLowerCase() +
                "&store=" +
                item.storeType._id.toString() +
                "&id=" +
                item.vendor._id;
            }
            item.set("webViewUrl", webViewUrl, { strict: false });
          });
        }
      }

      let finalData = {
        resdata: resdata,
        promotionData,
        cuisinesData,
        productsData,
        bestSellerProduct,
      };

      res.json(helper.showSuccessResponse("DATA_SUCCESS", finalData));
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  getNearByVendors: async (req, res) => {
    try {
      let data = req.body;
      console.log("data------", JSON.stringify(data))
      let store = req.store;
      let obj = {};
      if (!data.customerLocation) {
        return res.json(
          helper.showValidationErrorResponse("CUSTOMER_LOCATION_IS_REQUIRED")
        );
      }
      let isDelivery = false;
      let isTakeaway = false;
      if (data.deliveryType && data.deliveryType.length > 0) {
        data.deliveryType.forEach((item, i) => {
          if (item.toUpperCase() === "DELEVERY")
            data.deliveryType[i] = "DELIVERY";

          if (
            item.toUpperCase() === "DELIVERY" ||
            item.toUpperCase() === "DELEVERY"
          )
            isDelivery = true;
          if (item.toUpperCase() === "TAKEAWAY") isTakeaway = true;
        });

        if (data.deliveryType.length > 0)
          obj.deliveryType = { $in: data.deliveryType };
      }
      if (!data.storeTypeId) {
        return res.json(
          helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED")
        );
      }
      const getStoreType = await storeType.getStoreTypeByIdAsync(
        data.storeTypeId
      );
      if (getStoreType === null) {
        return res.json(
          helper.showValidationErrorResponse("INVALID_STORE_TYPE")
        );
      }
      let cuisines = [];
      if (getStoreType.storeType === "FOOD" || getStoreType.storeType === "SERVICEPROVIDER") {
        cuisines = await Cuisines.find(
          { status: "active", storeType: ObjectId(getStoreType._id) },
          "name image"
        ).populate("image");
      }
      if (getStoreType.storeType === "ECOMMERCE") {
        cuisines = await BusinessType.find(
          { status: "active", storeType: ObjectId(getStoreType._id) },
          "name image"
        ).populate("image");
      }
      const customerLocation = {
        type: "Point",
        coordinates: [
          Number(data.customerLocation.lng),
          Number(data.customerLocation.lat),
        ],
      };
      let pageOptions = {
        page: parseInt(data.page) || 1,
        limit: parseInt(data.limit) || 12,
      };
      let sort = { isVendorAvailable: -1, avgRating: -1, _id: -1 };
      if (data.sortby === "lprice") {
        sort =
          getStoreType.storeType === "FOOD"
            ? { pricePerPerson: 1, _id: 1 }
            : { minOrderAmont: 1, _id: 1 };
      } else if (data.sortby === "hprice") {
        sort =
          getStoreType.storeType === "FOOD"
            ? { pricePerPerson: -1, _id: -1 }
            : { minOrderAmont: -1, _id: -1 };
      }
      obj.onlineStatus = "online";
      obj.status = "approved";
      obj.storeType = { $in: [ObjectId(data.storeTypeId)] };
      obj.role = "VENDOR";
      if (data.search != undefined && data.search != "") {
        obj.name = { $regex: data.search, $options: "i" };
      }
      if (data.cuisines) {
        let cList = [];
        if (data.cuisines.length > 0) {
          data.cuisines.forEach((element) => {
            cList.push(ObjectId(element));
          });
          obj.cuisines = { $in: cList };
        }
      }
      if (data.businessType) {
        let bList = [];
        if (data.businessType.length > 0) {
          data.businessType.forEach((element) => {
            bList.push(ObjectId(element));
          });
          obj.businessType = { $in: bList };
        }
      }
      let radius = Number(env.SEARCH_RADIUS);
      if (!isDelivery && isTakeaway)
        radius = getStoreType.deliveryAreaVendorTakeaway
          ? getStoreType.deliveryAreaVendorTakeaway
          : Number(env.SEARCH_RADIUS);
      else
        radius = getStoreType.deliveryAreaVendor
          ? getStoreType.deliveryAreaVendor
          : Number(env.SEARCH_RADIUS);
      if (getStoreType.storeType === "SERVICEPROVIDER") {
        radius = getStoreType.deliveryAreaDriver
          ? getStoreType.deliveryAreaDriver
          : Number(env.SEARCH_RADIUS);
      }
      console.log("radius------>", JSON.stringify(radius))
      let unit = store.distanceUnit ? store.distanceUnit : "km";
      radius = helper.getDeliveryArea(radius, unit);
      let count = await User.aggregate([
        {
          $geoNear: {
            near: customerLocation,
            distanceField: "distance",
            key: "userLocation",
            spherical: true,
            maxDistance: radius,
            query: obj,
          },
        },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      let webViewUrl =
        "https://" +
        store.domain +
        "/applistingview?lat=" +
        data.customerLocation.lat +
        "&lng=" +
        data.customerLocation.lng +
        "&type=" +
        getStoreType.storeType.toLowerCase() +
        "&store=" +
        getStoreType._id +
        "&id=";
      let userfid = await User.aggregate([
        {
          $geoNear: {
            near: customerLocation,
            distanceField: "distance",
            key: "userLocation",
            spherical: true,
            maxDistance: radius,
            query: obj,
          },
        },
        { $project: { _id: 1 } },
      ]);
      let promotionData = await Promotion.find({
        store: store.storeId,
        storeTypeId: ObjectId(data.storeTypeId),
        status: "active",
      })
        .populate("storeTypeId", "storeType label")
        .populate("vendor", "name isVendorAvailable timeSlot")
        .populate("promotionImage");

      if (promotionData.length > 0) {
        promotionData = promotionData.filter((elementdata) => {
          if (elementdata.vendor) {
            if (data.customerLocation.lng && data.customerLocation.lat) {
              let deliverTo = userfid.find(
                (ele) => String(ele._id) == String(elementdata.vendor._id)
              );
              return (
                deliverTo &&
                String(deliverTo._id) == String(elementdata.vendor._id)
              );
            } else {
              return elementdata;
            }
          } else {
            return elementdata;
          }
        });
        if (promotionData.length > 0) {
          await Promise.all(
            promotionData.map((item) => {
              if (item.vendor) {
                let OpenClosedata = helper.getVendorOpenCloseStatus(
                  item.vendor.isVendorAvailable,
                  item.vendor.timeSlot,
                  new Date(),
                  store.timezone
                );
                let webViewUrl =
                  "https://" +
                  store.domain +
                  "/applistingview?lat=" +
                  Number(data.customerLocation.lat) +
                  "&lng=" +
                  Number(data.customerLocation.lng) +
                  "&type=" +
                  item.storeTypeId.storeType.toLowerCase() +
                  "&store=" +
                  item.storeTypeId._id.toString() +
                  "&id=" +
                  item.vendor._id;
                item.set("vendorOpenClose", OpenClosedata.status, {
                  strict: false,
                });
                item.set("webViewUrl", webViewUrl, { strict: false });
              } else {
                item.set("webViewUrl", null, { strict: false });
                item.set("vendorOpenClose", "Close", { strict: false });
              }
            })
          );
        }
      }
      let skip = (pageOptions.page - 1) * pageOptions.limit;
      console.log("customerLocation------>", JSON.stringify(customerLocation))
      console.log("obj------>", JSON.stringify(obj))
      console.log("radius------>", JSON.stringify(radius))
      User.aggregate(
        [
          {
            $geoNear: {
              near: customerLocation,
              distanceField: "distance",
              key: "userLocation",
              spherical: true,
              maxDistance: radius,
              query: obj,
              distanceMultiplier: 0.001
            },
          },
          { $sort: sort },
          { $skip: skip },
          { $limit: pageOptions.limit },
          {
            $lookup: {
              from: "cuisines",
              localField: "cuisines",
              foreignField: "_id",
              as: "cuisines",
            },
          },
          {
            $lookup: {
              from: "businesstypes",
              localField: "businessType",
              foreignField: "_id",
              as: "businessType",
            },
          },
          {
            $lookup: {
              from: "files",
              localField: "profileImage",
              foreignField: "_id",
              as: "profileImage",
            },
          },
          {
            $lookup: {
              from: "storetypes",
              localField: "storeType",
              foreignField: "_id",
              as: "storeType",
            },
          },
          {
            $addFields: {
              jeoId: {
                $cond: { if: "$geoFence", then: "$geoFence", else: [] },
              },
            },
          },
          {
            $lookup: {
              from: "geofences",
              let: { jeodata: "$jeoId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$status", "active"] },
                        {
                          $in: ["$_id", "$$jeodata"],
                        },
                      ],
                    },
                  },
                },
              ],
              as: "geoData",
            },
          },
          { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
          {
            $unwind: {
              path: "$profileImage",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              "storeType.label": 1,
              "storeType.storeType": 1,
              "storeType._id": 1,
              name: 1,
              isVendorAvailable: 1,
              timeSlot: 1,
              profileImage: 1,
              cuisines: { name: 1 },
              businessType: { name: 1 },
              address: 1,
              mobileNumber: 1,
              countryCode: 1,
              member: 1,
              pricePerPerson: 1,
              minOrderAmont: 1,
              avgRating: 1,
              reviewCount: 1,
              distance: { $round: ["$distance", 1] },
              orderPreparationTime: 1,
              geoFence: "$geoData",
              webViewUrl: { $concat: [webViewUrl, { $toString: "$_id" }] },
            },
          },
        ],
        async (err, resdata) => {
          //console.log("resdata------>", resdata)
          if (err) {
            console.log("err", err);
            return res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            if (resdata.length === 0) {
              let response = helper.showSuccessResponseCount(
                "NO_DATA_FOUND",
                [],
                0
              );
              response.cuisines = cuisines;
              response.promotionData = promotionData;
              response.storeTypeDetails = {
                seoSettings: getStoreType.seoSettings,
                storeTypeImageBackground: getStoreType.storeTypeIcon,
                deliveryType: getStoreType.deliveryType
                  ? getStoreType.deliveryType
                  : [],
              };
              response.sortAndFiter = {
                sort: Config.SORT_TYPE,
                deliveryType: Config.DELIVERY_TYPE,
                QuickFilter: cuisines
              }
              res.json(response);
            } else {
              await Promise.all(
                resdata.map(async (element) => {
                  let vendorOpenClose = helper.getVendorOpenCloseStatus(
                    element.isVendorAvailable,
                    element.timeSlot,
                    new Date(),
                    store.timezone
                  );

                  //const customerLocation = { type: "Point", coordinates: [Number(data.customerLocation.lng), Number(data.customerLocation.lat)] }
                  //const customerLocation = { type: "Point", coordinates: [76.7509428446592, 30.748774] }

                  UserObj = {
                    customerLocation: customerLocation.coordinates,
                    unit: unit,
                  };
                  element["vendorOpenClose"] = vendorOpenClose.status;
                  if (vendorOpenClose.status == "Close") {
                    element["isOpen"] = false;
                  } else {
                    element["isOpen"] = true;
                  }

                  if (element.hasOwnProperty("geoFence")) {
                    let geofence = await geofencingFun.globalVenderCheck(
                      UserObj,
                      element
                    );
                    if (geofence && !geofence.isAccepteOrder) {
                      element["vendorOpenClose"] = "Close";
                      element["isUnderGeofence"] = false;
                      console.log("geoFence close vendor", element.name);
                    } else {
                      element["isUnderGeofence"] = true;
                    }
                  }
                  delete element.timeSlot;
                  delete element.isVendorAvailable;
                })
              );
              resdata = resdata.filter((element) => {
                return (
                  element.hasOwnProperty("geoFence") && element.isUnderGeofence
                );
              });
              //sorting for show open store list first
              resdata.sort((a, b) => {
                return Number(b.isOpen) - Number(a.isOpen);
              });
              let response = helper.showSuccessResponseCount(
                "DATA_SUCCESS",
                resdata,
                totalcount
              );
              response.cuisines = cuisines;
              response.favorite = resdata;
              response.promotionData = promotionData;
              response.storeTypeDetails = {
                seoSettings: getStoreType.seoSettings,
                storeTypeImageBackground: getStoreType.storeTypeIcon,
              };
              response.sortAndFiter = {
                sort: Config.SORT_TYPE,
                deliveryType: Config.DELIVERY_TYPE,
                QuickFilter: cuisines
              }
              res.json(response);
            }
          }
        }
      );
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getNearByVendorsForEcommerce: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      let obj = {};
      if (!data.customerLocation) {
        return res.json(
          helper.showValidationErrorResponse("CUSTOMER_LOCATION_IS_REQUIRED")
        );
      }
      let isDelivery = false;
      let isTakeaway = false;
      if (data.deliveryType) {
        data.deliveryType.forEach((item, i) => {
          if (item.toUpperCase() === "DELEVERY")
            data.deliveryType[i] = "DELIVERY";

          if (
            item.toUpperCase() === "DELIVERY" ||
            item.toUpperCase() === "DELEVERY"
          )
            isDelivery = true;
          if (item.toUpperCase() === "TAKEAWAY") isTakeaway = true;
        });

        if (data.deliveryType.length > 0)
          obj.deliveryType = { $in: data.deliveryType };
      }
      if (!data.storeTypeId) {
        return res.json(
          helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED")
        );
      }
      const getStoreType = await storeType.getStoreTypeByIdAsync(
        data.storeTypeId
      );
      if (getStoreType === null) {
        return res.json(
          helper.showValidationErrorResponse("INVALID_STORE_TYPE")
        );
      }
      let businessType = [];
      let categories = [];
      categories = await Cuisines.find(
        { status: "active", storeType: ObjectId(getStoreType._id) },
        "name image"
      ).populate("image");
      if (getStoreType.storeType === "ECOMMERCE") {
        businessType = await BusinessType.find(
          { status: "active", storeType: ObjectId(getStoreType._id) },
          "name image"
        ).populate("image");
      }
      const customerLocation = {
        type: "Point",
        coordinates: [
          Number(data.customerLocation.lng),
          Number(data.customerLocation.lat),
        ],
      };
      let pageOptions = {
        page: parseInt(data.page) || 1,
        limit: parseInt(data.limit) || 12,
      };
      let sort = { isVendorAvailable: -1, avgRating: -1, _id: -1 };
      if (data.sortby === "lprice") {
        sort =
          getStoreType.storeType === "FOOD"
            ? { pricePerPerson: 1, _id: 1 }
            : { minOrderAmont: 1, _id: 1 };
      } else if (data.sortby === "hprice") {
        sort =
          getStoreType.storeType === "FOOD"
            ? { pricePerPerson: -1, _id: -1 }
            : { minOrderAmont: -1, _id: -1 };
      }
      obj.onlineStatus = "online";
      obj.status = "approved";
      obj.storeType = { $in: [ObjectId(data.storeTypeId)] };
      obj.role = "VENDOR";
      if (data.search != undefined && data.search != "") {
        obj.name = { $regex: data.search, $options: "i" };
      }
      if (data.businessType) {
        let bList = [];
        if (data.businessType.length > 0) {
          data.businessType.forEach((element) => {
            bList.push(ObjectId(element));
          });
          obj.businessType = { $in: bList };
        }
      }
      if (data.category) {
        let cList = [];
        if (data.category.length > 0) {
          data.category.forEach((element) => {
            cList.push(ObjectId(element));
          });
          obj.cuisines = { $in: cList };
        }
      }
      let radius = Number(env.SEARCH_RADIUS);
      if (!isDelivery && isTakeaway)
        radius = getStoreType.deliveryAreaVendorTakeaway
          ? getStoreType.deliveryAreaVendorTakeaway
          : Number(env.SEARCH_RADIUS);
      else
        radius = getStoreType.deliveryAreaVendor
          ? getStoreType.deliveryAreaVendor
          : Number(env.SEARCH_RADIUS);

      let unit = store.distanceUnit ? store.distanceUnit : "km";
      radius = helper.getDeliveryArea(radius, unit);
      let count = await User.aggregate([
        {
          $geoNear: {
            near: customerLocation,
            distanceField: "distance",
            key: "userLocation",
            spherical: true,
            maxDistance: radius,
            query: obj,
          },
        },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      let webViewUrl =
        "https://" +
        store.domain +
        "/applistingview?lat=" +
        data.customerLocation.lat +
        "&lng=" +
        data.customerLocation.lng +
        "&type=" +
        getStoreType.storeType.toLowerCase() +
        "&store=" +
        getStoreType._id +
        "&id=";
      let userfid = await User.aggregate([
        {
          $geoNear: {
            near: customerLocation,
            distanceField: "distance",
            key: "userLocation",
            spherical: true,
            maxDistance: radius,
            query: obj,
          },
        },
        { $project: { _id: 1 } },
      ]);
      let promotionData = await Promotion.find({
        store: store.storeId,
        storeTypeId: ObjectId(data.storeTypeId),
        status: "active",
      })
        .populate("storeTypeId", "storeType label")
        .populate("vendor", "name isVendorAvailable timeSlot")
        .populate("promotionImage");

      if (promotionData.length > 0) {
        promotionData = promotionData.filter((elementdata) => {
          if (elementdata.vendor) {
            if (data.customerLocation.lng && data.customerLocation.lat) {
              let deliverTo = userfid.find(
                (ele) => String(ele._id) == String(elementdata.vendor._id)
              );
              return (
                deliverTo &&
                String(deliverTo._id) == String(elementdata.vendor._id)
              );
            } else {
              return elementdata;
            }
          } else {
            return elementdata;
          }
        });
        if (promotionData.length > 0) {
          await Promise.all(
            promotionData.map((item) => {
              if (item.vendor) {
                let OpenClosedata = helper.getVendorOpenCloseStatus(
                  item.vendor.isVendorAvailable,
                  item.vendor.timeSlot,
                  new Date(),
                  store.timezone
                );
                let webViewUrl =
                  "https://" +
                  store.domain +
                  "/applistingview?lat=" +
                  Number(data.customerLocation.lat) +
                  "&lng=" +
                  Number(data.customerLocation.lng) +
                  "&type=" +
                  item.storeTypeId.storeType.toLowerCase() +
                  "&store=" +
                  item.storeTypeId._id.toString() +
                  "&id=" +
                  item.vendor._id;
                item.set("vendorOpenClose", OpenClosedata.status, {
                  strict: false,
                });
                item.set("webViewUrl", webViewUrl, { strict: false });
              } else {
                item.set("webViewUrl", null, { strict: false });
                item.set("vendorOpenClose", "Close", { strict: false });
              }
            })
          );
        }
      }
      let skip = (pageOptions.page - 1) * pageOptions.limit;
      User.aggregate(
        [
          {
            $geoNear: {
              near: customerLocation,
              distanceField: "distance",
              key: "userLocation",
              spherical: true,
              maxDistance: radius,
              query: obj,
            },
          },
          { $sort: sort },
          { $skip: skip },
          { $limit: pageOptions.limit },
          {
            $lookup: {
              from: "cuisines",
              localField: "cuisines",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $lookup: {
              from: "businesstypes",
              localField: "businessType",
              foreignField: "_id",
              as: "businessType",
            },
          },
          {
            $lookup: {
              from: "files",
              localField: "profileImage",
              foreignField: "_id",
              as: "profileImage",
            },
          },
          {
            $lookup: {
              from: "storetypes",
              localField: "storeType",
              foreignField: "_id",
              as: "storeType",
            },
          },
          {
            $addFields: {
              jeoId: {
                $cond: { if: "$geoFence", then: "$geoFence", else: [] },
              },
            },
          },
          {
            $lookup: {
              from: "geofences",
              let: { jeodata: "$jeoId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$status", "active"] },
                        {
                          $in: ["$_id", "$$jeodata"],
                        },
                      ],
                    },
                  },
                },
              ],
              as: "geoData",
            },
          },
          { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
          {
            $unwind: {
              path: "$profileImage",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              "storeType.label": 1,
              "storeType.storeType": 1,
              "storeType._id": 1,
              name: 1,
              isVendorAvailable: 1,
              timeSlot: 1,
              profileImage: 1,
              category: { name: 1 },
              businessType: { name: 1 },
              address: 1,
              pricePerPerson: 1,
              minOrderAmont: 1,
              avgRating: 1,
              reviewCount: 1,
              orderPreparationTime: 1,
              geoFence: "$geoData",
              webViewUrl: { $concat: [webViewUrl, { $toString: "$_id" }] },
            },
          },
        ],
        async (err, resdata) => {
          if (err) {
            console.log("err", err);
            return res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            if (resdata.length === 0) {
              let response = helper.showSuccessResponseCount(
                "NO_DATA_FOUND",
                [],
                0
              );
              response.businessType = data.businessType && data.businessType.length > 0 ? data.businessType[0] : businessType
              response.category = data.businessType && businessType && businessType.length > 0 ? categories : []
              response.promotionData = promotionData;
              response.storeTypeDetails = {
                seoSettings: getStoreType.seoSettings,
                _id: getStoreType._id,
                storeType: getStoreType.storeType,
                deliveryType: getStoreType.deliveryType
                  ? getStoreType.deliveryType
                  : [],
              };
              res.json(response);
            } else {
              await Promise.all(
                resdata.map(async (element) => {
                  let vendorOpenClose = helper.getVendorOpenCloseStatus(
                    element.isVendorAvailable,
                    element.timeSlot,
                    new Date(),
                    store.timezone
                  );
                  UserObj = {
                    customerLocation: customerLocation.coordinates,
                    unit: unit,
                  };
                  element["vendorOpenClose"] = vendorOpenClose.status;
                  if (vendorOpenClose.status == "Close") {
                    element["isOpen"] = false;
                  } else {
                    element["isOpen"] = true;
                  }
                  if (element.hasOwnProperty("geoFence")) {
                    let geofence = await geofencingFun.globalVenderCheck(
                      UserObj,
                      element
                    );
                    if (geofence && !geofence.isAccepteOrder) {
                      element["vendorOpenClose"] = "Close";
                      element["isUnderGeofence"] = false;
                      console.log("geoFence close vendor", element.name);
                    } else {
                      element["isUnderGeofence"] = true;
                    }
                  }
                  delete element.timeSlot;
                  delete element.isVendorAvailable;
                })
              );
              resdata = resdata.filter((element) => {
                return (
                  element.hasOwnProperty("geoFence") && element.isUnderGeofence
                );
              });
              resdata.sort((a, b) => {
                return Number(b.isOpen) - Number(a.isOpen);
              });
              let response = helper.showSuccessResponseCount(
                "DATA_SUCCESS",
                resdata,
                totalcount
              );
              response.businessType = data.businessType && data.businessType.length > 0 ? data.businessType[0] : businessType
              response.category = data.businessType && businessType && businessType.length > 0 ? categories : []
              response.promotionData = promotionData;
              response.storeTypeDetails = {
                seoSettings: getStoreType.seoSettings,
                _id: getStoreType._id,
                storeType: getStoreType.storeType,
              };
              res.json(response);
            }
          }
        }
      );
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  getNearByVendorsWithProducts: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      let obj = {};

      if (!data.customerLocation) {
        return res.json(
          helper.showValidationErrorResponse("CUSTOMER_LOCATION_IS_REQUIRED")
        );
      }

      const customerLocation = {
        type: "Point",
        coordinates: [
          Number(data.customerLocation.lng),
          Number(data.customerLocation.lat),
        ],
      };

      let pageOptions = {
        page: parseInt(data.page) || 0,
        limit: parseInt(data.limit) || 9999999999999,
      };

      let sort = { avgRating: -1 };

      obj.onlineStatus = "online";
      obj.status = "approved";
      obj.store = store.storeId;
      obj.role = "VENDOR";
      let obj1 = {
        onlineStatus: "online",
        status: "approved",
        store: store.storeId,
        role: "VENDOR",
      };

      if (data.search != undefined && data.search != "") {
        obj.name = { $regex: data.search, $options: "i" };
      } else {
        let result = {
          stores: [],
          products: [],
        };
        let response = helper.showSuccessResponseCount("NO_DATA_FOUND", result);
        response["totaVendorPage"] = 1;
        response["totaProductPage"] = 1;

        return res.json(response);
      }

      let radius = Number(env.SEARCH_RADIUS);

      let unit = store.distanceUnit ? store.distanceUnit : "km";
      radius = helper.getDeliveryArea(radius, unit);

      let count = await User.aggregate([
        // { $match: { $text: { $search: data.search } } },
        {
          $geoNear: {
            near: customerLocation,
            distanceField: "distance",
            key: "userLocation",
            spherical: true,
            maxDistance: radius,
            query: obj,
          },
        },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);

      let vendorIds = await User.aggregate([
        {
          $geoNear: {
            near: customerLocation,
            distanceField: "distance",
            key: "userLocation",
            spherical: true,
            maxDistance: radius,
            query: obj1,
          },
        },
        { $group: { _id: null, vendorIds: { $push: "$_id" } } },
      ]);

      let totalcount = count.length > 0 ? count[0].count : 0;
      let vendorsIds = vendorIds.length > 0 ? vendorIds[0].vendorIds : [];

      let webViewUrl =
        "https://" +
        store.domain +
        "/applistingview?lat=" +
        data.customerLocation.lat +
        "&lng=" +
        data.customerLocation.lng +
        "&type=";
      let webViewUrlProduct =
        "https://" +
        store.domain +
        "/applistingdetail?lat=" +
        data.customerLocation.lat +
        "&lng=" +
        data.customerLocation.lng +
        "&type=";

      User.aggregate(
        [
          {
            $geoNear: {
              near: customerLocation,
              distanceField: "distance",
              key: "userLocation",
              spherical: true,
              maxDistance: radius,
              query: obj,
            },
          },
          {
            $lookup: {
              from: "cuisines",
              localField: "cuisines",
              foreignField: "_id",
              as: "cuisines",
            },
          },
          {
            $lookup: {
              from: "files",
              localField: "profileImage",
              foreignField: "_id",
              as: "profileImage",
            },
          },
          {
            $lookup: {
              from: "storetypes",
              localField: "storeType",
              foreignField: "_id",
              as: "storeType",
            },
          },
          { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
          { $sort: sort },
          { $skip: pageOptions.page * pageOptions.limit },
          { $limit: pageOptions.limit },
          {
            $project: {
              "storeType.label": 1,
              "storeType.storeType": 1,
              "storeType._id": 1,
              name: 1,
              isVendorAvailable: 1,
              timeSlot: 1,
              profileImage: 1,
              cuisines: { name: 1 },
              address: 1,
              avgRating: 1,
              pricePerPerson: 1,
              minOrderAmont: 1,
              orderPreparationTime: 1,
              reviewCount: 1,
              webViewUrl: {
                $concat: [
                  webViewUrl,
                  { $toLower: "$storeType.storeType" },
                  "&store=",
                  { $toString: "$storeType._id" },
                  "&id=",
                  { $toString: "$_id" },
                ],
              },
            },
          },
          {
            $unwind: {
              path: "$profileImage",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        async (err, resdata) => {
          if (err) {
            res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            let condition = {
              vendor: { $in: vendorsIds },
              status: "active",
            };
            if (data.search)
              condition.name = { $regex: data.search, $options: "i" };

            let productsDataCount = await Product.estimatedDocumentCount(
              condition
            );

            let productsData = await Product.getProductByConditionAsync(
              condition,
              pageOptions
            );
            await Promise.all(
              productsData.map((item) => {
                item.set("profileImage", item.featured_image, {
                  strict: false,
                });

                if (item.storeType.storeType === "FOOD")
                  item.set(
                    "webViewUrl",
                    webViewUrl +
                    `food&store=${item.storeType._id}&id=${item.vendor}`,
                    { strict: false }
                  );
                else
                  item.set(
                    "webViewUrl",
                    webViewUrlProduct +
                    `grocery&id=${item._id}&store=${item.storeType._id}&vid=${item.vendor}`,
                    { strict: false }
                  );
              })
            );

            if (resdata.length === 0) {
              let result = {
                stores: [],
                products: productsData,
              };
              let response = helper.showSuccessResponseCount(
                "NO_DATA_FOUND",
                result
              );
              response["totaVendorPage"] = 1;
              response["totaProductPage"] = 1;

              res.json(response);
            } else {
              await Promise.all(
                resdata.map((element) => {
                  let vendorOpenClose = helper.getVendorOpenCloseStatus(
                    element.isVendorAvailable,
                    element.timeSlot,
                    new Date(),
                    store.timezone
                  );
                  //element.set("vendorOpenClose", vendorOpenClose.status, { strict: false });
                  element["vendorOpenClose"] = vendorOpenClose.status;
                  delete element.timeSlot;
                  delete element.isVendorAvailable;
                })
              );

              let result = {
                stores: resdata,
                products: productsData,
              };
              let response = helper.showSuccessResponse("DATA_SUCCESS", result);

              response["totaVendorPage"] = Math.ceil(
                totalcount / pageOptions.limit
              );
              response["totaProductPage"] = Math.ceil(
                productsDataCount / pageOptions.limit
              );
              res.json(response);
            }
          }
        }
      );
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  getNearByVendorsDetails: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      let unit = store.distanceUnit ? store.distanceUnit : "km";
      let UserObj;
      if (!data.storeTypeId) {
        return res.json(
          helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED")
        );
      }
      const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);
      if (getStoreType === null) {
        return res.json(
          helper.showValidationErrorResponse("INVALID_STORE_TYPE")
        );
      }
      data.storeType = getStoreType._id;
      data.storeTypeDetails = getStoreType;
      const getStore = await Store.getStorePaymentSettingAsync(
        getStoreType.store
      );
      if (getStore === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_STORE"));
      }
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      data.timezone = getStore.timezone;
      data._id = ObjectId(data._id);
      // let geofence = { isAccepteOrder: true }
      // if (data.customerLocation) {
      //     const customerLocation = { type: "Point", coordinates: [Number(data.customerLocation.lng), Number(data.customerLocation.lat)] }
      //     //const customerLocation = { type: "Point", coordinates: [76.7509428446592, 30.748774] }
      //     UserObj = {
      //         customerLocation: customerLocation.coordinates,
      //         unit: unit
      //     }
      //     let check_vender = await User.getUserByIdAsync(data._id);
      //     geofence = await geofencingFun.globalVenderCheck(UserObj, check_vender)
      //     console.log("User Obj---", UserObj)
      // }
      // console.log("geofence------")
      // console.log(geofence)
      data.storeTypeSettings = {};
      if (getStoreType.storeType === "FOOD") {
        // console.log("In FOOD")
        module.exports.getRestaurantDetails(data, (response) => {
          if (response == null) {
            res.json(
              helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
            );
          } else {
            if (response.vendorDetails.status != "approved") {
              return res.json(
                helper.showValidationErrorResponse("VENDOR_IS_NOT_AVAILABLE")
              );
            }
            //response["isAccepteOrder"] = geofence.isAccepteOrder
            //console.log("response---", response)
            res.json(helper.showSuccessResponse("DATA_SUCCESS", response));
          }
        });
      } else if (getStoreType.storeType === "SERVICEPROVIDER") {
        module.exports.getProviderServices(data, (response) => {
          if (response == null) {
            res.json(
              helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
            );
          } else {
            if (response.vendorDetails.status != "approved") {
              return res.json(
                helper.showValidationErrorResponse("VENDOR_IS_NOT_AVAILABLE")
              );
            }
            res.json(helper.showSuccessResponse("DATA_SUCCESS", response));
          }
        });
      }
      //else if (getStoreType.storeType === "GROCERY") {
      else {
        // console.log("In GROCERY")
        // console.log("store.storeVersion")
        // console.log(store.storeVersion)
        if (store.storeVersion > 2) {
          module.exports.getRestaurantDetails(data, (response) => {
            if (response == null) {
              res.json(
                helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
              );
            } else {
              if (response.vendorDetails.status != "approved") {
                return res.json(
                  helper.showValidationErrorResponse("VENDOR_IS_NOT_AVAILABLE")
                );
              }
              //response["isAccepteOrder"] = geofence.isAccepteOrder
              res.json(helper.showSuccessResponse("DATA_SUCCESS", response));
            }
          });
        } else {
          module.exports.getVendorCategories(data, (response) => {
            if (response == null) {
              res.json(
                helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
              );
            } else {
              if (response.vendorDetails.status != "approved") {
                return res.json(
                  helper.showValidationErrorResponse("VENDOR_IS_NOT_AVAILABLE")
                );
              }
              //response["isAccepteOrder"] = geofence.isAccepteOrder
              res.json(helper.showSuccessResponse("DATA_SUCCESS", response));
            }
          });
        }
      }
      // } else {
      //     console.log("In Other")
      //     module.exports.getVendorCategories(data, (response) => {
      //         if (response == null) {
      //             res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
      //         } else {
      //             //response["isAccepteOrder"] = geofence.isAccepteOrder
      //             res.json(helper.showSuccessResponse('DATA_SUCCESS', response));
      //         }
      //     });
      // }
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getNearByVendorsDetailsEcommerce: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      let unit = store.distanceUnit ? store.distanceUnit : "km";
      let UserObj;
      if (!data.storeTypeId) {
        return res.json(
          helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED")
        );
      }
      const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);
      if (getStoreType === null) {
        return res.json(
          helper.showValidationErrorResponse("INVALID_STORE_TYPE")
        );
      }
      data.storeType = getStoreType._id;
      data.storeTypeDetails = getStoreType;
      const getStore = await Store.getStorePaymentSettingAsync(
        getStoreType.store
      );
      if (getStore === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_STORE"));
      }
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      data.timezone = getStore.timezone;
      data._id = ObjectId(data._id);
      data.storeTypeSettings = {};
      module.exports.getVendorCategories(data, (response) => {
        if (response == null) {
          res.json(
            helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
          );
        } else {
          if (response.vendorDetails.status != "approved") {
            return res.json(
              helper.showValidationErrorResponse("VENDOR_IS_NOT_AVAILABLE")
            );
          }
          res.json(helper.showSuccessResponse("DATA_SUCCESS", response));
        }
      });

    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  getRestaurantDetails: async (data, responseCallback) => {
    try {
      let resdata = {};
      let sortByField = data.orderBy || "date_created_utc";
      let sortOrder = data.order || -1;
      resdata.storeTypeSettings = data.storeTypeSettings;
      const getVendor = await User.getUserByIdAsync(data._id);
      let vendorOpenClose = helper.getVendorOpenCloseStatus(
        getVendor.isVendorAvailable,
        getVendor.timeSlot,
        new Date(),
        data.timezone
      );
      if (data.storeTypeDetails.isEnableDeliveryTimeSlot && helper.getDeliveryTimeSlot(getVendor, data.timezone)) {
        let vendorDeliverySlot = helper.getVendorDeliveryTypeStatusForNewFeatures(
          getVendor,
          new Date(),
          data.timezone
        );
        console.log("deliveryType===>", getVendor.deliveryType);
        if (vendorDeliverySlot.status == "Close") {
          vendorOpenClose.status = vendorDeliverySlot.status;
        }
      }
      resdata.vendorDetails = {
        name: getVendor.name,
        status: getVendor.status,
        profileImage: getVendor.bannerImage,
        deliveryType: getVendor.deliveryType,
        minOrderAmont: getVendor.minOrderAmont,
        vendorOpenCloseStatus: vendorOpenClose.status,
        startTime: vendorOpenClose.startTime,
        closeTime: vendorOpenClose.endTime,
        address: getVendor.address,
        avgRating: getVendor.avgRating,
        reviewCount: getVendor.reviewCount,
        cuisines: getVendor.cuisines,
        seoSettings: getVendor.seoSettings ? getVendor.seoSettings : null,
        id: getVendor._id,
        storeTypeId: getVendor.storeType[0]._id
      };
      //console.log("resdata------>", resdata)
      let condition = {};
      if (data.sortby === "lprice") {
        sortByField = "price"
        sortOrder = -1
      } else if (data.sortby === "hprice") {
        sortByField = "price"
        sortOrder = 1
      }
      let filter = {
        sortByField: sortByField,
        sortOrder: sortOrder
      }
      console.log("filter------->", filter)
      if (data.veganType) condition.veganType = data.veganType;
      if (data.search && data.search != "" && data.search != null) {
        condition['$or'] = [];
        condition['$or'].push({ name: { $regex: data.search || '', $options: 'i' } })
      }
      const getCategory = await Category.getCategoryByStoreType(data);
      if (getCategory.length > 0) {
        await Promise.all(
          getCategory.map(async (element) => {
            //console.log("category--", element.catName)
            let items = await Product.getProductByCategoryIdAsync(
              condition,
              element._id,
              filter
            );
            //console.log("items---", items)
            for (let index = 0; index < items.length; index++) {
              if (items[index].bestSeller && items[index].bestSeller === true)
                items[index].bestSeller = "yes";
              else items[index].bestSeller = "no";
            }

            if (items.length > 0) {
              element.set("items", items, { strict: false });
            } else {
              element.set("items", [], { strict: false });
            }
          })
        );

        resdata.menuList = getCategory;
      } else {
        resdata.menuList = [];
      }
      responseCallback(resdata);
    } catch (error) {
      console.log("errro in getRestaurantDetails--", error);
      responseCallback(null);
    }
  },

  getVendorCategories: async (data, responseCallback) => {
    try {
      let resdata = {};

      const getVendor = await User.getUserByIdAsync(data._id);
      let vendorOpenClose = helper.getVendorOpenCloseStatus(
        getVendor.isVendorAvailable,
        getVendor.timeSlot,
        new Date(),
        data.timezone
      );
      if (data.storeTypeDetails.isEnableDeliveryTimeSlot && helper.getDeliveryTimeSlot(getVendor, data.timezone)) {
        let vendorDeliverySlot =
          helper.getVendorDeliveryTypeStatusForNewFeatures(
            getVendor,
            new Date(),
            data.timezone
          );
        console.log("vendorDeliverySlot===>", vendorDeliverySlot);
        console.log("deliveryType===>", getVendor.deliveryType);
        if (vendorDeliverySlot.status == "Close") {
          vendorOpenClose.status = vendorDeliverySlot.status;
        }
      }
      resdata.vendorDetails = {
        name: getVendor.name,
        status: getVendor.status,
        profileImage: getVendor.bannerImage ? getVendor.bannerImage : getVendor.profileImage,
        deliveryType: getVendor.deliveryType,
        minOrderAmont: getVendor.minOrderAmont,
        vendorOpenCloseStatus: vendorOpenClose.status,
        startTime: vendorOpenClose.startTime,
        closeTime: vendorOpenClose.endTime,
        address: getVendor.address,
        avgRating: getVendor.avgRating,
        reviewCount: getVendor.reviewCount,
        seoSettings: getVendor.seoSettings ? getVendor.seoSettings : null,
        id: getVendor._id,
        storeTypeId: getVendor.storeType[0]._id,
        aboutUs: getVendor.aboutUs,
        website: getVendor.website,
        member: getVendor.member,
        email: getVendor.email,
        mobileNumber: getVendor.mobileNumber,
        countryCode: getVendor.countryCode,
        expireDate: getVendor.expireDate,
        brandName: getVendor.brandName
      };
      //console.log("resdata------>", resdata)
      const getCategory = await Category.getVendorCategory(data);

      if (getCategory.length > 0) {
        await Promise.all(
          getCategory.map(async (element) => {
            if (element.subcategories.length > 0) {
              //console.log("element.subcategories1", element.subcategories);
              element.subcategories = await module.exports.getSubCategories(element.subcategories);
            }
          })
        );

        resdata.categories = getCategory;
      } else {
        resdata.categories = [];
      }
      responseCallback(resdata);
    } catch (error) {
      responseCallback(null);
    }
  },
  getProviderServices: async (data, responseCallback) => {
    try {
      let resdata = {};
      let sortByField = data.orderBy || "date_created_utc";
      let sortOrder = data.order || -1;
      const getVendor = await User.getUserByIdAsync(data._id);
      let vendorOpenClose = helper.getVendorOpenCloseStatus(
        getVendor.isVendorAvailable,
        getVendor.timeSlot,
        new Date(),
        data.timezone
      );
      if (data.storeTypeDetails.isEnableDeliveryTimeSlot && helper.getDeliveryTimeSlot(getVendor, data.timezone)) {
        let vendorDeliverySlot =
          helper.getVendorDeliveryTypeStatusForNewFeatures(
            getVendor,
            new Date(),
            data.timezone
          );
        console.log("vendorDeliverySlot===>", vendorDeliverySlot);
        console.log("deliveryType===>", getVendor.deliveryType);
        if (vendorDeliverySlot.status == "Close") {
          vendorOpenClose.status = vendorDeliverySlot.status;
        }
      }
      resdata.vendorDetails = {
        name: getVendor.name,
        status: getVendor.status,
        profileImage: getVendor.bannerImage ? getVendor.bannerImage : getVendor.profileImage,
        vendorOpenCloseStatus: vendorOpenClose.status,
        startTime: vendorOpenClose.startTime,
        closeTime: vendorOpenClose.endTime,
        address: getVendor.address,
        avgRating: getVendor.avgRating,
        reviewCount: getVendor.reviewCount,
        id: getVendor._id,
        storeTypeId: getVendor.storeType[0]._id,
        aboutUs: getVendor.aboutUs,
        website: getVendor.website,
        member: getVendor.member,
        email: getVendor.email,
        mobileNumber: getVendor.mobileNumber,
        countryCode: getVendor.countryCode,
        expireDate: getVendor.expireDate,
        brandName: getVendor.brandName
      };
      let condition = {
        status: "active",
        vendor: data._id
      };
      if (data.sortby === "lprice") {
        sortByField = "price"
        sortOrder = -1
      } else if (data.sortby === "hprice") {
        sortByField = "price"
        sortOrder = 1
      }
      let filter = {
        sortByField: sortByField,
        sortOrder: sortOrder
      }
      let items = await Product.getServicesForProviderAsync(
        condition,
        filter
      );
      if (items.length > 0) {
        resdata.services = items;
      } else {
        resdata.services = [];
      }
      responseCallback(resdata);
    } catch (error) {
      responseCallback(null);
    }
  },

  getSubCategories: async (subcategory) => {
    subcategory = subcategory.filter((ele) => {
      return ele.status != "archived";
    });
    await Promise.all(
      subcategory.map(async (element2) => {
        if (element2.subcategories && element2.subcategories.length > 0) {
          element2.subcategories = await module.exports.getMidCategory(
            element2.subcategories
          );
        }
      })
    );

    subcategory.sort(function (a, b) {
      return a.sortOrder - b.sortOrder;
    });

    return subcategory;
  },

  getMidCategory: async (midcate) => {
    // console.log("midcate", midcate);
    let newCate = [];
    await Promise.all(
      midcate.map(async (element) => {
        let nCat = await module.exports.getSubCategoryById(element._id);
        newCate.push(nCat);
      })
    );

    newCate = newCate.filter((ele) => {
      return ele.status != "archived";
    });

    newCate.sort(function (a, b) {
      return a.sortOrder - b.sortOrder;
    });

    return newCate;
  },

  getSubCategoryById: async (id) => {
    let getCategory = await Category.findById(id, "catName status")
      .populate({ path: 'catImage', select: "link" })
      .populate({
        path: "subcategories",
        match: { status: "active" }, select: "catName status",
        populate: { path: "catImage", select: "link" }
      })

    if (getCategory.subcategories && getCategory.subcategories.length > 0) {
      getCategory.subcategories = await module.exports.getMidCategory(
        getCategory.subcategories
      );
    }

    return getCategory;
  },

  getDeliveryAddress: async (req, res) => {
    try {
      let store = req.store;
      const data = req.body;
      let vendorLocation;

      const obj = {};

      obj.user = req.user._id;

      if (!data.storeTypeId) {
        return res.json(
          helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED")
        );
      }

      const getAddresses = await Address.find(obj).sort({
        date_created_utc: -1,
      });
      // console.log("getAddresses:======>", getAddresses)
      if (getAddresses.length <= 0) {
        return res.json(
          helper.showSuccessResponse("DATA_SUCCESS", getAddresses)
        );
      }

      const getStoreType = await storeType.getStoreTypeByIdAsync(
        data.storeTypeId
      );

      if (getStoreType === null) {
        return res.json(
          helper.showValidationErrorResponse("INVALID_STORE_TYPE")
        );
      }
      if (getStoreType.storeType != "SERVICEPROVIDER") {
        if (!data.vendorId) {
          return res.json(
            helper.showValidationErrorResponse("VENDOR_ID_IS_REQUIRED")
          );
        }

        const getVendor = await User.findOne({ _id: ObjectId(data.vendorId) });

        if (getVendor === null) {
          return res.json(helper.showValidationErrorResponse("INVALID_VENDOR"));
        }

        vendorLocation = getVendor.userLocation;
      } else {
        //console.log("customerLocation---", data.customerLocation)
        if (!data.hasOwnProperty("customerLocation")) {
          return res.json(
            helper.showValidationErrorResponse("INVALID USER ADDRESS")
          );
        }
        if (!Object.keys(data.customerLocation).length) {
          return res.json(
            helper.showValidationErrorResponse("INVALID USER ADDRESS")
          );
        }
        vendorLocation = {
          type: "Point",
          coordinates: [
            Number(data.customerLocation.lng),
            Number(data.customerLocation.lat),
          ],
        }; //getVendor.userLocation;
      }
      let radius = getStoreType.deliveryAreaVendor
        ? getStoreType.deliveryAreaVendor
        : Number(env.SEARCH_RADIUS);
      let unit = store.distanceUnit ? store.distanceUnit : "km";
      radius = helper.getDeliveryArea(radius, unit);
      Address.aggregate(
        [
          {
            $geoNear: {
              near: vendorLocation,
              distanceField: "distance",
              key: "addressLocation",
              spherical: true,
              maxDistance: radius,
              query: obj,
            },
          },
          {
            $project: { _id: 1 },
          },
        ],
        async (err, resdata) => {
          if (err) {
            console.log("err", err);
            return res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            let deliverTo = resdata.map((element) => element._id.toString());
            //console.log("deliverTo:==>", deliverTo);
            await Promise.all(
              getAddresses.map((element) => {
                if (deliverTo.includes(element._id.toString())) {
                  element.set("deliverTo", true, { strict: false });
                } else {
                  element.set("deliverTo", false, { strict: false });
                }
              })
            );
            let response = helper.showSuccessResponse(
              "DATA_SUCCESS",
              getAddresses
            );
            //console.log("response:=========>", response)
            res.json(response);
          }
        }
      );
    } catch (error) {
      console.log("errror:==>", error);
    }
  },

  userCartMiddleware: async (req, res) => {
    try {
      let data = req.body;
      data.tipAmount = 0;
      data.tipOption = [1, 2];
      data.deliveryFee = 0;
      data.orderTotal = 0;
      let store = req.store;
      let isLoyaltyPointsEnabled = false;
      let isLoggedIn = false;
      let user = null;
      data.deliveryType = data.deliveryType ? data.deliveryType : "DELIVERY";
      if (req.get("Authorization")) {
        let token = req.get("Authorization").replace("Bearer ", "");
        user = await User.findOne({ "tokens.token": token }, "loyaltyPoints");
        if (user != null) {
          isLoggedIn = true;
          if (store.loyaltyPoints.status) {
            data.loyaltyPoints = user.loyaltyPoints;
            isLoyaltyPointsEnabled = true;
          }
        }
      }

      data.isLoyaltyPointsEnabled = isLoyaltyPointsEnabled;
      // console.log("data:===>", data)

      if (!data.items) {
        return res.json(
          helper.showValidationErrorResponse("ITEMS_IS_REQUIRED")
        );
      }

      if (!data.items.length === 0) {
        return res.json(
          helper.showValidationErrorResponse("ITEMS_IS_REQUIRED")
        );
      }

      if (!data.storeTypeId) {
        return res.json(
          helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED")
        );
      }
      console.log("data--- items", JSON.stringify(data.items));
      const getStoreType = await storeType.getStoreTypeByIdAsync(
        data.storeTypeId
      );

      if (getStoreType === null) {
        return res.json(
          helper.showValidationErrorResponse("INVALID_STORE_TYPE")
        );
      }

      if (!getStoreType.store.googleMapKey) {
        return res.json(
          helper.showValidationErrorResponse("GOOGLEMAP_KEY_NOT_SETUP")
        );
      }

      if (!getStoreType.store.googleMapKey.server) {
        return res.json(
          helper.showValidationErrorResponse("GOOGLEMAP_KEY_NOT_SETUP")
        );
      }

      data.googleMapKey = getStoreType.store.googleMapKey.server;
      data.storeTypeDetails = {
        scheduled: getStoreType.scheduled.status,
        deliveryPlatform: getStoreType.deliveryPlatform.platform,
        deliveryType: getStoreType.deliveryType,
      };
      let lineData = await orderService.generateLineItems(
        data.items,
        getStoreType.storeType,
        store.storeVersion
      );

      if (lineData.isValidItem) {
        return res.json(helper.showValidationErrorResponse("INVALID_ITEMS"));
      }

      if (
        ["GROCERY"].includes(getStoreType.storeType) &&
        lineData.totalWeight
      ) {
        data.totalWeight = lineData.totalWeight;
      }
      data.line_items = lineData.line_items;
      data.subTotal = helper.roundNumber(lineData.itemTotal);
      data.line_items_array = [...lineData.line_items];
      // data.line_items.sort(function (a, b) {
      //     return compareStrings(a.name, b.name);
      // });

      if (!data.deliveryType) {
        return res.json(
          helper.showValidationResponseWithData(
            "DELIVERY_TYPE_IS_REQUIRED",
            data
          )
        );
      }

      if (!data.vendor) {
        return res.json(
          helper.showValidationResponseWithData("VENDOR_IS_REQUIRED", data)
        );
      }

      const getVendor = await User.getUserByIdAsync(data.vendor);

      if (getVendor === null) {
        return res.json(
          helper.showValidationResponseWithData("VENDOR_IS_INVALID", data)
        );
      }
      let vendorDeliverySlot;
      if (getStoreType.isEnableDeliveryTimeSlot && helper.getDeliveryTimeSlot(getVendor, data.timezone)) {
        vendorDeliverySlot = helper.getVendorDeliveryTypeStatusForNewFeatures(getVendor, new Date(), store.timezone);
      };
      let vendorOpenClose = helper.getVendorOpenCloseStatus(
        getVendor.isVendorAvailable,
        getVendor.timeSlot,
        new Date(),
        getStoreType.store.timezone
      );

      data.vendorDetails = {
        name: getVendor.name,
        status: getVendor.status,
        profileImage: getVendor.profileImage,
        deliveryType: getVendor.deliveryType,
        minOrderAmont: getVendor.minOrderAmont,
        vendorOpenCloseStatus: vendorOpenClose.status,
        startTime: vendorOpenClose.startTime,
        closeTime: vendorOpenClose.endTime,
        address: getVendor.address,
        avgRating: getVendor.avgRating,
        reviewCount: getVendor.reviewCount,
        seoSettings: getVendor.seoSettings ? getVendor.seoSettings : null,
      };
      // if (helper.roundNumber(lineData.itemTotal) < helper.roundNumber(getVendor.minOrderAmont)) {
      //     let minumamount = helper.showValidationErrorResponse('minimumOrderLabel')
      //     minumamount.message = minumamount.message.replace('{minOrderAmont}', getVendor.minOrderAmont)
      //     return res.json(minumamount);
      // }
      let today = new Date();
      today.setHours(0, 0, 0, 0);

      let unit = store.distanceUnit ? store.distanceUnit : "km";

      if (getStoreType.store.tip) {
        data.tipOption = getStoreType.store.tip;
        data.tipType = getStoreType.store.tipType;
      }
      //check coupon code
      if (data.coupon) {
        // let checkLimit = await module.exports.checkProcode(getVendor._id, getStoreType._id, user, data.date_created, data.date_created_utc)
        // console.log("check--- in cart", checkLimit)
        // if (checkLimit) {
        //     return res.json(helper.showValidationResponseWithData('Promo Code Max Limit exceeded'));
        // }
        const couponCost = await Pricing.couponDiscountCalculation(
          getStoreType._id,
          getVendor._id,
          data.coupon,
          data.subTotal
        );

        data.discountTotal = couponCost.discountTotal;
        data.couponType = couponCost.couponType;
        data.couponBy = couponCost.couponBy;
        data.couponAmount = couponCost.couponAmount;
        data.subTotal = couponCost.itemTotal;
      }

      //calculate tax
      const getTax = Pricing.taxCalculation(
        getStoreType.taxSettings,
        getVendor.taxAmount,
        data.subTotal
      );
      data.tax = getTax.tax;
      data.taxAmount = getTax.taxAmount;

      //calculate tip
      if (data.tip) {
        const getTip = Pricing.tipCalculation(
          Number(data.tip),
          data.subTotal,
          getStoreType.store.tipType
        );
        data.tip = getTip.tip;
        data.tipAmount = getTip.tipAmount;
        data.tipType = getStoreType.store.tipType;
      }

      //calculate delivery fee
      if (isLoggedIn && data.deliveryType && data.deliveryType === "DELIVERY") {
        if (vendorDeliverySlot) {
          if (!vendorDeliverySlot.isDeliveryTypeAvailable) {
            return res.json(helper.showValidationResponseWithData("NOT_TAKING_DELIVERY_ORDER", data));
          }
          if (vendorDeliverySlot.status == "Close") {
            vendorOpenClose.status = vendorDeliverySlot.status;
          }
        }
        const getDeliveryFee = await Pricing.deliveryFeeCalculation(
          data,
          getStoreType,
          getVendor,
          unit
        );
        if (getDeliveryFee.message != null) {
          return res.json(
            helper.showValidationResponseWithData(getDeliveryFee.message, data)
          );
        }
        let query = {};
        let promoCodeObj = {};
        promoCodeObj = {
          customerLocation:
            getDeliveryFee.billingDetails.addressLocation.coordinates, //data.customerLocation && data.customerLocation.lat && data.customerLocation.lng ? data.customerLocation : {},
          // today: today,
          // vendorId: getVendor._id,
          // storeTypeId: getStoreType._id,
          unit: unit, //must be in meter
        };
        query = {
          $or: [
            { type: "vendor", vendor: getVendor._id },
            { type: "global", storeType: getStoreType._id },
          ],
          status: "active",
          start_date: { $lte: new Date(today) },
          date_expires: { $gte: new Date(today) },
        };
        let project = "code discount_type amount description geoFence";

        data.promoCodes = await geofencingFun.globalPromoCode(
          promoCodeObj,
          query,
          project
        );
        //data = { ...data, ...getDeliveryFee };
        UserObj = {
          customerLocation: promoCodeObj.customerLocation,
          unit: unit,
        };

        if (getVendor.geoFence.length) {
          let geofence = await geofencingFun.globalVenderCheck(
            UserObj,
            getVendor
          );
          if (geofence && !geofence.isAccepteOrder) {
            return res.json(
              helper.showValidationErrorResponse(
                "RESTAURANT_NOT_TAKE_ORDER_ADDRESS"
              )
            );
          }
        }
        data = { ...data, ...getDeliveryFee };
      }

      data.orderTotal = helper.roundNumber(
        data.subTotal + data.tax + data.tipAmount + data.deliveryFee
      );

      data.maxRedeemPoints = 0;
      data.maxRedemptionValue = 0;
      data.redemptionValue = 0;

      if (data.isLoyaltyPointsEnabled) {
        let Lp = helper.calculateLoyalityPoints(
          data.orderTotal,
          store.loyaltyPoints
        );
        data.maxRedeemPoints = Lp.redemPoints;
        data.maxRedemptionValue = Lp.redemptionValue;
      }

      if (data.isLoyaltyPointsEnabled && data.isLoyaltyPointsUsed) {
        if (!data.loyaltyPoints.points) {
          return res.json(
            helper.showValidationResponseWithData(
              "YOU_HAVE_NO_LOYALTY_POINTS",
              data
            )
          );
        }

        if (!data.pointsToRedeem) {
          return res.json(
            helper.showValidationResponseWithData(
              "PLEASE_ENTER_REDEEM_POINTS",
              data
            )
          );
        }

        if (Number(data.pointsToRedeem) > data.loyaltyPoints.points) {
          return res.json(
            helper.showValidationResponseWithData(
              "REDEEM_POINTS_MUST_BE_LESS_THAN_LOYALTY_POINTS",
              data
            )
          );
        }

        if (Number(data.pointsToRedeem) > data.maxRedeemPoints) {
          return res.json(
            helper.showValidationResponseWithData(
              "REDEEM_POINTS_MUST_BE_LESS_TO_MAX_REDEEM_POINTS",
              data
            )
          );
        }

        // let aLp = helper.calculateLoyalityPointsValue(data.pointsToRedeem, store.loyaltyPoints);
        let calculate_point = data.maxRedemptionValue / data.maxRedeemPoints;
        let redemptionValue = helper.roundNumber(
          data.pointsToRedeem * calculate_point
        );

        //data.orderTotal = helper.roundNumber(data.orderTotal - aLp.redemptionValue);
        data.orderTotal = helper.roundNumber(data.orderTotal - redemptionValue);

        data.redemptionValue = redemptionValue; //aLp.redemptionValue;
      }
      if (lineData.stock_status) {
        let messagdat = helper.showValidationResponseWithData(
          "OUT_OF_STOCK",
          data
        );
        messagdat.message = messagdat.message.replace(
          "{productname}",
          lineData.stockObj.name
        );
        messagdat.message = messagdat.message.replace(
          "{stock}",
          lineData.stockObj.stock
        );
        return res.json(messagdat);
      }
      // console.log("data:====>", data)
      let response = helper.showSuccessResponse("USER_CART", data);
      res.json(response);
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },

  checkProcode: async (getVendor, getStoreType, user) => {
    try {
      let getCoupon = await Coupon.findOne({
        code: code,
        status: "active",
        $or: [
          { type: "vendor", vendor: getVendor._id },
          { type: "global", storeType: getStoreType._id },
        ],
      });
      if (getCoupon) {
        if (user) {
          let checkPomoUsedCount = await promoUse.findOne({
            user: user._id,
            promoCodeId: getCoupon._id,
          });
          if (checkPomoUsedCount) {
            if (
              checkPomoUsedCount.count >= getCoupon.maxUse &&
              getCoupon.maxUse
            ) {
              return true;
            }
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  },
  enableUserNotifications: async (req, res) => {
    try {
      let data = req.body;
      let getUser = req.user;

      if (data.firebaseToken) {
        getUser.firebaseToken = data.firebaseToken;
      }

      if (getUser.firebaseTokens == null) {
        getUser.firebaseTokens = [{ token: data.firebaseToken }];
      } else {
        const _firebaseTokens = getUser.firebaseTokens.map(
          ({ token }) => token
        );

        if (!_firebaseTokens.includes(data.firebaseToken)) {
          getUser.firebaseTokens = getUser.firebaseTokens.concat({
            token: data.firebaseToken,
          });
        } else {
          getUser.firebaseTokens = [{ token: data.firebaseToken }];
        }

        User.updateFirebaseToken(getUser, (err, mytoken) => {
          if (err) {
            res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            let resdata = helper.showSuccessResponse("DATA_SUCCESS", mytoken);
            res.json(resdata);
          }
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getStoreByStoreId: async (req, res) => {
    try {
      let data = req.body;

      if (!data.storeId) {
        return res.json(
          helper.showValidationErrorResponse("STORE_ID_IS_REQUIRED")
        );
      }

      let getStore = await Store.findOne(
        { slug: data.storeId },
        "api_key storeName domain slug email mobileNumber logo language currency timezone distanceUnit googleMapKey paymentMode paymentSettings themeSettings socialMedia appUrl deliveryMultiStoretype bankFields chatCodeScript"
      )
        .populate({
          path: "storeType",
          match: { status: "active" },
          select: "storeType storeVendorType status",
        })
        .populate({ path: "logo" })
        .populate({ path: "bannerImage" })
        .exec();

      if (getStore == null) {
        return res.json(helper.showValidationErrorResponse("INVALID_STORE"));
      }

      getStore.set("isDemoStore", true, { strict: false });
      getStore.set("trackingDistance", 20, { strict: false });

      let resdata = helper.showSuccessResponse("DATA_SUCCESS", getStore);
      res.json(resdata);
    } catch (error) {
      console.log("err", error);
      return res
        .status(500)
        .json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getStorePromoCode: async (req, res) => {
    try {
      let data = req.body;
      data.store = req.user.store._id;
      if (!data.storeTypeId || !data.hasOwnProperty("storeTypeId")) {
        return res.json(
          helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED")
        );
      }
      let today = new Date();
      //today.setHours(0, 0, 0, 0);
      let unit = req.user.store.distanceUnit
        ? req.user.store.distanceUnit
        : "km";
      let userLocation = [];
      if (
        data.customerLocation &&
        data.customerLocation.lat &&
        data.customerLocation.lng
      ) {
        userLocation.push(data.customerLocation.lng);
        userLocation.push(data.customerLocation.lat);
      }
      let promoCodeObj = {
        customerLocation: userLocation,
        unit: unit, //must be in meter
      };
      let query = {
        type: "global",
        storeType: ObjectId(data.storeTypeId),
        store: data.store,
        status: "active",
        start_date: { $lte: new Date(today) },
        date_expires: { $gte: new Date(today) },
      };
      let project = "code discount_type amount description";
      let getCoupon = await geofencingFun.globalPromoCode(
        promoCodeObj,
        query,
        project
      );

      if (getCoupon == null) {
        return res.json(helper.showValidationErrorResponse("INVALID_STORE"));
      }

      let resdata = helper.showSuccessResponse("DATA_SUCCESS", getCoupon);
      res.json(resdata);
    } catch (error) {
      console.log("err", error);
      return res
        .status(500)
        .json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getTransaction: async (req, res) => {
    try {
      let { orderBy, order, page, limit, startDate, endDate, type } = req.body;
      var pageSize = limit || 10;
      var sortByField = orderBy || "date_created_utc";
      var sortOrder = order || -1;
      var paged = page || 1;
      let obj = {};
      let user = req.user;
      if (startDate) {
        startDate = new Date(
          new Date(new Date(startDate).setHours(0, 0, 0, 0))
            .toString()
            .split("GMT")[0] + " UTC"
        ).toISOString();
        startDate = new Date(startDate);
        startDate.setHours(0, 0, 0, 0);
      }

      if (endDate) {
        endDate = new Date(
          new Date(new Date(endDate).setHours(0, 0, 0, 0))
            .toString()
            .split("GMT")[0] + " UTC"
        ).toISOString();
        endDate = new Date(endDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
      }
      if (startDate && endDate)
        obj.date_created_utc = {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        };
      if (type) obj.type = type;

      obj.payment_to = ObjectId(user._id);

      let count = await paymentLedger.aggregate([
        { $match: obj },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      paymentLedger.getTransaction(
        obj,
        sortByField,
        sortOrder,
        paged,
        pageSize,
        (err, resdata) => {
          if (err) {
            return res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            let countdata = count[0] ? count[0].count : 0;
            return res.json(
              helper.showSuccessResponseCount(
                "DATA_SUCCESS",
                resdata,
                countdata
              )
            );
          }
        }
      );
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  walletToWalletTransaction: async (req, res) => {
    try {
      let { payment_to, amount } = req.body;
      let user = req.user;
      let store = req.store;
      if (!payment_to) {
        return res.json(helper.showValidationErrorResponse("USER_IS_REQUIRED"));
      }
      if (!amount) {
        return res.json(
          helper.showValidationErrorResponse("AMOUNT_IS_REQUIRED")
        );
      }
      if (!user.wallet) {
        return res.json(
          helper.showValidationErrorResponse("PLEASE_ADD_MONEY_TO_WALLET")
        );
      }

      if (user.wallet < amount) {
        return res.json(
          helper.showValidationErrorResponse("WALLET_BALANCE_IS_LOW")
        );
      }
      let validatePaymentToUser = await User.findOne({
        _id: payment_to,
        role: "USER",
        status: "active",
      });
      if (!validatePaymentToUser) {
        return res.json(helper.showValidationErrorResponse("INVALID_USER_ID"));
      }

      let addedTransaction = await Transaction.addTransaction(
        null,
        null,
        "USER",
        store.storeId,
        payment_to,
        amount,
        "credit",
        `Credited in Wallet`,
        null,
        null,
        null,
        true
      );
      res.json(helper.showSuccessResponse("DATA_SUCCESS", addedTransaction));
      Transaction.addTransaction(
        null,
        null,
        "USER",
        store.storeId,
        user._id,
        amount,
        "debit",
        `Debited to Wallet`,
        null,
        null,
        null,
        true
      );
      notifyUser.walletToWalletSendMoneyNotify(
        payment_to,
        amount,
        "credit",
        user
      );
      notifyUser.walletToWalletSendMoneyNotify(
        user._id,
        amount,
        "debit",
        user,
        validatePaymentToUser
      );
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getUsersListForWalletTransaction: async (req, res) => {
    try {
      const data = req.body;
      const store = req.store;
      const pageSize = data.limit || 50;
      const sortByField = data.orderBy || "date_created_utc";
      const sortOrder = data.order || -1;
      const paged = data.page || 1;
      let obj = {};
      let user = req.user;
      obj.store = ObjectId(store.storeId);
      if (!obj.hasOwnProperty("status")) {
        obj.status = { $ne: "archived" };
      }

      if (data.search) {
        obj["$or"] = [];
        obj["$or"].push({ name: { $regex: data.search, $options: "i" } });
        obj["$or"].push({ email: { $regex: data.search, $options: "i" } });
        obj["$or"].push({
          mobileNumber: { $regex: data.search, $options: "i" },
        });
      } else {
        return res.json(helper.showSuccessResponseCount("DATA_SUCCESS", []));
      }
      obj._id = { $ne: user._id };
      obj.role = "USER";
      let count = await User.aggregate([
        { $match: obj },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      User.getUsersWithFilterForTransaction(
        obj,
        sortByField,
        sortOrder,
        paged,
        pageSize,
        (err, resdata) => {
          if (err) {
            res.json(
              helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
            );
          } else {
            res.json(
              helper.showSuccessResponseCount(
                "DATA_SUCCESS",
                resdata,
                totalcount
              )
            );
          }
        }
      );
    } catch (err) {
      console.log("err", err);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getActiveStoreLanguage: async (req, res) => {
    try {
      let store = req.store;
      let langCode = req.params.code;

      let getLangugeCode = Config.LANGUAGES.filter(i => {
        return i.code === langCode;
      });

      if (!getLangugeCode.length) {
        return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
      }

      let customerTerminology = require('../config/customer-lang-' + langCode + '.json');
      let terminologyData = [];
      let getTerminologyData = await terminologyModel.findOne({ store: store.storeId, lang: langCode, type: "customers" });
      let staticTerminology = customerTerminology.langJSON_arr;

      if (getTerminologyData != null) {
        let storeTerminology = getTerminologyData.values;
        terminologyData = [...staticTerminology, ...storeTerminology];
      }
      else {
        let storeTerminology = customerTerminology.Insert_JSON_arr;
        terminologyData = [...staticTerminology, ...storeTerminology];
      }

      res.json(helper.showSuccessResponse('DATA_SUCCESS', terminologyData));

    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  updateSelectedLanguage: async (req, res) => {
    try {
      let user = req.user;
      let { language } = req.body;
      if (!language) {
        return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
      }

      let getLangugeCode = Config.LANGUAGES.filter(i => {
        return i.code === language.code;
      });
      if (!getLangugeCode.length) {
        return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
      }
      let data = { language, _id: user._id };
      User.updateUserProfile(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
        }
      });

    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  activateUser: async (req, res) => {
    let { token } = req.body;
    if (!token) {
      return res.json(helper.showValidationErrorResponse('MISSING_TOKEN'));
    }
    let user = await User.findOne({ activation_token: token }).lean();
    if (!user) {
      return res.json(helper.showValidationErrorResponse('INVALID_ACTIVATION_TOKEN'));
    }
    if (user && user.isActivated) {
      return res.json(helper.showValidationErrorResponse('ALREADY_ACTIVATED'));
    }
    if (user && user.token_valid_till < new Date()) {
      return res.json(helper.showValidationErrorResponse('TOKEN_EXPIRED'));
    }
    User.activateUser(user._id, (error, resdata) => {
      if (error) {
        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", error));
      } else {
        res.json(helper.showSuccessResponse("UPDATE_SUCCESS", resdata));
      }
    })
  },
  getStoreTypePromotions: async (req, res) => {
    try {
      let { storeTypeId } = req.params;
      let store = req.store;
      let query = { store: store.storeId, status: "active" };
      if (!store.isSingleVendor) {
        query["storeTypeId"] = ObjectId(storeTypeId);
      }
      Promotion.getStoreTypePromotions(query, (error, resdata) => {
        if (error) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", error));
        } else {
          res.json(helper.showSuccessResponse("DATA_SUCCESS", resdata));
        }
      })
    } catch (error) {
      return res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  testTNC: async (req, res) => {
    const username = '7c01464635124d458fc5312bf05720ee';
    const password = '8a04AB19518f4934B42dFD433C1d5F97';
    const random_uuid = uuidv4();
    const payload = {
      "uid": random_uuid,
      "tnc_id": 32515,
      "license_plate": "ABC123454",
      "timestamp": new Date().toISOString(),
      "txn_type": "DROP-OFF",
      "ride_count": 1,
      "lon": -73.7830148,
      "lat": 40.6440152
    };
    const options = {
      auth: {
        username,
        password
      }
    };
    console.log("payload-------->", payload)
    try {
      const response = await axios.post('https://api.mspmac.org/_services/v1.0/tnctrips', payload, options);
      console.log('TNC response:', response.data);
      res.send({
        message: "OK",
        data: response.data
      })
    } catch (error) {
      console.error('Error testTNC', error);
      return { status: false, data: {} };
    }
  },
  getCuisineList: async (req, res) => {
    try {
      const { orderBy, order, page, limit, storeTypeId, search, fields } = req.body
      let pageSize = limit || 10;
      let sortByField = orderBy || "date_created_utc";
      let sortOrder = order || -1;
      let paged = page || 1;
      let obj = {};
      if (!storeTypeId) {
        return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
      }

      if (storeTypeId) {
        obj.storeType = ObjectId(storeTypeId);
      }

      if (fields && fields.length > 0) {
        fields.forEach(element => {
          if (element.fieldName && element.fieldValue) {
            obj[element.fieldName] = element.fieldValue;
          }
        });
      }
      if (!obj.hasOwnProperty("status")) {
        obj.status = { $ne: "archived" };
      }
      if (search) {
        obj['$or'] = [];
        obj['$or'].push({ name: { $regex: search || '', $options: 'i' } })
      }
      let count = await Cuisines.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
      Cuisines.geCuisinesWithFilterImage(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let countdata = count[0] ? count[0].count : 0;
          return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
        }
      });
    }
    catch (err) {
      console.log("err", err);
      return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  becomeHost: async (req, res) => {
    try {
      let data = req.body;
      let store = req.store;
      let user = req.user
      data.store = store.storeId;
      const getUser = await User.findOne({ _id: { $ne: ObjectId(user._id) }, mobileNumber: data.mobileNumber, role: "USER", status: { $ne: "archived" } });
      if (getUser != null) {
        return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_ALREADY_EXISTS'));
      }
      data.role = "USER";
      data.onlineStatus = "offline";
      data.isHost = true
      data.stripeConnect = {
        status: false,
        accountId: null
      };
      data.status = "created";
      let values = [];
      let complete = [];
      let vehicleInfo = [];
      if (data.documents && data.documents.length > 0) {
        let message = '';
        let flag = false;
        for (let index = 0; index < data.documents.length; index++) {
          let innerflag = false;
          let vehicleInfoValues = [];
          let fields = data.documents[index].fields;
          let template = data.documents[index];
          let templateType = data.documents[index].type;
          if (templateType && templateType === "vehicleInfo") {
            if (!template.vehicleType) {
              flag = true;
              message = "Please select vehicle type";
              break;
            }
          }
          if (fields && fields.length > 0) {
            for (let index2 = 0; index2 < fields.length; index2++) {
              let required = fields[index2].validation.required;
              let name = fields[index2].name;
              let value = fields[index2].value;
              let type = fields[index2].type;
              let label = fields[index2].label;
              let valueType = fields[index2].valueType
              if (required && type != 'checkbox') {
                if (!value) {
                  innerflag = true;
                  message = fields[index2].label + ' is required';
                  break;
                }
              }
              let obj = {
                label: label,
                name: name,
                value: value,
                type: type
              }
              if (valueType) {
                obj.valueType = valueType
              }
              if (type === 'checkbox') {
                let options = fields[index2].options;
                obj.options = options;
              }
              if (templateType && templateType === "vehicleInfo") {
                vehicleInfoValues.push(obj);
              } else {
                values.push(obj);
              }
            }
          }
          if (innerflag) {
            flag = true;
            break;
          }
          if (vehicleInfoValues.length > 0) {
            let vehicleObj = {
              template: template._id,
              vehicleType: template.vehicleType,
              values: vehicleInfoValues,
              complete: [{ template: template._id.toString(), isComplete: template.isComplete }]
            }
            vehicleInfo.push(vehicleObj);
          } else {
            complete.push({ template: template._id.toString(), isComplete: template.isComplete });
          }
        }
        if (flag) {
          return res.json(helper.showParamsErrorResponse(message));
        }
      }
      if (data.otherdocument && data.otherdocument.length > 0) {
        let message = '';
        let flag = false;
        for (let index = 0; index < data.otherdocument.length; index++) {
          let innerflag = false;
          let fields = data.otherdocument[index].fields;
          let template = data.otherdocument[index];
          if (fields && fields.length > 0) {
            for (let index2 = 0; index2 < fields.length; index2++) {
              let required = fields[index2].validation.required;
              let name = fields[index2].name;
              let value = fields[index2].value;
              let type = fields[index2].type;
              let label = fields[index2].label;
              if (required && type != 'checkbox') {
                if (!value) {
                  innerflag = true;
                  message = fields[index2].label + ' is required';
                  break;
                }
              }
              let obj = {
                label: label,
                name: name,
                value: value,
                type: type
              }
              if (type === 'checkbox') {
                let options = fields[index2].options;
                obj.options = options;
              }
              values.push(obj);
            }
          }
          if (innerflag) {
            flag = true;
            break;
          }
          complete.push({ template: template._id.toString(), isComplete: template.isComplete });
        }
        if (flag) {
          return res.json(helper.showParamsErrorResponse(message));
        }
      };
      data.user = user._id
      User.addUserHost(data, async (err, resdata) => {
        if (err) {
          console.log("err----", err)
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          if (values.length > 0) {
            let doc = await Document.create({ user: resdata._id, values: values, complete: complete, date_created_utc: new Date() });
          }
          if (vehicleInfo.length > 0) {
            await Promise.all(vehicleInfo.map(item => {
              item.user = resdata._id;
              item.date_created_utc = new Date();
              return item;
            }));
            let vehicle = await driverVehicle.insertMany(vehicleInfo);
            await User.findByIdAndUpdate(resdata._id, { vehicle: vehicle[0]._id });
          }
          res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
        }
      });
    } catch (error) {
      console.log("err", error);
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  getProviderRelated: async (req, res) => {
    try {
      let id = req.params._id;
      if (!id) {
        return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
      }
      var getUser = await User.findById(id)
      if (getUser == null) {
        return res.json(helper.showValidationErrorResponse('USER_ID_IS_NOT_VALID'));
      }
      let related = [];
      if (getUser.cuisines && getUser.cuisines.length > 0) {
        let getRelated = await User.find({ status: 'approved', cuisines: { $in: getUser.cuisines } })
          .populate({ path: 'profileImage' })
          .exec();
        related = getRelated;
      }
      res.json(helper.showSuccessResponse('DATA_SUCCESS', related));
    } catch (error) {
      console.log("err", error);
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },

};

function compareStrings(a, b) {
  // Assuming you want case-insensitive comparison
  a = a.toLowerCase();
  b = b.toLowerCase();

  return a < b ? -1 : a > b ? 1 : 0;
}

async function homepageFunction(data, body) {
  let result = []
  let isDeliveryServiceAdd = false
  let isTranpotationServiceAdd = false
  let deliveryService = await data.filter((item) => {
    return item.storeType == "FOOD" || item.storeType == "BAKERY" || item.storeType == "GROCERY" || item.storeType == "MEDICINE"
  })
  let transapotationService = await data.filter((item) => {
    return item.storeType == "TAXI" || item.storeType == "CARRENTAL"
  })
  if (body.isDeliveryService) {
    return result = deliveryService
  } else if (body.isTranpotationService) {
    return result = transapotationService
  }
  for (let i = 0; i < data.length; i++) {
    if (data[i].storeType == "ECOMMERCE") {
      data[i].isHaveSubModule = false
      result.push(data[i])
    } else if (data[i].storeType == "FOOD" || data[i].storeType == "BAKERY" || data[i].storeType == "GROCERY" || data[i].storeType == "MEDICINE") {
      if (!isDeliveryServiceAdd && deliveryService.length > 0) {
        isDeliveryServiceAdd = true
        result.push({
          isHaveSubModule: true,
          label: "Delivery Service",
          isDeliveryService: true,
          "storeTypeImage": {
            "_id": "66220e0cffb61c0b6b24b894",
            "date_created": "2024-04-19T05:42:09.779Z",
            "date_created_utc": "2024-04-19T05:42:09.779Z",
            "link": "https://bok-superapp.s3.us-east-2.amazonaws.com/1713785249094Group%2037078%281%29.png",
            "meta_data": []
          }
        })
      }
    } else if (data[i].storeType == "TAXI" || data[i].storeType == "CARRENTAL") {
      if (!isTranpotationServiceAdd && transapotationService.length > 0) {
        isTranpotationServiceAdd = true
        result.push({
          isHaveSubModule: true,
          isTranpotationService: true,
          label: "Transportation Services",
          "storeTypeImage": {
            "_id": "66220e0cffb61c0b6b24b894",
            "date_created": "2024-04-19T05:42:09.779Z",
            "date_created_utc": "2024-04-19T05:42:09.779Z",
            "link": "https://bok-superapp.s3.us-east-2.amazonaws.com/1713785285021Group%2037069.png",
            "meta_data": []
          }
        })
      }
    } else if (data[i].storeType == "SERVICEPROVIDER") {
      data[i].isHaveSubModule = false
      result.push(data[i])
    }
  }
  return result
}

async function topMerchants(data, storeTypeId, store, resdataStoreType) {
  let pageOptions = {
    page: parseInt(data.page) || 1,
    limit: parseInt(data.limit) || 5,
  };
  let skip = (pageOptions.page - 1) * pageOptions.limit;
  let sort = { isVendorAvailable: -1, avgRating: -1, _id: -1 };
  let radius = Number(env.SEARCH_RADIUS);
  let unit = store.distanceUnit ? store.distanceUnit : "km";
  radius = helper.getDeliveryArea(radius, unit);
  const customerLocation = {
    type: "Point",
    coordinates: [
      Number(data.customerLocation.lng),
      Number(data.customerLocation.lat),
    ],
  };
  let obj = {};
  obj.onlineStatus = "online";
  obj.status = "approved";
  obj.role = "VENDOR";
  let deliveryService = await resdataStoreType.filter((item) => {
    return item.storeType == "FOOD" || item.storeType == "BAKERY" || item.storeType == "GROCERY" || item.storeType == "MEDICINE"
  })
  let transapotationService = await resdataStoreType.filter((item) => {
    return item.storeType == "TAXI" || item.storeType == "CARRENTAL"
  })
  if (data.isDeliveryService) {
    storeTypeId = deliveryService.map((item) => ObjectId(item._id));
  } else if (data.isTranpotationService) {
    storeTypeId = transapotationService.map((item) => ObjectId(item._id));
  }
  obj.storeType = { $in: storeTypeId };
  let resdata = await User.aggregate(
    [
      {
        $geoNear: {
          near: customerLocation,
          distanceField: "distance",
          key: "userLocation",
          spherical: true,
          maxDistance: radius,
          query: obj,
          distanceMultiplier: 0.001
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: pageOptions.limit },
      {
        $lookup: {
          from: "cuisines",
          localField: "cuisines",
          foreignField: "_id",
          as: "cuisines",
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "profileImage",
          foreignField: "_id",
          as: "profileImage",
        },
      },
      {
        $lookup: {
          from: "storetypes",
          localField: "storeType",
          foreignField: "_id",
          as: "storeType",
        },
      },
      {
        $addFields: {
          jeoId: {
            $cond: { if: "$geoFence", then: "$geoFence", else: [] },
          },
        },
      },
      {
        $lookup: {
          from: "geofences",
          let: { jeodata: "$jeoId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$status", "active"] },
                    {
                      $in: ["$_id", "$$jeodata"],
                    },
                  ],
                },
              },
            },
          ],
          as: "geoData",
        },
      },
      { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$profileImage",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "storeType.label": 1,
          "storeType.storeType": 1,
          "storeType._id": 1,
          name: 1,
          isVendorAvailable: 1,
          timeSlot: 1,
          profileImage: 1,
          cuisines: { name: 1 },
          address: 1,
          pricePerPerson: 1,
          minOrderAmont: 1,
          distance: { $round: ["$distance", 1] },
          avgRating: 1,
          reviewCount: 1,
          orderPreparationTime: 1,
          geoFence: "$geoData",
        },
      },
    ])
  if (resdata && resdata.length == 0) {
    return []
  } else {
    await Promise.all(
      resdata.map(async (element) => {
        let vendorOpenClose = helper.getVendorOpenCloseStatus(
          element.isVendorAvailable,
          element.timeSlot,
          new Date(),
          store.timezone
        );
        UserObj = {
          customerLocation: customerLocation.coordinates,
          unit: unit,
        };
        element["vendorOpenClose"] = vendorOpenClose.status;
        if (vendorOpenClose.status == "Close") {
          element["isOpen"] = false;
        } else {
          element["isOpen"] = true;
        }
        if (element.hasOwnProperty("geoFence")) {
          let geofence = await geofencingFun.globalVenderCheck(
            UserObj,
            element
          );
          if (geofence && !geofence.isAccepteOrder) {
            element["vendorOpenClose"] = "Close";
            element["isUnderGeofence"] = false;
            console.log("geoFence close vendor", element.name);
          } else {
            element["isUnderGeofence"] = true;
          }
        }
        delete element.timeSlot;
        delete element.isVendorAvailable;
      })
    );
    resdata = await resdata.filter((element) => {
      return (
        element.hasOwnProperty("geoFence") && element.isUnderGeofence
      );
    });
    resdata.sort((a, b) => {
      return Number(b.isOpen) - Number(a.isOpen);
    });
    //console.log("resdata------------>>>>", JSON.stringify(resdata))
    return resdata
  }


}