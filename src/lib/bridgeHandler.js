const {
} = require('./config');
const helper = require('../lib/helper');

const request = require('request-promise-native');
const querystring = require('querystring');
const {
  doceboHandler,
  hubspotHandler,
} = require('./handler');

class bridgeHandler {
  constructor () {
    const statusHandler = require('./statusHandler')('bridge');
    this.getStatus = (arg = '') => statusHandler.getStatus(arg);
    this.setStatus = (arg) => statusHandler.setStatus(arg);
    this.updateStatus = (arg1, arg2) => statusHandler.updateStatus(arg1, arg2);
  }

  handle_workflow_contact_active(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const user_create_response = await doceboHandler.user_create_from_hubspot({
          email: helper.getSafe(() => payload.properties.email.value),
          first_name: helper.getSafe(() => payload.properties.firstname.value),
          last_name: helper.getSafe(() => payload.properties.lastname.value),
          type: helper.getSafe(() => payload.properties.type.value),
          contact_type: helper.getSafe(() => payload.properties.contact_type_salesforce.value),
          contact_subtypes: helper.getSafe(() => payload.properties.contact_subtype_cloned_.value.split(';')),
          coach_name: helper.getSafe(() => payload.properties.dc_coach.value || payload.properties.ca_coach.value),
          owner_email: helper.getSafe(() => payload['associated-owner'].email),
        });
        resolve(user_create_response);
      } catch(e) {
        reject(e);
      }
    });
  }

};

module.exports = new bridgeHandler();
