var runService = require('../');

var Readable = require('stream').Readable;
var Writable = require('stream').Writable;

var input = new Readable;
var output = Writable();

output._write = function (chunk, enc, next) {
  console.log(chunk.toString());
  next();
};

output.on('error', function(err){
  console.log('err', err)
});

var service = require('fs').readFileSync(__dirname + '/test-service.js').toString();

runService({ 
  service: service,
  env: { 
    params: "testing",
    req: input,
    res: output
  },
  vm: {
    require: require,
    console: console
  },
 })(function(err){
  if(err) throw err;
});