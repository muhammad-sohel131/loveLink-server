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

const stripe = require('stripe')(process.env.Stripe_secret_key);
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
        const premiumBioCollection = await client.db("loveLink").collection("premiumBio");
        const favouritesBioCollection = await client.db("loveLink").collection("favouriteBios")
        const contactRequestCollection = await client.db("loveLink").collection("contact-requests")
       
        app.get("/premiumProfiles", async(req, res) => {
            try{
                const profiles = await biosCollention.find({isPremium: true}).limit(6).toArray();
                res.send(profiles)
            }catch(err){
                res.status(500).send({message: err.message})
            }
        })

        app.get("/premiumBios", async(req, res) => {
            const result = await premiumBioCollection.find().toArray();
            res.send(result)
        })
        app.delete("/premiumBios/:id", async(req, res) => {
            try{
                const result = await premiumBioCollection.deleteOne({bio_id: +req.params.id})
                res.send(result)
            }catch(error){
                res.status(500).send({ error: error.message });
            }
        })
        app.post("/premiumBios", async(req, res) => {
            const result = await premiumBioCollection.insertOne(req.body);
            res.send(result);
        })

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
        app.put("/makePremium/:id", async (req, res) => {
            try {
                const result = await biosCollention.updateOne(
                    { bio_id: +req.params.id },  
                    { $set: { isPremium: true } } 
                );
                res.send(result);
            } catch (error) {
                console.log(error)
                res.status(500).send({ error: error.message });
            }
        });

        app.put("/makeAdmin/:id", async (req, res) => {
            try {
                const result = await biosCollention.updateOne(
                    { bio_id: +req.params.id },  
                    { $set: { isAdmin: true } } 
                );
                res.send(result);
            } catch (error) {
                console.log(error)
                res.status(500).send({ error: error.message });
            }
        });
        
        app.get('/bios/:email', async(req, res) => {
            const filter = {
                email: req.params.email
            }
            const result = await biosCollention.findOne(filter);
            res.send(result)
        })
        app.get('/biosId/:id', async(req, res) => {
            const filter = {
                bio_id: parseInt(req.params.id)
            }
            const result = await biosCollention.findOne(filter);
            res.send(result)
        })
        app.get('/contact-requests', async (req, res) => {
            const { status, email } = req.query; 
            const filter = {};
        
            if (status) {
                filter.status = status;
            }
            if (email) {
                filter.email = email;
            }
        
            try {
                const result = await contactRequestCollection.find(filter).toArray();
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: err.message });
            }
        });
        

        app.post('/contact-requests', async(req, res) => {
           try{
            const result = contactRequestCollection.insertOne(req.body);
            res.send(result)
           }catch(err) {
            res.status(500).send({message: err.message})
           }

        })
        app.put('/contact-requests', async (req, res) => {
            const { bio_id, author_email } = req.query; 
        
            try {
                const filter = { bio_id: parseInt(bio_id), author_email: author_email }; 
                const updateDoc = { $set: { status : 'Approved' } };
        
                const result = await contactRequestCollection.updateOne(filter, updateDoc);
        
                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: "No contact request found or status is the same" });
                }
        
                res.send({ message: "Status updated successfully", result });
            } catch (err) {
                res.status(500).send({ message: err.message });
            }
        });
        app.delete('/contact-requests', async(req, res) => {
            const { bio_id, author_email } = req.query; 
            try{
                const filter = {
                    bio_id : parseInt(bio_id),
                    author_email
                }
                const result = await contactRequestCollection.deleteOne(filter)
                res.send(result)
            }catch(err){
                console.log(err)
                res.status(500).send({message: err.message})
            }
        })
        app.post("/favourites", async(req, res) => {
            try{
                const result = favouritesBioCollection.insertOne(req.body);
                res.send(result)
            }catch(err){
                res.status(500).send({message: err.message})
            }
        })
        app.delete("/favourites/:id", async(req, res)=> {
            try{
                const email = "moriam@gmail.com"
                const result = await favouritesBioCollection.deleteOne({bio_id : parseInt(req.params.id), author_email: email})
                res.send(result)
            }catch(err){
                res.status(500).send({message: err.message})
            }
        })
        app.get("/favourites/:email", async (req, res) => {
            try{
                const email = req.params.email;
                const result = await favouritesBioCollection.find({author_email: email}).toArray();
                res.send(result);
            }catch(err){
                res.status(500).send({message: err.message})
            }
        })


        // paymentIntent
        app.post('/create-payment-intent', async(req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'USD',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
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