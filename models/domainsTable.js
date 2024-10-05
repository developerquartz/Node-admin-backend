const mongoose = require('mongoose');

let DomainSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    domain: { type: String, required: true },
    price: { type: Number, required: true },
    transactionDetails: { type: Object },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_payment_utc: { type: Date },
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

const DomainTable = module.exports = mongoose.model('Domain', DomainSchema);