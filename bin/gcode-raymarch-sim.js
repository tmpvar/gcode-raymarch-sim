#!/usr/bin/env node


var argv = require('optimist').argv;
var skateboard = require('skateboard');
var split = require('split');
var createGrblSimulator = require('grbl-simulator');
var opener = require('opener');


if (typeof argv.i !== 'undefined') {

  process.stdin.pause();
  var stream = null;
  skateboard(function(stream) {
    process.stdin.pipe(split()).pipe(stream)on('data', function(d) {
      console.log(d);
    });

    process.stdin.resume();
  });
} else {

}
