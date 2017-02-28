var http = require("http");
var runService = require('../');

var service = require('fs').readFileSync(__dirname + '/test-service.js').toString();

var server = http.createServer(function(req, res){
  runService({ service: service, env: { params: "hi", req: req, res: res }})(function(){});
}).listen(9999);