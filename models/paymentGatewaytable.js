const mongoose = require('mongoose');
const Config = require('../config/constants.json');

let GatewaySchema = mongoose.Schema({
    title: { type: String }, // Payment gateway title on checkout.
    description: { type: String }, //Payment gateway description on checkout.
    sort_order: { type: Number }, //Payment gateway sort order.
    payment_method: { type: String, enum: Config.PAYMENTGATEWAY },
    countries: { type: Array, default: [] },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
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

const GatewayTable = module.exports = mongoose.model('Gateway', GatewaySchema);