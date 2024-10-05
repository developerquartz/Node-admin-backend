const productVariationTable = require('../models/productVariationTable');
const Product = require('../models/productsTable');
const emailService = require("./emailService");
const deliveryRequest = require('./deliveryRequest');
const Order = require('../models/ordersTable');
const ServiceMiddleware = require('../module/serviceProvider/middleware/servicerequest')
const { sendSMS } = require("../lib/otpverification");
const helper = require('./helper');

let generateLineItems = async (items, storeType, storeVersion) => {

    let generateData = { isValidItem: false, line_items: [], itemTotal: 0 };
    let data = {};
    console.log("store Version---", storeVersion)
    if (storeType === 'FOOD') {
        data = await generateFoodLineItems(items);
    } else {
        if (storeVersion > 2) {
            data = await generateFoodLineItems(items);
        }
        else {
            data = await generateOtherStoreTypeLineItems(items);
        }
    }

    return { ...generateData, ...data };
}

let generateFoodLineItems = async (items) => {
    let isValidItem = false;
    let line_items = [];
    let itemTotal = 0;
    let totalWeight = 0;
    let stock_status = false;
    for (let index = 0; index < items.length; index++) {
        let element = items[index];

        if (element.itemId) {
            let getItem = await Product.getProductByIdAsync(element.itemId);

            if (getItem === null) {
                isValidItem = true;
                break;
            }
            let obj = {};
            obj.categoryId = element.categoryId ? element.categoryId : [];
            obj.countId = element.countId ? element.countId : 0;
            obj.product = getItem._id;
            obj.name = getItem.name;
            obj.productImage = (getItem.featured_image && getItem.featured_image.link) || "";
            obj.price = getItem.price;
            obj.veganType = getItem.veganType;
            obj.quantity = Number(element.quantity);
            let lineItemTotal = helper.roundNumber(obj.price * obj.quantity);
            let addonPrice = 0;
            if (getItem.weight) {
                totalWeight = totalWeight + helper.convertToUnit(getItem.weight, getItem.pricingType);
            }
            if (element.addons != undefined) {
                if (element.addons.length > 0) {
                    element.addons.forEach(elements => {
                        addonPrice = addonPrice + Number(elements.price);
                    });
                    obj.addons = element.addons;
                } else {
                    obj.addons = [];
                }
            } else {
                obj.addons = [];
            }

            if (!getItem.manage_stock && getItem.stock_status != "instock") {
                stock_status = true;
                break;
            }

            //addonPrice = (addonPrice * obj.quantity);

            let lineTotal = helper.roundNumber(lineItemTotal + addonPrice);
            obj.lineTotal = lineTotal;

            itemTotal = itemTotal + lineTotal;

            line_items.push(obj);
        }
        else {
            isValidItem = true;
            break;
        }

    }

    return { isValidItem: isValidItem, line_items: line_items, itemTotal, totalWeight, stock_status };


}

