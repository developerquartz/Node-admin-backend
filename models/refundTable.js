const mongoose = require('mongoose');

let RefundSchema = mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    charge: { type: mongoose.Schema.Types.ObjectId, ref: 'paymentLedger' },
    amount: { type: Number, required: true },
    reason: { type: String },
    refunded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, //User ID of user who created the refund.
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

const RefundTable = module.exports = mongoose.model('Refund', RefundSchema);