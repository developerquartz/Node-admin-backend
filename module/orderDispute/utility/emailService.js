const ObjectId = require("objectid")
const mailgunSendEmail = require("../../../lib/mailgunSendEmail")
const User = require("../../../models/userTable")
const Template = require("../../../models/templateTable")
const Store = require("../../../models/storeTable")
const { productTemplate } = require("../../../helper/emailTemplateHtml/getVendorTemplates")

module.exports = {

    createDisputeEmail: async (user,data,store,order) => {
        try {
            const admin=store
            const getUser = user

            let to = admin.supportEmail

            const getStore=store
            if (!getStore) return console.log("Invalid Store")
            const getTemplate = await Template.findOne({
                store: ObjectId(admin.storeId),
                constant: "NEW_DISPUTE",
                status: "active",
            })

            if (!getTemplate)
                return console.log(
                    "create dispute templete not found on this store",
                    getUser.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[customerName\]/g, getUser.name)

            let body = getTemplate.body

            body = body.replace(/\[adminName\]/g, getStore.storeName)
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[type\]/g, data.disputeWith)
            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user order delivered email ", err)
        }
    }
}
