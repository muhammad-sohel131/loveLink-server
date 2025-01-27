const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 5000;
const dbUser = process.env.dbUser
const dbPsrd = process.env.dbPswrd

const stripe = require('stripe')(process.env.Stripe_secret_key);
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());

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
        // await client.connect();
        // // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const biosCollention = await client.db("loveLink").collection("bios");
        const premiumBioCollection = await client.db("loveLink").collection("premiumBio");
        const favouritesBioCollection = await client.db("loveLink").collection("favouriteBios")
        const contactRequestCollection = await client.db("loveLink").collection("contact-requests")
        const marriedCollection = await client.db("loveLink").collection("marriedCollection");

        // json web token api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.isAdmin;
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }
        app.get("/premiumProfiles", async (req, res) => {
            try {
                const profiles = await biosCollention.find({ isPremium: true }).limit(6).toArray();
                res.send(profiles)
            } catch (err) {
                res.status(500).send({ message: err.message })
            }
        })

        app.get("/premiumBios", verifyToken, async (req, res) => {
            const result = await premiumBioCollection.find().toArray();
            res.send(result)
        })
        app.delete("/premiumBios/:id", verifyToken, async (req, res) => {
            try {
                const result = await premiumBioCollection.deleteOne({ bio_id: +req.params.id })
                res.send(result)
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        })
        app.post("/premiumBios", verifyToken, async (req, res) => {
            const result = await premiumBioCollection.insertOne(req.body);
            res.send(result);
        })

        app.get("/bios", async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;  
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;  
        
                const total = await biosCollention.countDocuments();
                const result = await biosCollention.find().skip(skip).limit(limit).toArray();
        
                res.send({
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    biodatas: result
                });
            } catch (error) {
                res.status(500).send({ message: "Server Error", error });
            }
        });
        

        app.post("/bios", async (req, res) => {
            const body = req.body;
            const filter = {
                email: body.email,
            }
            const existingBio = await biosCollention.findOne(filter);
            let result;
            if (existingBio) {
                result = await biosCollention.updateOne(
                    { email: body.email },
                    { $set: { ...body } }
                )
            } else {
                const lastBio = await biosCollention.find().sort({ bio_id: -1 }).limit(1).toArray();
                const lastId = lastBio.length > 0 ? lastBio[0].bio_id + 1 : 0;
                body.bio_id = lastId;
                result = biosCollention.insertOne(body);
            }
            res.send(result)
        })
        app.put("/makePremium/:id", verifyToken, async (req, res) => {
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

        app.put("/makeAdmin/:id", verifyToken, async (req, res) => {
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

        app.get('/bios/:email', verifyToken, async (req, res) => {
            const filter = {
                email: req.params.email
            }
            const result = await biosCollention.findOne(filter);
            res.send(result)
        })
        app.get('/biosId/:id', verifyToken, async (req, res) => {
            const filter = {
                bio_id: parseInt(req.params.id)
            }
            const result = await biosCollention.findOne(filter);
            res.send(result)
        })
        app.get('/contact-requests', verifyToken, async (req, res) => {
            const { status, auth_email } = req.query;
            const filter = {};

            if (status) {
                filter.status = status;
            }
            if (auth_email) {
                filter.auth_email = auth_email;
            }

            try {
                const result = await contactRequestCollection.find(filter).toArray();
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: err.message });
            }
        });


        app.post('/contact-requests', verifyToken, async (req, res) => {
            try {
                const result = contactRequestCollection.insertOne(req.body);
                res.send(result)
            } catch (err) {
                res.status(500).send({ message: err.message })
            }

        })
        app.put('/contact-requests', verifyToken, async (req, res) => {
            const { bio_id, author_email } = req.query;

            try {
                const filter = { bio_id: parseInt(bio_id), author_email: author_email };
                const updateDoc = { $set: { status: 'Approved' } };

                const result = await contactRequestCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: "No contact request found or status is the same" });
                }

                res.send({ message: "Status updated successfully", result });
            } catch (err) {
                res.status(500).send({ message: err.message });
            }
        });
        app.delete('/contact-requests', verifyToken, async (req, res) => {
            const { bio_id, author_email } = req.query;
            try {
                const filter = {
                    bio_id: parseInt(bio_id),
                    author_email
                }
                const result = await contactRequestCollection.deleteOne(filter)
                res.send(result)
            } catch (err) {
                console.log(err)
                res.status(500).send({ message: err.message })
            }
        })
        app.post("/favourites", verifyToken, async (req, res) => {
            try {
                const result = favouritesBioCollection.insertOne(req.body);
                res.send(result)
            } catch (err) {
                res.status(500).send({ message: err.message })
            }
        })
        app.delete("/favourites", verifyToken, async (req, res) => {
            const { bio_id, auth_email } = req.query;
            const filter = {
                bio_id: parseInt(bio_id),
                author_email: auth_email
            }
            try {
                const result = await favouritesBioCollection.deleteOne(filter)
                res.send(result)
            } catch (err) {
                res.status(500).send({ message: err.message })
            }
        })
        app.get("/favourites/:email", verifyToken, async (req, res) => {
            try {
                const email = req.params.email;
                const result = await favouritesBioCollection.find({ author_email: email }).toArray();
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: err.message })
            }
        })

        app.get('/gotMarried', async(reeq, res) => {
            try{
                const result = await marriedCollection.find().toArray();
                res.send(result)
            }catch(err){
                res.status(500).send({message: err.message})
            }
        })
        app.post('/gotMarried', async(req, res) => {
            try{
                const result = marriedCollection.insertOne(req.body);
                res.send(result)
            }catch(err){
                res.status(500).send({message: err.message})
            }
        })
        app.get("/biodataStats", async (req, res) => {
            try {
                const totalBiodata = await biosCollention.countDocuments();
                const totalBoys = await biosCollention.countDocuments({ gender: "Male" });
                const totalGirls = await biosCollention.countDocuments({ gender: "Female" });
                const totalMarriages = await marriedCollection.countDocuments();
        
                res.json({
                    totalBiodata,
                    totalBoys,
                    totalGirls,
                    totalMarriages
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
                res.status(500).json({ message: "Server error" });
            }
    })
        // paymentIntent
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
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