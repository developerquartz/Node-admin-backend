const Order = require('../../../models/ordersTable');
module.exports = {

    validatePyament: async (req, res, next) => {
        try {
            let data = req.body;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            let getOrder = await Order.findById(data._id, 'orderStatus paymentStatus').populate("storeType", "storeType");

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }
            if (["cancelled", "completed", "rejected"].includes(getOrder.orderStatus)) {

                let response = helper.showValidationErrorResponse('NOT_A_VALID_ORDER_STATUS');
                response.message = response.message.replace("{status}", getOrder.orderStatus);
                return res.json(response);
            }
            if (getOrder.paymentStatus == 'process') {
                return res.json(helper.showValidationErrorResponse('Please wait, payment is processing'));
            }
            if (getOrder.orderStatus == 'pending') {
                return res.json(helper.showValidationErrorResponse('Please wait, you are already make request'));
            }
            if (["TAXI", "PICKUPDROP", "SERVICEPROVIDER"].includes(getOrder.storeType.storeType)) {
                getOrder.paymentStatus = 'process';
                await getOrder.save();
            }
            else {

                getOrder.orderStatus = 'pending';
                await getOrder.save();

            }

            next()


        } catch (error) {
            console.log("errrrrr", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}