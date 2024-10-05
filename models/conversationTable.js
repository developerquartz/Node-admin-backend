const mongoose = require('mongoose');

let RoomSchema = mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date_created_utc: { type: Date }
},
    {
        versionKey: false // You should be aware of the outcome after set to false
    });

const RoomTable = module.exports = mongoose.model('Room', RoomSchema);