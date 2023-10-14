//jshint esversion:6
require('dotenv').config();
const express =require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session=require("express-session")
// const bcrypt=require("bcrypt");
// const saltrounds=10;
// const md5=require("md5");
// const encrypt=require("mongoose-encryption");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const uri=process.env.uri;

const app=express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(uri);

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

// const secret="Thisissecretstring";

// const secret=process.env.SECRET;
// userSchema.plugin(encrypt,{secret:secret, encryptedFields:["password"]});

userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(async function(id,done){
    const user=await User.findById(id);
    if(user){
        done(null,user);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// app.post("/register",async (req,res)=>{
//     const newUser=new User({
//         email:req.body.username,
//         password:req.body.password
//     });

//     await newUser.save()

//     res.render("secrets");
// })

// app.post("/login",async (req,res)=>{
//     foundUser=await User.findOne({email:req.body.username});
//     if(foundUser){
//         if(foundUser.password===req.body.password){
//             res.render("secrets");
//         }
//         else{
//             res.redirect("/login");
//         }
//     } else{
//         res.redirect("/login");
//     } 
// })

// app.post("/register",async (req,res)=>{
//     const newUser=new User({
//         email:req.body.username,
//         password:md5(req.body.password)
//     });

//     await newUser.save()

//     res.render("secrets");
// })

// app.post("/login",async (req,res)=>{
//     foundUser=await User.findOne({email:req.body.username});
//     if(foundUser){
//         if(foundUser.password===md5(req.body.password)){
//             res.render("secrets");
//         }
//         else{
//             res.redirect("/login");
//         }
//     } else{
//         res.redirect("/login");
//     } 
// })

// app.post("/register",async (req,res)=>{
//     bcrypt.hash(req.body.password,saltrounds,async function(err,hash){
//         const newUser=new User({
//             email:req.body.username,
//             password:hash
//         });
//         await newUser.save()
//         res.render("secrets");
//     });
// });

// app.post("/login",async (req,res)=>{
//     foundUser=await User.findOne({email:req.body.username});
//     if(foundUser){
//         bcrypt.compare(req.body.password,foundUser.password,function(err,result){
//             if(result==true){
//                 res.render("secrets");
//             } else{
//                 res.redirect("/login");
//             }
//         })
//     } else{
//         res.redirect("/login");
//     } 
// })

app.post("/register",(req,res)=>{
    User.register({username:req.body.username},req.body.password,function(err,user){
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        })
    })
})

app.get("/secrets",async (req,res)=>{
    const foundUsers=await User.find({"secret":{$ne:null}});
    res.render("secrets",{usersWithSecrets: foundUsers});
})

app.post("/login",(req,res)=>{
    const user=new User({
        username:req.body.username,
        password:req.body.password
    })
    req.login(user,function(err){
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        })
    })
})

app.get("/logout",function(req,res){
    req.logout(function(err){
        res.redirect("/");
    });
})

app.get("/",function (req,res){
    res.render("home");
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get("/login",function (req,res){
    res.render("login");
})

app.get("/register",function (req,res){
    res.render("register");
})

app.listen(3000,function(){
    console.log("Server started on port 3000");
})

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    } else{
        res.redirect("/login");
    }
})

app.post("/submit",async function(req,res){
    const submittedsecret= req.body.secret;
    const foundUser=await User.findById(req.user.id);
    if(foundUser){
        foundUser.secret=submittedsecret;
        await foundUser.save();
        res.redirect("/secrets");
    }
})

