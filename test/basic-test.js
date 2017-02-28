var tap = require("tap"),
    test = tap.test,
    plan = tap.plan,
    mschema;


// readable / writable stream classes used for testing input / output to services
var Readable = require('stream').Readable;
var Writable = require('stream').Writable;

// a few example / test services to use as testing fixtures
//var helloService = require('../examples/services/hello');
//var echoStringService = require('../examples/services/echoString');

var helloService = require('fs').readFileSync(__dirname + '/../examples/services/hello.js').toString();
var echoStringService = require('fs').readFileSync(__dirname + '/../examples/services/echoString.js').toString();

test("attempt to load run-service module", function (t) {
  rs = require('../');
  t.end();
});

test("attempt to run hello service", function (t) {
  
  var input = new Readable;
  var output = Writable();

  output._write = function (chunk, enc, next) {
    t.equal(chunk.toString(), "Hello!");
    next();
  };

  output.on('error', function(err){
    console.log('err', err)
  });

  output.on('finish', function end () {
    t.end();
  });

  rs({
    service: helloService,
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
    console.log('finished')
    if(err) throw err;
  });

});

test("attempt to run echoString service", function (t) {

  var input = new Readable;
  var output = Writable();

  output._write = function (chunk, enc, next) {
    t.equal(chunk.toString(), "testing 123");
    next();
  };

  output.on('error', function(err){
    console.log('err', err)
  });

  output.on('finish', function end () {
    t.end();
  });

  rs({ 
    service: echoStringService,
    env: { 
      params: "testing 123",
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
});

