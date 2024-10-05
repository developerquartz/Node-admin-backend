const mongoose = require('mongoose');

let productVariationSchema = mongoose.Schema({
    description: { type: String },
    image: { type: String },
    sku: { type: String, default: null },
    price: { type: Number, default: 0 },
    compare_price: { type: Number, default: 0 },
    manage_stock: { type: Boolean, default: false },
    stock_quantity: { type: Number, default: 0 },
    stock_status: { type: String, enum: ['instock', 'outofstock'], default: "instock" },
    attributes: { type: Array, default: [] },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date },
    meta_data: [
        {
            key: { type: String },
            value: { type: String }
        }
    ]
},
    {
        versionKey: false // You should be aware of the outcome after set to false
    });

const productVariationTable = module.exports = mongoose.model('productVariation', productVariationSchema);

//add productVariation
module.exports.addproductVariation = function (data, callback) {
    productVariationTable.create(data, callback);
}

module.exports.getproductVariationByIdAsync = (id, callback) => {
    return productVariationTable.findById(id, callback);
}

//update productVariation
module.exports.updateproductVariation = function (data, callback) {
    let query = { _id: data._id }
    productVariationTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.removeProductvariation = (id, callback) => {
    var query = { _id: id };
    productVariationTable.remove(query, callback);
}