#!/usr/bin/env node
/* Node test runner: node tests/run-tests.js   (no install required) */
'use strict';
var path = require('path');
var CORE = require(path.join(__dirname, '..', 'js', 'core.js'));
var makeSuite = require('./suite.js');

var result = makeSuite(CORE);
result.log.forEach(function (l) { console.log(l); });
console.log('\n' + result.pass + ' passed, ' + result.fail + ' failed');
process.exit(result.fail ? 1 : 0);
