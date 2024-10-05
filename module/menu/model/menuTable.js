const mongoose = require('mongoose');
const menuConstant = require('../config/constant.json') // making constant.json file global for menu folder only

let MenuSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required : true },
    label: { type: String, required : true },
    
    type: { type: String, enum:menuConstant.menuType, required : true },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'menuItems'}],
    status: { type: String, enum: ["active", "inactive", "archived"], required:true, default: "active" },

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

const MenuTable = module.exports = mongoose.model('menu', MenuSchema);

