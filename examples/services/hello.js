module['exports'] = function hello (service) {
  service.res.write('Hello!')
  service.res.end();
};