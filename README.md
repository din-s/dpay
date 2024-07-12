**D-Pay Backend Service**
---
**Pre-requisite**
- `NodeJS`, `npm` installed
- `MongoDB` A NoSQL database for document store
- `Postman` to test API

List of APIs
- Setup Wallet: (`POST /setup`) Creates a new wallet for the user.
- Execute Transaction: (`POST /transact/:walletId`) Performs debit or credit transactions on the wallet.
- Get Wallet Details: (`GET /wallet/:id`) Retrieves information about the user's wallet.
- Get Transactions: (`GET /transactions`) Fetches a list of transactions associated with the wallet (Note: you need to supply `walletId` as queryParam also supports `skip` and `limit`).

**Project Setup Steps:**
Clone the Repository:

```Bash
git clone https://github.com/din-s/dpay.git
```
Install Dependencies:

```Bash
cd dpay
npm install
```

Run the Application:
```Bash
npm run start
```

**Note** This repo is also hosted on [Railway](https://railway.app/) however due limited developer credits & no auth protection in this project I am not able to share the link here we can connect in person to see the hosted backend service demo.

**Todo**
- Didn't got opportunity to test for Race Condition behaviour
- upto 4 Decimal places precision in Balance.

--- 
- Thankyou I really enjoyed developing this project. Hope you find it useful.
- For any query reach to me @[linkedIn](https://linkedin.com/in/din-s-sharma)