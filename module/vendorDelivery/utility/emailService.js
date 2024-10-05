const ObjectId = require("objectid")
const mailgunSendEmail = require("../../../lib/mailgunSendEmail")
const User = require("../../../models/userTable")
const Template = require("../../../models/templateTable")
const Store = require("../../../models/storeTable")

module.exports = {

    userOrderDeliveredEmail: async (order) => {
        if (!order) return console.log("Order not found in order delivered email")
        try {
            const getUser = await User.findById(order.user._id);

            let to = getUser.email

            const getStore = await Store.findById(ObjectId(order.store._id)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(order.store._id),
                constant: "ORDER_DELIVERED",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No user order delivered template in store ",
                    getUser.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            const products = order.line_items && order.line_items.map(item => {
                let content = productTemplate()

                content = content.replace(/\[productImage\]/g, item.productImage)
                content = content.replace(/\[productName\]/g, item.name)
                content = content.replace(/\[productQuantity\]/g, item.quantity)
                content = content.replace(/\[productAddons\]/g, item.addons && item.addons.map(add => `
                    <span>
                        <span className="font-weight-bold text-capitalize">
                            ${add.name}
                        </span>${" "}
                        ${getStore.currency.sign}
                        ${add.price}
                        ${", "}
                    </span>
                `))
                content = content.replace(/\[currency\]/g, getStore.currency.sign)
                content = content.replace(/\[productCost\]/g, item.price)

                return content
            })

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[orderPlacedAt\]/g, order.date_created_utc)
            body = body.replace(/\[orderStatus\]/g, order.orderStatus)
            body = body.replace(/\[customerName\]/g, getUser.name)
            if (order.billingDetails) {
                body = body.replace(/\[customerAddress\]/g, order.billingDetails.address || "")
            }
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[products\]/g, products)
            body = body.replace(/\[currency\]/g, getStore.currency.sign)
            body = body.replace(/\[productTotal\]/g, order.subTotal)
            body = body.replace(/\[tax\]/g, order.taxAmount)
            body = body.replace(/\[taxAmount\]/g, order.tax)
            body = body.replace(/\[tip\]/g, order.tip || 0)
            body = body.replace(/\[tipAmount\]/g, order.tipAmount || 0)
            body = body.replace(/\[deliveryFee\]/g, order.deliveryFee)
            body = body.replace(/\[orderAmount\]/g, order.orderTotal)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user order delivered email ", err)
        }
    }
}
