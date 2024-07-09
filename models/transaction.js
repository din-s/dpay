const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
    amount: {type: Number},
    description: {type: String},
    closingBalance: {type: Number},
    type: {type: String, enum: ['credit', 'debit'], default: 'credit'},
    executedAt: {type: Date},
    walletId: {type: mongoose.Types.ObjectId}
})

const Transaction = new mongoose.model('transaction', transactionSchema);

module.exports = Transaction