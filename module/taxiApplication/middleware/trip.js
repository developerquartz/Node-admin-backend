const socketHelper = require('../../../helper/socketHelper');
const sendRequestHelper = require('../../../helper/sendRequest');
const multiLocation = require("../../../models/dropmultiLocation");
const order = require('../../../models/ordersTable');
const utilityFunc = require('../utility/functions');
const { sendCustomOtp } = require("../../../lib/otpverification")
const sendOrderPlacedNotificationToStore = require("../../../helper/sendOrderPlacedNotificationToStore")

let afterTripCreate = (resdata) => {
    try {
        socketHelper.singleSocket(resdata.store, "Store", { orderId: resdata._id }, 'storeListen');
        sendRequestHelper.sendRequest(resdata._id);
        sendOrderPlacedNotificationToStore(resdata._id);
    } catch (error) {
        console.log("afterTripCreate error :", error);
    }
}
let addMultiLocation = async (data, orderId, store) => {
    try {
        let Ids = [];
        if (data.dropOffMulti) {
            let itemdata = data.dropOffMulti
            for (i in itemdata) {
                let items = itemdata[i]
                items.order = orderId;
                items.location = { type: "Point", coordinates: [items.location.lng, items.location.lat] };
                let multiData = await multiLocation.addAddress(items);
                Ids.push(multiData._id)
            }
            // data.dropOffMulti.map(async items => {
            //     items.order = orderId;
            //     let multiData = await multiLocation.addAddress(items);
            //     console.log("MultiData---", multiData)
            //     Ids.push(multiData._id)

            // })
            console.log("Ids---", Ids)
            if (Ids.length) {
                await order.updateOne({ _id: orderId }, { $set: { dropMulti: Ids } });
            }
            else {
                console.log("Invalid Ids----")
            }

        }
    }
    catch (error) {
        console.log("addMultiLocation error :", error);
    }

}
let addstopsArray = async (data, orderId) => {
    let Ids = [];
    if (data.multiStopLocation) {
        let itemdata = data.multiStopLocation;
        for (i in itemdata) {
            let items = itemdata[i]
            items.order = orderId;
            items.location = { type: "Point", coordinates: [items.location.lng, items.location.lat] };
            let multiData = await multiLocation.addAddress(items);
            Ids.push(multiData._id)
        }
        await order.updateOne({ _id: orderId }, { $set: { multiStop: Ids } });
    }


}
module.exports = {
    afterTripCreate,
    addMultiLocation,
    addstopsArray
}