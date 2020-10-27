#!/usr/bin/env node

// npm install minimist if you want to have a cli
import minimist from 'minimist';
const argv = minimist(process.argv.slice(2));

require('../lib')(argv);
