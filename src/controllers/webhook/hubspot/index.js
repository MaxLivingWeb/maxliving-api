const {
  hubspotHandler,
  bridgeHandler,
  logHandler,
} = require('../../../lib/handler');

exports.index = async (req, res) => {
  const payload = req.body;
  try {
    await Promise.all(
      payload.map(event => new Promise(async (resolve, reject) => {
        const responseData = {
          success: true,
        };
        resolve();
        try {
          responseData.data = await hubspotHandler.handle_webhook_index(event);
        } catch(error) {
          responseData.success = false;
          responseData.data = error;
        }
        logHandler.write({
          source: `webhook.hubspot.${event.subscriptionType}`,
          payload: event,
          content: responseData,
        });
      }))
    );
  } catch(error) {
    console.log('--- Error', error);
  }
  res.status(204).send();
};

exports.contact_active = async (req, res) => {
  const payload = req.body;
  const responseData = {
    success: true,
  };
  try {
    responseData.data = await bridgeHandler.handle_workflow_contact_active(payload);
  } catch(error) {
    console.log('--- Error', error);
    responseData.success = false;
    responseData.data = error;
  }
  await logHandler.write({
    source: 'webhook.hubspot.workflow.contact_active',
    payload,
    content: responseData,
  });
  // res.status(204).send();
  res.send(responseData);
};
