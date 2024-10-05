const mongoose = require("mongoose");
const Config = require("../config/constants.json");

let chargeSchema = mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    charge: { type: Number, required: true },
    type: { type: String, enum: ["charge", "refund"], default: "charge" },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date },
    mete
  },
  {
    versionKey: false, // You should be aware of the outcome after set to false
  }
);


const Charge = (module.exports = mongoose.model("Charges", chargeSchema));
