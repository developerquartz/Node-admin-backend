const storeType = require('../../models/storeTypeTable');

module.exports = {

    createCategoryDefault: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        next();
    },

    updateCategoryDefault: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        next();
    },

    viewCategoryDefault: async (req, res, next) => {
        let id = req.params._id;

        if (!id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        next();
    },

    viewCategoryList: async (req, res, next) => {
        let data = req.body;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        if (!["SERVICEPROVIDER", "AIRBNB", "CARRENTAL"].includes(data.storeTypeName)) {
            if (!data.vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
            }
        }

        next();
    },

    deleteCategoryDefault: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        next();
    },

    createCategoryByFoodVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        next();
    },
    createCategoryByAirbnbVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        next();
    },
    createCategoryByServiceproviderVendor: async (req, res, next) => {
        let data = req.body;
        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        next();
    },
    updateCategoryByFoodVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        next();
    },
    updateCategoryByAirbnbVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        next();
    },

    updateCategoryByServiceproviderVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        next();
    },

    createCategoryByGroceryVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_REQUIRED'));
        }

        if (data.catDesc) {
            req.body.catDesc = data.catDesc;
        } else {
            req.body.catDesc = null;
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        if (data.catImage) {
            req.body.catImage = data.catImage;
        } else {
            delete req.body.catImage;
        }

        if (data.isFeatured) {
            req.body.isFeatured = data.isFeatured;
        } else {
            req.body.isFeatured = false;
        }

        next();
    },

    updateCategoryByGroceryVendor: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_REQUIRED'));
        }

        if (data.catDesc) {
            req.body.catDesc = data.catDesc;
        } else {
            req.body.catDesc = null;
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        if (data.catImage) {
            req.body.catImage = data.catImage;
        } else {
            delete req.body.catImage;
        }

        if (data.isFeatured) {
            req.body.isFeatured = data.isFeatured;
        } else {
            req.body.isFeatured = false;
        }

        next();
    },
    createCategoryByCarrentalVendor: async (req, res, next) => {
        let data = req.body;
        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        if (data.parent == undefined || data.parent == '') {
            req.body.parent = "none";
        }

        next();
    },
    updateCategoryByCarrentalVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.catName) {
            return res.json(helper.showValidationErrorResponse('CATEGORY_NAME_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        next();
    },
}