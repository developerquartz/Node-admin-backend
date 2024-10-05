const ObjectId = require("objectid")
const mailgunSendEmail = require("../../../lib/mailgunSendEmail")
const User = require("../../../models/userTable")
const Template = require("../../../models/templateTable")
const Card = require('../../../models/cardTable');
const Store = require("../../../models/storeTable")
const { productTemplate } = require("../../../helper/emailTemplateHtml/getVendorTemplates")
const driverVehicle = require('../models/driverVehicleTable')

module.exports = {

    userOrderDeliveredEmail: async (order) => {
        if (!order) return console.log("Order not found in order delivered email")
        try {
            const getUser = await User.findById(order.user)
            const getVendor = await User.findById(order.vendor)

            let to = getUser.email

            const getStore = await Store.findById(ObjectId(getUser.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(getUser.store),
                constant: "ORDER_DELIVERED",
                status: "active",
            })
            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No user order delivered template in store ",
                    getUser.store
                )

            let billingDetails = ""
            if (order.hasOwnProperty("billingDetails")) {
                billingDetails = order.billingDetails.address
            }
            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, order.vendor.name)

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
            body = body.replace(/\[storeName\]/g, order.vendor.name)
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[orderPlacedAt\]/g, order.date_created_utc)
            body = body.replace(/\[orderStatus\]/g, order.orderStatus)
            body = body.replace(/\[customerName\]/g, getUser.name)
            body = body.replace(/\[customerAddress\]/g, billingDetails)
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
    },
    userTripCompletedEmail: async (order) => {
        if (!order) return console.log("Order not found in order delivered email")
        try {
            // console.log("tripDetails:===============>", order)
            const getUser = await User.findById(order.user)
            let to = getUser.email

            const getStore = await Store.findById(ObjectId(getUser.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(getUser.store),
                constant: "TRIP_COMPLETED_CUSTOMER",
                status: "active",
            })
            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No user trip completed template in store ",
                    getUser.store
                )

            let paymentMethod
            if (order.paymentMethod == "cod") {
                paymentMethod = "Cash"
            } else if (order.paymentMethod == "wallet") {
                paymentMethod = "Wallet"
            } else {
                const getCard = await Card.getCardByIdAsync(order.paymentSourceRef);
                paymentMethod = `Card XXXXXX${getCard.last4digit}`

            }
            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body
            let message = `You rode with`;
            let driverName = helper.capitalize(order.driver.name);
            let customerName = helper.capitalize(getUser.name);

            body = body.replace(/\[message\]/g, message)

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[orderPlacedAt\]/g, order.date_created_utc)
            //body = body.replace(/\[orderStatus\]/g, order.orderStatus)
            body = body.replace(/\[customerName\]/g, customerName)
            body = body.replace(/\[driverName\]/g, driverName)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[currency\]/g, getStore.currency.sign)

            body = body.replace(/\[discount\]/g, order.discountTotal || 0)
            body = body.replace(/\[subTotal\]/g, order.subTotal)
            body = body.replace(/\[orderTotal\]/g, order.orderTotal)
            body = body.replace(/\[paymentMode\]/g, paymentMethod)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user trip completed email ", err)
        }
    },
    driverTripCompletedEmail: async (order) => {
        if (!order) return console.log("Order not found in order delivered email")
        try {
            // console.log("tripDetails:===============>", order)
            const getDriver = await User.findById(order.driver._id);

            let to = getDriver.email;

            const getStore = await Store.findById(ObjectId(getDriver.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(getDriver.store),
                constant: "TRIP_COMPLETED_DRIVER",
                status: "active",
            })
            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No user trip completed template in store ",
                    getDriver.store
                )
            let paymentMethod
            if (order.paymentMethod == "cod") {
                paymentMethod = "Cash"
            } else if (order.paymentMethod == "wallet") {
                paymentMethod = "Wallet"
            } else {
                const getCard = await Card.getCardByIdAsync(order.paymentSourceRef);
                paymentMethod = `**** ${getCard.last4digit} Card`
            }
            console.log("PaymentMode----", paymentMethod)
            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body
            let message = `Trip by`;
            let driverName = helper.capitalize(order.user.name);
            let customerName = helper.capitalize(order.driver.name);
            body = body.replace(/\[message\]/g, message)

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[orderPlacedAt\]/g, order.date_created_utc)
            //body = body.replace(/\[orderStatus\]/g, order.orderStatus)
            body = body.replace(/\[customerName\]/g, customerName)
            body = body.replace(/\[driverName\]/g, driverName)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[currency\]/g, getStore.currency.sign)
            body = body.replace(/\[discount\]/g, order.discountTotal || 0)
            body = body.replace(/\[subTotal\]/g, order.subTotal)
            body = body.replace(/\[orderTotal\]/g, order.orderTotal)
            body = body.replace(/\[paymentMode\]/g, paymentMethod)
            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user trip completed email ", err)
        }
    }
}
