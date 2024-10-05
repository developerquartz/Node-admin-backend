const twilio = require("twilio");
const Otp = require('../models/otp');

module.exports.generateOTP = function () {
  let codelength = 4;
  return (
    Math.floor(Math.random() * (Math.pow(10, codelength - 1) * 9)) +
    Math.pow(10, codelength - 1)
  );
};

module.exports.sendOtpSMSCallback = async function (twilioKey, data, callback) {
  try {
    let from = env.twilio.twilioFrom;
    let accountSid = env.twilio.accountSid;
    let authToken = env.twilio.authToken;
    let invalitwilio = false;
    for (i in twilioKey) {
      if (
        !twilioKey[i] ||
        twilioKey[i] == "null" ||
        twilioKey[i] == "undefined"
      ) {
        invalitwilio = true;
        break;
      }
    }
    if (twilioKey != undefined && twilioKey != {} && !invalitwilio) {
      from = twilioKey.twilioFrom;
      accountSid = twilioKey.accountSid;
      authToken = twilioKey.authToken;
    }

    // console.log(from, accountSid, authToken);

    var client = new twilio(accountSid, authToken);
    const service = await client.verify.services.create({
      friendlyName: data.storeName,
      codeLength: 4,
    });

    var VERIFICATION_SID = service.sid;

    client.verify.services(VERIFICATION_SID)
      .verifications
      .create({
        to: data.countryCode + data.mobileNumber,
        channel: 'sms'
      }, callback);
    // let respnse = await client.verify
    //   .services(VERIFICATION_SID)
    //   .verifications.create({
    //     to: data.countryCode + data.mobileNumber,
    //     channel: "sms",
    //   });
  } catch (error) {
    console.log("error :", error);
    callback("TWILIO_NOT_WORKING", {});
  }
};

module.exports.sendOtpSMSTwilio = async function (twilioKey, data) {
  try {
    let from = env.twilio.twilioFrom;
    let accountSid = env.twilio.accountSid;
    let authToken = env.twilio.authToken;
    let invalitwilio = false;
    for (i in twilioKey) {
      if (
        !twilioKey[i] ||
        twilioKey[i] == "null" ||
        twilioKey[i] == "undefined"
      ) {
        invalitwilio = true;
        break;
      }
    }
    if (twilioKey != undefined && twilioKey != {} && !invalitwilio) {
      from = twilioKey.twilioFrom;
      accountSid = twilioKey.accountSid;
      authToken = twilioKey.authToken;
    }

    // console.log(from, accountSid, authToken);

    var client = new twilio(accountSid, authToken);
    const service = await client.verify.services.create({
      friendlyName: data.storeName,
      codeLength: 4,
    });

    var VERIFICATION_SID = service.sid;

    let twilio_response = await client.verify.services(VERIFICATION_SID)
      .verifications
      .create({
        to: data.countryCode + data.mobileNumber,
        channel: 'sms'
      });
    console.log('Twilio message sent successfully');
    return { status: true, data: twilio_response };
  } catch (error) {
    console.log("send_Otp_SMS_Twilio error :", error);
    // callback("TWILIO_NOT_WORKING", {});
  }
};

module.exports.sendOtpSMSTwilio_OTP = async function (twilioKey, data) {
  try {
    let from = env.twilio.twilioFrom;
    let accountSid = env.twilio.accountSid;
    let authToken = env.twilio.authToken;
    let invalitwilio = false;
    for (i in twilioKey) {
      if (!twilioKey[i] || twilioKey[i] == "null" || twilioKey[i] == "undefined") {
        invalitwilio = true;
        break;
      }
    }
    if (twilioKey != undefined && twilioKey != {} && !invalitwilio) {
      from = twilioKey.twilioFrom;
      accountSid = twilioKey.accountSid;
      authToken = twilioKey.authToken;
    }
    const response = await client.messages.create({
      from: from,
      to: data.countryCode + data.mobileNumber,
      body: data.message,
    });
    console.log('Twilio message sent successfully');
    return { status: true, data: response };
  } catch (error) {
    console.log("error :", error);
  }
};

module.exports.sendOtpSMSVerifyCallback = function (twilioKey, data, callback) {
  let from = env.twilio.twilioFrom;
  let accountSid = env.twilio.accountSid;
  let authToken = env.twilio.authToken;
  let invalitwilio = false;
  for (i in twilioKey) {
    if (
      !twilioKey[i] ||
      twilioKey[i] == "null" ||
      twilioKey[i] == "undefined"
    ) {
      invalitwilio = true;
      break;
    }
  }
  if (twilioKey != undefined && twilioKey != {} && !invalitwilio) {
    from = twilioKey.twilioFrom;
    accountSid = twilioKey.accountSid;
    authToken = twilioKey.authToken;
  }
  var client = new twilio(accountSid, authToken);

  client.verify.services(data.serviceSid).verificationChecks.create(
    {
      to: data.countryCode + data.mobileNumber,
      code: data.OTP,
    },
    callback
  );
};

