const translate = require('translate-google');
const storeModel = require("../models/storeTable")
const terminologyModel = require("../models/terminologyTable")
async function translateData(lan, label, responseCallback) {
    return new Promise((resolve, reject) => {
        let obj = { label: label }
        if (!lan) {
            console.log('Language_IS_REQUIRED');
            return reject("Language_IS_REQUIRED");
        }
        if (lan == "zh") {
            lan = "zh-cn"
        }
        translate(obj, { to: lan }).then(res => {
            resolve(responseCallback(res))
        }).catch(err => {
            console.error(err)
            responseCallback(err)
            reject(responseCallback(err))

        })
    })

}
async function addTerminologyByDocTemplate(storeId, type, label, dataType, oldLabel) {
    try {
        console.log("datatt===", storeId, type, label, dataType, oldLabel)
        let getStore = await storeModel.findById(storeId);
        let activeLanguage = getStore.storeLanguage || [];
        let types;
        if (type == "DRIVER") {
            types = "drivers"
        } else if (type == "USER") {
            types = "customers"
        } else if (type == "VENDOR") {
            types = "vendors"
        } else {
            return
        }
        for (let i = 0; i < activeLanguage.length; i++) {
            let getTerminology = await terminologyModel.findOne({ type: types, store: storeId, lang: activeLanguage[i].code });
            if (dataType == "add") {
                translateData(activeLanguage[i].code, label, async (response) => {
                    let update = {
                        constant: label + "Text",
                        value: response.label,
                        label: label
                    }
                    console.log("update----", update)
                    await terminologyModel.findByIdAndUpdate(getTerminology._id, { $addToSet: { values: update } })
                })
            } else if (dataType == "remove") {
                await terminologyModel.findByIdAndUpdate(getTerminology._id, { $pull: { values: { constant: label + "Text" } } })
            } else if (dataType == "update") {
                await terminologyModel.findByIdAndUpdate(getTerminology._id, { $pull: { values: { constant: oldLabel + "Text" } } })
                translateData(activeLanguage[i].code, label, async (response) => {
                    let update = {
                        constant: label + "Text",
                        value: response.label,
                        label: label
                    }
                    console.log("update----", update)
                    await terminologyModel.findByIdAndUpdate(getTerminology._id, { $addToSet: { values: update } })
                })
            }
        }
        return
    } catch (error) {
        console.log("err", error);
        return error
    }
}
async function deleteTerminologyByDocTemplate(getDoc) {
    try {
        getDoc.fields.forEach(item => {
            addTerminologyByDocTemplate(getDoc.store, getDoc.role, item.label, "remove");
        });
        addTerminologyByDocTemplate(getDoc.store, getDoc.role, getDoc.name, "remove");
    } catch (error) {
        console.log("err", error);
        return error
    }
}
module.exports = {
    translateData,
    addTerminologyByDocTemplate,
    deleteTerminologyByDocTemplate
}