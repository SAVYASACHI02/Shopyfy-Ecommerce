const port=4000;
const express=require("express");
const app=express();
const mongoose=require("mongoose");
const jwt=require("jsonwebtoken")
const multer=require("multer")
const path=require("path")
const cors=require("cors")

app.use(express.json());// request we get from response pass through json
app.use(cors());//connect backend to express app

//DATABASE CONNECTION WITH MONGO DB

mongoose.connect("mongodb+srv://savyas02:savyas02@cluster0.9whohot.mongodb.net/e-commerce")//in the end add path where we will have data of our express.application

// API CREATION


app.get("/",(req,res)=>{
    res.send("Express App is running")
})

// Image Storage Engine
const storage=multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload=multer({storage:storage}) 

// creating upload Endpoint for images
app.use('/images',express.static('upload/images'))// after this we will get /upload/images  at /images endpoint

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    });
})

// Schema creation
 
const Product=mongoose.model("product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
          type:String,
          required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    avilable:{
        type:Boolean,
        default:true,
    }
})

app.post('/addproduct',async (req,res)=>{
    let products= await Product.find({});// we get all products in arrow which get stored in products and we can access them
     let id;
    if(products.length>0) // we are trying to get our own id starting from 0
    {
       let last_product_array=products.slice(-1);
       let last_product=last_product_array[0];
       id=last_product.id+1; 
    }
    else
    {
       id=1; 
    }
    const product=new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();  //automatic store in db
    console.log("saved");
    res.json({
        success:true,
        name:req.body.name,
    }) 
})

// creating api for deleting product

app.post('/removeproduct',async (req,res)=>{
     await Product.findOneAndDelete({id:req.body.id});
     console.log("removed");
     res.json({
        success:true,
        name:req.body.name,
     })
})

//Create API for getting all product 

app.get('/allproducts',async (req,res)=>{
     let products=await Product.find({});// now in this products we get all product as array
     console.log("All products Fetched");
     res.send(products); 
})

// Schema for user model
const Users=mongoose.model('Users',{
      name:{
         type:String,
      },
      email:{
         type:String,
         unique:true,
      },
      password:{
        type:String
      },
      cartData:{
        type:Object,
      },
      date:{
        type:Date,
        default:Date.now,
      }
})

//creating end point to register user
app.post('/signup', async (req,res)=>{
    console.log("why erroe")
    let check=await Users.findOne({email:req.body.email})
    if(check){
        return res.status(400).json({success:false,error:"existing user found with same email address"})
    }
    let cart={};
    for (let i = 0; i < 300; i++) {
       cart[i]=0;
    }
    const user=new Users({
       name:req.body.username,
       email:req.body.email,
       password:req.body.password,
       cartData:cart,
    })
    
    await user.save();
    
    const data={
        user:{
            id:user.id
        }
    }
    const token=jwt.sign(data,'secret_ecom')
   
    res.json({success:true,token})
})
// creating endpoint for user login
app.post('/login',async (req,res)=>{
    let user=await Users.findOne({email:req.body.email})
    if(user){
        const passCompare= req.body.password === user.password;
        if(passCompare){
            const data={
                user:{
                    id:user.id
                }
            }
            const token=jwt.sign(data,'secret_ecom')
            res.json({success:true,token})
        }
        else
        {
            res.json({success:false,error:"Wrong Password"})
        }
    }
    else{
        res.json({success:false,errors:"Wrong email id"})
    }
})

// creating endpoint for new colllection
app.get('/newcollections',async (req,res)=>{
   let products=await Product.find({})
   let newcollection=products.slice(1).slice(-8)// we get recently added 8 products
   console.log("new collection fetched ")
   res.send(newcollection)
})

// cretaing endpoint in women section

app.get('/popularinwomen',async (req,res)=>{
    let products=await Product.find({category:"women"})
    let popular_in_women=products.slice(0,4) //getting 4 products from all fethed products
    console.log("popular in women fetched")
    res.send(popular_in_women)
})


//creating middleware to fetch user
 const fetchUser= async (req,res,next)=>{
    const token=req.header('auth-token')
    if(!token){
        res.status(401).send({errors:"please authenticate using validae"})
    }
    else{
        try{
                const data=jwt.verify(token,'secret_ecom')
                req.user=data.user;
                next()
        }catch(error){
            res.status(401).send({errors:"please authenticate using correct token"})
        }
    }
 }

// creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser,async (req,res)=>{
      
   let userData=await Users.findOne({_id:req.user.id})
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Added")
})

// creating endpoint to remove product from cartdata
app.post('/removefromcart',async (req,res)=>{
    let userData=await Users.findOne({_id:req.user.id})
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Removed")
})

//creating endpoint to get cart
app.post('/getcart',fetchUser,async (req,res)=>{
    let userData=await Users.findOne({_id:req.user.id})//we will get user if from middleware
    res.json(userData.cartData)
})


app.listen(port,(error)=>{
     if(!error){
        console.log("server is runnning on port:"+port);
     }
     else{
        console.log("Error"+error);
     }
})













