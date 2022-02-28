var express = require('express');
var router = express.Router();

const {
  cronHandler,
  hubspotHandler,
  doceboHandler,
} = require('../lib/handler');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'MaxLiving API' });
});

router.get('/test', async (req, res) => {
  let responseData = {
    success: true,
  };
  try {
    responseData.data = await (() => new Promise(async (resolve, reject) => {
      try {
        resolve();
      } catch(e) {
        console.log(e)
        reject(e)
      }
    }))()
  } catch(e) {
    console.log(e);
    responseData.success = false;
    responseData.error = e;
  }
  res.send(responseData);
});


router.use('/hubspot', require('./hubspot'));
router.use('/webhook', require('./webhook'));

router.use('/status', require('./status'));

module.exports = router;

cronHandler.run();
