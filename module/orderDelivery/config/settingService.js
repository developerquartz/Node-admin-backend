const Store = require('../../../models/storeTable');
const utilityFunc = require('../utility/functions')
let chekPaymentSetting = async (data) => {

    let flag = true;
    let paymentSettings = null;

    const getPayment = await Store.getStorePaymentSettingAsync(data.storeId);

    if (getPayment.paymentSettings.length === 0) {
        flag = false;
    }

    const getGatewaySetting = getPayment.paymentSettings.filter(payment => {
        return payment.payment_method === data.payment_method;
    });

    if (getGatewaySetting.length === 0) {
        flag = false;
    } else {
        paymentSettings = getGatewaySetting[0];
    }

    let paymentMode = getPayment.paymentMode;

    return {
        flag: flag,
        currency: getPayment.currency.code,
        paymentMode: paymentMode,
        paymentSettings: paymentSettings
    }
}

let chekStoreSetting = async (req,res,next) => {
    try {
        let data = req.body
        let payment_method = data.payment_method
    
        let flag = true;
        let paymentSettings = null;
    
        const getPayment = req.store
    
        if (!getPayment.paymentSettings || getPayment.paymentSettings.length === 0) {
            flag = false;
        }
    
        const getGatewaySetting = getPayment.paymentSettings.filter(payment => {
            return payment.payment_method === payment_method;
        });
    
        if (getGatewaySetting.length === 0) {
            flag = false;
        } else {
            paymentSettings = getGatewaySetting[0];
        }
    
        let paymentMode = getPayment.paymentMode;
    
        if (!getStore.flag) {
            throw new Error("SETUP_PAYMENT_SETTING_FIRST");
        }

        if (getStore.flag && !getStore.paymentSettings.status) {
            throw new Error("PAYMENT_METHOD_DISABLE");
        }

        
        req.store =  {
            ...req.store,
            paymentMode: paymentMode,
            paymentSettings: paymentSettings
        }
        next();

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);    
    }
    

  
}

module.exports = {
    chekPaymentSetting,
    chekStoreSetting
}