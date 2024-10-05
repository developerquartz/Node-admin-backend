const mongoose = require('mongoose');

let subscriptionSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    billingPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    stripeSubscriptionId: { type: String },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
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

const subscriptionTable = module.exports = mongoose.model('Subscription', subscriptionSchema);

//add Plans
module.exports.addSubscription = function (data, callback) {
    data.date_created_utc = new Date();
    subscriptionTable.create(data, callback);
}