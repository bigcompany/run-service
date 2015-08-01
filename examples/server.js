var http = require("http");
var runService = require('../');

var service = function testService (opts) {
  var res = opts.res;
  res.write('hello i am a service ' + opts.params);
  res.end();
};

var server = http.createServer(function(req, res){
  runService({ service: service, env: { params: "hi", req: req, res: res }})(function(){});
}).listen(9999);