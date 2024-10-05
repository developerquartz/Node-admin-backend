const Product = require('../models/productsTable');
const productVariationTable = require('../models/productVariationTable');
let manageProductvariation = async (element, releaseInStock) => {
    const getVariation = await productVariationTable.getproductVariationByIdAsync(element.variation_id);
    if (getVariation.manage_stock) {
        if (releaseInStock) {
            getVariation.stock_quantity += 1;
            getVariation.stock_status = "instock";
        } else {
            getVariation.stock_quantity -= 1;
            if (!getVariation.stock_quantity) {
                getVariation.stock_status = "outofstock";
            }
        }
        await getVariation.save();
    }
}
let manageProductStock = async (line_items, releaseInStock) => {
    if (!line_items)
        return
    for (const index in line_items) {
        let element = line_items[index];
        if (element.product && element.quantity) {
            let getItem = await Product.findById(element.product, "stock_quantity type manage_stock stock_status")
                .populate("storeType", "storeType")
                .populate("variations", "stock_quantity manage_stock stock_status")

            if (getItem.storeType.storeType == "GROCERY") {
                console.log("getItem.type --", getItem.type)
                if (getItem.type != "simple") {
                    console.log("variation_id---", element.variation_id)
                    manageProductvariation(element, releaseInStock)
                }
            }
            if (getItem.manage_stock) {
                if (releaseInStock) {
                    getItem.stock_quantity = getItem.stock_quantity + element.quantity;
                    getItem.stock_status = "instock";
                } else {
                    getItem.stock_quantity = getItem.stock_quantity - element.quantity;
                    if (!getItem.stock_quantity) {
                        getItem.stock_status = "outofstock";
                    }
                }
                await getItem.save();
            }

        }
    }
}

module.exports = {
    manageProductStock
}