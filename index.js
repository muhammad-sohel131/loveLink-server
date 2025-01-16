const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();

const app = express();
app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send("Welcome to our server");
})
app.listen(port, () => {
    console.log(`Server is runnig on port - ${port}`)
})