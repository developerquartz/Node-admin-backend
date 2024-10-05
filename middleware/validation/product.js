const storeTypeTable = require('../../models/storeTypeTable');
const productVariation = require('../../models/productVariationTable');
const Store = require('../../models/storeTable');
const ObjectId = require('objectid');

const attributeTerms = require('../../models/attributeTermsTable');
const attributeTable = require('../../models/attributeTable');
const categoryTable = require('../../models/categoryTable');
const addonTable = require('../../models/addonTable');
const cuisinesTable = require('../../models/cuisinesTable');

module.exports = {

    createProductDefault: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        next();
    },

    updateProductDefault: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        next();
    },

    viewProductDefault: async (req, res, next) => {
        let id = req.params._id;

        if (!id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        next();
    },

    viewProductList: async (req, res, next) => {
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

    deleteProductDefault: async (req, res, next) => {
        let data = req.body;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        next();
    },
    createProductByFoodVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },

    createProductByAirbnbVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }

        /*
        if (data.addons.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_ADDONS_IS_REQUIRED'));
        }
        */

        if (data.images.length === 0) {
            return res.json(helper.showValidationErrorResponse('IMAGE_IS_REQUIRED'));
        }

        if (data.location && data.location.lat && data.location.lng) {
            data.location = { type: "Point", coordinates: [Number(data.location.lng), Number(data.location.lat)] };

        }

        if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        }

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },

    createProductByServiceproviderVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        // if (data.categories.length === 0) {
        //     return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        // }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },
    updateProductByFoodVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },

    updateProductByAirbnbVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }


        if (data.images.length === 0) {
            return res.json(helper.showValidationErrorResponse('IMAGE_IS_REQUIRED'));
        }

        if (data.location && data.location.lat && data.location.lng) {
            data.location = { type: "Point", coordinates: [Number(data.location.lng), Number(data.location.lat)] };

        }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },
    updateProductByServiceproviderVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        // if (data.categories.length === 0) {
        //     return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        // }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },
    createProductByGroceryVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.vendor) {
            return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
        }

        if (!data.type) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_TYPE_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_STATUS_IS_REQUIRED'));
        }

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.stock_status) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_STOCK_STATUS_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (!data.description) {
            return res.json(helper.showValidationErrorResponse('DESCRIPTION_IS_REQUIRED'));
        }

        if (data.images && data.images.length > 0) {
            req.body.images = data.images;
        } else {
            req.body.images = [];
        }

        if (data.type === "variable") {

            if (data.attributes.length === 0) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ATTRIBUTES_IS_REQUIRED'));
            }

            if (data.variations.length === 0) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_VARIATIONS_IS_REQUIRED'));
            }

            let variants = [];
            await Promise.all(data.variations.map(async element => {
                let getVariation = await productVariation.create(element);
                if (getVariation != null) {
                    variants.push(getVariation._id);
                }
            }));
            req.body.variations = variants;
        }

        if (data.short_description) {
            req.body.short_description = data.short_description;
        } else {
            req.body.short_description = null;
        }

        if (data.sku) {
            req.body.sku = data.sku;
        } else {
            req.body.sku = null;
        }

        if (data.manage_stock) {
            req.body.manage_stock = data.manage_stock;
        } else {
            req.body.manage_stock = false;
        }

        if (req.body.manage_stock) {

            if (!data.stock_quantity) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_STOCK_QUANTITY_IS_REQUIRED'));
            }
        }

        next();
    },

    updateProductByGroceryVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.type) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_TYPE_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_STATUS_IS_REQUIRED'));
        }

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.stock_status) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_STOCK_STATUS_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (!data.description) {
            return res.json(helper.showValidationErrorResponse('DESCRIPTION_IS_REQUIRED'));
        }

        if (data.images && data.images.length > 0) {
            req.body.images = data.images;
        } else {
            req.body.images = [];
        }

        if (data.type === "variable") {

            if (data.attributes.length === 0) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_ATTRIBUTES_IS_REQUIRED'));
            }

            if (data.variations.length === 0) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_VARIATIONS_IS_REQUIRED'));
            }

            let variants = [];
            await Promise.all(data.variations.map(async element => {
                if (element._id) {
                    let getVariation = await productVariation.findOneAndUpdate({ _id: element._id }, element, { new: true });
                    if (getVariation != null) {
                        variants.push(getVariation._id);
                    }
                } else {
                    let getVariation = await productVariation.create(element);
                    if (getVariation != null) {
                        variants.push(getVariation._id);
                    }
                }
            }));
            req.body.variations = variants;
        }

        if (data.short_description) {
            req.body.short_description = data.short_description;
        } else {
            req.body.short_description = null;
        }

        if (data.sku) {
            req.body.sku = data.sku;
        } else {
            req.body.sku = null;
        }

        if (data.manage_stock) {
            req.body.manage_stock = data.manage_stock;
        } else {
            req.body.manage_stock = false;
        }

        if (req.body.manage_stock) {

            if (!data.stock_quantity) {
                return res.json(helper.showValidationErrorResponse('PRODUCT_STOCK_QUANTITY_IS_REQUIRED'));
            }
        }

        next();
    },
    importProductCombinedCSV: async (req, res, next) => {
        try {
            let file = req.file
            if (!file) {
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));
            }

            req.body.store = req.store.storeId
            let data = req.body

            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            if (!data.storeType)
                return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
            if (!data.vendor)
                return res.json(helper.showValidationErrorResponse("VENDOR_ID_IS_REQUIRED"));

            let storeTypeData = await storeTypeTable.findById(ObjectId(data.storeType))

            let filePath = file.path
            let csvData = await helper.csvToJson(filePath)
            // for (let i = 0; i < csvData.length; i++) {
            //     csvData[i].SNO = i + 1
            // }
            csvData = csvData.filter((currElement, index) => currElement.SNO = index + 1);

            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local

            let groupData = await helper.groupByKey(csvData, "sku")
            req.body.originalCSVData = JSON.parse(JSON.stringify(csvData));

            let errMsg = "";
            let productFinalData = []
            for (const key in groupData) {
                if (groupData.hasOwnProperty(key)) {
                    let element = groupData[key];
                    let initialProd = element[0];

                    let checkCat = [];
                    let checkAddon = [];
                    let checkBrand;

                    initialProd.categories = (initialProd.categories && initialProd.categories != "") ? initialProd.categories.split(',') : [];
                    // if(initialProd.categories.length>0)
                    // checkCat = await categoryTable.aggregate([{$match:{status:"active",catName:{$in:initialProd.categories},vendor:ObjectId(req.body.vendor)}},{$group:{_id:"$vendor",catId: { $push: "$_id" },catName: { $push: "$catName" }    }}])

                    // initialProd.addons = (initialProd.addons && initialProd.addons != "") ? initialProd.addons.split(',') : [];
                    // if(initialProd.addons.length>0) 
                    // checkAddon = await addonTable.aggregate([{status:"active",$match:{name:{$in:initialProd.addons},vendor:ObjectId(req.body.vendor)}},{$group:{_id:"$vendor",addonId: { $push: "$_id" },name: { $push: "$name" }    }}]) // in food store only
                    initialProd.brand = (initialProd.brand && initialProd.brand != "") ? initialProd.brand.split(',')[0] : "";
                    if (initialProd.brand && initialProd.brand != "")
                        checkBrand = await cuisinesTable.findOne({ status: "active", name: initialProd.brand, store: ObjectId(data.store), storeType: ObjectId(req.body.storeType) }) // except food store 
                    else
                        delete initialProd.brand;
                    // console.log("productName:=====>", initialProd.name);
                    let validationData = await helper.importProductObjectValidation(errMsg, initialProd, checkCat, checkAddon, checkBrand, storeTypeData.storeType);
                    errMsg = errMsg + validationData.errMsg;
                    initialProd = validationData.itm;

                    let variationArr = []
                    let attributeArr = []

                    for (let index = 0; index < element.length; index++) {
                        let element1 = element[index];
                        let variationAttr = []
                        if (initialProd.type == "variable" && initialProd.rowStatus == "success") {
                            for (item of Object.keys(element1)) {
                                if (item.includes('Variation:Value')) {
                                    let number = item.replace("Variation:Value", "")

                                    let variationKey = "Variation:Name" + number
                                    let variationValueKey = "Variation:Value" + number
                                    if (!initialProd[variationKey] && element1[variationValueKey]) {
                                        errMsg += "variation attibute name is required in " + element1.SNO + " row,";
                                        Object.assign(element[index], { rowStatus: "failure" });
                                        Object.assign(element[index], { reason: "variation attribute value is required" });
                                        return;
                                    }
                                    else if (!element1["Variation:price"] || !element1["Variation:sku"]) {
                                        errMsg += "variation price,sku is required in " + element1.SNO + " row,";
                                        Object.assign(element[index], { rowStatus: "failure" });
                                        Object.assign(element[index], { reason: "variation price,sku is required" });
                                        return;
                                    }
                                    else {
                                        Object.assign(element[index], { rowStatus: "success" });
                                        Object.assign(element[index], { reason: "" });
                                    }
                                    if (!element1[item])
                                        return;

                                    let term = element1[item]
                                    let termsData = await attributeTerms.findOneAndUpdate({ name: term }, { $set: { name: term } }, { upsert: true, new: true })
                                    let termsObj = { _id: termsData._id, name: termsData.name }
                                    variationAttr.push(termsObj)
                                    let attributedata = await attributeTable.findOneAndUpdate({ name: initialProd[variationKey], storeType: data.storeType, vendor: data.vendor },
                                        {
                                            $set: {
                                                name: initialProd[variationKey],
                                                storeType: data.storeType,
                                                vendor: data.vendor
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
                            }
                            if (variationAttr.length > 0) {
                                let obj = {
                                    "sku": element1["Variation:sku"],
                                    "price": element1["Variation:price"],
                                    "stock_quantity": element1["Variation:stock_quantity"],
                                    "stock_status": element1["Variation:stock_status"],
                                    "attributes": variationAttr
                                }
                                if (element1["Variation:manage_stock"] && element1["Variation:manage_stock"].toLowerCase() == "true")
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
                    }
                    initialProd.variations = variationArr
                    initialProd.attributes = attributeArr

                    productFinalData.push(initialProd)


                }
            }

            req.body.errMsg = errMsg
            // console.log("errMsg---", errMsg)
            req.body.csvData = productFinalData
            req.body.originalGroupByData = JSON.parse(JSON.stringify(groupData));

            // let resp = helper.showSuccessResponse('DATA_ADDED_SUCCESS')
            // resp.csvData = csvData
            // resp.groupData = groupData
            // resp.productFinalData = productFinalData
            // // resp.groupDataKeys = Object.keys(groupData)
            // res.json(resp);

            next();

        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importFoodProductCombinedCSV: async (req, res, next) => {
        try {
            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));
            req.body.store = req.store.storeId
            let data = req.body

            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            if (!data.storeType)
                return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
            if (!data.vendor)
                return res.json(helper.showValidationErrorResponse("VENDOR_ID_IS_REQUIRED"));

            let storeTypeData = await storeTypeTable.findById(ObjectId(data.storeType))

            let filePath = file.path
            let csvData = await helper.csvToJson(filePath)
            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i + 1
            }
            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local

            if (storeTypeData.storeType != "FOOD") {
                req.body.csvData = csvData
                return next();
            }
            let groupData = await helper.groupByKey(csvData, "sku")
            req.body.originalCSVData = JSON.parse(JSON.stringify(csvData));

            let errMsg = "";
            let productFinalData = []
            for (const key in groupData) {
                if (groupData.hasOwnProperty(key)) {
                    let element = groupData[key];
                    let initialProd = element[0];

                    let checkCat = [];
                    let checkAddon = [];
                    let checkBrand;

                    initialProd.categories = (initialProd.categories && initialProd.categories != "") ? initialProd.categories.split(',') : [];
                    // if(initialProd.categories.length>0)
                    // checkCat = await categoryTable.aggregate([{$match:{status:"active",catName:{$in:initialProd.categories},vendor:ObjectId(req.body.vendor)}},{$group:{_id:"$vendor",catId: { $push: "$_id" },catName: { $push: "$catName" }    }}])

                    // initialProd.brand = (initialProd.brand && initialProd.brand != "") ? initialProd.brand.split(',')[0] : "";
                    // if(initialProd.brand && initialProd.brand != "")
                    // checkBrand = await cuisinesTable.findOne({status:"active",name:initialProd.brand,store:ObjectId(data.store),storeType:ObjectId(req.body.storeType)}) // except food store 
                    // else
                    // delete initialProd.brand

                    let validationData = await helper.importProductObjectValidation(errMsg, initialProd, checkCat, checkAddon, checkBrand, storeTypeData.storeType)
                    errMsg = errMsg + validationData.errMsg

                    initialProd = validationData.itm
                    let addon = []
                    let addonsArr = []
                    if (initialProd.rowStatus == "success") {
                        for (let index = 0; index < element.length; index++) {
                            let element1 = element[index];
                            let objectKeys = Object.keys(element1)
                            let variationKey;

                            Object.keys(element1).map(item => {
                                if (item.includes('addons:Name')) {
                                    let number = item.replace("addons:Name", "")
                                    variationKey = "addons:Name" + number
                                    let variationValueKey = "addons:OptionName" + number
                                    let variationPrice = "addons:OptionPrice" + number

                                    // console.log("initialProd addon :",initialProd[variationKey]);
                                    if (!initialProd[variationKey])
                                        return;
                                    initialProd[variationKey] = initialProd[variationKey].trim()

                                    if (element1[variationValueKey])
                                        element1[variationValueKey] = element1[variationValueKey].trim()

                                    if (element1[variationPrice])
                                        element1[variationPrice] = element1[variationPrice].trim()

                                    if (element1[variationValueKey] && element1[variationValueKey] != "") {
                                        if (element1[variationPrice] === "") {
                                            errMsg += "Addons Option name/price is required in " + element1.SNO + " row,";
                                            Object.assign(element[index], { rowStatus: "failure" });
                                            Object.assign(element[index], { reason: "Addons Option name/price is required" });
                                            return;
                                        }
                                    }
                                    else if (element1[variationPrice] && element1[variationPrice] != "") {
                                        if (element1[variationValueKey] === "") {
                                            errMsg += "Addons Option name/price is required in " + element1.SNO + " row,";
                                            Object.assign(element[index], { rowStatus: "failure" });
                                            Object.assign(element[index], { reason: "Addons Option name/price is required" });
                                            return;
                                        }
                                    } else {
                                        Object.assign(element[index], { rowStatus: "success" });
                                        Object.assign(element[index], { reason: "" });
                                    }

                                    let addonOption;

                                    if (element1[variationValueKey] && element1[variationPrice]) {
                                        // variationAttr.push({default:true,name:element1[variationValueKey],price:element1[variationPrice]})
                                        addonOption = { default: true, name: element1[variationValueKey], price: element1[variationPrice] }
                                    }
                                    // console.log("addonOption ",index," :",addonOption);

                                    let checkAttribute = false
                                    for (let i = 0; i < addon.length; i++) {

                                        let itm = addon[i];
                                        // console.log("addon itm:",itm.name,itm.options);

                                        if (itm.name.toString() == initialProd[variationKey].toString()) {

                                            checkAttribute = true
                                            let checkterms;
                                            if (addonOption) {
                                                checkterms = itm.options.find(termsValue => {
                                                    return (termsValue.name.toString() === addonOption.name.toString() && termsValue.price.toString() === addonOption.price.toString())
                                                })
                                                if (checkterms == undefined)
                                                    addon[i] = ({ name: initialProd[variationKey], options: [...itm.options, addonOption] })
                                            }
                                        }
                                    }
                                    if (checkAttribute == false)
                                        addon.push({ name: initialProd[variationKey], options: [addonOption] })

                                }
                            })
                            // console.log("addon ",index, " :",addon);

                        }
                        if (addon.length > 0) {
                            await Promise.all(addon.map(async (addonItem) => {
                                let queryobj = {
                                    "name": addonItem.name,
                                    "storeType": ObjectId(req.body.storeType),
                                    "vendor": ObjectId(req.body.vendor)

                                }
                                let obj = {
                                    "name": addonItem.name,
                                    "storeType": ObjectId(req.body.storeType),
                                    "type": "SINGLESELECT",
                                    "status": "active",
                                    "vendor": ObjectId(req.body.vendor)

                                }
                                let update = obj//{ ...obj }
                                update.options = addonItem.options.length > 0 ? addonItem.options : [];
                                update.date_created_utc = new Date();
                                //let addonData = await addonTable.findOneAndUpdate(obj, update, { upsert: true, new: true })
                                let addonData = await addonTable.findOneAndUpdate(queryobj, update, { upsert: true, new: true })
                                addonsArr.push(addonData._id)
                            }))
                        }
                        initialProd.addons = addonsArr

                    }
                    productFinalData.push(initialProd)


                }
            }

            req.body.errMsg = errMsg
            req.body.csvData = productFinalData
            req.body.originalGroupByData = JSON.parse(JSON.stringify(groupData));

            // let resp = helper.showSuccessResponse('DATA_ADDED_SUCCESS')
            // resp.csvData = csvData
            // resp.groupData = groupData
            // resp.productFinalData = productFinalData
            // console.log("productFinalData :",productFinalData);

            // resp.groupDataKeys = Object.keys(groupData)
            // return res.json(resp);

            next();

        } catch (error) {
            console.log("errorsss", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importProductCSV: async (req, res, next) => {
        try {
            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));
            req.body.store = req.store.storeId
            let data = req.body

            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            if (!data.storeType)
                return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
            if (!data.vendor)
                return res.json(helper.showValidationErrorResponse("VENDOR_ID_IS_REQUIRED"));

            let filePath = file.path
            let csvData = await helper.csvToJson(filePath)
            // req.body.csvData = await helper.csvToJson(filePath)
            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local



            req.body.csvData = csvData



            next();

        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    createProductByCarrentalVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (!data.images && data.images.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        }

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },
    updateProductByCarrentalVendor: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_NAME_IS_REQUIRED'));
        }

        if (!data.price) {
            return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
        }

        if (Number(data.price) < 0) {
            return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
        }

        if (Number(data.compare_price)) {
            if (Number(data.compare_price) < Number(data.price)) {
                return res.json(helper.showValidationErrorResponse('COMPARE_PRICE_MUST_BE_GREATER'));
            }
            req.body.on_sale = "yes";
        } else {
            req.body.on_sale = "no";
        }

        if (data.categories.length === 0) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_CATEGORIES_IS_REQUIRED'));
        }

        /* if (!data.featured_image) {
            return res.json(helper.showValidationErrorResponse('PRODUCT_IMAGES_IS_REQUIRED'));
        } */

        if (data.addons && data.addons.length > 0) {
            req.body.addons = data.addons;
        } else {
            req.body.addons = [];
        }

        next();
    },

}