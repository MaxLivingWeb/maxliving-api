var express = require('express');
var router = express.Router();
var docebo_controller = require('../../../controllers/webhook/docebo');

router.get('/', function(req, res, next) {
  res.send('webhook - docebo - respond with a resource');
});

router.post('/course_enrollment_completed', docebo_controller.course_enrollment_completed);

module.exports = router;
