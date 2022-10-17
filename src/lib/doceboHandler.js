const {
  DOCEBO_BASE_URL,
  DOCEBO_CLIENT_ID,
  DOCEBO_CLIENT_SECRET,
  DOCEBO_PASSWORD,
  DOCEBO_ADMIN_USERNAME,
  DOCEBO_ADMIN_PASSWORD,
  DOCEBO_CERTIFICATES,
} = require('./config');
const helper = require('./helper');

const request = require('request');
const querystring = require('querystring');
const {

} = require('./handler');

class doceboHandler {
  constructor () {
    const statusHandler = require('./statusHandler')('docebo');
    this.getStatus = (arg = '') => statusHandler.getStatus(arg);
    this.setStatus = (arg) => statusHandler.setStatus(arg);
    this.updateStatus = (arg1, arg2) => statusHandler.updateStatus(arg1, arg2);
  }

  get_access_token (payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const params = {
          scope: 'api',
          client_id: DOCEBO_CLIENT_ID,
          client_secret: DOCEBO_CLIENT_SECRET,
          grant_type: 'password',
          username: DOCEBO_ADMIN_USERNAME,
          password: DOCEBO_ADMIN_PASSWORD,
        };

        const requestDataString = JSON.stringify(params);
        const response = await helper.do_request({
          method: 'POST',
          url: `${DOCEBO_BASE_URL}/oauth2/token`,
          body: requestDataString,
          headers: {
            // 'Content-Length': requestDataString.length,
            'Content-Type': 'application/json',
          },
        });
        resolve(response);
      } catch(e) {
        reject(e);
      }
    });
  }

  create_single_user (payload, access_token) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!access_token) {
          const tokenResponse = await this.get_access_token();
          access_token = tokenResponse.access_token;
        }

        const requestDataString = JSON.stringify(payload);
        const response = await helper.do_request({
          method: 'POST',
          url: `${DOCEBO_BASE_URL}/manage/v1/user`,
          body: requestDataString,
          headers: {
            'Authorization': 'Bearer ' + access_token,
            // 'Content-Length': requestDataString.length,
            'Content-Type': 'application/json',
          },
        });
        resolve(response);
      } catch(e) {
        reject(e);
      }
    });
  }

  user_create_from_hubspot ({
    email,
    first_name,
    last_name,
    phone,
    mobilephone,
    company,
    type,
    contact_type,
    contact_subtypes,
    coach_name,
    owner_email,
    dc_coach,
    dc_coaches_email,
    // relationship_manager,
    lms_profile,
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        const tokenResponse = await this.get_access_token();

        const params = {
          "userid": email,
          "email": email,
          "firstname": first_name,
          "lastname": last_name,
          "password": 'RANDOMPASSWORD', //Math.random().toString(36).slice(-10),
          "force_change": 1,
          "email_validation_status": 1,
          "send_notification_email": true,
          "additional_fields": {},
          "manager": {},
        };

        const orgchartsResponse = await this.get_orgcharts(tokenResponse.access_token);
        const orgchart = orgchartsResponse.data.items.find(item => item.code == type);
        if (orgchart) {
          params.select_orgchart = {
            [orgchart.id]: orgchart.id,
          };
        }

        const userFieldsResponse = await this.get_userfields(tokenResponse.access_token);
        const phone_field = userFieldsResponse.data.items.find(field => field.title == 'Office Phone Number');
        if (phone_field) {
          params.additional_fields[phone_field.id] = phone;
        }
        const mobilephone_field = userFieldsResponse.data.items.find(field => field.title == 'Mobile Phone Number');
        if (mobilephone_field) {
          params.additional_fields[mobilephone_field.id] = mobilephone;
        }
        const company_field = userFieldsResponse.data.items.find(field => field.title == 'Company');
        if (company_field) {
          params.additional_fields[company_field.id] = company;
        }
        const contact_subtype_field = userFieldsResponse.data.items.find(field => field.title == 'Contact Subtype');
        if (contact_subtype_field) {
          const fieldResponse = await this.get_field_info(contact_subtype_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => contact_subtypes.includes(option.translations.english)); // choose one from contact_subtype(s)
          if (dropdownOption) {
            params.additional_fields[contact_subtype_field.id] = dropdownOption.option_id;
          }
        }
        const suffix_field = userFieldsResponse.data.items.find(field => field.title == 'Suffix');
        if (suffix_field) {
          const fieldResponse = await this.get_field_info(suffix_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == (contact_type == 'CA' ? 'CA' : 'DC'));
          if (dropdownOption) {
            params.additional_fields[suffix_field.id] = dropdownOption.option_id;
          }
        }
        const type_field = userFieldsResponse.data.items.find(field => field.title == 'Type');
        if (type_field) {
          const fieldResponse = await this.get_field_info(type_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == type);
          if (dropdownOption) {
            params.additional_fields[type_field.id] = dropdownOption.option_id;
          }
        }
        const dc_coach_field = userFieldsResponse.data.items.find(field => field.title == 'DC Coach');
        if (dc_coach_field) {
          const fieldResponse = await this.get_field_info(dc_coach_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == dc_coach);
          if (dropdownOption) {
            params.additional_fields[dc_coach_field.id] = dropdownOption.option_id;
          }
        }
        const dc_coaches_email_field = userFieldsResponse.data.items.find(field => field.title == 'DC Coaches Email');
        if (dc_coaches_email_field) {
          params.additional_fields[dc_coaches_email_field.id] = dc_coaches_email;
        }
        // const relationship_manager_field = userFieldsResponse.data.items.find(field => field.title == 'Relationship Manager');
        // if (relationship_manager_field) {
        //   params.additional_fields[relationship_manager_field.id] = relationship_manager;
        // }
        const lms_profile_field = userFieldsResponse.data.items.find(field => field.title == 'LMS Profile');
        if (lms_profile_field) {
          const fieldResponse = await this.get_field_info(lms_profile_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == lms_profile);
          if (dropdownOption) {
            params.additional_fields[lms_profile_field.id] = dropdownOption.option_id;
          }
        }

        const managersResponse = await this.get_managers(tokenResponse.access_token);
        if (coach_name) {
          const coachField = managersResponse.data.items.find(manager => manager.title == 'Coach');
          if (coachField) {
            const usersResponse = await this.get_users(
              coach_name
              // `?search_text=${encodeURIComponent(coach_name)}`
            );
            const user = usersResponse.data.items.filter(user => user.fullname == coach_name)[0];
            if (user) {
              params.manager[coachField.id] = user.user_id;
            }
          }
        }
        if (owner_email) {
          const rmField = managersResponse.data.items.find(manager => manager.title == (contact_type == 'Student' ? 'Student Relationship Manager' : 'Relationship Manager' ));
          if (rmField) {
            const userResponse = await this.get_users(
              owner_email
              // `?search_text=${encodeURIComponent(owner_email)}`
            );
            const user = userResponse.data.items.filter(user => user.email == owner_email)[0];
            if (user) {
              params.manager[rmField.id] = user.user_id;
            }
          }
        }

        const userResponse = await this.create_single_user(params, tokenResponse.access_token);

        return resolve({
          payload: params,
          result: userResponse
        });
      } catch(e) {
        reject(e);
      }
    })
  }

  change_status (user_id, status = 1) {
    return new Promise(async (resolve, reject) => {
      try {
        const tokenResponse = await this.get_access_token();
        const params = {
          "user_ids": [user_id],
          "status": status,
        };
        const response = await helper.do_request({
          method: 'PUT',
          url: `${DOCEBO_BASE_URL}/manage/v1/user/change_status`,
          body: JSON.stringify(params),
          headers: {
            'Authorization': 'Bearer ' + tokenResponse.access_token,
            // 'Content-Length': requestDataString.length,
            'Content-Type': 'application/json',
          },
        });
        resolve(response);
      } catch(e) {
        reject(e);
      }
    });
  }

  update_user (user_id, {
    first_name,
    last_name,
    phone,
    mobilephone,
    company,
    type,
    contact_type,
    contact_subtypes,
    coach_name,
    owner_email,
    dc_coach,
    dc_coaches_email,
    // relationship_manager,
    lms_profile,
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        const tokenResponse = await this.get_access_token();

        const params = {
          "firstname": first_name,
          "lastname": last_name,
          "additional_fields": {},
          "manager": {},
        };

        const orgchartsResponse = await this.get_orgcharts(tokenResponse.access_token);
        const orgchart = orgchartsResponse.data.items.find(item => item.code == type);
        if (orgchart) {
          params.select_orgchart = {
            [orgchart.id]: orgchart.id,
          };
        }

        const userFieldsResponse = await this.get_userfields(tokenResponse.access_token);
        const phone_field = userFieldsResponse.data.items.find(field => field.title == 'Office Phone Number');
        if (phone_field) {
          params.additional_fields[phone_field.id] = phone;
        }
        const mobilephone_field = userFieldsResponse.data.items.find(field => field.title == 'Mobile Phone Number');
        if (mobilephone_field) {
          params.additional_fields[mobilephone_field.id] = mobilephone;
        }
        const company_field = userFieldsResponse.data.items.find(field => field.title == 'Company');
        if (company_field) {
          params.additional_fields[company_field.id] = company;
        }
        const contact_subtype_field = userFieldsResponse.data.items.find(field => field.title == 'Contact Subtype');
        if (contact_subtype_field) {
          const fieldResponse = await this.get_field_info(contact_subtype_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => contact_subtypes.includes(option.translations.english)); // choose one from contact_subtype(s)
          if (dropdownOption) {
            params.additional_fields[contact_subtype_field.id] = dropdownOption.option_id;
          }
        }
        const suffix_field = userFieldsResponse.data.items.find(field => field.title == 'Suffix');
        if (suffix_field) {
          const fieldResponse = await this.get_field_info(suffix_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == (contact_type == 'CA' ? 'CA' : 'DC'));
          if (dropdownOption) {
            params.additional_fields[suffix_field.id] = dropdownOption.option_id;
          }
        }
        const type_field = userFieldsResponse.data.items.find(field => field.title == 'Type');
        if (type_field) {
          const fieldResponse = await this.get_field_info(type_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == type);
          if (dropdownOption) {
            params.additional_fields[type_field.id] = dropdownOption.option_id;
          }
        }
        const dc_coach_field = userFieldsResponse.data.items.find(field => field.title == 'DC Coach');
        if (dc_coach_field) {
          const fieldResponse = await this.get_field_info(dc_coach_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == dc_coach);
          if (dropdownOption) {
            params.additional_fields[dc_coach_field.id] = dropdownOption.option_id;
          }
        }
        const dc_coaches_email_field = userFieldsResponse.data.items.find(field => field.title == 'DC Coaches Email');
        if (dc_coaches_email_field) {
          params.additional_fields[dc_coaches_email_field.id] = dc_coaches_email;
        }
        // const relationship_manager_field = userFieldsResponse.data.items.find(field => field.title == 'Relationship Manager');
        // if (relationship_manager_field) {
        //   params.additional_fields[relationship_manager_field.id] = relationship_manager;
        // }
        const lms_profile_field = userFieldsResponse.data.items.find(field => field.title == 'LMS Profile');
        if (lms_profile_field) {
          const fieldResponse = await this.get_field_info(lms_profile_field.id, tokenResponse.access_token);
          const dropdownOption = fieldResponse.data.dropdown_options.find(option => option.translations.english == lms_profile);
          if (dropdownOption) {
            params.additional_fields[lms_profile_field.id] = dropdownOption.option_id;
          }
        }

        const managersResponse = await this.get_managers(tokenResponse.access_token);
        if (coach_name) {
          const coachField = managersResponse.data.items.find(manager => manager.title == 'Coach');
          if (coachField) {
            const usersResponse = await this.get_users(
              coach_name
              // `?search_text=${encodeURIComponent(coach_name)}`
            );
            const user = usersResponse.data.items.filter(user => user.fullname == coach_name)[0];
            if (user) {
              params.manager[coachField.id] = user.user_id;
            }
          }
        }
        if (owner_email) {
          const rmField = managersResponse.data.items.find(manager => manager.title == (contact_type == 'Student' ? 'Student Relationship Manager' : 'Relationship Manager' ));
          if (rmField) {
            const userResponse = await this.get_users(
              owner_email
              // `?search_text=${encodeURIComponent(owner_email)}`
            );
            const user = userResponse.data.items.filter(user => user.email == owner_email)[0];
            if (user) {
              params.manager[rmField.id] = user.user_id;
            }
          }
        }

        const userUpdateResponse = await helper.do_request({
          method: 'PUT',
          url: `${DOCEBO_BASE_URL}/manage/v1/user/${user_id}`,
          body: JSON.stringify(params),
          headers: {
            'Authorization': 'Bearer ' + tokenResponse.access_token,
            // 'Content-Length': requestDataString.length,
            'Content-Type': 'application/json',
          },
        });

        resolve(userUpdateResponse);
      } catch(e) {
        console.log('--- from docebo.update_user', e);
        reject(e);
      }
    });
  }

  get_orgcharts (access_token) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!access_token) {
          const tokenResponse = await this.get_access_token();
          access_token = tokenResponse.access_token;
        }

        const response = await helper.do_request({
          method: 'GET',
          url: `${DOCEBO_BASE_URL}/manage/v1/orgchart`,
          headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json',
          },
          cache: {
            key: 'docebo_orgchart',
            expire: 3600 * 24,
          },
        });

        return resolve(response);
      } catch(e) {
        reject(e);
      }
    })
  }
  get_userfields (access_token) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!access_token) {
          const tokenResponse = await this.get_access_token();
          access_token = tokenResponse.access_token;
        }

        const response = await helper.do_request({
          method: 'GET',
          url: `${DOCEBO_BASE_URL}/manage/v1/user_fields`,
          headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json',
          },
          cache: {
            key: 'docebo_user_fields',
            expire: 3600 * 24,
          },
        });

        return resolve(response);
      } catch(e) {
        reject(e);
      }
    })
  }
  get_field_info (field_id, access_token) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!access_token) {
          const tokenResponse = await this.get_access_token();
          access_token = tokenResponse.access_token;
        }

        const response = await helper.do_request({
          method: 'GET',
          url: `${DOCEBO_BASE_URL}/manage/v1/user_fields/${field_id}`,
          headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json',
          },
          cache: {
            key: `docebo_user_fields_${field_id}`,
            expire: 3600 * 24,
          },
        });

        return resolve(response);
      } catch(e) {
        reject(e);
      }
    })
  }
  get_users (search_text, access_token) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!access_token) {
          const tokenResponse = await this.get_access_token();
          access_token = tokenResponse.access_token;
        }

        const response = await helper.do_request({
          method: 'GET',
          url: `${DOCEBO_BASE_URL}/manage/v1/user?search_text=${encodeURIComponent(search_text)}`,
          headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json',
          },
          cache: {
            key: `docebo_users_${search_text}`,
            expire: 3600 * 24,
          }
        });

        return resolve(response);
      } catch(e) {
        reject(e);
      }
    });
  }
  get_managers (access_token) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!access_token) {
          const tokenResponse = await this.get_access_token();
          access_token = tokenResponse.access_token;
        }

        const response = await helper.do_request({
          method: 'GET',
          url: `${DOCEBO_BASE_URL}/manage/v1/managers`,
          headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json',
          },
          cache: {
            key: 'docebo_managers',
            expire: 3600 * 24,
          },
        });

        return resolve(response);
      } catch(e) {
        reject(e);
      }
    });
  }

  getCertificateID (payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const certData = DOCEBO_CERTIFICATES.split(';').find(item => item.split(':')[1].split(',').includes(payload.course_id + ''));

        if (!certData) {
          return resolve(null);
        }

        const [cert_id, courses_list] = certData.split(':');
        const course_ids = courses_list.split(',');

        const certResult = await Promise.all(
          course_ids.map(course_id => new Promise(async (resolve, reject) => {
            if (course_id == payload.course_id) {
              return resolve(true);
            }

            try {
              const tokenResponse = await this.get_access_token();
              const courseResponse = await helper.do_request({
                method: 'GET',
                url: `${DOCEBO_BASE_URL}/learn/v1/enrollments/${course_id}/${payload.user_id}`,
                headers: {
                  'Authorization': 'Bearer ' + tokenResponse.access_token,
                  'Content-Type': 'application/json',
                },
              });
              if (courseResponse.course_complete_date || (courseResponse.data && courseResponse.data.records && courseResponse.data.records.course_complete_date)) {
                return resolve(true);
              }
              resolve(false);
            } catch(e) {
              resolve(false);
            }
          }))
        );

        if (certResult.every(r => r)) { // all courses completed
          return resolve(cert_id);
        }

        resolve(null);
      } catch(e) {
        reject(e);
      }
    });
  }

};

module.exports = new doceboHandler();
