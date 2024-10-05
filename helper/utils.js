const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// const env = require('../config/env');
const storeType = require("../models/storeTypeTable");
const ObjectId = require('objectid');
let hashPassword = async (password) => {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    return {
        salt: salt.toString('hex'),
        hashedPassword: hashedPassword,
    }
}

let generateToken = (user, expiresIn = '15d') => {
    console.log("tokenExpiresIn:", expiresIn)
    return jwt.sign(
        {
            _id: user._id, // We are gonna use this in the middleware 'isAuth'
            role: user.role,
            email: user.email
        },
        env.jwtSecret,
        { expiresIn: expiresIn }
    );
}

let verifyToken = (token) => {
    return jwt.verify(
        token,
        env.jwtSecret
    );
}

let verifyPassword = async (hashedPassword, password) => {
    const validPassword = await bcrypt.compare(password, hashedPassword);
    return validPassword;
}

let generateOTP = (codelength) => {
    return Math.floor(Math.random() * (Math.pow(10, (codelength - 1)) * 9)) + Math.pow(10, (codelength - 1));
}
let makearrdata = (resdata) => {
    return new Promise(async (resolve, reject) => {
        let result = [], image = [], category = [], element, addondata = [], addoncount = 0, optioncount = 1;
        for (i in resdata) {
            element = resdata[i];
            let temoptiodata = []
            addoncount = 0;
            optioncount = 1;
            let addonkey = "addons:Name";
            let optionkey = "addons:OptionName";
            let optionpricekey = "addons:OptionPrice";
            category = element.categories;
            image = element.images;
            addondata = element.addons;
            let categories = category.map(elment => elment.catName).toString();
            let images = image.map(elment => elment.link).toString();
            let fdata = {
                "categories": categories,
                "name": element.name,
                "price": element.price,
                "compare_price": element.compare_price,
                "short_description": element.short_description,
                "featured_image": element.featured_image && element.featured_image.link ? element.featured_image.link : "",
                "images": images,
                "sku": element.sku,
                "status": element.status,
                "stock_status": element.stock_status,
                "type": element.type,
                "veganType": element.veganType
            };
            if (addondata.length) {
                for (j in addondata) {
                    addoncount += 1
                    let addonoption = [...addondata[j].options]
                    let key = addonkey + addoncount
                    fdata[key] = addondata[j].name
                    if (addonoption && addonoption.length) {
                        let optionobj = addonoption.shift();
                        let opkey = optionkey + addoncount;
                        let opkeyp = optionpricekey + addoncount;
                        fdata[opkey] = optionobj.name;
                        fdata[opkeyp] = optionobj.price;
                        let objdata = {
                            "optioncount": addoncount,
                            "optiondata": addonoption,
                            "otionlength": addonoption.length
                        }
                        temoptiodata.push(objdata)

                    }
                };
                result.push(fdata);
                result = await workrecrsuve(temoptiodata, result, element.sku)

            }
            else {
                result.push(fdata);
            }
        }
        resolve(result)
    })
}
let generateGetOrdersQuery = async (req, data) => {
    let findQuery = {};
    let user = req.user;
    let requestQuery = req.query;
    let store = req.store;
    let storeTypeId = data.storeTypeId;
    let storeTypeName = ["TAXI", "PICKUPDROP", "SERVICEPROVIDER"];

    let getStoreType = await storeType.findById(ObjectId(storeTypeId), "storeType");

    if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
        && user.driverassign && user.driverassign.length) {
        findQuery["driver"] = { $in: user.driverassign }
    };
    if (getStoreType && !storeTypeName.includes(getStoreType.storeType)) {
        if (user.role == 'STAFF' && helper.isValidHidethings(store, "vendorlistdispatcher")
            && user.vendorassign && user.vendorassign.length) {
            findQuery["vendor"] = { $in: user.vendorassign };
        }
    };
    if (data.vendor) {
        findQuery.vendor = ObjectId(data.vendor);
    }
    if (requestQuery && requestQuery.driver) {
        findQuery.driver = ObjectId(requestQuery.driver);
    }
    if (requestQuery && requestQuery.customer) {
        findQuery.user = ObjectId(requestQuery.customer);
    }
    if (user.role === "VENDOR") {
        findQuery["vendor"] = user._id
    }
    findQuery.storeType = { $in: [ObjectId(storeTypeId)] };
    findQuery.store = ObjectId(store.storeId);

    return findQuery;

}
workrecrsuve = async (temoptiodata, recusive_arr, sku) => {
    let temparr = []
    let opdata = {}
    let optionkey = "addons:OptionName";
    let optionpricekey = "addons:OptionPrice";
    if (temoptiodata.length) {
        for (t in temoptiodata) {
            let objectdata = temoptiodata[t]
            if (objectdata.otionlength) {
                let arrtemp = objectdata.optiondata
                let makeobj = arrtemp.shift()
                let opkeyr = optionkey + objectdata.optioncount;
                let opkeypr = optionpricekey + objectdata.optioncount;
                opdata[opkeyr] = makeobj.name;
                opdata[opkeypr] = makeobj.price;
                opdata['sku'] = sku
                let objdata = {
                    "optioncount": objectdata.optioncount,
                    "optiondata": arrtemp,
                    "otionlength": arrtemp.length
                }
                temparr.push(objdata)
            }
        }
        if (Object.keys(opdata).length) {
            recusive_arr.push(opdata)
        }
        workrecrsuve(temparr, recusive_arr, sku)
    }
    return recusive_arr

}
module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    generateOTP,
    makearrdata,
    generateGetOrdersQuery
}