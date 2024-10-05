const Product = require('../models/productsTable');
const User = require('../models/userTable');
const productVariation = require('../models/productVariationTable');
const attributeTerms = require('../models/attributeTermsTable');
const attributeTable = require('../models/attributeTable');
const categoryTable = require('../models/categoryTable');
const addonTable = require('../models/addonTable');
const cuisinesTable = require('../models/cuisinesTable');
const storeTypeTable = require('../models/storeTypeTable');
const Validation = require('../middleware/validation/product');
const Review = require('../models/productReviewTable');
const ObjectId = require('objectid');
const Config = require('../config/constants.json');
const File = require('../models/fileTable.js');
const awsimageuploadFromUrl = require('../lib/awsimageuploadFromUrl');
var isCorrupted = require('is-corrupted-jpeg');
const csv = require('csv-express')
const logTable = require('../models/logTable')
const mailgunSendEmail = require('../lib/mailgunSendEmail');
const Store = require('../models/storeTable');
const storeType = require("../models/storeTypeTable");

module.exports = {
    test: async (req, res) => {
        let url = req.body.url
        awsimageuploadFromUrl(url, (err, result) => {

            console.log("err, result :", err, result);


            return res.send({ err, result })
        })

    },
    importProductCSV: async (req, res) => {
        try {
            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));
            // console.log("body :", req.body);
            let data = req.body
            data.store = req.store.storeId
            let storeData = await Store.findById(ObjectId(data.store)).populate("owner")
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            if (!data.storeType)
                return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
            if (!data.vendor)
                return res.json(helper.showValidationErrorResponse("VENDOR_ID_IS_REQUIRED"));


            res.json(helper.showSuccessResponse('CSV_IMPORTED', {})); // data will continue its execution


            let storeTypeData = await storeTypeTable.findById(ObjectId(data.storeType))


            let csvData = req.body.csvData
            //console.log("csvData", csvData)
            let originalGroupByData;
            let errMsg = ""
            if (storeTypeData.storeType === "FOOD") {
                originalGroupByData = req.body.originalGroupByData
                errMsg = req.body.errMsg
            }


            const csvDataCopy = csvData
            let csvDataCopy2 = []


            await Promise.all(csvData.map(async function (itm, i) {
                let checkCat = [];
                let checkAddon = [];
                let checkBrand;

                if (storeTypeData.storeType != "FOOD") {
                    itm.categories = (itm.categories && itm.categories != "") ? itm.categories.split(',') : [];
                    // console.log("itm.categories :",itm.categories);\


                    itm.brand = (itm.brand && itm.brand != "") ? itm.brand.split(',')[0] : "";
                    if (itm.brand && itm.brand != "") {
                        checkBrand = await cuisinesTable.findOne({ status: "active", name: itm.brand, store: ObjectId(data.store), storeType: ObjectId(req.body.storeType) }) // except food store 
                    }
                    else {
                        delete itm.brand
                    }

                    let validationData = await helper.importProductObjectValidation(errMsg, itm, checkCat, checkAddon, checkBrand, storeTypeData.storeType)
                    errMsg = validationData.errMsg
                    csvData[i] = validationData.itm
                    csvDataCopy2.push(validationData.itm)
                }
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
            // console.log("result :", result);
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
            for (let i3 = 0; i3 < result.length; i3++) {
                const element = result[i3];

                let obj = { ...element }
                if (element.categories.length > 0) {
                    for (let index = 0; index < element.categories.length; index++) {
                        const element2 = element.categories[index];
                        let query = {
                            catName: element2,
                            status: "active",
                            storeType: ObjectId(data.storeType),
                            vendor: ObjectId(req.body.vendor)
                        }
                        let update = {
                            catName: element2,
                            status: "active",
                            storeType: ObjectId(data.storeType),
                            vendor: ObjectId(req.body.vendor),
                        }

                        let getData = await categoryTable.findOne(query)

                        let catData;
                        if (getData)
                            catData = await categoryTable.findOneAndUpdate({ _id: getData._id }, update, { new: true });
                        else
                            catData = await categoryTable.create(update)

                        element.categories[index] = catData._id
                    }
                }
                if (storeTypeData.storeType === "FOOD")
                    obj.type = "simple";

                let ImageIdsArr = []
                obj.storeType = req.body.storeType;
                obj.pricingType = "unit";
                obj.vendor = req.body.vendor;


                if (element.manage_stock && element.manage_stock.toLowerCase() == "true")
                    obj.manage_stock = true
                else
                    obj.manage_stock = false
                if (element.featured_image == "" || !element.featured_image)
                    delete obj.featured_image
                if (element.images == "" || !element.images)
                    delete obj.images

                if (element.status == "" || !element.status)
                    obj.status = "active"

                if (storeTypeData.storeType === "FOOD" && (element.veganType == "" || !element.veganType))
                    obj.veganType = "veg"

                if (element.featured_image && !ObjectId.isValid(element.featured_image)) {
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
            }
            finalResult = finalResult;


            // let csvDataCopy = []
            let getSNO = resData.map(a => a["SNO"])// ;
            for (const key in originalGroupByData) {
                if (originalGroupByData.hasOwnProperty(key)) {
                    let element = originalGroupByData[key];


                    for (let index = 0; index < element.length; index++) {
                        delete element[index].variations;
                        delete element[index].attributes;

                        csvDataCopy2.push(element[index])
                    }
                }
            }

            // download imported csv code start
            let csvResult = []
            if (storeTypeData.storeType === "FOOD")
                csvResult = csvDataCopy2
            else
                resData.forEach(element => {

                    let fdata = {
                        "Product Id": element._id,
                        "Store Type ": element.storeType,
                        "Vegan type": element.veganType,
                        "Name": element.name,
                        "SKU": element.sku,
                        "price": element.price,
                        "Date": new Date(element.date_created_utc).toLocaleDateString()
                    }
                    csvResult.push(fdata);
                });
            // if (csvResult.length > 0) {
            //     res.setHeader('Content-disposition', 'attachment; filename=product.csv');
            //     res.set('Content-Type', 'text/csv');
            //     res.csv(csvResult, true, {
            //         "Access-Control-Allow-Origin": "*"
            //     }, 200);
            // }
            // else
            //     res.json(helper.showValidationResponseWithData('PRODUCT_CSV_NOT_IMPORTED', {}));
            // download imported csv code end

            if (csvDataCopy2.length > 0) {
                //storeData.email
                let to = storeData.owner.email
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
            let storeData = await Store.findById(ObjectId(data.store)).populate("owner")

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
            const csvDataCopy = csvData
            let csvDataCopy2 = []

            let getProductIds;
            try {
                getProductIds = csvData.map(a => ObjectId(a["product_id"]))// ;

            } catch (error) {
                return res.json(helper.showValidationErrorResponse('WRONG_PRODUCT_ID'));

            }

            res.json(helper.showSuccessResponse('CSV_IMPORTED', {})); // data will continue its execution


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

                // let checkAttributeTerms = []

                // Object.keys(itm).filter(item => {
                //     if(item.includes('attribute:')){
                //         if(itm[item] && itm[item] != '')
                //         checkAttributeTerms.push({name:item.substr(item.indexOf(":")+1,item.length),terms:(itm[item] && itm[item] != '') ? itm[item].split("|") : []})
                //     }
                // })

                return (
                    itm.rowStatus == "success"
                    // checkAttributeTerms.length > 0
                    // && getDbProductIds.includes(itm.product_id) 
                    // && itm.product_id 
                    // && itm.price 
                    // && itm.sku 
                    // && itm.stock_status
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

                            let checkVariation = await productVariation.findOne({ sku: obj.sku })
                            let variations;
                            if (!checkVariation) {
                                variations = await productVariation.create(obj)
                                variationArr.push(variations._id)
                            }
                            else {
                                variations = await productVariation.findOneAndUpdate({ sku: obj.sku }, obj, { new: true })
                                variationArr.push(variations._id)
                            }

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

            // if (csvDataCopy2.length > 0) {
            //     res.setHeader('Content-disposition', 'attachment; filename=combinedProduct.csv');
            //     res.set('Content-Type', 'text/csv');
            //     res.csv(csvDataCopy2, true, {
            //         "Access-Control-Allow-Origin": "*"
            //     }, 200);
            // }
            // else
            // res.json(helper.showValidationResponseWithData('VARIATION_CSV_NOT_IMPORTED', {}));



            if (csvDataCopy2.length > 0) {
                //storeData.email
                let to = storeData.owner.email
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
            let storeData = await Store.findById(ObjectId(data.store)).populate("owner")

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let storeTypeData = await storeTypeTable.findById(ObjectId(data.storeType))

            let csvData = req.body.csvData
            let originalGroupByData = req.body.originalGroupByData
            let errMsg = req.body.errMsg


            console.log("csvData :", csvData);

            var result = csvData.filter(function (itm) {

                if (storeTypeData.storeType === "FOOD")
                    delete itm.brand
                else
                    delete itm.addons

                return (
                    itm.rowStatus == "success"
                )
            });

            res.json(helper.showSuccessResponse('CSV_IMPORTED', {})); // data will continue its execution



            // console.log("result :", result);
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
            for (let i3 = 0; i3 < result.length; i3++) {
                const element = result[i3];

                let obj = { ...element }

                if (element.categories.length > 0) {
                    for (let index = 0; index < element.categories.length; index++) {
                        const element2 = element.categories[index];
                        let query = {
                            catName: element2,
                            status: "active",
                            storeType: ObjectId(data.storeType),
                            vendor: ObjectId(req.body.vendor)
                        }
                        let update = {
                            catName: element2,
                            status: "active",
                            // parent: "none",
                            storeType: ObjectId(data.storeType),
                            vendor: ObjectId(req.body.vendor)
                        }

                        let getData = await categoryTable.findOne(query)
                        let catData;
                        if (getData)
                            catData = await categoryTable.findOneAndUpdate({ _id: getData._id }, update, { new: true });
                        else
                            catData = await categoryTable.create(update)

                        element.categories[index] = catData._id
                    }
                }


                let ImageIdsArr = []
                obj.storeType = req.body.storeType
                obj.vendor = req.body.vendor


                if (element.manage_stock && element.manage_stock.toLowerCase() == "true")
                    obj.manage_stock = true
                else
                    obj.manage_stock = false

                if (element.featured_image == "" || !element.featured_image)
                    delete obj.featured_image
                if (element.images == "" || !element.images)
                    delete obj.images

                if (element.status == "" || !element.status)
                    obj.status = "active"

                if (storeTypeData.storeType === "FOOD" && (element.veganType == "" || !element.veganType))
                    obj.veganType = "veg"

                if (element.featured_image && !ObjectId.isValid(element.featured_image)) {
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
                // console.log("data1 :", data1);

                if (data1) {
                    resData.push(data1)
                    await File.updateMany({ _id: { $in: ImageIdsArr } }, { $set: { productId: data1._id, vendor: data1.vendor, storeType: data1.storeType } })
                }
                finalResult.push(obj)
            }
            finalResult = finalResult;

            let csvDataCopy = []
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
            csvResult = csvDataCopy
            // resData.forEach(element => {

            //     let fdata = {
            //         "Order Id": element._id,
            //         "Store Type ": element.storeType,
            //         "Vegan type": element.veganType,
            //         "Name": element.name,
            //         "SKU": element.sku,
            //         "price": element.price,
            //         "Date": new Date(element.date_created_utc).toLocaleDateString()
            //     }
            //     csvResult.push(fdata);
            // });


            // if (csvResult.length > 0) {
            //     res.setHeader('Content-disposition', 'attachment; filename=combinedProduct.csv');
            //     res.set('Content-Type', 'text/csv');
            //     res.csv(csvResult, true, {
            //         "Access-Control-Allow-Origin": "*"
            //     }, 200);
            // }
            // else
            //     res.json(helper.showValidationResponseWithData('PRODUCT_CSV_NOT_IMPORTED', {}));

            //res.json(helper.showSuccessResponse('CSV_IMPORTED', {}));


            if (csvDataCopy.length > 0) {
                //storeData.email
                let to = storeData.owner.email
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
    ProductMiddleware: async (req, res) => {
        try {
            let data = req.body;

            if (data.storeTypeName && Config.SERVICES.includes(data.storeTypeName.toUpperCase()) && !["FOOD", "SERVICEPROVIDER", "AIRBNB", "CARRENTAL"].includes(data.storeTypeName.toUpperCase())) {
                data.storeTypeName = "GROCERY";
            }
            let func1 = data.action + "ProductBy" + helper.capitalize(data.storeTypeName.toLowerCase()) + "Vendor";
            let func2 = data.action + "ProductData";

            if (data.action === "view" && data.method === 'get') {
                func1 = data.action + "ProductDefault";
                func2 = data.action + "ProductBy" + helper.capitalize(data.storeTypeName.toLowerCase()) + "Vendor";
            }

            if (data.action === "view" && data.method === 'post') {
                func1 = data.action + "ProductList";
                func2 = data.action + "ProductListByFilter";
            }

            if (data.action === 'delete') {
                func1 = data.action + "ProductDefault";
            }

            console.log("func1:", func1, "\nfunc2:", func2)

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
                    Validation[data.action + "ProductDefault"](req, res, () => {
                        module.exports[func2](req, res);
                    });
                    break;
            }
        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    createProductData: async (req, res) => {
        try {
            let data = req.body;

            Product.addProduct(data, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewProductData: async (req, res) => {
        try {
            let id = req.params._id;

            Product.getProductById(id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getProductsListById: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Product.getProductById(product_id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewProductByFoodVendor: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            Product.getProductByIdFood(product_id, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    viewProductByAirbnbVendor: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Product.getProductByIdAirbnb(product_id, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewProductByServiceproviderVendor: async (req, res) => {
        try {
            let product_id = req.params._id;
            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            Product.getProductByIdFood(product_id, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    viewProductByCarrentalVendor: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Product.getProductByIdCarRental(product_id, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    viewProductByGroceryVendor: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Product.getProductByIdGrocery(product_id, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewProductByGroceryVendorFrontend: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Product.getProductByIdGroceryForFrontend(product_id, async (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                    } else {

                        if (resdata.status != "active") {
                            return res.json(helper.showValidationErrorResponse('PRODUCT_IS_NOT_AVAILABLE'));
                        }
                        if (resdata.bestSeller && resdata.bestSeller === true)
                            resdata.bestSeller = "yes"
                        else
                            resdata.bestSeller = "no"
                        if (resdata.type === 'variable') {
                            await Promise.all(resdata.variations.map(element => {
                                let variation_id = [];
                                let variation_title = [];
                                element.attributes.forEach(attribute => {
                                    variation_id.push(attribute._id.toString());
                                    variation_title.push(attribute.name.toString());
                                });

                                element.set('variation_id', variation_id.join('~'), { strict: false });
                                element.set('variation_title', variation_title.join('/'), { strict: false });
                            }));
                        }
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getProductsListBySlug: async (req, res) => {
        try {
            let product_id = req.params.slug;
            let user = req.user;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('SLUG_IS_REQUIRED'));
            }

            Product.getProductBySlug(product_id, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateProductData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_REQUIRED'));
            }

            Product.updateProduct(data, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeProductData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_REQUIRED'));
            }

            Product.removeProduct(data._id, (err, resdata) => {
                if (err || resdata == null) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    deleteProductData: async (req, res) => {
        try {
            let data = req.body;
            let ids = [];
            let update = {};

            if (data._id.constructor === Array) {
                if (data._id.length === 0) {
                    return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
                }

                data._id.forEach(element => {
                    ids.push(ObjectId(element));
                });

                if (data.bestSeller) {
                    update.bestSeller = (data.bestSeller == "true" ? true : false);
                } else {
                    update.status = data.status;
                }
            } else {
                ids.push(ObjectId(data._id));
                update.status = 'archived';
            }

            data._id = ids;

            Product.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    module.exports.removeServiceFromProvider(data._id)
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewProductListByFilter: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, storeTypeName, vendor, fields, search, categories } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let obj = {};

            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }

            if (vendor) {
                obj.vendor = ObjectId(vendor);
            }

            if (categories) {
                obj.categories = ObjectId(categories);
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

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ name: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ short_description: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ description: { $regex: search || '', $options: 'i' } })
            }

            let count = await Product.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let countdata = count[0] ? count[0].count : 0;

            Product.getProductsList(obj, pageSize, sortByField, sortOrder, paged, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponseCount('ITEM_DATA', resdata, countdata));
                }
            });
        } catch (error) {
            console.log("error", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewUserProductListByFilter: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, vendor, category, search } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let store = req.store;
            let obj = {};
            if (!storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }
            const getStoreType = await storeType.getStoreTypeByIdAsync(
                storeTypeId
            );
            if (getStoreType === null) {
                return res.json(
                    helper.showValidationErrorResponse("INVALID_STORE_TYPE")
                );
            }
            if (!vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
            }
            let getVendor = await User.findById(vendor, 'status isVendorAvailable timeSlot');
            if (getVendor.status != "approved") {
                return res.json(helper.showSuccessResponseCount('ITEM_DATA', [], 0));
            }
            let vendorOpenClose = helper.getVendorOpenCloseStatus(getVendor.isVendorAvailable, getVendor.timeSlot, new Date(), store.timezone);
            if (vendorOpenClose.status === "Close") {
                return res.json(helper.showSuccessResponseCount('ITEM_DATA', [], 0));
            }
            obj.vendor = ObjectId(vendor);
            obj.storeType = ObjectId(storeTypeId);
            obj.status = "active";
            obj.stock_status = "instock";
            if (category) {
                obj.categories = { $in: [ObjectId(category)] };
            }
            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ name: { $regex: search || '', $options: 'i' } })
            }
            let count = await Product.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let countdata = count[0] ? count[0].count : 0;
            if (getStoreType && getStoreType.storeType == "ECOMMERCE") {
                Product.getProductsListForUserEcom(obj, pageSize, sortByField, sortOrder, paged, async (err, resdata) => {
                    if (err) {
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        for (let index = 0; index < resdata.length; index++) {
                            if (resdata[index].bestSeller && resdata[index].bestSeller === true)
                                resdata[index].bestSeller = "yes"
                            else
                                resdata[index].bestSeller = "no"
                        }
                        return res.json(helper.showSuccessResponseCount('ITEM_DATA', resdata, countdata));
                    }
                });
            } else {
                Product.getProductsListForUser(obj, pageSize, sortByField, sortOrder, paged, async (err, resdata) => {
                    if (err) {
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        for (let index = 0; index < resdata.length; index++) {
                            if (resdata[index].bestSeller && resdata[index].bestSeller === true)
                                resdata[index].bestSeller = "yes"
                            else
                                resdata[index].bestSeller = "no"
                        }
                        return res.json(helper.showSuccessResponseCount('ITEM_DATA', resdata, countdata));
                    }
                });
            }

        } catch (error) {
            console.log("error", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archiveProductData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('CATEGORY_ID_REQUIRED'));
            }

            data.status = "archived";

            Product.updateProduct(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('PRODUCT_DELETED', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addProductReview: async (req, res) => {
        try {
            let data = req.body;

            if (!data.product_id) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_REQUIRED'));
            }

            var getProduct = await Product.getProductByIdAsync(data.product_id);

            if (getProduct == null) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_NOT_VALID'));
            }

            if (!data.reviewer) {
                return res.json(helper.showValidationErrorResponse('REVIEWR_NAME_IS_REQUIRED'));
            };

            if (!data.reviewer_email) {
                return res.json(helper.showValidationErrorResponse('REVIEWR_EMAIL_IS_REQUIRED'));
            };

            if (!data.review) {
                return res.json(helper.showValidationErrorResponse('REVIEW_IS_REQUIRED'));
            }

            if (!data.rating) {
                return res.json(helper.showValidationErrorResponse('REVIEW_RATING_IS_REQUIRED'));
            }

            Review.addReview(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    //update product avg rating
                    module.exports.updateProductAvgRating(getProduct, resdata._id);
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateProductAvgRating: async (data, reviewId) => {

        Review.aggregate([
            {
                "$match": {
                    $and: [{ rating: { "$exists": true, "$gt": 0 } },
                    { product_id: data._id.toString() }
                    ]
                }
            },
            { $group: { _id: "$product_id", average_rating: { $avg: "$rating" } } }
        ]
            , (err, resdata) => {
                if (err) {
                    console.log("error in finding product avg,rating!");
                } else {
                    let rating_count = data.rating_count ? data.rating_count : 0;

                    var reviewDetails = {
                        productId: data._id,
                        reviewId: reviewId,
                        average_rating: helper.roundNumber(resdata[0].average_rating),
                        rating_count: rating_count + 1
                    }
                    Product.updateReviewDetails(reviewDetails, (err, result) => {
                        if (err) {
                            console.log("Unable to update review!", err);
                        } else {
                            console.log("Product rating updated!")
                        }
                    });
                }
            });
    },

    getProductReviews: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_REQUIRED'));
            }

            var getProduct = await Product.getProductByIdAsync(product_id);

            if (getProduct == null) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_NOT_VALID'));
            }

            const getReviews = await Review.find({ product_id: product_id.toString() });

            res.json(helper.showSuccessResponse('DATA_SUCCESS', getReviews));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getProductRelated: async (req, res) => {
        try {
            let product_id = req.params._id;

            if (!product_id) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_REQUIRED'));
            }

            var getProduct = await Product.getProductByIdAsync(product_id);

            if (getProduct == null) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ID_IS_NOT_VALID'));
            }

            let related = [];

            if (getProduct.categories) {
                let getRelated = await Product.find({ status: 'active', categories: { $in: getProduct.categories } }, { _id: 1, name: 1, price: 1, compare_price: 1, featured_image: 1, average_rating: 1, rating_count: 1, brand: 1 })
                    .populate({ path: 'featured_image' })
                    .populate({ path: 'brand' })
                    .exec();

                related = getRelated;
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', related));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeServiceFromProvider: async (serviceId) => {
        try {

            let removeService = await User.updateMany({ serviceId: { $in: serviceId } },
                {
                    $pull: { serviceId: { $in: serviceId } }
                })
            return removeService;
        } catch (error) {
            console.log("error:", error)
        }

    }
}