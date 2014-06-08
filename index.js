var express = require('express');
var app = express();
var watsi = require('./watsi.js');

app.get('/', function(req, res){
  watsi.readDoc(function(data) {
    res.send(data)
  });
});

app.listen(3000);
