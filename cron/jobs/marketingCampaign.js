const Campaign = require('../../module/marketing/compaignTable');
const Push = require('../../helper/pushNotification');
const User = require('../../models/userTable');
const Order = require('../../models/ordersTable');
const analytics = require('../../module/marketing/analytics')

module.exports = (agenda) => {
    agenda.define('store campaign', { priority: 'high', concurrency: 10 }, async function (job, done) {
        let data = job.attrs.data;
        console.log("cron store campaign", data);
        try {
            if (data.id) {
                const getCampaign = await Campaign.findById(data.id).populate('template').populate({ path: 'store', select: 'storeName slug mailgun twilio firebase storeType' }).exec();
                if (getCampaign != null) {
                    if (getCampaign.status === "active") {
                        console.log("getCampaign", getCampaign);
                        const getAudiances = await getAudiance(getCampaign);
                        console.log("getAudiances", getAudiances);
                        if (getAudiances.length > 0) {
                            switch (getCampaign.template.type) {
                                case 'email':
                                    sendCampaignEmail(getAudiances, getCampaign);
                                    break;
                                case 'sms':
                                    sendCampaignSMS(getAudiances, getCampaign);
                                    break;
                                case 'push':
                                    sendCampaignPush(getAudiances, getCampaign);
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                }
            }
            done();
        } catch (error) {
            console.log("cron store campaign err", error);
        }
    });
};

async function getAudiance(getCampaign) {
    //console.log("getCampaign data:", getCampaign);

    let obj = {};
    obj.status = getCampaign.audianceType === "USER" ? "active" : "approved"
    obj.role = getCampaign.audianceType;

    if (getCampaign.audianceType != "VENDOR") {
        obj.store = getCampaign.store._id;
    } else {
        obj.storeType = { $in: getCampaign.storeType };
    }

    if (["registeredBefore", "orderBefore"].includes(getCampaign.audianceFilter)) {
        obj.date_created_utc = { $lt: new Date(getCampaign.audianceFilterDate.setHours(0, 0, 0, 0)) }
    } else if (["registeredAfter", "orderAfter"].includes(getCampaign.audianceFilter)) {
        obj.date_created_utc = { $gt: new Date(getCampaign.audianceFilterDate.setHours(0, 0, 0, 0)) }
    }

    let select = 'email';

    if (getCampaign.template.type === "sms") {
        select = 'countryCode mobileNumber';
    }

    if (getCampaign.template.type === "push") {
        select = 'firebaseTokens';
    }
    let getData;
    console.log("obj :", obj);

    if (!["orderAfter", "orderBefore"].includes(getCampaign.audianceFilter))
        getData = await User.find(obj, select).sort({ date_created_utc: -1 });
    else {
        delete obj.role;
        delete obj.status;
        let userIds = await Order.distinct('user', obj)
        getData = await User.find({ _id: { $in: userIds }, status: "active" }, select).sort({ date_created_utc: -1 })
    }

    return getData;
}

async function sendCampaignEmail(getAudiancesdata, getCampaign) {
    getAudiancesdata = [...new Map(getAudiancesdata.map(item => [item["email"], item])).values()]
    if (process.env.NODE_ENV != "production" && getAudiancesdata.length > 5) {
        getAudiancesdata.length = 5
    }

    console.log("getCampaign :", getCampaign);
    let audianceLength = getAudiancesdata.length;

    var chunk = [] // [[{},{}],[{},{}]]
    while (getAudiancesdata.length > 0) {

        chunk.push(getAudiancesdata.splice(0, 999))

    }
    async function getData(item) {

        let recipientVars = {}
        let getEmail = []
        for (let index = 0; index < item.length; index++) {
            const element = item[index];
            recipientVars[element["email"]] = { "id": element["_id"] }
            getEmail.push(element["email"])
        }
        let checkMail = await sendEmail(getCampaign.store.mailgun, getEmail, recipientVars, getCampaign.template.subject, getCampaign.template.body, getCampaign.slug);

    };

    let finalArr = []
    for (let index = 0; index < chunk.length; index++) {
        const element = chunk[index];
        finalArr.push(getData(element))
    }

    await Promise.all(finalArr)

    let notProcessed = 0;
    let resData = { successCount: 0, failureCount: 0, totalCount: audianceLength }
    let analyticsData = await analytics.addCampaignStat(getCampaign, resData, notProcessed)
    await Campaign.findByIdAndUpdate(getCampaign._id, { $set: { logId: analyticsData._id } })
}

async function sendCampaignSMS(getAudiancesdata, getCampaign) {
    sendSMS(getCampaign.store.twilio, getCampaign, getAudiancesdata, getCampaign.template.subject, getCampaign.template.body);
}

async function sendCampaignPush(getAudiancesdata, getCampaign) {
    let messages = [];
    let notProcessed = 0;
    await Promise.all(getAudiancesdata.map(async element => {
        if (element.firebaseTokens && element.firebaseTokens.length > 0) {
            await Promise.all(element.firebaseTokens.map(nElement => {
                if (nElement.token) {
                    messages.push({
                        notification: { title: getCampaign.template ? getCampaign.template.subject : "Subject", body: getCampaign.template ? getCampaign.template.body : "Body" },
                        token: nElement.token
                    });
                }
            }));
        }
        else
            notProcessed++

    }));

    if (messages.length > 0) {
        let resData = await Push.sendBatchNotification(messages, getCampaign.audianceType, getCampaign.store.firebase);
        resData.totalCount = messages.length
        let analyticsData = await analytics.addCampaignStat(getCampaign, resData, notProcessed)

        await Campaign.findByIdAndUpdate(getCampaign._id, { $set: { logId: analyticsData._id } })

    } else {
        let resData = { successCount: 0, failureCount: 0 }
        resData.totalCount = messages.length

        let analyticsData = await analytics.addCampaignStat(getCampaign, resData, notProcessed)
        await Campaign.findByIdAndUpdate(getCampaign._id, { $set: { logId: analyticsData._id } })
    }

}

async function sendEmail(mailgunKey, to, recipientVars, sub, msg, tag) {
    try {

        let from = env.mailgun.MAILGUN_FROM;
        let api_key = env.mailgun.MAILGUN_API_KEY;
        let domain = env.mailgun.MAILGUN_DOMAIN;

        if (mailgunKey != undefined && mailgunKey != {}) {
            from = mailgunKey.MAILGUN_FROM;
            api_key = mailgunKey.MAILGUN_API_KEY;
            domain = mailgunKey.MAILGUN_DOMAIN;
        }

        const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });
        // to.length = 5 //fxed the array size
        let data = {
            from: from,
            to: to.toString(),
            subject: sub || "",
            html: `<div class="es-wrapper-color" style="background-color: #f2f4f6;">${msg}</div>`,
            'recipient-variables': JSON.stringify(recipientVars),
            "o:tag": [tag]
        };
        let mailData = await mailgun.messages().send(data)
        console.log("mailData: ", mailData);

        if (mailData)
            return true;
        else
            return false;

    } catch (error) {
        console.log('Mail gun error data', error);
        return false;
    }
}

async function sendSMS(twilioKey, getCampaign, getAudiancesdata, title, body) {
    let from = env.twilio.twilioFrom;
    let accountSid = env.twilio.accountSid;
    let authToken = env.twilio.authToken;

    if (twilioKey != undefined && twilioKey != {}) {
        accountSid = twilioKey.accountSid;
        authToken = twilioKey.authToken;
        from = twilioKey.twilioFrom
    }

    let numbers = [];
    let notProcessed = 0;

    getAudiancesdata.forEach(element => {
        if (element.countryCode && element.mobileNumber) {
            numbers.push(element.countryCode + element.mobileNumber);
        }
        else
            notProcessed++;
    });

    if (numbers.length > 0) {
        if (process.env.NODE_ENV != "production" && numbers.length > 5) {
            numbers.length = 5 //fixed the array size
        }
        let client = require('twilio')(accountSid, authToken);
        //const service = await client.messaging.services.create({ friendlyName: title });
        let failureCount = 0;
        //console.log("numbers :", numbers);
        //console.log("service :", service);

        let smsData = await Promise.all(
            numbers.map(async number => {
                try {
                    return await client.messages.create({
                        to: number,
                        from: from,
                        body: body
                    });
                } catch (error) {
                    console.log("error msg : ", error);

                    failureCount++;
                }

            })
        )
        if (smsData) {
            console.log("smsData :", smsData);

            let resData = { successCount: numbers.length - failureCount, failureCount: failureCount }
            resData.totalCount = numbers.length

            let analyticsData = await analytics.addCampaignStat(getCampaign, resData, notProcessed)
            await Campaign.findByIdAndUpdate(getCampaign._id, { $set: { logId: analyticsData._id } })

        }
    }
}