const {
  bridgeHandler,
  logHandler,
} = require('../../../lib/handler');

exports.course_enrollment_completed = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await bridgeHandler.docebo_course_enrollment_completed(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'webhook.docebo.course_enrollment_completed',
    payload,
    content: responseData,
  });
  // res.status(204).send();
  res.send(responseData);
};
