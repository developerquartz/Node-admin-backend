const Promotion = require('../../models/promotionTable');
const storeType = ["TAXI", "PICKUPDROP", 'SERVICEPROVIDER'];
module.exports = {

    createPromotionDefault: async (req, res, next) => {
        let data = req.body;
        console.log("data:", data)

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        if (!data.promotionName) {
            return res.json(helper.showValidationErrorResponse('PROMOTION_NAME_IS_REQUIRED'));
        }

        if (!data.promotionImage) {
            return res.json(helper.showValidationErrorResponse('PROMOTION_IMAGE_IS_REQUIRED'));
        }

        if (!data.type) {
            return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
        }
        if (!storeType.includes(data.storeTypeName)) {
            if (data.type == "multiVendor" && !data.vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
            }

            if (data.type == "singleVendor" && !data.category) {
                return res.json(helper.showValidationErrorResponse('CATEGORY_ID_IS_REQUIRED'));
            }
        }
        else {
            delete data.vendor;
        }
        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }
        console.log("data after validation:", data)


        next();
    },
}