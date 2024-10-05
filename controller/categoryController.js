const Category = require('../models/categoryTable.js');
const ObjectId = require('objectid');
const Validation = require('../middleware/validation/category');
const Config = require('../config/constants.json');
const Services = require('../models/productsTable');

module.exports = {

    CategoryMiddleware: async (req, res) => {
        try {
            let data = req.body;

            if (data.storeTypeName && Config.SERVICES.includes(data.storeTypeName.toUpperCase()) && !["FOOD", "SERVICEPROVIDER", "AIRBNB", "CARRENTAL"].includes(data.storeTypeName.toUpperCase())) {
                data.storeTypeName = "GROCERY";
            }

            let func1 = data.action + "CategoryBy" + helper.capitalize(data.storeTypeName.toLowerCase()) + "Vendor";
            let func2 = data.action + "CategoryData";

            if (data.action === "view" && data.method === 'get') {
                func1 = data.action + "CategoryDefault";
                //func2 = data.action + "CategoryBy" + helper.capitalize(data.storeTypeName.toLowerCase()) + "Vendor";
            }

            if (data.action === "view" && data.method === 'post') {
                func1 = data.action + "CategoryList";
                func2 = data.action + "CategoryListByFilter";
            }

            if (data.action === 'delete') {
                func1 = data.action + "CategoryDefault";
            }

            console.log("func1", func1);

            console.log("func2", func2);

            switch (data.storeTypeName) {
                case 'FOOD':
                    Validation[func1](req, res, () => {
                        module.exports[func2](req, res);
                    });
                    break;
                case 'GROCERY':
                    Validation[func1](req, res, () => {
                        module.exports[func2](req, res);
                    });
                    break;
                case 'SERVICEPROVIDER':
                    Validation[func1](req, res, () => {
                        module.exports[func2](req, res);
                    });
                    break;
                case 'AIRBNB':
                    Validation[func1](req, res, () => {
                        module.exports[func2](req, res);
                    });
                    break;
                case 'CARRENTAL':
                    Validation[func1](req, res, () => {
                        module.exports[func2](req, res);
                    });
                    break;
                default:
                    Validation[data.action + "CategoryDefault"](req, res, () => {
                        module.exports[func2](req, res);
                    });
                    break;
            }
        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewCategoryListByFilter: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, storeTypeName, vendor, fields, search } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "sortOrder";
            var sortOrder = order || 1;
            var paged = page || 1;
            let obj = {};

            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }
            if (!["SERVICEPROVIDER", "AIRBNB", "CARRENTAL"].includes(storeTypeName)) {
                if (vendor) {
                    obj.vendor = ObjectId(vendor);
                }
            }

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }

            obj.parent = "none";

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ catName: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ catDesc: { $regex: search || '', $options: 'i' } })
            }
            let count = await Category.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Category.getCategories(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;

                    await Promise.all(resdata.map(async element => {

                        if (element.subcategories.length > 0) {
                            //console.log("element.subcategories1", element.subcategories);
                            element.subcategories = await module.exports.getSubCategories(element.subcategories);
                        }

                    }));

                    res.json(helper.showSuccessResponseCount('CATEGORY_DATA', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getSubCategories: async (subcategory) => {
        subcategory = subcategory.filter(ele => {
            return ele.status != 'archived'
        });
        await Promise.all(subcategory.map(async element2 => {

            if (element2.subcategories && element2.subcategories.length > 0) {
                element2.subcategories = await module.exports.getMidCategory(element2.subcategories);
            }

        }));

        subcategory.sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
        });

        return subcategory;
    },

    getMidCategory: async (midcate) => {
        //console.log("midcate", midcate);
        let newCate = [];
        await Promise.all(midcate.map(async element => {

            let nCat = await module.exports.getSubCategoryById(element._id);
            newCate.push(nCat);
        }));

        newCate = newCate.filter(ele => {
            return ele.status != 'archived'
        });

        newCate.sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
        });

        return newCate;
    },

    getSubCategoryById: async (id) => {

        let getCategory = await Category.findById(id);

        if (getCategory.subcategories && getCategory.subcategories.length > 0) {
            getCategory.subcategories = await module.exports.getMidCategory(getCategory.subcategories);
        }

        return getCategory;
    },

    createCategoryData: async (req, res) => {
        try {
            let data = req.body;

            Category.addCategory(data, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (data.parent != undefined && data.parent != '' && data.parent != 'none') {

                        let subData = {
                            parent: data.parent,
                            ref: resdata._id
                        }

                        Category.AddRefToCategoryParent(subData);
                    }
                    res.json(helper.showSuccessResponse('CATEGORY_ADDED', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateCategoryData: async (req, res) => {
        try {
            let data = req.body;

            Category.getCategoryById(data._id, (err, resdata) => {
                if (resdata === null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_CATEGORY_ID'));
                }

                if (data.parent == undefined || data.parent == '') {
                    data.parent = "none";
                }

                Category.updateCategory(data, (err, resdata) => {
                    if (err) {
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        if (data.parent != undefined && data.parent != '' && data.parent != 'none') {

                            let subData = {
                                parent: data.parent,
                                ref: resdata._id
                            }

                            Category.AddRefToCategoryParent(subData);
                        }
                        res.json(helper.showSuccessResponse('CATEGORY_UPDATED', resdata));
                    }
                });
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewCategoryData: async (req, res) => {
        try {
            var cat_id = req.params._id;
            if (!cat_id) {
                return res.json(helper.showValidationErrorResponse('CATEGORY_ID_REQUIRED'));
            }
            Category.getCategoryById(cat_id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata === null) {
                        return res.json(helper.showValidationErrorResponse('INVALID_CATEGORY_ID'));
                    } else {
                        return res.json(helper.showSuccessResponse('CATEGORY_DETAIL', resdata));
                    }
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeCategoryData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('CATEGORY_ID_REQUIRED'));
            }

            Category.removeCategory(data._id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('CATEGORY_DELETED', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archiveCategoryData: async (req, res) => {
        try {
            let data = req.body;

            data.status = "archived";

            Category.updateCategory(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.parent != undefined && resdata.parent != '' && resdata.parent != 'none') {

                        let subData = {
                            parent: resdata.parent,
                            ref: resdata._id
                        }

                        Category.removeRefToCategoryByParent(subData);
                    }
                    module.exports.removeCategoreIdFromProduct([resdata._id]);
                    return res.json(helper.showSuccessResponse('CATEGORY_DELETED', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    deleteCategoryData: async (req, res) => {
        try {
            let data = req.body;
            let ids = [];
            let update = {};
            if (data._id.constructor === Array) {
                if (data._id.length === 0) {
                    return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
                }

                if (!data.status) {
                    return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
                }

                data._id.forEach(element => {
                    ids.push(ObjectId(element));
                });

                update.status = data.status;

            } else {
                ids.push(ObjectId(data._id));
                update.status = 'archived';
            }

            data._id = ids;
            // console.log("data:===>", data)

            Category.updateStatusByIds(data, update, async (err, resdata) => {

                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    module.exports.removeCategoreIdFromProduct(data._id);
                    await Promise.all(data._id.map(async element => {
                        await module.exports.deleteMidCategory(element);

                    }));
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    sortOrder: async (req, res) => {
        try {
            let data = req.body;

            if (data.sortOrder.length === 0) {
                return res.json(helper.showValidationErrorResponse('SORT_ORDER_IS_REQUIRED'));
            }

            await Promise.all(data.sortOrder.map(async element => {
                await Category.findOneAndUpdate({ _id: element._id }, { sortOrder: element.sortOrder });
            }));

            res.json(helper.showSuccessResponse('UPDATE_SUCCESS', {}));
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    removeCategoreIdFromProduct: async (categories) => {
        try {

            let removeService = await Services.updateMany({ categories: { $in: categories } },
                {
                    $pull: { categories: { $in: categories } }
                })
            return removeService;
        } catch (error) {
            console.log("error:", error)
        }

    },
    deleteMidCategory: async (_id) => {

        let getCategory = await Category.findOneAndUpdate({ _id }, { status: "archived" }, { new: true });
        // console.log("getCategory:=>", getCategory)

        await Promise.all(getCategory && getCategory.subcategories.map(async element => {
            module.exports.removeCategoreIdFromProduct([element]);
            await module.exports.deleteMidCategory(element);

        }));

        return getCategory;
    },
}