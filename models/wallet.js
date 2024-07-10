const mongoose = require('mongoose')
const walletSchema = new mongoose.Schema({
    name: {type: String},
    balance: {type: Number, default: 0},
    isDeleted: {type: Boolean, default: false},
    isActive: {type: Boolean, default: true},
    createdAt: {type: Date},
    updatedAt: {type: Date}
})

const Wallet = new mongoose.model('wallet', walletSchema);

module.exports = Wallet;