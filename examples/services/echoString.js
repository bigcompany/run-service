module['exports'] = function echoString (service) {
  service.res.write(service.params)
  service.res.end();
};