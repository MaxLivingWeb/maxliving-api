var express = require('express');
var router = express.Router();
var hubspot_controller = require('../../../controllers/webhook/hubspot');

router.get('/', function(req, res, next) {
  res.send('webhook - hubspot - respond with a resource');
});

router.post('/', hubspot_controller.index);

router.post('/contact_active', hubspot_controller.contact_active);

module.exports = router;
