#!/usr/bin/env node

// inspired by https://www.alexbevi.com/blog/2020/01/26/what-is-mongodb-ftdc-aka-diagnostic-dot-data/

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const BSON = require('bson');
const BSONStream = require('bson-stream');
//const { EJSON, BSON } = require('bson');
const fs = require('fs');
const { Buffer } = require('buffer');
const zlib = require('zlib');
const { Readable } = require('stream');


const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command('transform', 'Transforms the input FTDC file to output JSON.')
  .example('$0 transform -f metrics.2022-06-16T19-38-10Z-00000', 'Transforms the given file to JSON file')
  .alias('f', 'file')
  .nargs('f', 1)
  .describe('f', 'Load a file')
  .demandOption(['f'])
  .help('h')
  .alias('h', 'help')
  .argv;



const bsonStreamOptions = {
  "maxDocLength": 2147483647,  // use maximal size instead of default 16777216
  "raw": false,                // emit JSONObjects (false) instead of Buffers (True)
  "debug": true,              // whether to do extra console logging or not
  "hide": true                //whether to suppress errors
};


let rs = fs.createReadStream(argv.file);
let inBsonStream = rs.pipe(new BSONStream(bsonStreamOptions));

inBsonStream.on('error', errorHandler);
inBsonStream.on('data', function (obj) {

  if (obj.type === 0) { //metadata
    console.log(JSON.stringify(obj, null, ' '));
  } else if (obj.type === 1) { //metrics
    // console.log(obj.data);
    let dataBase64 = Buffer.from(obj.data.buffer, 'base64');
    let bsonData = zlib.inflateSync(dataBase64.slice(4));  //slice(4) to avoid zlib header validy issue
    // console.log(bsonData);
    const buffStream = Readable.from(bsonData);
    let bsonStream = buffStream.pipe(new BSONStream(bsonStreamOptions));
    bsonStream.on('error', errorHandler);
    bsonStream.on('data', function (obj) {
      console.log(JSON.stringify(obj, null, ' '));
    });
  } else {
    console.log(`Unknown object type: ${obj.type}`);
    console.log(JSON.stringify(obj, null, ' '));
  }
});


function errorHandler(err) {
  console.log(`Unexpected error: \"${err.message}\"`);
  //process.exit(1);
}

// ========================================================================================  
/*
const express = require('express');
  const app = express();
  app.get('/', (req, res) => {
    res.send('Hi!');
  });

  const server = app.listen(3000, () => console.log('Server ready'));

  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Process terminated');
    });
  });
*/
