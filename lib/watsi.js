#!/usr/bin/env node
var fs = require('fs');
var jsonfile = require('jsonfile');
var path = require('path');
var GS = require('google-spreadsheets');

var DATA_FILE = path.join(__dirname, '..', 'public', 'data.json');
var TIMESTAMP_FILE = path.join(__dirname, '..', 'refresh.log');
var DOC_ID = '1Omhoi2Fl7E5aqxb7p9AIh7aXcYy_3A7YfYWXFqFEUZg';

function countries(callback) {
  readDoc(function(err, data) {
    var countries = {};
    data.forEach(function(row) {
      if (typeof countries[row.country] === 'undefined') {
        countries[row.country] = [];
      }
      countries[row.country].push(row)
    });
    callback(null, countries);
  })
}

function refreshData(callback) {

  GS({key: DOC_ID}, function(err, spreadsheet) {

    // get patients worksheet
    var patients = spreadsheet.worksheets[0];

    // get cells from worksheet
    patients.cells(null, function(err, rows) {

      var rowObjects = rows.cells;

      var rowsArray = [];

      for (var key in rowObjects) {
       rowsArray.push(rowObjects[key]);
      }

      var header = rowsArray.shift(); // remove header row && mutates the array!!

      // map relevant columns from posts
      var newDataArray = rowsArray.map(function(row) {
        var newObj = {};

        if (row['2'] && row['2'].value) { newObj.id       = row['2'].value; }
        if (row['6'] && row['6'].value) { newObj.cost     = row['6'].value; }
        if (row['4'] && row['4'].value) { newObj.country  = row['4'].value; }
        if (row['7'] && row['7'].value) { newObj.posted   = row['7'].value; }
        if (row['8'] && row['8'].value) { newObj.funded   = row['8'].value; }

        if (newObj.posted && newObj.funded) {
          var days = dayDiff(new Date(newObj.posted), new Date(newObj.funded))
          newObj.daysToFund = parseInt(days); // daylight savings time makes it uneven days
        }

        return newObj;
      });

      // Update refresh log
      jsonfile.writeFile(DATA_FILE, newDataArray, function(err) {
        if (err) { console.log(err); return; }
        fs.appendFile(TIMESTAMP_FILE, new Date().toString() + '\n', function(err) {
          if (err) { callback(err); return; }
          callback();
        })
      });

      function dayDiff(first, second) {
        return (second-first)/(1000*60*60*24);
      }
    });
  });
}

function readDoc(callback) {
  if (fs.existsSync(DATA_FILE)) {
    jsonfile.readFile(DATA_FILE, function(err, objects) {
      callback(null, objects);
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
module.exports.countries = countries;