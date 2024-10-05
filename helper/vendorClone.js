const Product = require("../models/productsTable");
const Category = require("../models/categoryTable");
const Addons = require("../models/addonTable");
const Utils = require('../helper/utils');
let addProduct = async (products, vendor) => {
    let categories = [];
    let addons = [];
    for (items of products) {
        if (items.categories) {
            categories = await addCategories(items.categories, vendor);
        }
        if (items.addons) {
            addons = await addAddons(items.addons, vendor);
        }
        let productObj = (buildProductObj(items, vendor, addons, categories));
        await Product.create(productObj);
    };
    // await Product.create(productArr);

};
let addCategories = async (categories, vendor) => {
    return new Promise(async (resolve, reject) => {
        let categoryIds = [];
        for (item of categories) {
            let categoryObj = buildCategoryObj(item, vendor);
            let query = { vendor: vendor._id, catName: categoryObj.catName };
            let storedCategories = await Category.findOneAndUpdate(query, categoryObj, { upsert: true, new: true });
            categoryIds.push(storedCategories._id);
        };
        //let storedCategories = await Category.create(categoryArr);
        //let getCatIds = helper.getFields(storedCategories, "_id");
        resolve(categoryIds);
    });
}
let addAddons = async (addons, vendor) => {
    return new Promise(async (resolve, reject) => {
        let addonIds = [];
        for (item of addons) {
            let addonObj = buildAddonsObj(item, vendor);
            let query = { vendor: vendor._id, name: addonObj.name };
            let storedAddons = await Addons.findOneAndUpdate(query, addonObj, { upsert: true, new: true });
            addonIds.push(storedAddons._id);

        };
        // let storedAddons = await Addons.insertMany(addonsArr);
        //let getAddonsId = helper.getFields(storedAddons, "_id");
        resolve(addonIds);
    });

}
let buildProductObj = (product, vendor, addons, categories) => {
    let obj = {
        "veganType": product.veganType,
        "status": "active",
        "price": product.price,
        "compare_price": product.compare_price,
        "categories": categories,
        "manage_stock": product.manage_stock,
        "bestSeller": product.bestSeller,
        "pricingType": product.pricingType,
        "stock_status": product.stock_status,
        "images": product.images || [],
        "variations": product.variations,
        "addons": addons,
        "average_rating": 0,
        "rating_count": 0,
        "date_created_utc": new Date(),
        "name": product.name,
        "featured_image": product.featured_image,
        "type": product.type,
        "sku": product.sku,
        "short_description": product.short_description,
        "description": product.description,
        "stock_quantity": product.stock_quantity,
        "vendor": vendor._id,
        "storeType": product.storeType
    };
    return obj;
}
let buildAddonsObj = (item, vendor) => {
    let obj = {
        "name": item.name,
        "storeType": item.storeType,
        "date_created_utc": new Date(),
        "maxLimit": item.maxLimit,
        "minLimit": item.minLimit,
        "options": item.options,
        "required": item.required,
        "status": "active",
        "type": item.type,
        "vendor": vendor._id
    };
    return obj;
};
let buildCategoryObj = (item, vendor) => {
    let obj = {
        "parent": "none",
        "subcategories": item.subcategories,
        "sortOrder": item.sortOrder,
        "status": "active",
        "date_created": new Date(),
        "date_created_utc": new Date(),
        "catName": item.catName,
        "catDesc": item.catDesc,
        "catImage": item.catImage,
        "isFeatured": item.isFeatured,
        "vendor": vendor._id,
        "storeType": item.storeType,
    };
    return obj;
};
let buildVendorObj = async (item) => {
    let obj = {
        "email": "clonevendor@gmail.com",
        "role": "VENDOR",
        "status": "created",
        "storeType": item.storeType,
        "address": item.address,
        "bannerImage": item.bannerImage,
        "commisionType": item.commisionType,
        "commission": item.commission,
        "countryCode": item.countryCode,
        "date_created_utc": new Date(),
        "deliveryType": item.deliveryType,
        "isBankFieldsAdded": false,
        "isVendorAvailable": true,
        "minOrderAmont": 10,
        "mobileNumber": item.mobileNumber,
        "name": item.name + " clone",
        "notificationSound": item.notificationSound,
        "notifications": item.notifications,
        "onlineStatus": item.onlineStatus,
        "orderAutoApproval": item.orderAutoApproval,
        "orderPreparationTime": item.orderPreparationTime,
        "pricePerPerson": item.pricePerPerson,
        "profileImage": item.profileImage,
        "store": item.store,
        "stripeConnect": item.stripeConnect,
        "taxAmount": item.taxAmount,
        "timeSlot": item.timeSlot,
        "userLocation": item.userLocation,
        "vendorAvailability": item.vendorAvailability,
        "bankFields": [],
        "cuisines": item.cuisines,
        "deliveryTimeSlot": item.deliveryTimeSlot,
        "geoFence": item.geoFence,
        "orderAutoCancel": item.orderAutoCancel,
        "pay360Split": item.pay360Split,
        "weekendDayDeliveryTimeSlot": item.weekendDayDeliveryTimeSlot,
        "wallet": 0
    };
    const getHash = await Utils.hashPassword("123123");
    obj.password = getHash.hashedPassword;
    obj.salt = getHash.salt;
    return obj;
};

let vendorCloneIntialSetupProcess = async (newVendor, vendor) => {
    try {
        let query = { vendor: vendor._id, status: "active" };
        let getProductsList = await Product.find(query).lean()
            .populate({ path: "categories", match: { status: "active" } })
            .populate({ path: "variations" })
            .populate({ path: "addons", match: { status: "active" } })
            .exec();
        //console.log("getProductsList===>", getProductsList)
        let getProductCatIds = helper.getFields(helper.getFields(getProductsList, "categories"), "_id");
        let getProductAddonIds = helper.getFields(helper.getFields(getProductsList, "addons"), "_id");

        let categories = await Category.find({ ...query, _id: { $nin: getProductCatIds } }).lean()
            .populate({ path: "subcategories", match: { status: "active" } });
        let addons = await Addons.find({ ...query, _id: { $nin: getProductAddonIds } }).lean();
        await addCategories(categories, newVendor);
        await addAddons(addons, newVendor);
        await addProduct(getProductsList, newVendor);
    } catch (error) {
        console.log(error)
    }
};

let getSubCategories = async (subcategory) => {
    await Promise.all(subcategory.map(async element2 => {
        if (element2.subcategories && element2.subcategories.length > 0) {
            element2.subcategories = await getMidCategory(element2.subcategories);
        }
    }));

    subcategory.sort(function (a, b) {
        return a.sortOrder - b.sortOrder;
    });

    return subcategory;
}
let getMidCategory = async (midcate) => {
    let newCate = [];
    await Promise.all(midcate.map(async element => {
        let nCat = await getSubCategoryById(element);
        newCate.push(nCat);
    }));

    newCate.sort(function (a, b) {
        return a.sortOrder - b.sortOrder;
    });

    return newCate;
}

let getSubCategoryById = async (id) => {

    let getCategory = await Category.findById(id);
    // let createCategories = await Category.create({});
    if (getCategory.subcategories && getCategory.subcategories.length > 0) {
        getCategory.subcategories = await getMidCategory(getCategory.subcategories);
    }

    return getCategory;
}

module.exports = { vendorCloneIntialSetupProcess, buildVendorObj };