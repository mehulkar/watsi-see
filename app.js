var express     = require('express');
var path        = require('path');
var logger      = require('morgan');
var expressHbs  = require('express3-handlebars');
var watsi       = require('./lib/watsi');
var async       = require('async');

var app = express();

// view engine setup
app.engine('hbs', expressHbs({extname:'hbs', defaultLayout:'main.hbs'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  async.parallel([watsi.readDoc, watsi.readTimeStamp], function(err, results){
    var items = results[0],
        timestamp = results[1],
        data = { items: items, timestamp: timestamp }
    res.render('index', data)
  });
});

app.get('/countries', function(req, res) {
  watsi.readDoc(function(err, data) {

    // collect by country
    var countries = {};
    data.forEach(function(row) {
      if (typeof countries[row.country] === 'undefined') {
        countries[row.country] = [];
      }
      countries[row.country].push(row)
    });

    // convert to array so we can sort
    var sortedCountries = [];

    for (var key in countries) {
      sortedCountries.push([key, countries[key]])
    }

    // sort by num of patients in each country
    sortedCountries.sort(function(a,b) {
      return b[1].length - a[1].length;
    });

    res.render('countries', {countries: sortedCountries})
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