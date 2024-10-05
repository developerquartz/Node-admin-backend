const admin = require('firebase-admin');

module.exports = {

    sendPushNotificationCustomer: (title, body, registrationToken, cdata) => {
        const payload = {
            notification: {
                title: title,
                body: body,
                sound: "default",
            },
            data: JSON.stringify(cdata)
        };

        if (registrationToken != undefined && registrationToken != '' && registrationToken != null && registrationToken != "none") {

            admin.messaging().sendToDevice(registrationToken, payload)
                .then((response) => {
                    // Response is a message ID string.
                    //console.log(title + ' firebase sent message:', response);
                })
                .catch((error) => {
                    //console.log('Firebase Error sending message:', error);
                });
        }
    },

    sendPushNotificationDriver: (title, body, registrationToken, cdata) => {

        const driverFDB = app.get("driverFDB");

        const payload = {
            notification: {
                title: title,
                body: body,
                sound: "default",
            },
            data: JSON.stringify(cdata)
        };

        if (registrationToken != undefined && registrationToken != '' && registrationToken != null && registrationToken != "none") {

            admin.messaging(driverFDB).sendToDevice(registrationToken, payload)
                .then((response) => {
                    // Response is a message ID string.
                    //console.log(title + ' firebase sent message:', response);
                })
                .catch((error) => {
                    //console.log('Firebase Error sending message:', error);
                });
        }
    },

    sendPushNotificationRestaurant: (title, body, registrationToken, cdata) => {

        const restaurantFDB = app.get("restaurantFDB");

        const payload = {
            notification: {
                title: title,
                body: body,
                sound: "default"
            }
        };

        if (registrationToken != undefined && registrationToken != '' && registrationToken != null && registrationToken != "none") {

            admin.messaging(restaurantFDB).sendToDevice(registrationToken, payload)
                .then((response) => {
                    // Response is a message ID string.
                    // console.log(title + ' firebase sent message:', response);
                })
                .catch((error) => {
                    // console.log('Firebase Error sending message:', error);
                });
        }
    },

    sendBatchNotification: async (messages, role, keys) => {

        let codelength = 4;
        let ranNum = Math.floor(Math.random() * (Math.pow(10, (codelength - 1)) * 9)) + Math.pow(10, (codelength - 1));

        let FDB = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: keys.FCM_PROJECTID, // I get no error here
                clientEmail: keys.FCM_CLIENT_EMAIL, // I get no error here
                privateKey: keys.FCM_PRIVATE_KEY.replace(/\\n/g, '\n') // NOW THIS WORKS!!!
            }),
        }, 'abatch' + new Date().getTime() + ranNum.toString());

        let sendRecord = await admin.messaging(FDB).sendAll(messages)
        //console.log("pushNotifiction:=========>", JSON.stringify(sendRecord));
        //console.log("keys:==>", keys);
        if (sendRecord) {
            console.log(sendRecord.successCount + ' messages were sent successfully\n', sendRecord.failureCount + ' messages were failed');
            return { successCount: sendRecord.successCount, failureCount: sendRecord.failureCount }
        }
        else {
            return { successCount: 0, failureCount: messages.length }
        }
    },

    sendPushToAll: (firebaseTokens, title, body, fcmData, keys) => {
        try {
            let messages2 = [];
            let finalfirebaseTokens = [...new Set(firebaseTokens.map(item => item.token))];
            finalfirebaseTokens.forEach(token => {
                if (token) {
                    messages2.push({
                        "notification":
                        {
                            "title": title,
                            "body": body,
                            //  "sound": "default"
                        },
                        "token": token,
                        "data": JSON.parse(JSON.stringify(fcmData)),
                        "android": {
                            "priority": "high",
                            "notification": {
                                "sound": "default",
                                "channel_id": "default"
                            }
                        },
                        "apns": {
                            "payload": {
                                "aps": {
                                    "sound": "default"
                                }
                            }
                        }
                    });
                }
            });
            if (messages2.length > 0) {
                module.exports.sendBatchNotification(messages2, "USER", keys);
            }
        } catch (error) {
            console.log("sendPushToAll err", error);
        }
    }
}