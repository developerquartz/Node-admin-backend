const mongoose = require('mongoose');
const disputeConstant = require('../config/constant.json')

let disputeSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    disputeWith: { type: String, enum: disputeConstant.disputeWith, required: true },
    attachment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    status: { type: String, enum: ["open", "closed", "cancelled"], required: true, default: "open" },

    reason: { type: String, default: null }, // reason for dispute
    description: { type: String, default: null },
    disputeResolvedMsg: { type: String, default: null },
    reply: [{
        replyBy: { type: String, enum: disputeConstant.replyBy, required: true },
        message: { type: String, required: true },
        user:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        image: { type: String },
        date_created: { type: String },
        time_created: { type: String },
        date_created_utc: { type: Date }
    }],

    date_created: { type: String },
    time_created: { type: String },
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

const DisputeTable = module.exports = mongoose.model('dispute', disputeSchema);

