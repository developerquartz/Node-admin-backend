const mongoose = require('mongoose');

let CartSchema = mongoose.Schema({
    cart_key: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    productImage: { type: String },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
    lineTotal: { type: Number, default: 0 },
    status: { type: String, enum: ["process", "success"], default: "process" },
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

const cartTable = module.exports = mongoose.model('Cart', CartSchema);

module.exports.getCartByKey = (cart_key, callback) => {
    cartTable.find({ cart_key: cart_key }, callback);
}

//add Cart
module.exports.addcart = function (data, callback) {
    var query = { cart_key: data.cart_key, product: data.product };
    data.status = "process";
    cartTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//update Cart
module.exports.updatecart = function (data, callback) {
    var query = { _id: data.cartId };
    cartTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//get Cart by id
module.exports.getcartById = (id, callback) => {
    cartTable.findById(id, callback);
}

module.exports.getcartByIdAsync = (id, callback) => {
    return cartTable.findById(id, callback);
}

//remove Cart
module.exports.removecart = (id, callback) => {
    let query = { _id: id };
    cartTable.remove(query, callback);
}