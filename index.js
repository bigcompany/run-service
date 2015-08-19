var through = require('through2');
var trycatch = require('trycatch');
var vm = require("vm");

module['exports'] = function runservice (config) {

  config = config || {};

  var service = config.service,
      req = config.env.req,
      res = config.env.res,
      isStreaming = config.env.isStreaming;

  if (typeof isStreaming === "undefined") {
    if (req._readableState && req._readableState.buffer && req._readableState.buffer.length) {
      isStreaming = true;
    }
  }

  return function _runservice (cb) {

    config.errorHandler = config.errorHandler || function defaultServiceErrorHandler (err) {
      // Note: you will probably want to pass in a custom error handler
      console.log('Using DEFAULT errorHandler. Pass in config.errorHandler for custom error handling.')
      throw err;
    };

    var errorHandler = config.errorHandler;
    // Do not let the Hook wait more than UNTRUSTED_HOOK_TIMEOUT until it assumes hook.res.end() will never be called...
    // This could cause issues with streaming hooks. We can increase this timeout...or perform static code analysis.
    // The reason we have this timeout is to prevent users from running hooks that never call hook.res.end() and hang forever
    var UNTRUSTED_HOOK_TIMEOUT = 10000,
        inSeconds = UNTRUSTED_HOOK_TIMEOUT / 1000;

    var serviceCompleted = false;
    var serviceCompletedTimer = setTimeout(function(){
      if (!serviceCompleted) {
        return errorHandler(new Error('Request Aborted! Hook source code took more than ' + inSeconds + ' seconds to call hook.res.end()\n\nA delay of this long usually indicates there is an error in the source code for the Hook. \nCheck source code to ensure hook.res.end() is being called. \n\nIf there are no errors and the Hook actually requires more than ' + inSeconds + ' seconds to execute, please contact hookmaster@hook.io and we can increase your timeout limits.'));
      }
    }, UNTRUSTED_HOOK_TIMEOUT);

    // this double try / catch should probably not be needed now that we are using vm module...
    // async try / catch is required for async user errors
    trycatch(function() {

      res.on('finish', function(){
        serviceCompleted = true;
      });

      // prepare function to be immediately called
      var str = "";

      str += '_runUntrustedServiceInVm = ' + service.toString() + "; \n _runUntrustedServiceInVm(hook)";
      //  str += service.toString() + "\n module['exports'](hook)";
      // run script in new-context so we can timeout from things like: "while(true) {}"

      var _serviceEnv = {
          env: req.env,
          req: req,
          res: res,
          streaming: isStreaming,
          __dirname: __dirname
        };

      // If any addition env variables have been passed in that require a context inside the vm fn
      if (typeof config.env === "object") {
        for (var e in config.env) {
          _serviceEnv[e] = config.env[e];
        }
      }

      var _vmEnv = {
        module: module,
        hook: _serviceEnv,
        require: require,
        rconsole: console // add a new scope `rconsole` which acts as a real console ( for internal development purpose )
      };

      // If any addition vm variables have been passed in that require a top-level context in the VM
      if (typeof config.vm === "object") {
        for (var e in config.vm) {
          _vmEnv[e] = config.vm[e];
        }
      }

      try {
        // displayErrors: true, this means any errors inside the service will be piped to stderr
        vm.runInNewContext(str, _vmEnv, { timeout: UNTRUSTED_HOOK_TIMEOUT, displayErrors: true });
      } catch (err) {
        return errorHandler(err);
      }
    }, function(err) {
      return errorHandler(err);
    });
  }
}