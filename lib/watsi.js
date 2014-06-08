#!/usr/bin/env node
var fs = require('fs');
var jsonfile = require('jsonfile');
var path = require('path');
var GS = require('google-spreadsheets');

var DATA_FILE = path.join(__dirname, '..', 'data.csv');

function refreshData(callback) {

  GS({key: '1Omhoi2Fl7E5aqxb7p9AIh7aXcYy_3A7YfYWXFqFEUZg'}, function(err, spreadsheet) {
    var patients = spreadsheet.worksheets[0];

    patients.cells(null, function(err, rows) {

      var rowObjects = rows.cells;

      var rowsArray = [];

      for (var key in rowObjects) {
       rowsArray.push(rowObjects[key]);
      }

      var header = rowsArray.shift(); // mutates the array!!

      // get relevant columns from posts
      var newDataArray = rowsArray.map(function(row) {
        var newObj = {};

        if (row['2'] && row['2'].value) { newObj.id     = row['2'].value; }
        if (row['6'] && row['6'].value) { newObj.cost   = row['6'].value; }
        if (row['7'] && row['7'].value) { newObj.posted = row['7'].value; }
        if (row['8'] && row['8'].value) { newObj.funded = row['8'].value; }

        return newObj;
      });

      jsonfile.writeFile(DATA_FILE, newDataArray, function(err) {
        callback();
      });
    });
  });
}

function readDoc(callback) {
  if (fs.existsSync(DATA_FILE)) {
    console.log(DATA_FILE);
    jsonfile.readFile(DATA_FILE, function(err, data) {
      callback(data);
    })
  } else {
    refreshData(function() {
      readDoc();
    });
  }
}

module.exports = {};
module.exports.readDoc = readDoc;
module.exports.refreshData = refreshData;