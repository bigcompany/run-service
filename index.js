var fs = require('fs');
var request = require("hyperquest");
var through = require('through2');
// var log = require("../log");
var streamBuffers = require('stream-buffers');
var trycatch = require('trycatch');
var vm = require("vm");

module['exports'] = function runService (req, res) {

  function cb (err, result) {
    if (err) {
      return res.end(err.message);
    }
  }

  // var formatError = require("./formatError");

  var untrustedHook = {};
  var untrustedSchema = untrustedHook.schema || {};
  var debugOutput = [];

   // A simple debug utility for inspecting data from inside a running hook
   var debug = function debug (arg) {
     // create log entry
     var entry = {
       time: new Date(),
       data: JSON.stringify(arg),
       ip : req.connection.remoteAddress
     };
     /*
     // push entry to log datasource
     log.push("/" + req.hook.owner + "/" + req.hook.name, entry, function(err, res) {
       if (err) {
         console.log('Error pushing log entry to datasource! ', err.message);
       }
     });
     */
     // push entry into temporary buffer for use in immediate request response
     debugOutput.push(entry);
   };

   // create a new buffer and output stream for capturing the hook.res.write and hook.res.end calls from inside the hook
   // this is used as an intermediary to pipe hook output to other streams ( such as another hook )
   var hookOutput = new streamBuffers.WritableStreamBuffer({
       initialSize: (100 * 1024),        // start as 100 kilobytes.
       incrementAmount: (10 * 1024)    // grow by 10 kilobytes each time buffer overflows.
   });

   var _headers = {
     code: null,
     headers: {}
   };

  // Do not let the Hook wait more than UNTRUSTED_HOOK_TIMEOUT until it assumes hook.res.end() will never be called...
  // This could cause issues with streaming hooks. We can increase this timeout...or perform static code analysis.
  // The reason we have this timeout is to prevent users from running hooks that never call hook.res.end() and hang forever
  var UNTRUSTED_HOOK_TIMEOUT = 2000,
      inSeconds = UNTRUSTED_HOOK_TIMEOUT / 1000;

  var untrustedHookCompleted = false;
  var untrustedHookCompletedTimer = setTimeout(function(){
    if (!untrustedHookCompleted) {
      return cb(new Error('Request Aborted! Hook source code took more than ' + inSeconds + ' seconds to call hook.res.end()\n\nA delay of this long usually indicates there is an error in the source code for the Hook. \nCheck ' + req.url + ' to ensure hook.res.end() is being called. \n\nIf there are no errors and the Hook actually requires more than ' + inSeconds + ' seconds to execute, you can increase the timeout limit.'));
    }
  }, UNTRUSTED_HOOK_TIMEOUT);
  // load string copy of module onto hook ( for eval loading later... )
  if (req.url === "/") {
    req.url = "/index";
  }
  return fs.readFile('../routes' + req.url + '.js', function (_err, _source) {
    if (_err) {
      return res.end(_err.message);
    }
    attemptExecution(null,  _source.toString())
  });
  
  function attemptExecution (err, untrustedSource) {
    
    // prepare function to be immediately called
    var str = untrustedSource + "\n module['exports'](req, res)";
    
    // this double try / catch should probably not be needed now that we are using vm module...
    // async try / catch is required for async user errors
    trycatch(function() {
      var isStreaming = false;
      if (req._readableState.buffer && req._readableState.buffer.length) {
        isStreaming = true;
      }

      res.on('finish', function(){
        untrustedHookCompleted = true
      });


      // run script in new-context so we can timeout from things like: "while(true) {}"
      try {
        vm.runInNewContext(str, {
          module: module,
          require: require,
          req: req,
          res: res,
          hook: {
            env: req.env,
            debug: debug,
            req: req,
            res: res,
            streaming: isStreaming,
            __dirname: __dirname
          },
          console: { log: debug }, // map Hook's console.log to our debug method
          rconsole: console        // add a new scope `rconsole` which acts as a real console ( for internal development purpose )
        }, { timeout: UNTRUSTED_HOOK_TIMEOUT });
      } catch (err) {
        // TODO: better error reporting with line number and user fault
        // err = formatError(err);
        return res.end(err.message);
      }

    }, function(err) {
      throw err;
      // err = formatError(err);
      return res.end(err.message);
      // return cb(err, opts, untrustedHook);
    });
  };

};
