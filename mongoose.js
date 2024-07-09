const mongoose = require('mongoose')

let database;
mongoose.connect(process.env.MONGO_URI)
.then((success) => {
    console.log('Connection to Mongo Successful');
})
.catch(err => console.error('An Error Occurred while connecting to mongoose', err));