let generateOtherStoreTypeLineItems = async (items) => {
    let isValidItem = false;
    let line_items = [];
    let itemTotal = 0;
    let totalWeight = 0;
    let stock_status = false;
    let stockObj = {}
    for (let index = 0; index < items.length; index++) {
        let element = items[index];

        if (element.itemId) {
            let getItem = await Product.getProductByIdAsync(element.itemId);

            if (getItem === null) {
                isValidItem = true;
                break;
            }

            let obj = {};
            obj.product = getItem._id;
            obj.name = getItem.name;
            obj.productImage = (getItem.featured_image && getItem.featured_image.link) || "";
            obj.quantity = Number(element.quantity);
            if (getItem.type === "simple") {
                obj.price = getItem.price;
                obj.product_stock_quantity = getItem.stock_quantity;
                obj.product_stock_status = getItem.stock_status;
                obj.product_manage_stock = getItem.manage_stock;
            } else {
                const getVariation = await productVariationTable.getproductVariationByIdAsync(element.variation_id);
                console.log("getVariation:==>", getVariation)
                if (getVariation === null) {
                    isValidItem = true;
                    break;
                }
                if (getVariation.manage_stock && getVariation.stock_quantity == 0) {
                    stock_status = true;
                    stockObj = {
                        name: obj.name + " " + element.variation_title + " has ",
                        stock: getVariation.stock_quantity + " quantity available"
                    }
                    //break;
                }
                if (!getVariation.manage_stock && getItem.stock_status != "instock") {
                    stock_status = true;
                    stockObj = {
                        name: element.variation_title + " is ",
                        stock: getItem.stock_status
                    }
                    //break;
                }
                obj.variation_id = getVariation._id;
                obj.variation_title = element.variation_title;
                obj.price = getVariation.price;
                obj.variation_stock_quantity = getVariation.stock_quantity;
                obj.variation_stock_status = getVariation.stock_status;
                obj.variation_manage_stock = getVariation.manage_stock;
                obj.product_stock_quantity = getItem.stock_quantity;
                obj.product_stock_status = getItem.stock_status;
                obj.product_manage_stock = getItem.manage_stock;
            }
            if (getItem.weight) {
                let getWeight = helper.convertToUnit(getItem.weight, getItem.pricingType);
                totalWeight += (getWeight * obj.quantity);
            }
            if (getItem.manage_stock && getItem.stock_quantity < obj.quantity) {
                stock_status = true;
                stockObj = {
                    name: obj.name + " has ",
                    stock: getItem.stock_quantity + " quantity available"
                }
                //break;
            }
            if (!getItem.manage_stock && getItem.stock_status != "instock") {
                stock_status = true;
                stockObj = {
                    name: obj.name + " is ",
                    stock: getItem.stock_status
                }
                //break;
            }
            let lineItemTotal = helper.roundNumber(obj.price * obj.quantity);
            let addonPrice = 0;
            let lineTotal = helper.roundNumber(lineItemTotal + addonPrice);
            obj.lineTotal = lineTotal;

            itemTotal = itemTotal + lineTotal;

            line_items.push(obj);
        }
        else {


            isValidItem = true;
            break;
        }

    }
    return { isValidItem: isValidItem, line_items: line_items, itemTotal, totalWeight, stock_status, stockObj };
}
let getvariationId = async (items) => {
    let isValidItem = false;
    let line_items = [];
    let itemTotal = 0;
    let totalWeight = 0;
    let stock_status = false;
    for (let index = 0; index < items.length; index++) {
        let element = items[index];
        let obj = { ...element };
        if (element.attributes && element.attributes.length) {
            let getItem = await Product.findOne({ _id: element.itemId }).populate({ path: "variations", match: { "attributes._id": { $all: element.attributes } } });
            if (getItem && getItem.variations && getItem.variations.length) {
                obj.variation_id = getItem.variations[0]._id
                let atrributedata = getItem.variations[0].attributes
                obj.variation_title = atrributedata.map(elemnt => elemnt.name).join("/") //atrributedata[0].name + "/" + atrributedata[1].name
            }
            //delete obj.variation
        }
        line_items.push(obj)

    }

    return line_items//{ isValidItem: isValidItem, line_items: line_items };
}

