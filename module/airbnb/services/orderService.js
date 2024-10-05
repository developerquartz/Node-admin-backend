const productVariationTable = require('../../../models/productVariationTable');
const Product = require('../../../models/productsTable');
const emailService = require("./emailService");
const deliveryRequest = require('../utility/deliveryRequest');
const Order = require('../../../models/ordersTable');
const moment = require('moment');

let generateLineItems = async (items, storeType) => {

    let generateData = { isValidItem: false, line_items: [], itemTotal: 0 };
    let data = {};
    data = await generateFoodLineItems(items);

    return { ...data };
}

let generateFoodLineItems = async (items) => {
    let isValidItem = false;
    let line_items = [];
    let itemTotal = 0;

    for (let index in items) {
        let element = items[index];

        if (element._id) {
            let getItem = await Product.getProductByIdAsync(element._id);

            if (getItem === null) {
                isValidItem = true;
                break;
            }

            let obj = {};
            obj.product = getItem._id;
            obj.name = getItem.name;
            obj.productImage = (getItem.featured_image && getItem.featured_image.link) || "";
            obj.price = getItem.price;
            obj.quantity = Number(element.quantity);
            let addonPrice = 0;

            if (element.addons != undefined) {
                if (element.addons.length > 0) {
                    let addons = element.addons
                    for (let elements in addons) {
                        let options = addons[elements].options
                        if (options.length) {
                            for (ele in options) {
                                if (options[ele].isSelected) {
                                    addonPrice = addonPrice + Number(options[ele].price);
                                }
                            }
                            // elements.options.forEach(ele => {
                            //     if (ele.isSelected) {
                            //         addonPrice = addonPrice + Number(ele.price);
                            //     }
                            // })
                        }
                    }
                    // element.addons.forEach(elements => {
                    //     if (elements.options.length) {
                    //         elements.options.forEach(ele => {
                    //             if (ele.isSelected) {
                    //                 addonPrice = addonPrice + Number(ele.price);
                    //             }
                    //         })
                    //     }
                    //     // addonPrice = addonPrice + Number(elements.price);
                    // });
                    obj.addons = element.addons;
                } else {
                    obj.addons = [];
                }
            } else {
                obj.addons = [];
            }
            let lineItemTotal = helper.roundNumber(obj.price + addonPrice);
            let lineTotal = helper.roundNumber(lineItemTotal * obj.quantity);
            obj.lineTotal = lineTotal;

            itemTotal = itemTotal + lineTotal;

            line_items.push(obj);
        }

    }

    return { isValidItem: isValidItem, line_items: line_items, itemTotal };
}
let beforeRequestSendToVendor = async (store, storeType, order, vendor, user) => {
    try {
        // if (store.orderAutoApproval && vendor.orderAutoApproval) {
        //     deliveryRequest.autoAcceptRequestByRestaurant(order._id)
        // } else {
        //     deliveryRequest.afterOrderSuccess(order._id, user, storeType, order.store);
        // }
        deliveryRequest.sendBookinNotificationToVendor(store, storeType, order, vendor, user);
        deliveryRequest.afterOrderSuccess(store, storeType, order, user);
        emailService.userOrderConfEmail(user, store, order, vendor);
        emailService.vendorNewOrderEmail(user, vendor, store, order);
    } catch (error) {
        console.log("beforeRequestSendToVendor err", error);
    }
}

let afterWebviewPaymentSuccess = async (data) => {
    let id = data.id;
    let transactionDetailsObj = data.transactionDetails ? { transactionDetails: data.transactionDetails } : {}
    let getOrder = await Order.findOneAndUpdate({ customOrderId: id }, { orderStatus: "pending", paymentStatus: "success", ...transactionDetailsObj })
        .populate({ path: "user", select: 'name email' })
        .populate({ path: "vendor", select: 'name email orderAutoApproval orderAutoCancel' })
        .populate({ path: "storeType", select: 'vendorWaitTime' })
        .populate({
            path: "store",
            select: 'storeName logo currency mailgun domain storeOrderAutoApproval',
            populate: {
                path: "logo",
                select: "link",
            }
        })
        .exec();

    beforeRequestSendToVendor(getOrder.store, getOrder.storeType, getOrder, getOrder.vendor, getOrder.user);
}
let generateAirbnbLineItems = async (item, data) => {
    let isValidItem = false;
    let itemTotal = 0;
    let validVendor = false;

    let getItem = await Product.getProductByIdNew(item);
    if (!getItem) {
        isValidItem = true;
        return { isValidItem };
    }
    if (getItem.vendor._id.toString() != data.vendor) validVendor = true;

    getItem.pricingTypeCount = await getHoursDayDiffByDate(data, getItem.pricingType || "day");
    itemTotal += helper.roundNumber(getItem.price * getItem.pricingTypeCount);


    return { isValidItem: isValidItem, validVendor, line_items: getItem, itemTotal };
}
let getHoursDayDiffByDate = async (data, pricingType) => {
    let type = ["day", "hours"];
    if (!type.includes(pricingType)) pricingType = "day";
    let diffDay = moment(new Date(data.checkOutDate)).diff(moment(new Date(data.checkInDate)), pricingType);
    diffDay = diffDay == 0 ? 1 : diffDay;
    return diffDay;
}
module.exports = {
    generateLineItems,
    beforeRequestSendToVendor,
    afterWebviewPaymentSuccess,
    generateAirbnbLineItems
}