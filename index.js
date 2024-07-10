const express = require('express');
const app = express();
require('dotenv').config()
require('./mongoose.js');
const bodyParser = require('body-parser')
const appConstants = require('./globals/app-constants.js');
// Database models
const Transaction = require('./models/transaction.js')
const Wallet = require('./models/wallet.js');
const { default: mongoose } = require('mongoose');

const port = process.env.PORT || 3001;

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
const logger = (req, res, next) => {
    console.log(req.Method, req.path, "called");
    next();
}
app.use(logger)

app.post("/setup", async(req, res) => {
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

    const existing = await Wallet.find({name: name}).exec();
    if(existing.length) {
        res.status(501).send({
            error: `Duplicate Wallet Name ${name}`,
            message: 'Please choose a unique wallet name.'
        })
        return;
    }

    // since other checks are done we are good to setup the new wallet the given params.
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


app.post("/transact/:walletId", async (req, res) => {
    const walletId = req.params.walletId;
    if(!mongoose.Types.ObjectId.isValid(walletId)) {
        res.status(400).send({
            error: 'Invalid Wallet Id supplied',
            message: "Please Supply a valid walletId"
        });
        return;
    }

    const wallet = await Wallet.findById(walletId)
    if(!wallet) {
        res.status(400).send({
            error: 'Invalid Wallet Id supplied',
            message: "Please Supply a valid walletId"
        });
        return;
    }

    const { amount, description } = req.body;

    if(!amount) { // this handles both 0 and undefined, null
        res.status(400).send({
            error: 'INVALID_AMOUNT',
            message: "Please supply a non-zero amount"
        });
        return;
    }

    if(amount < 0 && Math.abs(amount) > wallet.balance) {
        res.status(400).send({
            error: 'Insufficient Balance',
            message: "Please maintain a sufficient balance to execute this transaction",
            bal: wallet.balance // temp remove it

        });
        return;
    }

    // determine credit or debit;
    const txn = new Transaction({
        amount: Math.abs(amount),
        description: description,
        closingBalance: wallet.balance + amount,
        type: amount > 0 ? 'credit' : 'debit',
        executedAt: new Date(),
        walletId: walletId
    }).save().then(async (txn) => {

        // update the wallet with closing balance
        const updatedWallet = await Wallet.findByIdAndUpdate(walletId, {$set: {balance: txn.closingBalance, updatedAt: new Date()}}, {new: true}).exec();
        // { balance: 30, transactionId: ‘8328832323’ }
        res.status(200).send({
            balance: updatedWallet.balance,
            transactionId: txn._id
        })
    }).catch(err => {
        res.status(500).send({
            error: appConstants.responseStatus.somethingWentWrong,
            message: err
        })
    })
})

app.get("/transactions", async (req, res) => {

    const { walletId, skip = 0, limit = 100 } = req.query;
    if(!mongoose.Types.ObjectId.isValid(walletId)) {
        res.status(400).send({
            error: 'Invalid Wallet Id supplied',
            message: "Please Supply a valid walletId 1ert",
            is: `${walletId}`
        });
        return;
    }

    const walletExist = await Wallet.findById(walletId)
    // TODO: only allow to show transactions that match with req.header walletId

    if(!walletExist) {
        res.status(400).send({
            error: 'UNKNOWN_WALLET',
            message: "Please supply a valid walletID"
        });
        return;
    }

    const transactions = await Transaction.aggregate([{
        $match: {walletId: new mongoose.Types.ObjectId(walletId)}
    }, {
        $project: {
            id: "$_id",
            walletId: 1,
            amount: 1,
            description: 1,
            balance: "$closingBalance",
            date: "$executedAt",
            type: {$toUpper: "$type"}
        }
    }, 
    {$skip: Number(skip)},
    {$limit: Number(limit)}])

    /**
     * {
        id,
        walletId: string,
        amount: number,
        balance: number,
        description: string,
        date: <JS Date obj>,
        type: ‘CREDIT’/’DE BIT’
        }
    */
    res.status(200).send(transactions)
})

app.get("/wallet/:id", (req, res) => {

})

app.listen(port, () => {
    console.log(`DPay server now listenting on ${port}..`)
})