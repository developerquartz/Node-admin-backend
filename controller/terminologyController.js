const terminologyModel = require('../models/terminologyTable')
const storeModel = require('../models/storeTable');
const store = require('../middleware/validation/store');
const { Types } = require('aws-sdk/clients/cloudformation');
const helper = require('../helper/helper');
const terminology = require("../helper/terminology");
const { response } = require('express');

module.exports = {
    getjsonData: async (req, res) => {
        try {
            var jsondata;
            var arr = []
            for (key in jsondata) {
                arr.push(jsondata[key])
            }
            res.send({ arr })

        } catch (error) {

        }
    },
    deleteAllTerminology: async (req, res) => {
        try {
            terminologyModel.remove({}, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    console.log("resdata :", resdata);

                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', await terminologyModel.find()));
                }
            });
            res.send({ arr })

        } catch (error) {

        }
    },

    getStoreTerminologyScript: async (req, res) => {
        try {
            var driverObjArr = driverTerminology.langJSON
            var customerObjArr = customerTerminology.orderLangJson
            var arr = []
            for (key in customerObjArr) {
                arr.push({
                    "constant": key,
                    "value": customerObjArr[key],
                    "label": customerObjArr[key]
                })
            }
            res.send({ arr, length: arr.length })

        } catch (error) {

        }
    },

    addStoreTerminologyScript: async (req, res) => {
        try {
            var driverObjArr = driverTerminology.langJSON_arr
            var customerObjArr = customerTerminology.langJSON_arr
            var orderLangObjJarr = customerTerminology.orderLang_arr

            var storeData = await storeModel.find({
                status: "active"
            }, 'owner')
            var finalDriverTerminology = []
            var finalcustomerTerminology = []
            var finalorderLangObjJarr = []

            Promise.all(storeData.map((item) => {
                if (item._id && item.owner) {
                    finalDriverTerminology.push({
                        store: item._id,
                        user: item.owner,
                        type: "customers",
                        lang: "en",
                        values: customerObjArr,
                        date_created: new Date()
                    })
                    finalcustomerTerminology.push({
                        store: item._id,
                        user: item.owner,
                        type: "drivers",
                        lang: "en",
                        values: driverObjArr,
                        date_created: new Date()
                    })
                    finalorderLangObjJarr.push({
                        store: item._id,
                        user: item.owner,
                        type: "order",
                        lang: "en",
                        values: orderLangObjJarr,
                        date_created: new Date()
                    })
                }
            }))
            terminologyModel.insertMany([...finalDriverTerminology, ...finalcustomerTerminology, ...finalorderLangObjJarr], async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let terminologyData = await terminologyModel.find({ type: "customers" }).populate('store', 'domain').lean()
                    Promise.all(terminologyData.map(async (item) => {
                        await helper.updateTerminologyScript(item)
                    }))
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    //====================================== Script End ============================================
    getStoreTerminologyByStoreId: async (req, res) => {
        try {
            var data = req.body
            data.storeId = req.store.storeId
            if (!data.lang)
                return res.json(helper.showValidationErrorResponse('LANG_IS_REQUIRED'));
            if (!env.terminologyLang.includes(data.lang))
                return res.json(helper.showValidationErrorResponse('LANG_IS_WRONG'));
            if (!data.type)
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            if (!["order", "customers", "drivers", "vendors", "admin", "trip"].includes(data.type))
                return res.json(helper.showValidationErrorResponse('TYPE_IS_WRONG'));

            terminologyModel.getTerminologyByConditionAsync({ store: data.storeId, lang: data.lang, type: data.type }, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata) {
                        return res.json(helper.showSuccessResponse('DATA_FOUND_SUCCESS', resdata));
                    }
                    else {
                        return res.json(helper.showSuccessResponse('DATA_FOUND_SUCCESS', {}));
                    }
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateStoreTerminologyById: async (req, res) => {
        try {
            var data = req.body
            if (!data._id)
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_ID_IS_REQUIRED'));
            if (!data.values || data.values.length == 0)
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_IS_REQUIRED'));

            terminologyModel.updateTerminology(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.type == "customers")
                        await helper.updateTerminologyScript(resdata)

                    return res.json(helper.showSuccessResponse('TERMINOLOGY_UPDATED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addStoreTerminologyScriptById: async (req, res) => {
        try {
            let data = req.body;
            let terminologyData;

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_TYPE_IS_REQUIRED'));
            }

            if (!data.storeId) {
                return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
            }

            if (!data.lang) {
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_LANG_IS_REQUIRED'));
            }

            let driverTerminology = require('../config/driver-lang-' + data.lang + '.json');
            let customerTerminology = require('../config/customer-lang-' + data.lang + '.json');

            if (data.type == "customers") {
                terminologyData = customerTerminology.Insert_JSON_arr;
            } else if (data.type == "drivers") {
                terminologyData = driverTerminology.Insert_JSON_arr;
            } else if (data.type == "order") {
                terminologyData = customerTerminology.orderLang_arr;
            } else if (data.type == "trip") {
                terminologyData = customerTerminology.tripLang_arr;
            }

            let newTerminology;

            let getTerminology = await terminologyModel.findOne({ type: data.type, store: data.storeId, lang: data.lang })
                .populate('store', 'domain').exec();

            if (getTerminology != null) {
                newTerminology = terminologyData.map(x => Object.assign(x, getTerminology.values.find(y => y.constant == x.constant)));

                newTerminology = await terminologyModel.findByIdAndUpdate(getTerminology._id, { values: newTerminology }, { new: true })
                    .populate('store', 'domain').exec();
            } else {
                let insertData = {
                    store: data.storeId,
                    user: data.user,
                    type: data.type,
                    lang: data.lang,
                    values: terminologyData,
                    status: "active",
                    date_created: new Date()
                }
                newTerminology = await terminologyModel.create(insertData);
            }

            // console.log("newTerminology", newTerminology);

            if (data.type == "customers")
                await helper.updateTerminologyScript(newTerminology);

            res.json(helper.showSuccessResponse('TERMINOLOGY_UPDATED_SUCCESS', newTerminology));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addAllStoreTerminologyScriptById: async (req, res) => {
        try {
            let data = req.body;
            let terminologyData;

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_TYPE_IS_REQUIRED'));
            }

            if (!data.lang) {
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_LANG_IS_REQUIRED'));
            }

            const driverTerminology = require('../config/driver-lang-' + data.lang + '.json');
            const customerTerminology = require('../config/customer-lang-' + data.lang + '.json');

            if (data.type == "customers") {
                terminologyData = customerTerminology.Insert_JSON_arr;
            } else if (data.type == "drivers") {
                terminologyData = driverTerminology.Insert_JSON_arr;
            } else if (data.type == "orders") {
                terminologyData = customerTerminology.orderLang_arr;
            } else if (data.type == "trip") {
                terminologyData = customerTerminology.tripLang_arr;
            }

            let updateTerminology;

            let getTerminology = await terminologyModel.find({ type: data.type, lang: data.lang });

            if (getTerminology.length > 0) {

                await Promise.all(getTerminology.map(async terminology => {
                    if (terminology.values) {
                        let newTerminology = terminologyData.map(x => Object.assign(x, terminology.values.find(y => y.constant == x.constant)));

                        updateTerminology = await terminologyModel.findByIdAndUpdate(terminology._id, { values: newTerminology }, { new: true })
                            .populate('store', 'domain').exec();

                        if (data.type == "customers" && updateTerminology.store)
                            await helper.updateTerminologyScript(updateTerminology);
                    }
                }));
            }

            res.json(helper.showSuccessResponse('TERMINOLOGY_UPDATED_SUCCESS', updateTerminology));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    makeTerminologyFormat: async (req, res) => {
        try {
            let data = req.body;
            let langFormat = []
            for (key in data) {
                let obj = {
                    constant: key,
                    value: data[key],
                    label: data[key]
                }
                langFormat.push(obj);
            }
            res.send(langFormat);

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    makeTerminologyFormatOtherLang: async (req, res) => {
        try {
            let data = req.body, message = "", isfalse = false;
            if (!data.engLang || !data.engLang.length) {
                return res.json(helper.showValidationErrorResponse('English Language array required'));
            }
            if (!data.otherLang) {
                return res.json(helper.showValidationErrorResponse('Other Language object required'));
            }
            let eng_obj = data.engLang
            let other_obj = data.otherLang
            // if (Object.keys(eng_obj).length != Object.keys(other_obj).length) {
            //     return res.json(helper.showValidationErrorResponse('Both Object length not equal'));
            // }
            let langFormat = []
            //let new_array = eng_obj.map(element => element.value = other_obj[element.constant])
            //return res.send(new_array);
            for (key in eng_obj) {
                let element = eng_obj[key]
                // let obj = {
                //     constant: element.constant,
                //     label: eng_obj[key]
                // }
                if (!other_obj[element.constant]) {
                    message = element.constant + " key is not found in otherLang"
                    isfalse = true
                    break;
                }
                element.value = other_obj[element.constant]
                langFormat.push(element);
            }
            if (isfalse) {
                return res.send({ status: 400, message: message })
            }
            else {
                return res.send(langFormat);
            }

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    makeJsonFormat: async (req, res) => {
        try {
            let data = req.body;
            let type = "constant"
            if (!data.terminology || !data.terminology.length) {
                return res.json(helper.showValidationErrorResponse('Please add terminology'));
            }
            if (data.type && ["constant", "label", "value"].includes(data.type)) {
                type = data.type
                //return res.json(helper.showValidationErrorResponse('Please Select by constant or by lable default is constant'));
            }
            let jsondata = data.terminology;
            let langFormat = {}
            for (key in jsondata) {
                let key_data = jsondata[key]
                langFormat[key_data[type]] = key_data.value
            }
            res.send(langFormat);

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    terminologyToCSV: async (req, res) => {
        try {
            let query = req.query;
            let type = query.type;
            let result = [];

            let terminologyData;

            const driverTerminology = require('../config/driverLang.json')
            const customerTerminology = require('../config/customerLang.json')

            if (type == "customers") {
                let main = [...customerTerminology.langJSON_arr, ...customerTerminology.Insert_JSON_arr];

                let other = [...customerTerminology.orderLang_arr, ...customerTerminology.tripLang_arr];

                terminologyData = [...main, ...other];
                // "Key": element.constant,
                terminologyData.forEach(element => {

                    let fdata = {
                        "en": element.value
                    }
                    result.push(fdata);
                });

            } else if (type == "drivers") {
                let main = [...driverTerminology.langJSON_arr, ...driverTerminology.Insert_JSON_arr];

                terminologyData = main;
                //"Key": element.constant,
                terminologyData.forEach(element => {

                    let fdata = {
                        "en": element.value
                    }
                    result.push(fdata);
                });

            } else if (type == "admin") {

                let getlang = require('../config/admin-lang-en.json');
                //"Key": key,

                for (let key in getlang) {

                    let fdata = {
                        "en": getlang[key],
                    }
                    result.push(fdata);
                };
            }

            res.setHeader('Content-disposition', 'attachment; filename=' + type + '.csv');
            res.set('Content-Type', 'Text/csv');
            res.csv(result, true, {
                "Access-Control-Allow-Origin": "*"
            }, 200);

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addTerminologyToParticularLangAndType: async (req, res) => {
        try {
            let data = req.body;
            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_TYPE_IS_REQUIRED'));
            }
            if (!data.storeId) {
                return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
            }
            if (!data.lang) {
                return res.json(helper.showValidationErrorResponse('TERMINOLOGY_LANG_IS_REQUIRED'));
            }
            if (!data.values || !Array.isArray(data.values)) {
                return res.json(helper.showValidationErrorResponse('KEY_VALUE_IS_REQUIRED'));
            }
            if (!data.values.length) {
                return res.json(helper.showValidationErrorResponse('Values can not empty array'));
            }
            if (!["customers", "drivers", "order", "trip"].includes(data.type)) {
                return res.json(helper.showValidationErrorResponse('Invalid terminology type value'));
            }
            let isValidFormat = data.values.find(i => !i.constant || !i.value || !i.label);
            if (isValidFormat) {
                return res.json(helper.showValidationErrorResponse('Please provide terminology values as correct format'));
            }

            if (data.values.length > 10) {
                return res.json(helper.showValidationErrorResponse('Please provide terminology values under 10 elements'));
            }

            let getTerminology = await terminologyModel.findOne({ type: data.type, store: data.storeId, lang: data.lang });
            if (!getTerminology) {
                return res.json(helper.showValidationErrorResponse('Not found terminology info'));
            }
            let newTerminology = getTerminology.values;
            if (data.dataType == "add") {

                data.values.forEach((addValue) => {
                    // Check if constant value of addValue object does not exist in values array
                    if (!newTerminology.some((value) => value.constant === addValue.constant)) {
                        // Add addValue object to values array
                        newTerminology.push(addValue);
                    }
                });

            } else if (data.dataType == "remove") {
                // Remove elements from values array based on removeArr(data.value)
                newTerminology = newTerminology.filter((value) => {
                    // Return true if constant value of value object does not match constant value of any object in removeArr
                    return !data.values.some((removeValue) => {
                        return removeValue.constant === value.constant;
                    });
                });
            }
            if (getTerminology != null) {
                newTerminology = await terminologyModel.findByIdAndUpdate(getTerminology._id, { values: newTerminology }, { new: true })
            }
            res.json(helper.showSuccessResponse('TERMINOLOGY_UPDATED_SUCCESS', getTerminology));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
}