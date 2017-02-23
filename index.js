var through = require('through2');
// TODO: make trycatch configurable
//var trycatch = require('trycatch');
//trycatch.configure({'long-stack-traces': true});
var vm = require("vm");

module['exports'] = function runservice (config) {

  config = config || {};

  var service = config.service,
      req = config.env.req,
      res = config.env.res,
      isStreaming = config.env.isStreaming;
  if (typeof service === "undefined") {
    throw new Error('service is undefined');
  }

  if (typeof req === "undefined") {
    throw new Error('req is undefined');
  }

  if (typeof res === "undefined") {
    throw new Error('res is undefined');
  }

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
    // Do not let the Hook wait more than customTimeout until it assumes hook.res.end() will never be called...
    // This could cause issues with streaming hooks. We can increase this timeout...or perform static code analysis.
    // The reason we have this timeout is to prevent users from running hooks that never call hook.res.end() and hang forever
    var customTimeout;

    if (typeof config.env.customTimeout === "number") {
      customTimeout = config.env.customTimeout;
    } else {
      customTimeout = 10000;
    }

    inSeconds = customTimeout / 1000;

    var serviceCompleted = false;
    var serviceCompletedTimer = setTimeout(function(){
      if (!serviceCompleted) {
        return errorHandler(new Error('Request Aborted! Hook source code took more than ' + inSeconds + ' seconds to call hook.res.end()\n\nA delay of this long usually indicates there is an error in the source code for the Hook. \nCheck source code to ensure hook.res.end() is being called. \n\nIf there are no errors and the Hook actually requires more than ' + inSeconds + ' seconds to execute, please contact hookmaster@hook.io and we can increase your timeout limits.'));
      }
    }, customTimeout);

    // this double try / catch should probably not be needed now that we are using vm module...
    // async try / catch is required for async user errors
    // TODO: make trycatch configurable
    // Sometimes you want it, sometimes you don't
    // trycatch(function() {

      res.on('finish', function(){
        serviceCompleted = true;
        clearTimeout(serviceCompletedTimer);
      });
      // prepare function to be immediately called
      var str = "";
      if (
        config.env && 
        config.env.resource &&
        (config.env.resource.language === "babel" || config.env.resource.language === "es7")
      ) {
        // var es7error = "The es7 function threw an uncaught error. In order to get an error you must place your es7 code in a try / catch block. Note: hook.io plain JavaScript language support has much better stack traces.";
        str += service.toString() + "\n module['exports'].default(hook, res, cb).catch(function(err){ hook.res.end(err.message);})";
      } else {
        // Note: The way modules and functions are wrapped is in flux
        // The current approach is to meta-program a wrap around the function to call itself
        // This seems to work in most cases, but I have seen double execution in other cases
        // The current solution may be working, but if it doesnt we can try switching to compiling a module and calling its exports
        str += service.toString() + "\n\n module['exports'](hook, res, cb)";
        // We've previously tried anonymous function wrapping, but this can be brittle / doesn't work well with module.exports
        //str += '(\n' + str + '\n)(hook)';
      }

      /* TODO: add support for proxying request parameters in VM

      var proxy = new Proxy(req, {
        get: function(target, name) {
           //console.log("!!Getting pproperty '" + name + "'", env.input[name]);

           if (!(name in target)) {
               // console.log("!! Getting non-existant property '" + name + "'");
               return undefined;
           }
           return target[name];
         },
         set: function(target, name, value) {
           // console.log(">>>!!!Setting property '" + name + "', initial value: " + value);
           if (!(name in target)) {
               console.log("OTHER Setting non-existant property '" + name + "', initial value: " + value);
               console.error(JSON.stringify({ type: "setvar", payload: { key: name, value: value } }));
           }
           target[name] = value;
           return true;
         }
      });
      */

      // run script in new-context so we can timeout from things like: "while(true) {}"
      var _serviceEnv = {
        env: req.env,
        req: req, // TODO: proxy
        res: res,
        streaming: isStreaming,
        __dirname: __dirname
      };

      // legacy api support for function(hook) syntax
      // mneeds to map request parameters into service env?
      for (var p in req) {
        _serviceEnv[p] = req[p];
      }

      // If any addition env variables have been passed in that require a context inside the vm fn
      if (typeof config.env === "object") {
        for (var e in config.env) {
          _serviceEnv[e] = config.env[e];
        }
      }

      /* Removed. No need to add param setter / getters to legacy API,
         To keep code clean, we'll only add this to the new API / depreciate the old API
        var proxy2 = new Proxy(_serviceEnv, {
          get: function(target, name) {
            // console.log("!!Getting pproperty '" + name + "'", target[name]);
             if (!(name in target)) {
                 // console.log("Getting non-existant property '" + name + "'");
                 return undefined;
             }
             return target[name];
          },
          set: function(target, name, value) {
            // console.log("!!!Setting property '" + name + "', initial value: " + value);
            if (!(name in target)) {
               // console.log("SENDING MESSAGE Setting non-existant property '" + name + "', initial value: " + value);
               console.error(JSON.stringify({ type: "setvar", payload: { key: name, value: value } }));
            }
            target[name] = value;
            return true;
           }
        });
      */

      var _vmEnv = {
        module: module,
        req: req, // TODO: proxy
        res: res,
        cb: cb,
        hook: _serviceEnv,
        require: require,
        regeneratorRuntime: global.regeneratorRuntime,
        rconsole: console // add a new scope `rconsole` which acts as a real console ( for internal development purpose )
      };

      /*
         Remark: There has been some discussion about returning a promise ( in addition to a possible callback API )
         This would allow users to return a promise instead of ending the response
         var promise = new Promise(function(resolve, reject) {
            // do a thing, possibly async, then…
            if (true) {
              resolve("Stuff worked!");
            }
            else {
              reject(Error("It broke"));
            }
          });
      */
      // If any addition vm variables have been passed in that require a top-level context in the VM
      if (typeof config.vm === "object") {
        for (var e in config.vm) {
          _vmEnv[e] = config.vm[e];
        }
      }

      try {
        // displayErrors: true, this means any errors inside the service will be piped to stderr
        vm.runInNewContext(str, _vmEnv, { timeout: customTimeout, displayErrors: true });
      } catch (err) {
        return errorHandler(err);
      }

  }
}