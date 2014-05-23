#!/usr/bin/env node


var argv = require('optimist').argv;
var skateboard = require('skateboard');
var split = require('split');
var createGrblSimulator = require('grbl-simulator');
var opener = require('opener');
var throttle = require('throttle');

if (typeof argv.i !== 'undefined') {
  var port = argv.port || 9870;

  process.stdin.pause();
  var stream = null;
  skateboard({
    port: port,
    dir: __dirname + '/../public'
  }, function(stream) {
    stream.once('data', function() {
      process.stdin
             .pipe(createGrblSimulator(argv.interval || 1.0))
             .pipe(throttle(20000))
             .pipe(split()).on('data', function(d) {
        stream.write(d + '\r\n');
      });
      process.stdin.resume();
    });
  });

  opener('http://localhost:' + port + '?skate=true&diameter=' + (argv.diameter || 2.5));
} else {

}
