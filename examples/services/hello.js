module['exports'] = function hello (req, res, next) {
  res.write('Hello!')
  res.end();
};