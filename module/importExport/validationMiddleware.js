/* node modules */
const ObjectId = require('objectid');

/* DB models start */
const storeTypeTable = require('../../models/storeTypeTable');
const productVariation = require('../../models/productVariationTable');
const Store = require('../../models/storeTable');
const attributeTerms = require('../../models/attributeTermsTable');
const attributeTable = require('../../models/attributeTable');
const categoryTable = require('../../models/categoryTable');
const addonTable = require('../../models/addonTable');
const cuisinesTable = require('../../models/cuisinesTable');
/* DB models end */

module.exports = {
    importProductCombinedCSV: async (req, res, next) => {
        try {
            let file = req.file
            if (!file) 
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));
            req.body.store = req.store.storeId
            let data = req.body

            let storeData = await Store.findById(ObjectId(data.store))
            if(!storeData) 
            return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));
  
            if (!data.storeType)
                return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
            if (!data.vendor)
                return res.json(helper.showValidationErrorResponse("VENDOR_ID_IS_REQUIRED"));

            let storeTypeData = await storeTypeTable.findById(ObjectId(data.storeType))

            let filePath = file.path
            let csvData = await helper.csvToJson(filePath)
            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i+1
            }  
            if (csvData)
            helper.unlinkLocalFile(filePath) //delete the file from local

            let groupData = await helper.groupByKey(csvData,"sku")
            req.body.originalCSVData = JSON.parse(JSON.stringify(csvData));

            let errMsg = "";
            let productFinalData = []
            for (const key in groupData) {
                if (groupData.hasOwnProperty(key)) {
                    let element = groupData[key];
                    let initialProd = element[0];

                    let checkCat = [];
                    let checkAddon = [];
                    let checkBrand ;
                                    
                    initialProd.categories = (initialProd.categories && initialProd.categories != "") ? initialProd.categories.split(',') : [];
                    if(initialProd.categories.length>0)
                    checkCat = await categoryTable.aggregate([{$match:{status:"active",catName:{$in:initialProd.categories},vendor:ObjectId(req.body.vendor)}},{$group:{_id:"$vendor",catId: { $push: "$_id" },catName: { $push: "$catName" }    }}])
                    
                    initialProd.addons = (initialProd.addons && initialProd.addons != "") ? initialProd.addons.split(',') : [];
                    if(initialProd.addons.length>0) 
                    checkAddon = await addonTable.aggregate([{status:"active",$match:{name:{$in:initialProd.addons},vendor:ObjectId(req.body.vendor)}},{$group:{_id:"$vendor",addonId: { $push: "$_id" },name: { $push: "$name" }    }}]) // in food store only
    
                    initialProd.brand = (initialProd.brand && initialProd.brand != "") ? initialProd.brand.split(',')[0] : "";
                    if(initialProd.brand && initialProd.brand != "")
                    checkBrand = await cuisinesTable.findOne({status:"active",name:initialProd.brand,store:ObjectId(data.store),storeType:ObjectId(req.body.storeType)}) // except food store 
    
                    let validationData = await helper.importProductObjectValidation(errMsg,initialProd,checkCat,checkAddon,checkBrand,storeTypeData.storeType)
                    errMsg = errMsg + validationData.errMsg
                    initialProd = validationData.itm



                    let variationArr = []
                    let attributeArr = []

                    for (let index = 0; index < element.length; index++) {
                        let element1 = element[index];
                        let variationAttr = []
                        if(initialProd.type == "variable" && initialProd.rowStatus == "success") {
                       await Promise.all(Object.keys(element1).map(async item => {
                            if(item.includes('Variation:Value')){
                                let variationKey = "Variation:Name" + item[item.length-1]
                                let variationValueKey = "Variation:Value" + item[item.length-1]
                                if(!initialProd[variationKey] && element1[variationValueKey]) {
                                    errMsg += "variation attibute value is required in "+element1.SNO+ " row,";
                                    Object.assign(element[index], { rowStatus: "failure" });
                                    Object.assign(element[index], { reason: "variation attribute value is required" });
                                    return ;
                                }
                                else if(!element1["Variation:price"] || !element1["Variation:sku"] )
                                {
                                    errMsg += "variation price,sku is required in "+element1.SNO+ " row,";
                                    Object.assign(element[index], { rowStatus: "failure" });
                                    Object.assign(element[index], { reason: "variation price,sku is required" });
                                    return ;
                                }
                                else {
                                    Object.assign(element[index], { rowStatus: "success" });
                                    Object.assign(element[index], { reason: "" });
                                }
                                if(!element1[item])
                                return ;
             
                                let term = element1[item]
                                let termsData = await attributeTerms.findOneAndUpdate({name:term},{$set:{name:term}},{upsert:true,new:true})
                                let termsObj = {_id:termsData._id,name:termsData.name}
                                variationAttr.push(termsObj)
                                let attributedata = await attributeTable.findOneAndUpdate({name:initialProd[variationKey],storeType:data.storeType,vendor:data.vendor},
                                    {
                                        $set:{
                                        name:initialProd[variationKey],
                                        storeType:data.storeType,
                                        vendor:data.vendor
                                    },
                                    $addToSet: { terms: termsData._id },
        
                                },{upsert:true,new:true})
                                
                                let checkAttribute = false
                                for (let i = 0; i < attributeArr.length; i++) {
                                    let itm = attributeArr[i];
                                    if(itm._id.toString() == attributedata._id.toString()) {

                                        checkAttribute = true
                                        let checkterms = itm.terms.find(termsValue => {
                                            return termsValue._id.toString() == termsObj._id.toString()
                                         })
                                         if(checkterms == undefined)
                                        attributeArr[i] = ({_id:attributedata._id ,name: attributedata.name,terms: [...itm.terms,termsObj]})
                                    }   
                                }
                               if(checkAttribute == false)
                                attributeArr.push({_id:attributedata._id ,name: attributedata.name,terms: [termsObj]})
                            }
                        }))
                        if(variationAttr.length>0) {
                        let obj = {
                            "sku" : element1["Variation:sku"],
                            "price" : element1["Variation:price"],
                            "stock_quantity" : element1["Variation:stock_quantity"],
                            "stock_status" : element1["Variation:stock_status"],
                            "attributes":variationAttr
                        }
                        if (element1["Variation:manage_stock"] && element1["Variation:manage_stock"].toLowerCase() == "true")
                        obj.manage_stock = true
                        else
                        obj.manage_stock = false
                        let variations = await productVariation.create(obj)
                        variationArr.push(variations._id)
                    }
                    }
                    }
                    initialProd.variations = variationArr
                    initialProd.attributes = attributeArr
                    
                    productFinalData.push(initialProd)


                }
            }
            
            req.body.errMsg = errMsg
            req.body.csvData = productFinalData
            req.body.originalGroupByData = JSON.parse(JSON.stringify(groupData));

            next();

        } catch (error) {
            console.log("errorsss", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
}