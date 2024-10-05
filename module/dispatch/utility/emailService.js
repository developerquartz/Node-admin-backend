const ObjectId = require("objectid")
const mailgunSendEmail = require("../../../lib/mailgunSendEmail")
const Template = require("../../../models/templateTable")
const { productTemplate } = require("../../../helper/emailTemplateHtml/getVendorTemplates")

module.exports = {
    userOrderConfEmail: async (user, getStore, order) => {
        try {
            let to = user.email;
            const getTemplate = await Template.findOne({
                store: ObjectId(getStore.storeId),
                constant: "ORDER_CONFIRMATION",
                status: "active",
            })

            if (!getTemplate)
                return console.log(
                    "No user order confirmation template in store ",
                    getStore.storeId
                );

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

            body = body.replace(/\[logo\]/g, getStore.logo)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[orderPlacedAt\]/g, order.date_created_utc)
            body = body.replace(/\[orderStatus\]/g, order.orderStatus)
            body = body.replace(/\[customerName\]/g, user.name)
            // body = body.replace(/\[storeAddress\]/g, order.billingDetails.address || "")
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
            console.log("Error in order confirmation register email ", err)
        }
    },
    vendorNewOrderEmail: async (user, vendor, getStore, order) => {
        try {
            let to = vendor.email

            const getTemplate = await Template.findOne({
                store: ObjectId(getStore.storeId),
                constant: "VENDOR_ORDER_RECIEVED",
                status: "active",
            })

            if (!getTemplate)
                return console.log(
                    "No VENDOR_ORDER_RECIEVED template in store ",
                    getStore.storeId
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
            body = body.replace(/\[vendorName\]/g, vendor.name)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[storeAddress\]/g, vendor.address)

            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[orderPlacedAt\]/g, order.date_created_utc)
            body = body.replace(/\[orderStatus\]/g, order.orderStatus)
            body = body.replace(/\[customerName\]/g, user.name)
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
            console.log("Error in vendor new order email ", err)
        }
    }
}
