const createError = require('http-errors');
const {
  HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET,
  HUBSPOT_REDIRECT_URI
} = require('../../lib/config');
const {
  hubspotHandler,
  logHandler,
} = require('../../lib/handler');

exports.oauth_callback = async (req, res, next) => {
  console.log('===> Step 3: Handling the request sent by the server');

  // Received a user authorization code, so now combine that with the other
  // required values and exchange both for an access token and a refresh token
  if (req.query.code) {
    console.log('       > Received an authorization token');

    const authCodeProof = {
      grant_type: 'authorization_code',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      code: req.query.code
    };

    // Step 4
    // Exchange the authorization code for an access token and refresh token
    console.log('===> Step 4: Exchanging authorization code for an access token and refresh token');
    const token = await hubspotHandler.exchangeForTokens(req.sessionID, authCodeProof);
    if (token.message) {
      return next(createError(500, token.message));
    }

    // Once the tokens have been retrieved, use them to make a query
    // to the HubSpot API
    res.redirect('/');
  }
};
