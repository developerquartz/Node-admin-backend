const menuServices = require('../service/menu');
const menuItemServices = require('../service/menuItems');
const storeTable = require('../../../models/storeTable')
const ObjectId = require('objectid');

module.exports = {
    getMenuListWithFilter: async (req, res) => {
        try {
            const { orderBy, order, page, limit, search, fields } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};
            obj.store = req.store.storeId;

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
            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ label: { $regex: search || '', $options: 'i' } })
            }
            if (obj.deviceType)
                delete obj.deviceType;
            let query = [{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]

            let count = await menuServices.aggregateResult(query);
            menuServices.getMenuWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;

                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err :", err);

            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addMenuData: async (req, res) => {
        try {
            let data = req.body;
            console.log("data :", data);

            menuServices.addMenu(data, (err, resdata) => {
                if (err) {
                    console.log("err :", err);

                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err :", error);

            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getMenuDetailsById: async (req, res) => {
        try {
            let id = req.params._id;

            menuServices.getMenuById(id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('SUCCESS', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateMenuData: async (req, res) => {
        try {
            let data = req.body;
            let update = { _id: data._id }

            if (data.label)
                update.label = data.label
            if (data.status)
                update.status = data.status

            menuServices.updateMenu(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                    storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                        if (storeData)
                            helper.updateConfigStoreSetting(storeData);
                    })
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    removeMenuData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('FAQ_ID_IS_REQUIRED'));
            }

            data.status = "archived";

            menuServices.updateMenu(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                    storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                        if (storeData)
                            helper.updateConfigStoreSetting(storeData);
                    })
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateStatus: async (req, res) => {
        try {
            let data = req.body;

            if (data._id.length === 0) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            let ids = [];
            data._id.forEach(element => {
                ids.push(ObjectId(element));
            });

            data._id = ids;
            let update = {};
            update.status = data.status;

            menuServices.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                    storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                        if (storeData)
                            helper.updateConfigStoreSetting(storeData);
                    })
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },


    //=========================================== Menu Items ==================================================
    getMenuItemsListWithFilter: async (req, res) => {
        try {
            const { orderBy, order, page, limit, search, fields, menuId } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "sortOrder";
            var sortOrder = order || 1;
            var paged = page || 1;
            const store = req.store;
            let obj = {};
            obj.store = store.storeId;
            if (menuId) {
                obj.menuId = ObjectId(menuId);
            }

            if (fields && fields.length > 0) {
                console.log("fields", fields);
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }
            obj.parent = null;


            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ question: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ answer: { $regex: search || '', $options: 'i' } })
            }

            let query = [{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]

            let count = await menuItemServices.aggregateResult(query);
            menuItemServices.getMenuItems(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    await Promise.all(resdata.map(async element => {

                        if (element.child.length > 0) {
                            //console.log("element.child1", element.child);
                            element.child = await module.exports.getSubCategories(element.child);
                        }

                    }));

                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err :", err);

            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getSubCategories: async (subcategory) => {
        subcategory = subcategory.filter(ele => {
            return ele.status != 'archived'
        });
        await Promise.all(subcategory.map(async element2 => {

            if (element2.child && element2.child.length > 0) {
                element2.child = await module.exports.getMidCategory(element2.child);
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

        let getCategory = await menuItemServices.findByIdAsync(id);

        if (getCategory.child && getCategory.child.length > 0) {
            getCategory.child = await module.exports.getMidCategory(getCategory.child);
        }

        return getCategory;
    },
    // add Menu Items
    addMenuItems: async (req, res) => {
        try {
            let data = req.body;

            menuItemServices.addMenuItems(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));

                    if (resdata.parent && resdata.parent != null) {
                        let query = { _id: resdata.parent }
                        let update = { $addToSet: { child: resdata._id } }
                        await menuItemServices.updateOneAsync(query, update)
                    }
                    else {
                        let query = { _id: resdata.menuId }
                        let update = { $addToSet: { items: resdata._id } }
                        await menuServices.updateOneAsync(query, update)
                    }
                    storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                        if (storeData)
                            helper.updateConfigStoreSetting(storeData);
                    })
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    // Get Menu Item by its id
    getMenuItemByMenuItemId: async (req, res) => {
        try {
            let id = req.params._id;

            menuItemServices.getMenuItemsById(ObjectId(id), (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('SUCCESS', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    //update Menu item
    updateMenuItemData: async (req, res) => {
        try {
            let data = req.body;

            menuItemServices.getMenuItemsById(data._id, (err, resdata) => {
                if (resdata === null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_ID'));
                }

                if (!data.parent || data.parent == null) {
                    data.parent = null;
                }

                menuItemServices.updateMenuItems(data, async (err, resdata) => {
                    if (err) {
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        if (data.parent && data.parent != null) {

                            let subData = {
                                parent: data.parent,
                                ref: resdata._id
                            }

                            menuItemServices.AddRefToMenuItemParent(subData);
                            let query = { _id: resdata.menuId }
                            let update = { $pull: { items: resdata._id } }
                            await menuServices.updateOneAsync(query, update)
                        }
                        res.json(helper.showSuccessResponse('UPDATED', resdata));
                        storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                            if (storeData)
                                helper.updateConfigStoreSetting(storeData);
                        })
                    }
                });
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    //remove menu item
    removeMenuItemData: async (req, res) => {
        try {
            let id = req.params._id;

            menuItemServices.removeMenuItems(id, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETED', resdata));
                    let query = { _id: resdata.menuId }
                    let update = { $pull: { items: resdata._id } }
                    await menuServices.updateOneAsync(query, update)
                    storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                        if (storeData)
                            helper.updateConfigStoreSetting(storeData);
                    })
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archiveMenuItemData: async (req, res) => {
        try {
            let id = req.params._id;
            let data = { _id: id, status: "archived" }

            menuItemServices.updateMenuItems(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.parent != undefined && resdata.parent != '' && resdata.parent != 'none') {

                        let subData = {
                            parent: resdata.parent,
                            ref: resdata._id
                        }

                        menuItemServices.removeRefToMenuItemByParent(subData);
                    }
                    res.json(helper.showSuccessResponse('DELETED', resdata));
                    storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                        if (storeData)
                            helper.updateConfigStoreSetting(storeData);
                    })
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    deleteMenuItemsData: async (req, res) => {
        try {
            let data = req.body;
            menuItemServices.updateStatusByIds(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                    storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                        if (storeData)
                            helper.updateConfigStoreSetting(storeData);
                    })
                }
            });
        } catch (error) {
            console.log("errro :", error);

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
                await menuItemServices.updateOneAsync({ _id: element._id }, { sortOrder: element.sortOrder });
            }));

            res.json(helper.showSuccessResponse('UPDATE_SUCCESS', {}));
            storeTable.getStoreDataByIdForSettingScript(req.store.storeId, (err, storeData) => {
                if (storeData)
                    helper.updateConfigStoreSetting(storeData);
            })
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }

}