module.exports.sendOtpSMSVerify = async function (twilioKey, data) {
  let from = env.twilio.twilioFrom;
  let accountSid = env.twilio.accountSid;
  let authToken = env.twilio.authToken;
  let invalitwilio = false;
  for (i in twilioKey) {
    if (
      !twilioKey[i] ||
      twilioKey[i] == "null" ||
      twilioKey[i] == "undefined"
    ) {
      invalitwilio = true;
      break;
    }
  }
  if (twilioKey != undefined && twilioKey != {} && !invalitwilio) {
    from = twilioKey.twilioFrom;
    accountSid = twilioKey.accountSid;
    authToken = twilioKey.authToken;
  }
  var client = new twilio(accountSid, authToken);

  let response = await client.verify.services(data.serviceSid).verificationChecks.create(
    {
      to: data.countryCode + data.mobileNumber,
      code: data.OTP,
    });
  return response;
};

module.exports.sendSMS = (user, vendor, store, order) => {
  let from =
    store.twilio && store.twilio.twilioFrom
      ? store.twilio.twilioFrom
      : env.twilio.twilioFrom;
  let accountSid =
    store.twilio && store.twilio.accountSid
      ? store.twilio.accountSid
      : env.twilio.accountSid;
  let authToken =
    store.twilio && store.twilio.authToken
      ? store.twilio.authToken
      : env.twilio.authToken;
  let message = `You have received new order from : ${user.name}.\nOrder Summary:\norderNumber:${order.customOrderId},\nOrder placed at:${order.date_created_utc}`;
  console.log("store twilio: ", store.twilio);
  console.log(from, accountSid, authToken);
  var client = new twilio(accountSid, authToken);

  client.messages
    .create({
      from: from,
      to: vendor.countryCode + vendor.mobileNumber,
      body: message,
    })
    .then((message) => {
      console.log("message", message);
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports.sendCustomOtp = (item, data, store) => {
  let from =
    store.twilio && store.twilio.twilioFrom
      ? store.twilio.twilioFrom
      : env.twilio.twilioFrom;
  let accountSid =
    store.twilio && store.twilio.accountSid
      ? store.twilio.accountSid
      : env.twilio.accountSid;
  let authToken =
    store.twilio && store.twilio.authToken
      ? store.twilio.authToken
      : env.twilio.authToken;
  let message = `${store.storeName} Update: ${item.line_items[0].itemName
    }... with OTP ${Number(data.otp)} will be delivered today.`;
  console.log("store twilio for sendCustomOtp: ", store.twilio);
  console.log(from, accountSid, authToken);
  var client = new twilio(accountSid, authToken);

  let countryCode = data.countryCode;
  let mobileNumber = item.dropOffDetails.mobileNumber;

  client.messages
    .create({
      from: from,
      to: countryCode + mobileNumber,
      body: message,
    })
    .then((message) => {
      console.log("message", message);
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports.OtpSave = async (data) => {
  let query = {
    store: data.store
  };
  if (data.email && data.email !== "") {
    query.email = data.email;
  } else if (data.mobileNumber && data.countryCode && data.mobileNumber !== "") {
    query.mobileNumber = data.mobileNumber;
    query.countryCode = data.countryCode;
  } else {
    console.error('Invalid or missing data');
    return;
  }
  try {
    const existingOtpData = await Otp.findOne(query);
    if (existingOtpData) {
      await Otp.deleteMany(query);
    }
    await Otp.create({
      otp: data.OTP,
      ...query
    });
    console.log('OTP saved successfully');
  } catch (error) {
    console.error('Error saving OTP:', error);
  }
}

module.exports.OtpVerify = async (data) => {
  const query = {
    store: data.store,
    otp: data.OTP
  };
  if (data.email && data.email !== "") {
    query.email = data.email;
  } else if (data.mobileNumber && data.countryCode && data.mobileNumber !== "") {
    query.mobileNumber = data.mobileNumber;
    query.countryCode = data.countryCode;
  } else {
    console.log("Invalid or missing data");
    return null;
  }
  try {
    console.log("query-----", query)
    const optData = await Otp.findOne(query).lean();
    if (optData) {
      await Otp.deleteMany(query);
      return optData;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return null;
  }
}
