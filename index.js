const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();

const app = express();
app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000;
const dbUser = process.env.dbUser
const dbPsrd = process.env.dbPswrd

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${dbUser}:${dbPsrd}@cluster0.jd7el.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const biosCollention = await client.db("loveLink").collection("bios");

        app.get("/bios", async (req, res) => {
            const result = await biosCollention.find().toArray();
            res.send(result)
        })

        app.post("/bios", async (req, res) => {
            const body = req.body;
            const filter = {
                email: body.email,
            }
            const existingBio = await biosCollention.findOne(filter);
            let result;
            if (existingBio) {
                result = await biosCollention.updateOne(
                    {email: body.email},
                    {$set: {...body}}
                )
            } else {
                const lastBio = await biosCollention.find().sort({ bio_id: -1 }).limit(1).toArray();
                const lastId = lastBio.length > 0 ? lastBio[0].bio_id + 1 : 0;
                body.bio_id = lastId;
                result = biosCollention.insertOne(body);
            }
            res.send(result)
        })
    } finally {
        // Ensures that the client will close when you finish/error
        //   await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Welcome to our server");
})
app.listen(port, () => {
    console.log(`Server is runnig on port - ${port}`)
})