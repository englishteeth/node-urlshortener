'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var cors = require('cors');

var bodyParser = require('body-parser'); 
var dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.DB_URI);

const Schema = mongoose.Schema;
const shortURLSchema = new Schema({
  original: { type: String, required: true },
  short: { type: Number, default: 0 }
});
shortURLSchema.pre('validate', function(next) {
  var self = this;
    ShortURL.find({})
      .sort({ short: -1 })
      .limit(1)
      .exec(function(err, result) {
          if (err) return console.error(err);
          self.short = result[0].short + 1; 
          next(); 
    });
});
const ShortURL = mongoose.model("ShortURL", shortURLSchema);

var findURL = function(original, data) {
    ShortURL.findOne({original: original}, function(err, result) {
    if (err) return console.error(err);
    data(null, result); 
  });
};

var findShortURL = function(short, data) {
    ShortURL.findOne({short: short}, function(err, result) {
    if (err) return console.error(err);
    data(null, result); 
  });
};

var saveURL = function(original, data) {
  new ShortURL({ original: original }).save( function(err, res) {
    if (err) return console.error(err);
    data(null, res);
  });
};

app.use(cors());

/** this project needs to parse POST bodies **/
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// API endpoint... 
app.post("/api/shorturl/new", (req, resp)=>{
  const { url } = req.body;
  try {
    const pu = new URL(url);
    dns.lookup(pu.hostname, (err, addr) => {
      findURL(pu.href, (err, res) => {
        if (res==null) {
          saveURL(pu.href, (err, res) =>  {
            resp.json({ original_url:`${pu.href}`, "short_url":`${res.short}`});
          });
        } else {
          resp.json({ original_url:`${pu.href}`, "short_url":`${res.short}`});
        }
      });
    });
  } catch (e) {
    if (e instanceof TypeError) {
      resp.json({ err: e.message });
    } else {
      throw e;  // re-throw the error unchanged
    }
  }    
});

app.get("/api/shorturl/:short_url", (req, resp) => {
  const { short_url } = req.params;
  findShortURL(short_url, (err, res) => {
    if (res==null) {
      resp.json({ err: "short url not found" });
    } else {
      console.log(`Redirecting to: ${res.original}`);
      resp.redirect(`${res.original}`);
    }
  });
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});