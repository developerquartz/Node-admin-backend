const storeType = require('../../../models/storeTypeTable');

module.exports = {

    isStoreType: async (req, res, next) => {
        let data = req.body;

        data.storeTypeId = req.method === 'GET' ? req.params.storeTypeId : data.storeTypeId;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);

        if (getStoreType === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
        }

        req.body.storeType = getStoreType._id;
        req.body.storeTypeName = getStoreType.storeType;
        req.body.deliveryType = getStoreType.deliveryType;
        req.body.storeVendorType = getStoreType.storeVendorType;

        next();
    }
}