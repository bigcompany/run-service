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

output.end = function end () {
  process.exit();
};

var service = function testService (opts) {
  var res = opts.res;
  var colors = require('colors');
  res.write(colors.blue('hello') + ' i am a service: '+ opts.params);
  res.end();
};

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