module.exports = function testService (req, res, next) {
  res.write('hello i am a service ' + req.params);
  res.end();
};