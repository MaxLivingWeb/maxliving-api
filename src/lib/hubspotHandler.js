const {
  HUBSPOT_API_KEY,
  HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET,
  HUBSPOT_REDIRECT_URI
} = require('./config');
const helper = require('../lib/helper');

const request = require('request-promise-native');
const NodeCache = require('node-cache');
const querystring = require('querystring');
const {
  doceboHandler,
} = require('./handler');

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

class hubspotHandler {
  constructor () {
    const statusHandler = require('./statusHandler')('hubspot');
    this.getStatus = (arg = '') => statusHandler.getStatus(arg);
    this.setStatus = (arg) => statusHandler.setStatus(arg);
    this.updateStatus = (arg1, arg2) => statusHandler.updateStatus(arg1, arg2);

    this.properties = [
      'firstname',
      'lastname',
      'email',
      'contact_status',
      'type',
      'contact_type_salesforce',
      'contact_subtype_cloned_',
      'dc_coach',
      'ca_coach',
      'hubspot_owner_id',
      'docebo_user_id',
    ];
  }

  handle_contact_active (payload) {
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

  handle_webhook_contact_creation (event) {
    return new Promise(async (resolve, reject) => {
      try {
        const contactResponse = await this.getContactByID(event.objectId);
        if (contactResponse.properties.docebo_user_id) {
          throw 'docebo user already exists for this contact';
        }

        if (contactResponse.properties.contact_status != 'Active') {
          throw 'contact status is not active';
        }

        const owners = await this.getOwners();

        const user_create_response = await doceboHandler.user_create_from_hubspot({
          email: helper.getSafe(() => contactResponse.properties.email),
          first_name: helper.getSafe(() => contactResponse.properties.firstname),
          last_name: helper.getSafe(() => contactResponse.properties.lastname),
          type: helper.getSafe(() => contactResponse.properties.type),
          contact_type: helper.getSafe(() => contactResponse.properties.contact_type_salesforce),
          contact_subtypes: helper.getSafe(() => contactResponse.properties.contact_subtype_cloned_.split(';')),
          coach_name: helper.getSafe(() => contactResponse.properties.dc_coach || contactResponse.properties.ca_coach),
          owner_email: helper.getSafe(() => owners.find(owner => owner.ownerId == contactResponse.properties.hubspot_owner_id).email),
        });

        const docebo_user_id = helper.getSafe(() => user_create_response.result.data.user_id);
        if (docebo_user_id) {
          const updateResponse = await this.updateContactByID(contactResponse.id, {
            docebo_user_id,
          });
        }
        resolve(user_create_response);
      } catch(e) {
        reject(e);
      }
    });
  }

  handle_webhook_contact_propertyChange (event) {
    return new Promise(async (resolve, reject) => {
      try {
        let resolveData = event;
        const contactResponse = await this.getContactByID(event.objectId);
        if (event.propertyName == 'contact_status') {
          if (event.propertyValue == 'Active') {
            if (!contactResponse.properties.docebo_user_id) {
              resolveData = await this.handle_webhook_contact_creation(event);
            } else {
              resolveData = await doceboHandler.change_status(contactResponse.properties.docebo_user_id, 1);
            }
          } else if (event.propertyValue == 'Suspended' || event.propertyValue == 'Terminated') {
            if (contactResponse.properties.docebo_user_id) {
              resolveData = await doceboHandler.change_status(contactResponse.properties.docebo_user_id, 0);
            }
          }
        } else {
          if (!contactResponse.properties.docebo_user_id) {
            throw 'no docebo user created for this contact';
          }
          if (event.propertyValue != contactResponse.properties[event.propertyName]) {
            console.log('event payload and contact response mismatch', event.propertyName, event.propertyValue, contactResponse.properties[event.propertyName]);
          }
          const owners = await this.getOwners();
          resolveData = await doceboHandler.update_user(contactResponse.properties.docebo_user_id, {
            first_name: helper.getSafe(() => contactResponse.properties.firstname),
            last_name: helper.getSafe(() => contactResponse.properties.lastname),
            type: helper.getSafe(() => contactResponse.properties.type),
            contact_type: helper.getSafe(() => contactResponse.properties.contact_type_salesforce),
            contact_subtypes: helper.getSafe(() => contactResponse.properties.contact_subtype_cloned_.split(';')),
            coach_name: helper.getSafe(() => contactResponse.properties.dc_coach || contactResponse.properties.ca_coach),
            owner_email: helper.getSafe(() => owners.find(owner => owner.ownerId == contactResponse.properties.hubspot_owner_id).email),
          });
        }
        resolve(resolveData);
      } catch(e) {
        console.log('--- from hubspot.handle_webhook_contact_propertyChange', e);
        reject(e);
      }
    });
  }

  handle_webhook_index (event) {
    return new Promise(async (resolve, reject) => {
      try {
        let resolveData = event;
        if (event.subscriptionType == 'contact.creation') {
          resolveData = await this.handle_webhook_contact_creation(event);
        } else if (event.subscriptionType == 'contact.propertyChange') {
          resolveData = await this.handle_webhook_contact_propertyChange(event);
        }
        resolve(resolveData);
      } catch(e) {
        reject(e);
      }
    });
  }

  getContactByID (contactID) {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(
          await helper.do_request({
            method: 'GET',
            url: `https://api.hubapi.com/crm/v3/objects/contacts/${contactID}`,
            qs: {
              properties: this.properties.join(','),
              hapikey: HUBSPOT_API_KEY,
            },
            headers: {
              accept: 'application/json',
            },
          })
        );
      } catch(e) {
        reject(e);
      }
    });
  }

  updateContactByID (contactID, data) {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(
          await helper.do_request({
            method: 'PATCH',
            url: `https://api.hubapi.com/crm/v3/objects/contacts/${contactID}`,
            qs: {
              hapikey: HUBSPOT_API_KEY,
            },
            headers: {accept: 'application/json', 'content-type': 'application/json'},
            body: {
              properties: data,
            },
            json: true,
          })
        );
      } catch(e) {
        reject(e);
      }
    });
  }

  getOwners () {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(
          await helper.do_request({
            method: 'GET',
            url: `https://api.hubapi.com/owners/v2/owners`,
            qs: {
              hapikey: HUBSPOT_API_KEY,
            },
            cache: {
              key: 'hubspot_owners',
            },
          })
        );
      } catch(e) {
        reject(e);
      }
    })
  }

  updateCertificates (docebo_user_id, certificateID, completion_date) {
    return new Promise(async (resolve, reject) => {
      try {
        const searchResponse = await helper.do_request({
          method: 'POST',
          url: 'https://api.hubapi.com/crm/v3/objects/contacts/search',
          qs: {hapikey: HUBSPOT_API_KEY},
          headers: {accept: 'application/json', 'content-type': 'application/json'},
          body: {
            filterGroups: [{filters: [{value: docebo_user_id, propertyName: 'docebo_user_id', operator: 'EQ'}]}],
            sorts: ['email'],
            properties: ['email', 'id'],
            limit: 1,
            after: 0
          },
          json: true
        });
        if (searchResponse) {
          const contactID = searchResponse.results[0].id;
          const updateResponse = await this.updateContactByID(contactID, {
            [`docebo_certificate_${certificateID}_issued_date`]: completion_date.slice(0, 10),
          });
          return resolve(updateResponse);
        }
        throw 'no docebo user found';
      } catch(e) {
        reject(e);
      }
    });
  }

  async exchangeForTokens (userId, exchangeProof) {
    try {
      const responseBody = await request.post('https://api.hubapi.com/oauth/v1/token', {
        form: exchangeProof
      });
      // Usually, this token data should be persisted in a database and associated with
      // a user identity.
      const tokens = JSON.parse(responseBody);
      refreshTokenStore[userId] = tokens.refresh_token;
      accessTokenCache.set(userId, tokens.access_token, Math.round(tokens.expires_in * 0.75));

      console.log('       > Received an access token and refresh token');
      return tokens.access_token;
    } catch (e) {
      console.error(`       > Error exchanging ${exchangeProof.grant_type} for access token`);
      return JSON.parse(e.response.body);
    }
  }

  async refreshAccessToken (userId) {
    const refreshTokenProof = {
      grant_type: 'refresh_token',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      refresh_token: refreshTokenStore[userId]
    };
    return await this.exchangeForTokens(userId, refreshTokenProof);
  }

  async getAccessToken (userId) {
    // If the access token has expired, retrieve
    // a new one using the refresh token
    if (!accessTokenCache.get(userId)) {
      console.log('Refreshing expired access token');
      await this.refreshAccessToken(userId);
    }
    return accessTokenCache.get(userId);
  }

  isAuthorized (userId) {
    return refreshTokenStore[userId] ? true : false;
  }

};

module.exports = new hubspotHandler();
