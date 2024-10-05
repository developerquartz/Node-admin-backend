const menuItemServices = require('../service/menuItems')
const ObjectId = require('objectid')
const menuServices = require('../service/menu')
const { IdValidation, updateStatusValidation, addMenuItemsRule } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let addMenuItems = async (req, res, next) => {
    try {
        req.logType = {
            module: 'menu',
            function: 'addMenuItemsRule'
        }
        let payload = req.body;
        let addMenuItemRules = addMenuItemsRule();
        let validateAddMenuItem = validateRule(addMenuItemRules, payload);
        if (validateAddMenuItem) {

            if (payload.parent && payload.parent != "") {
                if (!ObjectId.isValid(payload.parent)) throw "PARENT_ID_IS_NOT_VALID";

                let parentData = await menuItemServices.findByIdAsync(payload.parent)
                if (!parentData)
                    throw "PARENT_ID_WRONG";
                else
                    req.body.parentData = parentData
            }
            if (payload.parent == "")
                delete payload.parent
            if (!payload.menuId) throw "MENU_ID_IS_NOT_VALID";

            if (payload.menuId) {
                if (!ObjectId.isValid(payload.menuId)) throw "MENU_ID_IS_NOT_VALID";

                let menuData = await menuServices.findByIdAsync(payload.menuId)
                if (!menuData)
                    throw "MENU_ID_WRONG";
            }

            let store = req.store;
            req.body.store = store.storeId;
            let user = req.user;
            req.body.user = user._id;

            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

let menuItemIdValidation = async (req, res, next) => {
    try {
        req.logType = {
            module: 'menu',
            function: 'checkMenuItemIdValidation'
        }

        let payload = { "_id": req.params._id };
        let menuIdValidationRules = IdValidation();
        let validateMenuItemId = validateRule(menuIdValidationRules, payload);
        if (validateMenuItemId) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

let updateMenuItem = async (req, res, next) => {
    try {
        let payload = req.body

        req.logType = {
            module: 'menu',
            function: 'updateMenuItemIdValidation'
        }

        let menuIdValidationRules = IdValidation();
        let validateMenuItemId = validateRule(menuIdValidationRules, payload);
        if (validateMenuItemId) {
            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let updateStatus = async (req, res, next) => {
    try {
        let payload = req.body
        req.logType = {
            module: 'menu',
            function: 'updateItemStatusValidation'
        }

        let updateStatusValidationRule = updateStatusValidation();
        let validateUpdateMenuStatus = validateRule(updateStatusValidationRule, payload);
        if (validateUpdateMenuStatus) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

let archiveItems = async (req, res, next) => {
    try {
        let ids = [];

        let payload = req.body
        req.logType = {
            module: 'menu',
            function: 'archiveItemValidation'
        }

        let updateStatusValidationRule = updateStatusValidation();
        let validateUpdateMenuStatus = validateRule(updateStatusValidationRule, payload);
        if (validateUpdateMenuStatus) {
            payload._id.forEach(element => {
                ids.push(ObjectId(element));
            });
            req.body._id = ids

            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}


module.exports = {
    addMenuItems,
    menuItemIdValidation,
    updateMenuItem,
    updateStatus,
    archiveItems
}