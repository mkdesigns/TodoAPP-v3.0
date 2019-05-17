//jshint esversion:6

require('dotenv').config();
const express = require("express"),
      bodyParser = require("body-parser"),
      ejs = require("ejs"),
      _ = require("lodash"),
      mongoose = require("mongoose"),
      session = require('express-session'),
      passport = require('passport'),
      passportLocalMongoose = require('passport-local-mongoose'),
      GoogleStrategy = require('passport-google-oauth20').Strategy,
      FacebookStrategy = require('passport-facebook').Strategy,
      InstagramStrategy = require('passport-instagram').Strategy,
      findOrCreate = require('mongoose-findorcreate')
      
const app = express();
const dbName = '/todoDB';

//const dbName = '/todoDB?retryWrites=true';

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "When you lose passion in things you were used to enjoy...",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//const url = 'mongodb+srv://mkd_admin:1186Emuuzeuf2010@mkdesigndb-wisuu.mongodb.net' || 'mongodb://localhost:27017';
const url = process.env.DATABASEURL || 'mongodb://localhost:27017';

mongoose.connect(url + dbName, {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const usersSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    instagramId: String,
    secret: String
});

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);

const User = mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Willkommen zu deiner todolist!"
});

const item2 = new Item({
  name: "Tippe den + Button um einen neuen Eintrag zu erstellen."
});

const item3 = new Item({
  name: "<-- Tippe hier, um Einträge zu löschen."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

    Item.find({}, function(err, foundItems) {
        if (foundItems.length === 0){
            Item.insertMany(defaultItems, function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("Successfully saved default items to DB.");
                }
            });
            res.redirect("/");
            } else {
                res.render("list", {listTitle: "Todo's", newListItems: foundItems});
            }
        });
    });
    
app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);
  console.log(customListName);
  
  List.findOne({name: customListName}, function(err, foundList){
    if (!err) {
      if (!foundList) {
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;
  
  const item = new Item({
    name: itemName
  });
  
  if(listName === "Todo's"){
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  
  if (listName === "Todo's") {
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if(err) {
        console.log("shit happens :-)");
      } else {
        console.log("Entry " + checkedItemId.name + " was deleted successfully");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});

app.listen(process.env.PORT, process.env.IP, function() {
  console.log("Server started!");
});