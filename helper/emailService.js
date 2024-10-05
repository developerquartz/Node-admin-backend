const ObjectId = require("objectid")
const mailgunSendEmail = require("../lib/mailgunSendEmail")
const User = require("../models/userTable")
const Template = require("../models/templateTable")
const Store = require("../models/storeTable")
const { productTemplate, getSlipTemplate, pdfproductTemplate } = require("./emailTemplateHtml/getVendorTemplates")
let { generatePdf } = require('../helper/generatePdf')

module.exports = {

    storeRegisterEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                type: "superadmin",
                constant: "STORE_SIGNUP_WELCOME_EMAIL",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No user register template in store ", user.store)

            let subject = getTemplate.subject
            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user register email ", err)
        }
    },

    storeRegisterEmailPaid: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                type: "superadmin",
                constant: "STORE_SIGNUP_WELCOME_EMAIL_PAID",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No user register template in store ", user.store)

            let subject = getTemplate.subject
            let body = getTemplate.body

            body = body.replace(/\[storeName\]/g, getStore.storeName)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user register email ", err)
        }
    },

    userRegisterEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "USER_REGISTER",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No user register template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            // body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[listings url\]/g, getStore.domain)

            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[customerName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user register email ", err)
        }
    },

    userLoginOtpEmail: async (user, store) => {
        if (!user) return
        try {
            let to = user.email
            const getStore = await Store.findById(ObjectId(store.storeId)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(store.storeId),
                constant: "USER_LOGIN_OTP",
                // constant:"USER_REGISTER",
                status: "active",
            })
            // console.log("getStore ", getStore);
            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No template found in store ",
                    user.store._id
                )
            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)
            let body = getTemplate.body
            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[OTP\]/g, user.OTP)
            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in driver change password register email ", err)
        }
    },

    userForgotPasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store._id)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store._id),
                constant: "USER_FORGOT_PASSWORD_OTP",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No template in store ",
                    user.store._id
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[userName\]/g, user.name)
            body = body.replace(/\[OTP\]/g, user.OTP)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in driver change password register email ", err)
        }
    },

    userResetPasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "USER_RESET_PASSWORD",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No reset password template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[customerName\]/g, user.name)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user reset password email ", err)
        }
    },

    userChangePasswordEmail: async (user) => {
        if (!user) return
        try {

            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "USER_CHANGE_PASSWORD",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No user change password template in store ",
                    user.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[customerName\]/g, user.name)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in change password register email ", err)
        }
    },

    userOrderConfEmail: async (user, getStore, order, vendor) => {
        try {
            let to = user.email;
            const getTemplate = await Template.findOne({
                store: ObjectId(getStore._id),
                constant: "ORDER_CONFIRMATION",
                status: "active",
            })

            if (!getTemplate)
                return console.log(
                    "No user order confirmation template in store ",
                    getStore._id
                );
            let billingDetails = ""
            if (order.hasOwnProperty("billingDetails")) {
                billingDetails = order.billingDetails.address
            }
            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, vendor ? vendor.name : '')

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
            //getStore.storeName
            body = body.replace(/\[logo\]/g, getStore.logo)
            body = body.replace(/\[storeName\]/g, vendor ? vendor.name : '')
            body = body.replace(/\[vendorName\]/g, vendor ? vendor.name : '')
            body = body.replace(/\[storeAddress\]/g, vendor ? vendor.address : '')
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[orderPlacedAt\]/g, order.date_created_utc)
            body = body.replace(/\[orderStatus\]/g, order.orderStatus)
            body = body.replace(/\[customerName\]/g, user.name)
            // body = body.replace(/\[storeAddress\]/g, order.billingDetails.address || "")
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
            console.log("Error in order confirmation register email ", err)
        }
    },

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

            let billingDetails = ""
            if (order.hasOwnProperty("billingDetails")) {
                billingDetails = order.billingDetails.address
            }

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No user order delivered template in store ",
                    getUser.store
                )
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

            generatePdf(body, async (err, result) => {
                console.log("err,result :", err, result);

                if (err)
                    var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
                else {
                    let file = {
                        filename: `order_invoice${order.customOrderId}.pdf`,
                        data: result
                    }

                    var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body, file)
                }
            })

        } catch (err) {
            console.log("Error in user order delivered email ", err)
        }
    },

    userOrderRefundEmail: async (order) => {
        if (!order) return console.log("Order not found in order refund email")
        try {
            const getUser = await User.findById(ObjectId(order.user._id))
            const getVendor = await User.findById(order.vendor._id)

            if (!getUser) return console.log("No user found in order refund email!")

            let to = getUser.email

            const getStore = await Store.findById(ObjectId(getUser.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(getUser.store),
                constant: "ORDER_REFUNDED",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No user order refund template in store ",
                    getUser.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[customerName\]/g, getUser.name)
            body = body.replace(/\[username\]/g, getUser.email)
            body = body.replace(/\[orderNumber\]/g, order.customOrderId)
            body = body.replace(/\[vendorName\]/g, getVendor.name)
            body = body.replace(/\[refundAmount\]/g, order.refundAmount)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in user order refund email ", err)
        }
    },

    /* Driver */
    driverRegisterEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email;

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "DRIVER_REGISTER",
                status: "active",
            })

            //console.log("getTemplate", getTemplate);

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate) {
                return console.log("No driver register template in store ", user.store)
            }

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body;

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[driverName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)
            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body);
        } catch (err) {
            console.log("Error in driver register email ", err)
        }
    },

    driverResetPasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: user.store,
                constant: "DRIVER_RESET_PASSWORD",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No driver reset password template in store ",
                    user.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[driverName\]/g, user.name)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in driver reset password email ", err)
        }
    },

    driverChangePasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store._id)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: user.store._id,
                constant: "DRIVER_CHANGE_PASSWORD",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No driver change password template in store ",
                    user.store._id
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[driverName\]/g, user.name)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in driver change password register email ", err)
        }
    },

    driverForgotPasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "DRIVER_FORGOT_PASSWORD_OTP",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No driver change password template in store ",
                    user.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[driverName\]/g, user.name)
            body = body.replace(/\[OTP\]/g, user.OTP)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in driver change password register email ", err)
        }
    },

    /* Vendor */
    vendorRegisterEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "VENDOR_REGISTER",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No vendor register template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[vendorName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in driver register email ", err)
        }
    },

    vendorResetPasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "VENDOR_RESET_PASSWORD",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No vendor reset password template in store ",
                    user.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[vendorName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in vendor reset password email ", err)
        }
    },

    vendorChangePasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "VENDOR_CHANGE_PASSWORD",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No vendor change password template in store ",
                    user.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[vendorName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in vendor change password register email ", err)
        }
    },

    vendorForgotPasswordEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "VENDOR_FORGOT_PASSWORD_OTP",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log(
                    "No vendor change password template in store ",
                    user.store
                )

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[vendorName\]/g, user.name)
            body = body.replace(/\[OTP\]/g, user.OTP)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in vendor change password register email ", err)
        }
    },

    vendorNewOrderEmail: async (user, vendor, getStore, order) => {
        try {
            let to = vendor.email

            const getTemplate = await Template.findOne({
                store: ObjectId(getStore._id),
                constant: "VENDOR_ORDER_RECIEVED",
                status: "active",
            })

            if (!getTemplate)
                return console.log(
                    "No VENDOR_ORDER_RECIEVED template in store ",
                    getStore._id
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
    },
    adminNewOrderEmail: async (user, vendor, getStore, order) => {
        try {
            let to = getStore.owneremail || getStore.owner.email

            const getTemplate = await Template.findOne({
                store: ObjectId(getStore._id),
                constant: "ADMIN_ORDER_RECIEVED",
                status: "active",
            })

            if (!getTemplate)
                return console.log(
                    "No template in store ",
                    getStore._id
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
            body = body.replace(/\[vendorName\]/g, getStore.storeName)
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
            console.log("Error in admin new order email ", err)
        }
    },
    /* Admin */
    adminApproveDriverEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "ADMIN_APPROVE_DRIVER",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No approve driver template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(
                /\[driverAndroidAppUrl\]/g,
                getStore.appUrl.driver_android_app
            )
            body = body.replace(
                /\[driverIOSAppUrl\]/g,
                getStore.appUrl.driver_ios_app
            )
            body = body.replace(/\[driverName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in approve driver email ", err)
        }
    },

    adminRejectDriverEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "ADMIN_REJECT_DRIVER",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No reject driver template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(
                /\[driverAndroidAppUrl\]/g,
                `<a href="${getStore.appUrl.driver_android_app}" style="color:#00b388;font-weight:600;">Android App</a>`
            )
            body = body.replace(
                /\[driverIOSAppUrl\]/g,
                `<a href="${getStore.appUrl.driver_ios_app}" style="color:#00b388;font-weight:600;">Android App</a>`
            )
            body = body.replace(/\[driverName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in reject driver email ", err)
        }
    },

    adminPayDriverEmail: async (user, data) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "ADMIN_PAY_DRIVER",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No pay driver template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[driverName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[amount\]/g, data.amount)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in pay driver email ", err)
        }
    },

    adminApproveVendorEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "ADMIN_APPROVE_VENDOR",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No approve vendor template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[vendorName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in approve vendor email ", err)
        }
    },

    adminRejectVendorEmail: async (user) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "ADMIN_REJECT_VENDOR",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No reject vendor template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[vendorName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in reject vendor email ", err)
        }
    },

    adminPayVendorEmail: async (user, data) => {
        if (!user) return
        try {
            let to = user.email

            const getStore = await Store.findById(ObjectId(user.store)).populate({
                path: "logo",
            })
            const getTemplate = await Template.findOne({
                store: ObjectId(user.store),
                constant: "ADMIN_PAY_VENDOR",
                status: "active",
            })

            if (!getStore) return console.log("Invalid Store")
            if (!getTemplate)
                return console.log("No pay vendor template in store ", user.store)

            let subject = getTemplate.subject
            subject = subject.replace(/\[storeName\]/g, getStore.storeName)

            let body = getTemplate.body

            body = body.replace(/\[logo\]/g, getStore.logo.link)
            body = body.replace(/\[storeName\]/g, getStore.storeName)
            body = body.replace(/\[supportMobileNumber\]/g, getStore.mobileNumber)
            body = body.replace(/\[supportEmail\]/g, getStore.email)
            body = body.replace(/\[storeDomain\]/g, getStore.domain)
            body = body.replace(/\[vendorName\]/g, user.name)
            body = body.replace(/\[username\]/g, user.email)
            body = body.replace(/\[amount\]/g, data.amount)

            var sendmail = await mailgunSendEmail.sendEmail(getStore.mailgun, to, subject, body)
        } catch (err) {
            console.log("Error in pay vendor email ", err)
        }
    },
    htmlslipdata: async (user, order) => {
        const getStore = await Store.findById(ObjectId(user.store))
        let body = getSlipTemplate()

        const products = order.line_items && order.line_items.map(item => {
            let content = pdfproductTemplate()

            //content = content.replace(/\[productImage\]/g, item.productImage)
            content = content.replace(/\[productName\]/g, item.name)
            content = content.replace(/\[productQuantity\]/g, item.quantity)
            if (item.addons && item.addons.length) {
                content = content.replace(/\[productAddons\]/g, item.addons && item.addons.map(add => `
                <span style="font-weight: 600">
                    ${add.name}${" "}
                    ${getStore.currency.sign}
                    ${add.price}
                    ${", "}
                </span>
        `))
            } else {
                content = content.replace(/\[productAddons\]/g, '')
                content = content.replace(/Addon:/g, '')
            }
            content = content.replace(/\[currency\]/g, getStore.currency.sign)
            content = content.replace(/\[productCost\]/g, item.price)

            return content
        })
        //getStore.storeName
        body = body.replace(/\[customOrderId\]/g, order.customOrderId);
        body = body.replace(/\[customerName\]/g, user.name);
        // body = body.replace(/\[mobileNumber\]/g, user.mobileNumber)
        // body = body.replace(/\[email\]/g, user.email)
        body = body.replace(/\[address\]/g, order.billingDetails ? order.billingDetails.address || "" : "")
        body = body.replace(/\[area\]/g, order.billingDetails ? order.billingDetails.area || "" : "")
        body = body.replace(/\[houseNo\]/g, order.billingDetails ? order.billingDetails.houseNo || "" : "")
        body = body.replace(/\[landmark\]/g, order.billingDetails ? order.billingDetails.landmark || "" : "")
        // body = body.replace(/\[storeAddress\]/g, order.billingDetails.address || "")

        body = body.replace(/\[products\]/g, products)
        body = body.replace(/\[currency\]/g, getStore.currency.sign)
        body = body.replace(/\[productTotal\]/g, order.subTotal)
        body = body.replace(/\[orderAmount\]/g, order.orderTotal)
        body = body.replace(/\[tax\]/g, order.taxAmount || 0)
        body = body.replace(/\[taxAmount\]/g, order.tax || 0)
        body = body.replace(/\[deliveryFee\]/g, order.deliveryFee || 0)
        return body;
    }
}
