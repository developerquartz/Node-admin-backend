const menuModel = require('../module/menu/service/menu')
const menuItemModel = require('../module/menu/service/menuItems')

let addDefaultMenuAndItem = async (store, plan, storeType) => {
    // console.log("store, plan, storeType :",store, plan, storeType);

    let menuDataArr = [
        {
            "items": [],
            "status": "active",
            "label": "TOP MENU",
            "type": "topMenu",
            "store": store,
            "date_created_utc": new Date(),
            "meta_data": []
        },
        {
            "items": [],
            "status": "active",
            "label": "QUICK LINKS",
            "type": "footerLeft",
            "store": store,
            "date_created_utc": new Date(),
            "meta_data": []
        },
        {
            "items": [],
            "status": "active",
            "label": "CUSTOMER SERVICE",
            "type": "footerMiddle",
            "store": store,
            "date_created_utc": new Date(),
            "meta_data": []
        }]

    let menuData = await menuModel.insertManyAsync(menuDataArr)

    let menuDataFinal = []
    await Promise.all(menuData.map(async (item) => {
        menuDataFinal.push(await menuItemData(store, item._id, item.type, plan, storeType))
    }))

    return menuDataFinal;

    async function menuItemData(store, menuId, menuType, plan, storeType) {

        let vendorReg = {
            "sortOrder": 1,
            "parent": null,
            "child": [],
            "status": "active",
            "label": "Vendor Registration",
            "link": "/vender-registration",
            "linkType": "internal",
            "target": "_self",
            "menuId": menuId,
            "store": store,
            "date_created_utc": new Date(),
            "meta_data": []
        }


        let ids = []
        let data = {
            "topMenu": [
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "HOME",
                    "link": "/",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "ABOUT US",
                    "link": "/aboutus",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "CONTACT US",
                    "link": "/contactus",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "LOGIN",
                    "islogin": true,
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "CREATE AN ACCOUNT",
                    "isSignUp": true,
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }
            ],
            "footerLeft": [
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "About Us",
                    "link": "/aboutus",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "Contact Us",
                    "link": "/contactus",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "Driver Registration",
                    "link": "/driver-registration",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }
            ],
            "footerMiddle": [
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "Terms & Condition",
                    "link": "/terms-condition",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "Privacy Policy",
                    "link": "/privacy-policy",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "Refund Policy",
                    "link": "/refund-policy",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "sortOrder": 1,
                    "parent": null,
                    "child": [],
                    "status": "active",
                    "label": "FAQs",
                    "link": "/faqs",
                    "linkType": "internal",
                    "target": "_self",
                    "menuId": menuId,
                    "store": store,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }
            ]
        }
        if (plan && plan.planType && plan.planType === "basic" && ["TAXI", "PICKUPDROP"].includes(storeType.storeType)) { }
        else
            data.footerLeft = [...data.footerLeft, ...[vendorReg],]


        let menuItemData = await menuItemModel.insertManyAsync(data[menuType])

        for (let index = 0; index < menuItemData.length; index++) {
            ids.push(menuItemData[index]._id)
        }
        return await menuModel.updateOneAsync({ _id: menuId }, { $addToSet: { items: ids } }, { new: true });

    }
}

module.exports = {
    addDefaultMenuAndItem
}