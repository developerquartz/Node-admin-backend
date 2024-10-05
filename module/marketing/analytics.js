const Campaign = require('./compaignTable');
const logTable = require('../../models/logTable');
const moment = require('moment');

module.exports = {
    addCampaignStat: async (getCampaign,resData,notProcessedAudiance) => {
        try {
        let totalMessage = resData.totalCount
        let obj = {
            campaignId:getCampaign._id,
            successCount:resData.successCount,
            failureCount:resData.failureCount,
            analyticPercentage:isNaN((resData.successCount/totalMessage)*100) ? 0 : ((resData.successCount/totalMessage)*100).toFixed(2),
            notProcessed:notProcessedAudiance,
            totalCount:totalMessage,
            isLogCompleted: (getCampaign.template && getCampaign.template.type === "email" && totalMessage != resData.successCount + resData.failureCount) ? false : true,
            type: "CAMPAIGN",
            id: getCampaign.store._id,
            idType: "stores",
            message: "Send Campaign marketing notification",
            notes: "Marketing notification sent!",
            status: 'success' ,
            meta_data: [{ key: "storeName", value: getCampaign.store.storeName }, { key: "slug", value: getCampaign.store.slug }]
        }
        let logData =  await logTable.addLogAsync(obj);
        console.log("log :",logData);
        
        return logData;
    } catch (error) {
            
    }
    },
    getMailgunStats: async (mailgunKey,getCampaign) => {
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
        var DATE_RFC2822 = "ddd, DD MMM YYYY HH:mm:ss";
        
        let date = new Date(getCampaign.date_modified_utc.setHours(0,0,0,0));
        let startDate = moment(new Date(date)).format(DATE_RFC2822).toString() + " UTC"
        let endDate = moment(new Date(new Date().setHours(0,0,0,0))).format(DATE_RFC2822).toString() + " UTC"

  console.log("startDate :",startDate);
  console.log("endDate :",endDate);

        let mailgunStats = await mailgun.get(`/${domain}/tags/${getCampaign.slug}/stats`, {"event": ['accepted', 'delivered', 'failed'], "duration": '1m',"start":startDate,"end":endDate})
        console.log("stats :",mailgunStats);
        if(mailgunStats)
        return { status :true, stats: mailgunStats}
        else
        return { status :false, stats: {}}
        
    } catch (error) {
        console.log("analyticsData error:",error);
        
        return { status :false, stats: {}}

    }
    }
    
}