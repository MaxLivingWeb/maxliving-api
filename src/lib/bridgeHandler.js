const {
  HUBSPOT_API_KEY,
  DOCEBO_BASE_URL,
} = require('./config');
const helper = require('./helper');

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

  handle_workflow_contact_active (payload) {
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

  docebo_course_enrollment_completed (payload) {
    return new Promise(async (resolve, reject) => {
      try {
        let resolveData = null;
        const certificateID = await doceboHandler.getCertificateID(payload.payload);
        if (certificateID) {
          resolveData = await hubspotHandler.updateCertificates(payload.payload.user_id, certificateID, payload.payload.completion_date);
        }
        resolve(resolveData);
      } catch(e) {
        reject(e);
      }
    });
  }

  migrate_docebo_user_ids_to_hubspot () {
    return new Promise(async (resolve, reject) => {
      try {
        resolve();

        const tokenResponse = await doceboHandler.get_access_token();
        let page = 1;
        let page_size = 10;
        while (1) {
          const response = await helper.do_request({
            method: 'GET',
            url: `${DOCEBO_BASE_URL}/manage/v1/user`,
            qs: {
              page,
              page_size,
            },
            headers: {
              'Authorization': 'Bearer ' + tokenResponse.access_token,
              'Content-Type': 'application/json',
            },
          });

          console.log(`Page ${page} ----------------------------`);
          console.log(response.data.items.map(item => ([item.user_id, item.email])));

          const batchReadResponse = await helper.do_request({
            method: 'POST',
            url: 'https://api.hubapi.com/crm/v3/objects/contacts/batch/read',
            qs: {hapikey: HUBSPOT_API_KEY},
            headers: {accept: 'application/json', 'content-type': 'application/json'},
            body: {
              inputs: response.data.items.map(item => ({id: item.email})),
              properties: ['email'],
              idProperty: 'email'
            },
            json: true
          });

          // console.log(batchReadResponse);

          const batchUpdateResponse = await helper.do_request({
            method: 'POST',
            url: 'https://api.hubapi.com/crm/v3/objects/contacts/batch/update',
            qs: {hapikey: HUBSPOT_API_KEY},
            headers: {accept: 'application/json', 'content-type': 'application/json'},
            body: {
              inputs: response.data.items.map(item => ({
                id: helper.getSafe(() => batchReadResponse.results.find(c => c.properties.email == item.email).id, item.email),
                properties: {
                  docebo_user_id: item.user_id
                }
              }))
            },
            json: true
          });

          // console.log(batchUpdateResponse);

          if (!response.data.has_more_data) break;
          page ++;
        }

      } catch(e) {
        reject(e);
      }
    });
  }

};

module.exports = new bridgeHandler();
