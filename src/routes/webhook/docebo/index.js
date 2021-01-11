var express = require('express');
var router = express.Router();
var docebo_controller = require('../../../controllers/webhook/docebo');

router.get('/', function(req, res, next) {
  res.send('webhook - docebo - respond with a resource');
});

module.exports = router;
