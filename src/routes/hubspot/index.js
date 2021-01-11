var express = require('express');
var router = express.Router();
var hubspot_controller = require('../../controllers/hubspot');

router.get('/', function(req, res, next) {
  res.send('hubspot - respond with a resource');
});

router.get('/oauth-callback', hubspot_controller.oauth_callback);

module.exports = router;
