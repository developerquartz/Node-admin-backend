const { addMenuValidation, IdValidation, updateStatusValidation } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let addMenu = async (req,res,next) =>{
    try {
        req.logType = {
            module: 'menu',
            function: 'validateAddMenu'
        }
        let payload = req.body;
        let addMenuRules = addMenuValidation();
        let validateAddMenu = validateRule(addMenuRules, payload);

        if (validateAddMenu) {
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

let menuIdValidation = async (req,res,next) => {
    try {

        req.logType = {
            module: 'menu',
            function: 'checkMenuIdValidation'
        }
        
        let payload = {"_id":req.params._id};
        let menuIdValidationRules = IdValidation();
        let validateAddMenu = validateRule(menuIdValidationRules, payload);

        if (validateAddMenu) {
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

let updateMenu = async (req,res,next) => {
    try {
        let payload = req.body

        req.logType = {
            module: 'menu',
            function: 'updateMenuValidation'
        }
        
        let updateMenuValidationRule = IdValidation();
        let validateUpdateMenu = validateRule(updateMenuValidationRule, payload);
        if(validateUpdateMenu) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let updateStatus = async (req,res,next) => {
    try {
        let payload = req.body

        req.logType = {
            module: 'menu',
            function: 'updateStatusValidation'
        }
        
        let updateStatusValidationRule = updateStatusValidation();
        let validateUpdateMenuStatus = validateRule(updateStatusValidationRule, payload);
        if(validateUpdateMenuStatus) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}


module.exports = {
    addMenu,
    menuIdValidation,
    updateMenu,
    updateStatus
}