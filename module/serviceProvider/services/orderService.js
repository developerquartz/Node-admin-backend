const productVariationTable = require('../../../models/productVariationTable');
const Product = require('../../../models/productsTable');
const emailService = require("./emailService");
const deliveryRequest = require('../utility/deliveryRequest');
const Order = require('../../../models/ordersTable');
const AddOn = require('../../../models/addonTable')
const ObjectId = require('objectid');
const moment = require('moment');
const sendOrderPlacedNotificationToStore = require("../../../helper/sendOrderPlacedNotificationToStore")


let generateLineItems = async (items, storeType) => {

    let generateData = { isValidItem: false, line_items: [], itemTotal: 0 };
    let data = {};
    data = await generateProviderService(items);

    return { ...data };
}

let generateFoodLineItems = async (items) => {
    let isValidItem = false;
    let line_items = [];
    let service_id = []
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
            obj._id = getItem._id;
            obj.name = getItem.name;
            obj.productImage = (getItem.featured_image && getItem.featured_image.link) || "";
            obj.price = getItem.price;
            obj.compare_price = getItem.compare_price
            obj.quantity = Number(element.quantity);
            let addonPrice = 0;
            if (element.addons != undefined) {
                if (element.addons && element.addons.length > 0) {
                    let addons = element.addons
                    for (let elements in addons) {
                        let getAddon = await AddOn.findOne({ _id: ObjectId(addons[elements]._id) });
                        if (!getAddon) {
                            isValidItem = true;
                            break;
                        }
                        let options = addons[elements].options
                        if (options && options.length) {
                            for (ele in options) {
                                let addOnoptions = getAddon.options.filter(eleadd => eleadd._id == options[ele]._id)
                                if (!addOnoptions.length) {
                                    isValidItem = true;
                                    break;
                                }
                                if (options[ele].isSelected) {
                                    addonPrice = addonPrice + Number(addOnoptions[0].price);
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
            service_id.push(element._id)
            line_items.push(obj);
        }
    }

    return { isValidItem: isValidItem, line_items: line_items, itemTotal, service_id: service_id };
}
let generateCarRentalLineItems = async (item, data) => {
    let isValidItem = false;
    let itemTotal = 0;
    let validVendor = false;
    let items = []
    let getItem = await Product.getProductByIdNew(item);
    if (!getItem) {
        isValidItem = true;
        return { isValidItem };
    }
    //if (getItem.vendor._id.toString() != data.vendor) validVendor = true;
    getItem.pricingTypeCount = await getHoursDayDiffByDate(data, getItem.pricingType || "day");
    console.log("getItem.pricingTypeCount------", getItem.pricingTypeCount)
    itemTotal += helper.roundNumber(getItem.price * getItem.pricingTypeCount);
    items.push(getItem)
    return { isValidItem: isValidItem, line_items: items, itemTotal };
}
let getHoursDayDiffByDate = async (data, pricingType) => {
    if (pricingType == "hour") {
        pricingType = "hours"
    }
    let type = ["day", "hours"];
    if (!type.includes(pricingType)) pricingType = "day";
    let diffDay = moment(new Date(data.checkOutDate_utc)).diff(moment(new Date(data.checkInDate_utc)), pricingType);
    diffDay = diffDay == 0 ? 1 : diffDay;
    return diffDay;
}
// let beforeRequestSendToVendor = async (store, storeType, order, vendor, user) => {
//     try {
//         if (store.orderAutoApproval && vendor.orderAutoApproval) {
//             deliveryRequest.autoAcceptRequestByRestaurant(order._id)
//         } else {
//             deliveryRequest.afterOrderSuccess(order._id, user, storeType, order.store);
//         }
//         emailService.userOrderConfEmail(user, store, order, vendor);
//         emailService.vendorNewOrderEmail(user, vendor, store, order);
//     } catch (error) {
//         console.log("beforeRequestSendToVendor err", error);
//     }
// }
let beforeRequestSendToVendor = async (store, storeType, order, user) => {
    try {
        // deliveryRequest.sendBookinNotificationToVendor(store, storeType, order, vendor, user);
        sendOrderPlacedNotificationToStore(order._id);
        //deliveryRequest.afterOrderSuccess(store, storeType, order, user);
        emailService.userOrderConfEmail(user, store, order);
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

module.exports = {
    generateLineItems,
    beforeRequestSendToVendor,
    afterWebviewPaymentSuccess,
    generateCarRentalLineItems
}