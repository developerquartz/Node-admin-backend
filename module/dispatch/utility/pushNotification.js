module.exports = {

    sendPushNotification: (title, body, registrationToken, cdata, keys) => {
        try {
            const admin = require('firebase-admin');

            //console.log("keys", keys);

            let fcm = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: keys.FCM_PROJECTID, // I get no error here
                    clientEmail: keys.FCM_CLIENT_EMAIL, // I get no error here
                    privateKey: keys.FCM_PRIVATE_KEY.replace(/\\n/g, '\n') // NOW THIS WORKS!!!
                })
            }, 'other' + new Date().getTime());

            const payload = {
                notification: {
                    title: title,
                    body: body,
                    sound: "default"
                },
                data: JSON.parse(JSON.stringify(cdata))
            };

            //console.log("registrationToken", registrationToken);

            if (registrationToken != undefined && registrationToken != '' && registrationToken != null && registrationToken != "none") {

                admin.messaging(fcm).sendToDevice(registrationToken, payload)
                    .then((response) => {
                        // Response is a message ID string.
                        console.log(title + ' firebase sent message:', response);
                    })
                    .catch((error) => {
                        console.log('Firebase Error sending message:', error);
                    });
            }
        } catch (error) {
            console.log("sendPushNotification err", error);
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
                            "body": body
                        },
                        "token": token,
                        "data": JSON.parse(JSON.stringify(fcmData)),
                        "android": {
                            "priority": "high",
                            "notification": {
                                "sound": "default",
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

            //console.log("messages2", messages2);

            if (messages2.length > 0) {
                module.exports.sendBatchNotification(messages2, "USER", keys);
            }
        } catch (error) {
            console.log("sendPushToAll err", error);
        }
    },

    sendBatchNotification: (messages, role, keys) => {
        try {
            const admin = require('firebase-admin');
            let codelength = 4;
            let ranNum = Math.floor(Math.random() * (Math.pow(10, (codelength - 1)) * 9)) + Math.pow(10, (codelength - 1));
            let FDB = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: keys.FCM_PROJECTID, // I get no error here
                    clientEmail: keys.FCM_CLIENT_EMAIL, // I get no error here
                    privateKey: keys.FCM_PRIVATE_KEY.replace(/\\n/g, '\n') // NOW THIS WORKS!!!
                })
            }, 'batch' + new Date().getTime() + ranNum.toString());

            admin.messaging(FDB).sendAll(messages)
                .then((response) => {
                    //console.log("response", response.responses[0].error);
                    console.log(response.successCount + ' messages were sent successfully');
                })
                .catch((error) => {
                    console.log('Firebase Error sending message:', error);
                });
        } catch (error) {
            console.log("sendBatchNotification err", error);
        }
    }
}