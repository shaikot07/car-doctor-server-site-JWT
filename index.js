const express = require('express')
const cors =require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port=process.env.PORT || 5000;

// middlewer 
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json()); 
app.use(cookieParser())


// amar banano middelwer for tokken veryfication ar jonno 

const verifyToken = async (req,res, next)=>{
    const token = req.cookies?.token;
    console.log('value of token in middleware',token);
    if(!token){
      return res.status(401).send({message: 'not authorized'})
    }
    jwt.verify(token,process.env.SECRET,(err, decoded)=>{
      // error
      if(err){
        console.log(err);
        return res.status(401).send({message:'unauthorized'})
      }
      // if token is valid then it would be decoded 
      console.log('value in the token', decoded);
      req.user = decoded;
      next()
    })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.loifkbc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');


      // auth related api 
      app.post('/jwt',async (req,res) =>{
        const user = req.body;
        console.log(user);
        const token = jwt.sign(user,process.env.SECRET,{expiresIn: '1h'})
        res
         .cookie('token', token,{
          httpOnly:true,
          secure:false,
          // sameSite:'none',
         
         })
        .send({success: true})
      })


    // service related  code below 
      // step:01 Get all data 
      app.get('/services',async(req,res)=>{
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result)
      })
      // akti data r bises bises property gulo niye akta data dibe 
      app.get('/services/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const options = {
                  // Include only the `title` and `imdb` fields in the returned document
                  // ki ki fild nibo ta 1 diye bole dite hbe 
                  projection: { title: 1, price: 1, service_id: 1,img: 1, },
                };
            const result=await serviceCollection.findOne(query,options);
            res.send(result)
      })

      // Bookings collection ar operations 
      app.post('/bookings',async(req,res)=>{
        const booking=  req.body; 
        console.log(booking);
        const result =await bookingCollection.insertOne(booking);
        res.send(result);
      });
      // some data pawar jonno operation 

      app.get('/bookings',verifyToken, async (req,res) =>{
        // console.log(req.query.email);
        // cookies ta asteche kina seta check korar jonno
        // console.log('tik tik token',req.cookies); 
        // verify set korar por user ke dekhabe 
        console.log('user in the valid token',req.user); 
        if(req.query.email !== req.user.email){
          return res.status(403).send({message: 'forbidden access'})
        }


        let query={};
          if(req.query?.email){
            query={email:req.query.email}
          }
        const result= await bookingCollection.find(query).toArray();
        res.send(result)  
      })

      // updated ar kaj 
      app.patch('/bookings/:id', async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updatedBooking = req.body;
        console.log(updatedBooking);
        const updateDoc ={
          $set:{
            status:updatedBooking.status
          },
        };
        const result = await bookingCollection.updateOne(filter,updateDoc);
        res.send(result)
      })





      // delete operation 
      app.delete('/bookings/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id:new ObjectId(id)};
        const result = await bookingCollection.deleteOne(query);
        res.send(result)
      })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
//     await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
      res.send('simple CRUD is RUNNING')
})

app.listen(port,()=>{
      console.log(`Simple CRUD is Running on port,${port}`);
})