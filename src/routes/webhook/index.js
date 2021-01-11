var express = require('express');
var router = express.Router();
var webhook_controller = require('../../controllers/webhook');

router.get('/', function(req, res, next) {
  res.send('webhook - respond with a resource');
});

router.post('/ping', webhook_controller.ping);

router.use('/hubspot', require('./hubspot'));
router.use('/docebo', require('./docebo'));

module.exports = router;
