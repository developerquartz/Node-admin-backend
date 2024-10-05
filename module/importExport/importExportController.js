
/* node modules */
const ObjectId = require('objectid');

/* DB models start */
const User = require('../../models/userTable');
const Product = require('../../models/productsTable');
const productVariation = require('../../models/productVariationTable');
const attributeTerms = require('../../models/attributeTermsTable');
const attributeTable = require('../../models/attributeTable');
const Category = require('../../models/categoryTable');
const addonTable = require('../../models/addonTable');
const storeType = require('../../models/storeTypeTable');
const File = require('../../models/fileTable.js');
const logTable = require('../../models/logTable')
const Store = require('../../models/storeTable');
const paymentLedger = require('../../models/paymentLedgerTable');
const Cuisine = require('../../models/cuisinesTable.js');

/* DB models end */

/* middlewares */
const mailgunSendEmail = require('../../lib/mailgunSendEmail');
const storeInitial = require('../../initial/storeInitial');


module.exports = {
    importProductCSV: async (req, res) => {
        try {
            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));
            let data = req.body
            data.store = req.store.storeId
            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            if (!data.storeType)
                return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
            if (!data.vendor)
                return res.json(helper.showValidationErrorResponse("VENDOR_ID_IS_REQUIRED"));


            let storeTypeData = await storeType.findById(ObjectId(data.storeType))

            let filePath = req.file.path

            let csvData = await helper.csvToJson(filePath)
            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local

            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i + 1
            }
            let csvDataCopy2 = []

            let errMsg = ""
            await Promise.all(csvData.map(async function (itm, i) {
                let checkCat = [];
                let checkAddon = [];
                let checkBrand;

                itm.categories = (itm.categories && itm.categories != "") ? itm.categories.split(',') : [];
                if (itm.categories.length > 0)
                    checkCat = await Category.aggregate([{ $match: { status: "active", catName: { $in: itm.categories }, vendor: ObjectId(req.body.vendor) } }, { $group: { _id: "$vendor", catId: { $push: "$_id" }, catName: { $push: "$catName" } } }])

                itm.addons = (itm.addons && itm.addons != "") ? itm.addons.split(',') : [];
                if (itm.addons.length > 0)
                    checkAddon = await addonTable.aggregate([{ $match: { status: "active", name: { $in: itm.addons }, vendor: ObjectId(req.body.vendor) } }, { $group: { _id: "$vendor", addonId: { $push: "$_id" }, name: { $push: "$name" } } }]) // in food store only

                itm.brand = (itm.brand && itm.brand != "") ? itm.brand.split(',')[0] : "";
                if (itm.brand && itm.brand != "")
                    checkBrand = await Cuisine.findOne({ status: "active", name: itm.brand, store: ObjectId(data.store), storeType: ObjectId(req.body.storeType) }) // except food store 

                let validationData = await helper.importProductObjectValidation(errMsg, itm, checkCat, checkAddon, checkBrand, storeTypeData.storeType)
                errMsg = validationData.errMsg
                csvData[i] = validationData.itm
                csvDataCopy2.push(validationData.itm)
            }))
            var result = csvData.filter(function (itm) {

                if (storeTypeData.storeType === "FOOD")
                    delete itm.brand
                else
                    delete itm.addons

                return (
                    itm.rowStatus == "success"
                )
            });
            console.log("result :", result);
            let obj = {
                type: "PRODUCT_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import product",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "PRODUCT_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });

            let finalResult = [];
            let resData = []
            await Promise.all(result.map(async element => {
                let obj = { ...element }

                let ImageIdsArr = []
                obj.storeType = req.body.storeType
                obj.vendor = req.body.vendor

                if (element.manage_stock && element.manage_stock.toLowerCase() == "true")
                    obj.manage_stock = true
                else
                    obj.manage_stock = false

                if (!ObjectId.isValid(element.featured_image)) {
                    let resdata = await File.addMultipleFile([{ link: element.featured_image }])

                    if (resdata != null) {
                        obj.featured_image = resdata[0]._id
                        ImageIdsArr.push(resdata[0]._id)
                    }
                }
                if (element.images) {
                    element.images = element.images.replace(/\s/g, "").split(',')
                    let imgUrlArr = []
                    let imgIdsArr = []

                    element.images.map(async item => {
                        if (!ObjectId.isValid(item))
                            imgUrlArr.push({ link: item })
                        else
                            imgIdsArr.push(item)
                    })

                    if (imgUrlArr.length > 0) {

                        let resdata = await File.addMultipleFile(imgUrlArr)

                        if (resdata != null) {
                            obj.images = imgIdsArr
                            resdata.forEach((item) => {
                                obj.images.push(item._id)
                                ImageIdsArr.push(item._id)

                            })
                        }
                    }
                    else
                        obj.images = imgIdsArr
                }
                let data1 = await Product.addProductCSV(obj)
                if (data1) {
                    resData.push(data1)
                    await File.updateMany({ _id: { $in: ImageIdsArr } }, { $set: { productId: data1._id, vendor: data1.vendor, storeType: data1.storeType } })
                }
                finalResult.push(obj)
            }));
            finalResult = finalResult;

            let csvResult = []
            resData.forEach(element => {

                let fdata = {
                    "Order Id": element._id,
                    "Store Type ": element.storeType,
                    "Vegan type": element.veganType,
                    "Name": element.name,
                    "SKU": element.sku,
                    "price": element.price,
                    "Date": new Date(element.date_created_utc).toLocaleDateString()
                }
                csvResult.push(fdata);
            });

            res.setHeader('Content-disposition', 'attachment; filename=product.csv');
            res.set('Content-Type', 'text/csv');
            res.csv(csvResult, true, {
                "Access-Control-Allow-Origin": "*"
            }, 200);

            if (csvDataCopy2.length > 0) {
                let to = storeData.email
                let sub = "Import product CSV"
                let msg = "Import product csv data."
                csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)


                let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                if (csvEmailData.status)
                    await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importProductCSV_" + new Date().getTime() + ".csv")
            }

        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importProductVariationCSV: async (req, res) => {
        try {
            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));

            let filePath = req.file.path

            let data = req.body;

            let store = req.store;
            data.store = store.storeId;
            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let csvData = await helper.csvToJson(filePath)
            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local

            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i + 1
            }
            let csvDataCopy2 = []
            let getProductIds = csvData.map(a => ObjectId(a["product_id"]))// ;

            var getDbProductIds = await Product.distinct('_id', { _id: { $in: getProductIds } });

            getDbProductIds.forEach((itm, i) => {
                getDbProductIds[i] = itm.toString()
            })

            let errMsg = ""
            var result = csvData.map(async function (itm, i) {

                let checkAttributeTerms = []

                Object.keys(itm).filter(item => {
                    if (item.includes('attribute:')) {
                        if (itm[item] && itm[item] != '')
                            checkAttributeTerms.push({ name: item.substr(item.indexOf(":") + 1, item.length), terms: (itm[item] && itm[item] != "") ? itm[item] : "" })
                    }
                })

                let validationData = await helper.importProductVariationObjectValidation(errMsg, itm, getDbProductIds, checkAttributeTerms, 'product_id')
                itm = validationData.itm
                errMsg = validationData.errMsg

                csvDataCopy2.push(validationData.itm)
            })
            var result = csvData.filter(function (itm, i) {
                return (
                    itm.rowStatus == "success"
                )
            });

            let finalResult = [];
            let groupData = await helper.groupByKey(result, "product_id")
            console.log("groupData :", groupData);

            for (const key in groupData) {
                if (groupData.hasOwnProperty(key)) {
                    let elementData = groupData[key];
                    console.log("elementData :", elementData);

                    let productData = await Product.findById(ObjectId(elementData[0].product_id))
                    if (!productData) {
                        return;
                    }
                    let attributeArr = []
                    let variationArr = []


                    for (let i = 0; i < elementData.length; i++) {
                        const element = elementData[i];

                        let obj = { ...element }
                        let variationAttr = []

                        await Promise.all(Object.keys(element).map(async item => {
                            if (item.includes('attribute:')) {
                                let attributeName = item.substr(item.indexOf(":") + 1, item.length)
                                let termName = (element[item] && element[item] != "") ? element[item] : ""

                                if (!termName)
                                    return;

                                let termsData = await attributeTerms.findOneAndUpdate({ name: termName }, { $set: { name: termName } }, { upsert: true, new: true })
                                let termsObj = { _id: termsData._id, name: termsData.name }
                                variationAttr.push(termsObj)

                                let attributedata = await attributeTable.findOneAndUpdate({ name: attributeName, storeType: productData.storeType, vendor: productData.vendor },
                                    {
                                        $set: {
                                            name: attributeName,
                                            storeType: productData.storeType,
                                            vendor: productData.vendor
                                        },
                                        $addToSet: { terms: termsData._id },

                                    }, { upsert: true, new: true })
                                let checkAttribute = false
                                for (let i = 0; i < attributeArr.length; i++) {
                                    let itm = attributeArr[i];
                                    if (itm._id.toString() == attributedata._id.toString()) {

                                        checkAttribute = true
                                        let checkterms = itm.terms.find(termsValue => {
                                            return termsValue._id.toString() == termsObj._id.toString()
                                        })
                                        if (checkterms == undefined)
                                            attributeArr[i] = ({ _id: attributedata._id, name: attributedata.name, terms: [...itm.terms, termsObj] })
                                    }
                                }
                                if (checkAttribute == false)
                                    attributeArr.push({ _id: attributedata._id, name: attributedata.name, terms: [termsObj] })

                            }
                        }))


                        if (variationAttr.length > 0) {
                            obj["attributes"] = variationAttr
                            if (element.manage_stock && element.manage_stock.toLowerCase() == "true")
                                obj.manage_stock = true
                            else
                                obj.manage_stock = false
                            let variations = await productVariation.create(obj)
                            variationArr.push(variations._id)
                        }
                    }

                    productData = await Product.findByIdAndUpdate(ObjectId(elementData[0].product_id),
                        {
                            $set: {
                                type: "variable",
                                attributes: attributeArr
                            },
                            $addToSet: {
                                variations: variationArr
                            }
                        }, { new: true })

                    finalResult.push(productData)
                }
            }
            let obj = {
                type: "VARIATION_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import variation",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "VARIATION_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });



            res.json(helper.showSuccessResponse('PRODUCT_VARIATION_CSV_IMPORTED', { finalResult }));

            if (csvDataCopy2.length > 0) {
                //storeData.email
                let to = storeData.email
                let sub = "Import product variation CSV"
                let msg = "Import product variation csv data."
                csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)


                let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                if (csvEmailData.status)
                    await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importProductVariationCSV_" + new Date().getTime() + ".csv")
            }


        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importProductCSVCombined: async (req, res) => {
        try {
            let data = req.body
            let storeData = await Store.findById(ObjectId(data.store))

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let storeTypeData = await storeType.findById(ObjectId(data.storeType))

            let csvData = req.body.csvData
            let originalGroupByData = req.body.originalGroupByData
            let errMsg = req.body.errMsg

            var result = csvData.filter(function (itm) {

                if (storeTypeData.storeType === "FOOD")
                    delete itm.brand
                else
                    delete itm.addons

                return (
                    itm.rowStatus == "success"
                )
            });
            console.log("result :", result);
            let obj = {
                type: "PRODUCT_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import product",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "PRODUCT_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });

            let finalResult = [];
            let resData = []
            await Promise.all(result.map(async element => {
                let obj = { ...element }

                let ImageIdsArr = []
                obj.storeType = req.body.storeType
                obj.vendor = req.body.vendor


                if (element.manage_stock && element.manage_stock.toLowerCase() == "true")
                    obj.manage_stock = true
                else
                    obj.manage_stock = false

                if (!ObjectId.isValid(element.featured_image)) {
                    let resdata = await File.addMultipleFile([{ link: element.featured_image }])

                    if (resdata != null) {
                        obj.featured_image = resdata[0]._id
                        ImageIdsArr.push(resdata[0]._id)
                    }
                }
                if (element.images) {
                    element.images = element.images.replace(/\s/g, "").split(',')
                    let imgUrlArr = []
                    let imgIdsArr = []

                    element.images.map(async item => {
                        if (!ObjectId.isValid(item))
                            imgUrlArr.push({ link: item })
                        else
                            imgIdsArr.push(item)
                    })

                    if (imgUrlArr.length > 0) {

                        let resdata = await File.addMultipleFile(imgUrlArr)

                        if (resdata != null) {
                            obj.images = imgIdsArr
                            resdata.forEach((item) => {
                                obj.images.push(item._id)
                                ImageIdsArr.push(item._id)

                            })
                        }
                    }
                    else
                        obj.images = imgIdsArr
                }
                let data1 = await Product.addProductCSV(obj)

                if (data1) {
                    resData.push(data1)
                    await File.updateMany({ _id: { $in: ImageIdsArr } }, { $set: { productId: data1._id, vendor: data1.vendor, storeType: data1.storeType } })
                }
                finalResult.push(obj)
            }));
            finalResult = finalResult;

            let csvDataCopy = []
            let getSNO = resData.map(a => a["SNO"])// ;

            for (const key in originalGroupByData) {
                if (originalGroupByData.hasOwnProperty(key)) {
                    let element = originalGroupByData[key];

                    for (let index = 0; index < element.length; index++) {
                        delete element[index].variations;
                        delete element[index].attributes;

                        csvDataCopy.push(element[index])
                    }
                }
            }

            let csvResult = []
            resData.forEach(element => {

                let fdata = {
                    "Order Id": element._id,
                    "Store Type ": element.storeType,
                    "Vegan type": element.veganType,
                    "Name": element.name,
                    "SKU": element.sku,
                    "price": element.price,
                    "Date": new Date(element.date_created_utc).toLocaleDateString()
                }
                csvResult.push(fdata);
            });

            res.setHeader('Content-disposition', 'attachment; filename=product.csv');
            res.set('Content-Type', 'text/csv');
            res.csv(csvResult, true, {
                "Access-Control-Allow-Origin": "*"
            }, 200);

            if (csvDataCopy.length > 0) {
                //storeData.email
                let to = storeData.email
                let sub = "Import product CSV"
                let msg = "Import product csv data."
                csvDataCopy = csvDataCopy.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)


                let csvEmailData = await helper.json2csv(csvDataCopy, Object.keys(csvDataCopy[0]))

                if (csvEmailData.status)
                    await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importCombinedProductCSV_" + new Date().getTime() + ".csv")
            }

        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importDriverViaCSV: async (req, res) => {
        try {
            let data = req.body;

            let store = req.store;
            data.store = store.storeId;

            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let storebankFields = storeData.bankFields


            let file = req.file
            console.log("storebankFields :", storebankFields);

            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));


            let filePath = req.file.path
            let csvData = await helper.csvToJson(filePath)

            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i + 1
            }
            const csvDataCopy = csvData
            let csvDataCopy2 = []

            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local
            csvData = [...new Map(csvData.map(item => [item["email"], item])).values()]

            let getEmails = csvData.map(a => a["email"])// ;
            console.log("getEmails :", getEmails);

            const getUserEmail = await User.distinct('email', { email: { $in: getEmails }, store: ObjectId(data.store), role: "DRIVER", status: { $ne: "archived" } });
            console.log("getUserEmail :", getUserEmail);

            let errMsg = ""
            if (getUserEmail.length > 0)
                errMsg = getUserEmail.toString() + " already exist,"
            csvData.map(async function (itm) {
                let validationData = await helper.importObjectValidation(errMsg, itm, getUserEmail, 'Driver', 'email')
                errMsg = validationData.errMsg

                csvDataCopy2.push(validationData.itm)
            })
            var result = csvData.filter(function (itm) {
                return (
                    itm.email
                    && validator.isEmail(itm.email)
                    && !getUserEmail.includes(itm.email)
                    && itm.name && itm.countryCode
                    && itm.mobileNumber
                    && validator.isMobilePhone(itm.mobileNumber)
                    && itm.address && itm.password)
            });
            let obj = {
                type: "DRIVER_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import driver",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "DRIVER_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });
            let finalArray = []
            for (let index = 0; index < result.length; index++) {
                let element = result[index];
                element.bankFields = storebankFields
                element.store = data.store

                if (element.account_number || element.account_name || element.bank_name || element.routing_number) {
                    element.bankFields.forEach((item, i) => {
                        if (item.label === "Account Number" && element.account_number)
                            element.bankFields[i].value = element.account_number
                        if (item.label === "Account Name" && element.account_name)
                            element.bankFields[i].value = element.account_name
                        if (item.label === "Bank Name" && element.bank_name)
                            element.bankFields[i].value = element.bank_name
                        if (item.label === "Routing Number" && element.routing_number)
                            element.bankFields[i].value = element.routing_number
                    })
                }
                element.countryCode = element.countryCode.trim()
                element.countryCode = (element.countryCode.includes("+") ? element.countryCode : "+" + element.countryCode);
                element.role = "DRIVER";
                element.status = "approved";
                element.onlineStatus = "offline";
                let getHash = await Utils.hashPassword(element.password);

                element.password = getHash.hashedPassword;
                element.salt = getHash.salt;
                let defaultData = storeInitial.getDriverDefaultData();

                element.date_created_utc = new Date();
                element.isBankFieldsAdded = false;
                element = { ...element, ...defaultData };
                finalArray.push(element)
            }

            let getSNO = csvDataCopy2.map(a => a["SNO"])// ;
            for (let j = 0; j < csvDataCopy.length; j++) {
                let element = csvDataCopy[j];
                if (!getSNO.includes(element.SNO)) {
                    element.rowStatus = 'failure'
                    element.reason = 'Duplicate email id.'
                    csvDataCopy2.push(element)
                }

            }


            User.insertMany(finalArray, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    await Promise.all(resdata.map((item) => {
                        emailService.driverRegisterEmail(item);
                    }))

                    res.json(helper.showSuccessResponse('DRIVER_CSV_IMPORTED', resdata));
                    if (csvDataCopy2.length > 0) {
                        //storeData.email
                        let to = storeData.email
                        let sub = "Import driver CSV"
                        let msg = "Import driver csv data."
                        csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)


                        let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                        if (csvEmailData.status)
                            await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importDriverCSV_" + new Date().getTime() + ".csv")
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importUserViaCSV: async (req, res) => {
        try {
            let data = req.body;

            let store = req.store;
            data.store = store.storeId;

            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));


            let filePath = req.file.path
            let csvData = await helper.csvToJson(filePath)
            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i
            }
            const csvDataCopy = csvData
            let csvDataCopy2 = []

            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local
            csvData = [...new Map(csvData.map(item => [item["mobileNumber"], item])).values()]

            let getMobile = csvData.map(a => a["mobileNumber"])// ;

            const getUserMobile = await User.distinct('mobileNumber', { mobileNumber: { $in: getMobile }, store: ObjectId(data.store), role: "USER", status: { $eq: "active" } });
            let errMsg = ""
            if (getUserMobile.length > 0)
                errMsg = getUserMobile.toString() + " already exist,"

            csvData.map(async function (itm) {
                let validationData = await helper.importObjectValidation(errMsg, itm, getUserMobile, 'User', 'mobileNumber')
                errMsg = validationData.errMsg

                csvDataCopy2.push(validationData.itm)
            })

            var result = csvData.filter(function (itm) {
                return (getUserMobile.includes(itm.mobileNumber) == false
                    && itm.mobileNumber
                    && validator.isMobilePhone(itm.mobileNumber) && itm.name
                    && itm.countryCode && itm.email && validator.isEmail(itm.email) && itm.password
                )
            });
            let obj = {
                type: "CUSTOMER_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import customer",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "CUSTOMER_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });
            let finalArray = []
            for (let index = 0; index < result.length; index++) {
                let element = result[index];
                element.store = data.store

                element.role = "USER";
                let getHash = await Utils.hashPassword(element.password);
                element.countryCode = element.countryCode.trim()
                element.countryCode = (element.countryCode.includes("+") ? element.countryCode : "+" + element.countryCode);
                element.password = getHash.hashedPassword;
                element.salt = getHash.salt;
                element.status = "active";
                element.date_created_utc = new Date();
                element.isLoginFromSocial = false;
                finalArray.push(element)
            }
            let getSNO = csvDataCopy2.map(a => a["SNO"])// ;
            for (let j = 0; j < csvDataCopy.length; j++) {
                let element = csvDataCopy[j];
                if (!getSNO.includes(element.SNO)) {
                    element.rowStatus = 'failure'
                    element.reason = 'Duplicate mobile number.'
                    csvDataCopy2.push(element)
                }

            }
            User.insertMany(finalArray, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('CUSTOMER_CSV_IMPORTED', resdata));
                    if (csvDataCopy2.length > 0) {
                        let to = storeData.email
                        let sub = "Import customer CSV"
                        let msg = "Import customer csv data."
                        csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)

                        let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                        if (csvEmailData.status)
                            await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importCustomerCSV_" + new Date().getTime() + ".csv")
                    }
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importRestaurantsViaCSV: async (req, res) => {
        try {
            let data = req.body;

            let store = req.store;
            data.store = store.storeId;
            let storeData = await Store.findById(ObjectId(data.store), 'mailgun email storeName slug googleMapKey')
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let googleMapKey = storeData.googleMapKey ? storeData.googleMapKey.server : ''
            if (!googleMapKey) {
                return res.json(helper.showValidationErrorResponse('GOOGLEMAP_KEY_NOT_SETUP'));
            }
            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));


            let filePath = req.file.path
            let csvData = await helper.csvToJson(filePath)

            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i
            }
            const csvDataCopy = csvData
            let csvDataCopy2 = []

            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local
            csvData = [...new Map(csvData.map(item => [item["email"], item])).values()]
            let getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);
            let storeTypeName = getStoreType.storeType;
            let deliveryType = getStoreType.deliveryType ? getStoreType.deliveryType : [];
            let getEmail = csvData.map(a => a["email"])// ;

            const getUserEmail = await User.distinct('email', { email: { $in: getEmail }, store: ObjectId(data.store), role: "VENDOR", status: { $eq: "approved" } });
            let errMsg = ""
            if (getUserEmail.length > 0)
                errMsg = getUserEmail.toString() + " already exist ,"
            csvData.map(async function (itm) {
                let validationData = await helper.importObjectValidation(errMsg, itm, getUserEmail, 'Vendor', 'email')
                errMsg = validationData.errMsg

                csvDataCopy2.push(validationData.itm)
            })
            var result = csvData.filter(function (itm) {

                return (
                    itm.email && validator.isEmail(itm.email)
                    && !getUserEmail.includes(itm.email) && itm.mobileNumber
                    && validator.isMobilePhone(itm.mobileNumber) && itm.name && itm.countryCode
                    && itm.password
                    && itm.address
                )
            });
            let obj = {
                type: "VENDOR_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import vendor",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "VENDOR_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });

            let finalArray = []
            for (let index = 0; index < result.length; index++) {
                let element = result[index];
                element.store = data.store

                element.role = "VENDOR";
                element.countryCode = element.countryCode.trim()
                element.countryCode = (element.countryCode.includes("+") ? element.countryCode : "+" + element.countryCode);

                let getHash = await Utils.hashPassword(element.password);
                element.password = getHash.hashedPassword;
                element.salt = getHash.salt;

                element.status = "approved";
                element.date_created_utc = new Date();
                element.isLoginFromSocial = false;

                element.storeType = data.storeTypeId
                let deliveryTypeData = [];
                let checkData = true;
                if (element.deliveryType) {
                    deliveryTypeData = element.deliveryType.toUpperCase().split(',')
                    if (deliveryTypeData.length > 2)
                        deliveryTypeData.length = 2
                    deliveryTypeData.forEach((item) => {
                        if (!["TAKEAWAY", "DELIVERY"].includes(item))
                            checkData = false
                    })

                }
                element.deliveryType = (deliveryTypeData.length > 0 && checkData) ? deliveryTypeData : deliveryType;
                let geoCodeData = await google.getLatLngFromAddress(googleMapKey, element.address)
                if (geoCodeData.lat && geoCodeData.lng) {
                    let location = { type: "Point", coordinates: [Number(geoCodeData.lng), Number(geoCodeData.lat)] };
                    element.userLocation = location;
                }
                element.onlineStatus = "online";
                let defaultData = await storeInitial.getVendorDefaultData(element, data.storeTypeId);

                defaultData.pricePerPerson = element.pricePerPerson ? element.pricePerPerson : defaultData.pricePerPerson
                defaultData.minOrderAmont = element.minOrderAmount ? element.minOrderAmount : defaultData.minOrderAmont
                defaultData.taxAmount = element.taxAmount ? element.taxAmount : defaultData.taxAmount
                defaultData.orderPreparationTime = element.orderPreparationTime ? element.orderPreparationTime : defaultData.orderPreparationTime

                if (element.pricePerPerson) delete element.pricePerPerson;
                if (element.minOrderAmount) delete element.minOrderAmount
                if (element.taxAmount) delete element.taxAmount
                if (element.orderPreparationTime) delete element.orderPreparationTime


                element = { ...element, ...defaultData };
                if (element.userLocation)
                    finalArray.push(element)
                else {
                    csvDataCopy2.map((item, i) => {
                        if (item.SNO === element.SNO) {
                            csvDataCopy2[i]['rowStatus'] = 'failure'
                            csvDataCopy2[i]['reason'] = 'Address is not valid.'
                        }

                    })
                }
            }
            let getSNO = csvDataCopy2.map(a => a["SNO"])// ;
            for (let j = 0; j < csvDataCopy.length; j++) {
                let element = csvDataCopy[j];
                if (!getSNO.includes(element.SNO)) {
                    element.rowStatus = 'failure'
                    element.reason = 'Duplicate email id.'
                    csvDataCopy2.push(element)
                }

            }


            User.insertMany(finalArray, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('VENDOR_CSV_IMPORTED', resdata));
                    if (csvDataCopy2.length > 0) {
                        let to = storeData.email
                        let sub = "Import vendor CSV"
                        let msg = "Import vendor csv data."
                        csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)


                        let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                        if (csvEmailData.status)
                            await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importVendorCSV_" + new Date().getTime() + ".csv")
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },



    getUserExports: async (req, res) => {
        try {
            let store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            obj.role = "USER";
            obj.status = { $ne: "archived" };

            User.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "User Id": element._id,
                            "Name": element.name,
                            "Email": element.email,
                            "Country Code": element.countryCode,
                            "Mobile Number": element.mobileNumber,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }
                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=customers.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getDriverExports: async (req, res) => {
        try {
            let store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            obj.role = "DRIVER";
            obj.status = { $ne: "archived" };

            User.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "userId": element._id,
                            "Name": element.name,
                            "Email": element.email,
                            "Country Code": element.countryCode,
                            "Mobile Number": element.mobileNumber,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }
                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=drivers.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getVendorExports: async (req, res) => {
        try {
            let store = req.store;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};
            obj.storeType = { $in: [ObjectId(storeTypeId)] };
            obj.role = "VENDOR";
            obj.status = { $ne: "archived" };

            User.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "userId": element._id,
                            "Name": element.name,
                            "Email": element.email,
                            "Country Code": element.countryCode,
                            "Mobile Number": element.mobileNumber,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }
                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=vendors.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getVendorProductsExports: async (req, res) => {
        try {
            let store = req.store;
            let id = req.params._id;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};
            obj.vendor = ObjectId(id);
            obj.storeType = ObjectId(storeTypeId);
            obj.status = { $ne: "archived" };

            Product.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "ProductId": element._id,
                            "Name": element.name,
                            "SKU": element.sku,
                            "Price": element.price,
                            "Compare Price": element.compare_price,
                            "Stock Status": element.stock_status,
                            "Manage Stock": element.manage_stock,
                            "Stock Quantity": element.stock_quantity,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }
                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=products.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getVendorCategoriesExports: async (req, res) => {
        try {
            let store = req.store;
            let id = req.params._id;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};
            obj.vendor = ObjectId(id);
            obj.storeType = ObjectId(storeTypeId);
            obj.status = { $ne: "archived" };

            const getStoreType = await storeType.getStoreTypeByIdAsync(storeTypeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }

            let sortByField = "sortOrder";
            let sortOrder = 1;

            Category.aggregate([
                { $match: obj },
                { $sort: { [sortByField]: parseInt(sortOrder) } },
            ], function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {
                        let fdata = {
                            "CategoryId": element._id,
                            ...(["GROCERY"].includes(getStoreType.storeType) ? { "Parent": element.parent } : {}),
                            "catName": element.catName,
                            ...(["GROCERY"].includes(getStoreType.storeType) ? { "Description": element.catDesc } : {}),
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }

                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=products.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            })
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getVendorBrandsExports: async (req, res) => {
        try {
            let store = req.store;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};
            obj.storeType = ObjectId(storeTypeId);
            obj.status = { $ne: "archived" };

            Cuisine.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "Name": element.name,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }

                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=brands.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            })
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getTransactionsExports: async (req, res) => {
        try {
            const query = req.query;
            let store = req.store;
            let id = req.params._id;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};

            obj.store = ObjectId(store.storeId);

            if (query.type) {
                obj['$and'] = [
                    { $or: [{ userType: 'VENDOR' }, { userType: 'DRIVER' }] }
                ]

                obj.type = query.type;
            } else if (query.user) {
                obj.payment_to = ObjectId(query.user);
            } else {
                obj.userType = "ADMIN";
            }

            obj.status = { $ne: "archived" };

            paymentLedger.aggregate([
                { $match: obj, },
                { $lookup: { from: 'stores', localField: 'store', foreignField: '_id', as: 'store' } },
                { $lookup: { from: 'users', localField: 'payment_to', foreignField: '_id', as: 'customerDetails' } },
                { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } },
                { $project: { store: 1, payment_to: 1, order: 1, payment_by: 1, type: 1, userType: 1, description: 1, amount: 1, adminVendorEarning: 1, adminDeliveryBoyEarning: 1, balance: 1, date_created_utc: 1, customerDetails: { _id: 1, name: 1 }, storeType: { _id: 1, storeType: 1 } } }
            ], function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {
                        let fdata = {
                            "Time": moment(element.date_created_utc).format("DD MMM YYYY, LT"),
                            "Type": element.type.toUpperCase(),
                            "Amount": element.store.currency.sign + element.amount,
                            ...(query.type ? {
                                "Name": element.customerDetails && element.customerDetails.name || ""
                            } : query.user ? {
                                "Name": element.customerDetails && element.customerDetails.name || "",
                                "Balance": element.store.currency.sign + element.balance
                            } : {
                                "Earning": element.store.currency.sign + element.balance
                            }),
                            "Description": element.description
                        }

                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=transactions.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            })
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
}