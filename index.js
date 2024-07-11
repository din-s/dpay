const express = require('express');
const app = express();
require('dotenv').config()
require('./mongoose.js');
const bodyParser = require('body-parser')
const cors = require('cors');
const appConstants = require('./globals/app-constants.js');
// Database models
const Transaction = require('./models/transaction.js')
const Wallet = require('./models/wallet.js');
const { default: mongoose } = require('mongoose');

const port = process.env.PORT || 3001;

const corsOptionsDelegate = (req, next) => {
    const allowlist = process.env.FRONT_END_URI || [];
    let corsOptions = { optionsSuccessStatus: 200 };
    if (allowlist.indexOf(req.header('Origin')) !== -1) {
      corsOptions.origin = true // reflect (enable) the requested origin in the CORS response
    } else {
      corsOptions.origin = false // disable CORS for this request
    }
    next(null, corsOptions) // callback expects two parameters: error and options
  }

app.use(cors(corsOptionsDelegate));

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
const logger = (req, res, next) => {
    console.log(req.method, req.path, "called");
    next();
}
app.use(logger)

const handleError = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ error: err.message || "Internal Server Error" });
};

app.use(handleError);
  

/**
 * Aceepts Wallet Name and an OPTIONAL initial balance to setup the wallet.
 * 
 * It also handles some validation like wallet name is required, and wallet can not be duplicated, and an initial wallet balance cannot be negative
 * req
 * { balance, name } e.g. { balance: 20, name: ‘Hello world’ }
 * 
 * res
 * Status 200, Response body: { id, balance, transactionId: ‘4349349843’, name: ‘Hello world’,
    date: <JS Date obj>}
 */
app.post("/setup", async(req, res) => {
    const {balance = 0, name} = req.body;
    if(!name) {
        handleError({
            statusCode: 400,
            message: 'Wallet name is required'
        }, null, res)
        return;
    }

    if(balance < 0) {
        handleError({
            statusCode: 400,
            message: 'Unable to initialize wallet with a negative balance.'
        }, null, res)
        return;
    }

    const existing = await Wallet.find({name: name});
    if(existing.length) {
        handleError({
            statusCode: 400,
            message: `Duplicate wallet name '${name}', Please choose a uniquq wallet name`
        }, null, res)
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
            res.status(200).send({
                id: wallet._id,
                balance: wallet.balance,
                transactionId: txn._id,
                name: wallet.name,
                date: txn.executedAt
            })
        })
    }).catch(e => {
        handleError({
            statusCode: 501,
            message: 'Failed to setup wallet: ' + err
        }, null, res)
        return;
    })
})


app.post("/transact/:walletId", async (req, res) => {
    const walletId = req.params.walletId;
    if(!mongoose.Types.ObjectId.isValid(walletId)) {
        handleError({
            statusCode: 400,
            message: 'Invalid Wallet Id supplied'
        }, null, res)
        return;
    }

    const wallet = await Wallet.findById(walletId)
    if(!wallet) {
        handleError({
            statusCode: 400,
            message: 'Invalid Wallet Id supplied'
        }, null, res)
        return;
    }

    const { amount, description } = req.body;

    if(!amount) { // this handles both 0 and undefined, null
        handleError({
            statusCode: 400,
            message: 'Invalid Amount, Please supply a non-zero amount'
        }, null, res)
        return;
    }

    if(amount < 0 && Math.abs(amount) > wallet.balance) {
        handleError({
            statusCode: 400,
            message: 'Insufficient Balance, Please maintain a sufficient balance to execute this transaction'
        }, null, res)
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
        res.status(200).send({
            balance: updatedWallet.balance,
            transactionId: txn._id
        })
    }).catch(err => {
        handleError({
            statusCode: 500,
            message: err
        }, null, res)
    })
})

app.get("/transactions", async (req, res) => {

    const { walletId, skip = 0, limit = 100 } = req.query;
    if(!mongoose.Types.ObjectId.isValid(walletId)) {
        handleError({
            statusCode: 400,
            message: 'Invalid Wallet Id supplied'
        }, null, res)
        return;
    }

    const walletExist = await Wallet.findById(walletId)
    // TODO: only allow to show transactions that match with req.header walletId

    if(!walletExist) {
        handleError({
            statusCode: 400,
            message: 'Invalid Wallet Id supplied'
        }, null, res)
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

app.get("/wallet/:id", async (req, res) => {
    const { id: walletId } = req.params;
    if(!mongoose.Types.ObjectId.isValid(walletId)) {
        handleError({
            statusCode: 400,
            message: 'Invalid Wallet Id supplied'
        }, null, res)
        return;
    }

    const walletExist = await Wallet.findById(walletId)
    // TODO: only allow to show transactions that match with req.header walletId

    if(!walletExist) {
        handleError({
            statusCode: 400,
            message: 'Invalid Wallet Id supplied'
        }, null, res)
        return;
    }

    const { _id: id, balance, name, createdAt: date } = walletExist
    res.status(200).send({id, balance, name, date})
})

app.listen(port, () => {
    console.log(`DPay server now listenting on ${port}..`)
})