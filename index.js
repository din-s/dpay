const express = require('express');
const app = express();
require('dotenv').config()
require('./mongoose.js');
const bodyParser = require('body-parser')
const appConstants = require('./globals/app-constants.js');
// Database models
const Transaction = require('./models/transaction.js')
const Wallet = require('./models/wallet.js')

const port = process.env.PORT || 3001;

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.post("/setup", (req, res) => {
    /**
     * req
     * { balance, name } e.g. { balance: 20, name: ‘Hello world’ }
     * 
     * res
     * Status 200, Response body: { id, balance, transactionId: ‘4349349843’, name: ‘Hello world’,
date: <JS Date obj>}
     */
    const {balance = 0, name} = req.body;
    if(!name) {
        res.status(400).send({
            error: 'Wallet Name is required'
        })
        return;
    }

    if(balance < 0) {
        res.status(400).send({
            error: 'Unable to initialize wallet with a negative balance.'
        })
        return;
    }
    const now = new Date();
    const newWallet = new Wallet({name, balance, createdAt: now, updatedAt: now})

    newWallet.save().then((wallet) => {
        // save the transaction
        const initTxn = {
            amount: balance,
            description: 'Opening Balance',
            closingBalance: balance,
            type: appConstants.tranactionType.CREDIT,
            executedAt: now,
            walletId: wallet._id
        }

        const transction = new Transaction(initTxn)

        transction.save().then((txn) => {
            res.status(appConstants.responseStatus.success200).send({
                id: wallet._id,
                balance: wallet.balance,
                transactionId: txn._id,
                name: wallet.name,
                date: txn.executedAt
            })
        })
    }).catch(e => {
        res.status(401).send({
            error: 'Failed to setup wallet: ' + err
        })
        return;
    })
})


app.post("/transact/:walletId", (req, res) => {

})

app.get("/transactions", (req, res) => {

})

app.get("/wallet/:id", (req, res) => {

})

app.listen(port, () => {
    console.log(`DPay server now listenting on ${port}..`)
})