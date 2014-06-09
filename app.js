var express     = require('express');
var path        = require('path');
var logger      = require('morgan');
var expressHbs  = require('express3-handlebars');
var watsi       = require('./lib/watsi');
var async       = require('async');
var fs = require('fs');

var app = express();

var csv = require('fast-csv');

// view engine setup
app.engine('hbs', expressHbs({extname:'hbs', defaultLayout:'main.hbs'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

var SPENDING_FILE = path.join(__dirname, 'public', 'spending.csv');


app.get('/', function(req, res) {
  var countries = {};

  watsi.countries(function(err, data) {

    /*
      * Read the countries from Watsi data
      * get all the calculated values and put them in an object
    */
    for (var country in data) {
      if (typeof countries[country] === 'undefined') {
        countries[country] = {};
      }
      // average days to fund
      countries[country].avgDaysToFund = getAvgDaysToFund(data[country], country);
      // average donation
      countries[country].avgDonation = getAvgDonation(data[country]);
      // totalDonation
      countries[country].totalDonations = getTotalDonations(data[country]);
      // totalPatients
      countries[country].totalPatients = data[country].length;
    }
    /*
      * Then look at Healthcare Spending data from World Bank
      * if we have data for a country, add the spending data
      * to the Watsi data.
    */
    csv.fromPath(SPENDING_FILE, {headers: true}).on('record', function(item) {
      var country = item['﻿Country Name'];

      // create country namespace object
      if (typeof countries[country] !== 'undefined') {
        // assign spending from spending.csv
        var spending = item["2012 [YR2012]"];
        if (spending) { countries[country].spending = parseFloat(spending).toFixed(2) + "%"; }
      }
    }).on('end', function() {
      /*
        * When we're done reading all the data from the Spending file
        * Turn our countries object into an array
        * and render that with the index page.
      */
      // turn it into an array
      var records = [];
      for (var country in countries) {
        var item = {
          name: country,
          avgDonation: countries[country].avgDonation,
          avgDaysToFund: countries[country].avgDaysToFund,
          totalDonations: countries[country].totalDonations,
          totalPatients: countries[country].totalPatients,
          spending: countries[country].spending
        }
        records.push(item);
      }
      res.render('index', {countries: records});
    });
  });
});

app.post('/refresh', function(req, res) {
  watsi.refreshData(function() {
    res.send('done');
  })
})

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

// HELPER FUNCTIONS
// for each country, assign the average daysToFund, totalDonations, and totalPatients
function getAvgDaysToFund(records, country) {
  // if (country === 'Guatemala') { console.log(records); }
  var total = records.reduce(function(running, item) {
    var num = parseFloat(item.daysToFund) || 0;
    return running += num;
  }, 0);
  if (total) {
    return (total / records.length).toFixed(1);
  } else {
    return "N/A";
  }
}

function getAvgDonation(records) {
  if (records.length > 0 ) {
    return toUSD(getTotalDonations(records) / records.length);
  } else {
    return 0;
  }
}

function getTotalDonations(records) {
  var sum = 0;
  records.forEach(function(item) {
    sum += parseFloat(item.cost.slice(1).replace(/,/g,''));
  });
  return toUSD(sum);
}

function toUSD(number) {
  var number = number.toString(),
  dollars = number.split('.')[0],

  dollars = dollars.split('').reverse().join('')
      .replace(/(\d{3}(?!$))/g, '$1,')
      .split('').reverse().join('');
  return '$' + dollars;
}