let beforeRequestSendToVendor = async (store, storeType, order, vendor, user) => {
    try {

        if (store.orderAutoApproval && vendor.orderAutoApproval) {
            deliveryRequest.autoAcceptRequestByRestaurant(order._id)
        } else {
            deliveryRequest.afterOrderSuccess(order._id, user, storeType, order.store, vendor, store, order.paymentMethod);
        }
        emailService.userOrderConfEmail(user, store, order, vendor);
        emailService.vendorNewOrderEmail(user, vendor, store, order);
        //emailService.adminNewOrderEmail(user, vendor, store, order);
        sendVendorOrderPlacedNotification(user, vendor, store, order);
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
        .populate({ path: "storeType", select: 'vendorWaitTime storeType' })
        .populate({
            path: "store",
            select: 'storeName logo currency mailgun domain orderAutoApproval notifications owner',
            populate: [{
                path: "logo",
                select: "link",
            },
            {
                path: "owner",
                select: "email",
            }]
        })
        .exec();


    // console.log("getOrder---", getOrder)
    if (getOrder.storeType.storeType != "SERVICEPROVIDER") {
        beforeRequestSendToVendor(getOrder.store, getOrder.storeType, getOrder, getOrder.vendor, getOrder.user);
        manageProductStock(getOrder.line_items, false);

    }
    else {
        ServiceMiddleware.sndrquestSrviceProvider(getOrder, getOrder.nearByTempDrivers);
    }
}
let sendVendorOrderPlacedNotification = async (user, vendor, store, order) => {
    if (store.notifications.vendorNotification.length) {


        store.notifications.vendorNotification.map(element => element.type == "orderPlaced" && element.values.map(element => {
            if (element.key == "notification" && element.value) {

            }
            else if (element.key == "sms" && element.value) {
                sendSMS(user, vendor, store, order);
            }



        }));
    }


}
let verifyLineItemData = async (data) => {
    let isValidItem = false;
    let items = data
    let msg = "INVALID_ITEMS";

    for (let index = 0; index < items.length; index++) {
        let element = items[index];
        if (!element.itemName) {

            isValidItem = true;
            msg = "NAME_REQUIRED"
            break;

        }
        if (!element.quantity || !Number(element.quantity)) {

            isValidItem = true;
            msg = "QUANTITY_REQUIRED"
            break;
        }


    }

    return { isValidItem: isValidItem, message: msg };


}
let verifyMultiLocationData = async (data, storeTypedata) => {
    let isValidItem = false;
    let items = data
    let msg = "INVALID_ITEMS";
    let lineTotal = 0;
    let lineItem = [];

    for (let index = 0; index < items.length; index++) {
        let element = items[index];

        if (!element.address) {
            isValidItem = true;
            msg = "ADDRESS_REQUIRED"
            break;
        }
        if (!element.line_items || !element.line_items.length) {
            isValidItem = true;
            msg = "ITEMS_REQUIRED"
            break;
        }
        let lineitems = [...element.line_items]
        let itemdata = lineitems.shift()
        lineItem.push(itemdata)
        if (!itemdata.itemName) {
            isValidItem = true;
            msg = "ITEM_NAME";
            break;
        }
        if (!itemdata.quantity || Number(itemdata.quantity) <= 0) {
            isValidItem = true;
            msg = "ITEM_QUANTITY";
            break;
        }

        //  lineTotal += helper.roundNumber(storeTypedata.firstboxprice * itemdata.quantity);

        for (let index = 0; index < lineitems.length; index++) {
            let element = lineitems[index];
            lineItem.push(element);
            if (!element.itemName) {
                isValidItem = true;
                msg = "ITEM_NAME";
                break;
            }
            if (!element.quantity || Number(element.quantity) <= 0) {
                isValidItem = true;
                msg = "ITEM_QUANTITY";
                break;
            }
            // lineTotal += helper.roundNumber(storeTypedata.otherboxprice * element.quantity);

        }
        // if (storeTypedata.firstboxprice && storeTypedata.otherboxprice) {
        // }

        if (!element.location) {
            isValidItem = true;
            msg = "LOCATION_REQUIRED"
            break;
        }
        // element.location = { type: "Point", coordinates: [element.location.lng, element.location.lat] }

    }

    return { isValidItem: isValidItem, message: msg, items: data, lineTotal, lineItem };


}
let verifymultiStopsData = async (data) => {
    let isValidStopLocation = false;
    let multiStop = data
    let msg = "INVALID_STOP_LOCATION";

    for (let index = 0; index < multiStop.length; index++) {
        let element = multiStop[index];

        if (!element.address) {
            isValidStopLocation = true;
            msg = "MULTI_STOP_ADDRESS_REQUIRED"
            break;
        }

        if (!element.location) {
            isValidStopLocation = true;
            msg = "MULTI_STOP_LOCATION_REQUIRED"
            break;
        }
        // element.location = { type: "Point", coordinates: [element.location.lng, element.location.lat] }

    }

    return { isValidStopLocation: isValidStopLocation, message: msg, multiStop: data };


}
let manageProductvariation = async (element, releaseInStock) => {
    const getVariation = await productVariationTable.getproductVariationByIdAsync(element.variation_id);
    if (getVariation && getVariation.manage_stock) {
        if (releaseInStock) {
            getVariation.stock_quantity += 1;
            getVariation.stock_status = "instock";
        } else {
            getVariation.stock_quantity -= 1;
            if (!getVariation.stock_quantity) {
                getVariation.stock_status = "outofstock";
            }
        }
        await getVariation.save();
    }
}
let manageProductStock = async (line_items, releaseInStock) => {
    if (!line_items)
        return
    for (const index in line_items) {
        let element = line_items[index];
        if (element.product && element.quantity) {
            let getItem = await Product.findById(element.product, "stock_quantity type manage_stock stock_status")
                .populate("storeType", "storeType")
                .populate("variations", "stock_quantity manage_stock stock_status")

            if (getItem.storeType.storeType == "GROCERY") {
                console.log("getItem.type --", getItem.type)
                if (getItem.type != "simple") {
                    console.log("variation_id---", element.variation_id)
                    manageProductvariation(element, releaseInStock)
                }
            }
            if (getItem.manage_stock) {
                if (releaseInStock) {
                    getItem.stock_quantity = getItem.stock_quantity + element.quantity;
                    getItem.stock_status = "instock";
                } else {
                    getItem.stock_quantity = getItem.stock_quantity - element.quantity;
                    if (!getItem.stock_quantity) {
                        getItem.stock_status = "outofstock";
                    }
                }
                await getItem.save();
            }

        }
    }
}

module.exports = {
    manageProductStock,
    generateLineItems,
    beforeRequestSendToVendor,
    afterWebviewPaymentSuccess,
    verifyMultiLocationData,
    getvariationId,
    verifyLineItemData,
    verifymultiStopsData
}