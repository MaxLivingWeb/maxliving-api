const request = require('request');
const xml2js = require('xml2js');
const requestDB = require('./resources').db.request;

exports.getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

const do_request = (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (options.cache) {
        let cached_data = null;
        const expire = requestDB.get(`${options.cache.key}.expire`).value();
        // console.log(`"${options.cache.key}" cached expire`, expire);
        if (!expire || new Date(expire) <= new Date()) {
          // console.log('trying to refresh cache');
          cached_data = await do_request({
            ...options,
            cache: undefined,
          });
          requestDB.set(`${options.cache.key}`, {
            data: cached_data,
            expire: new Date(Date.now() + 1000 * (options.cache.expire || 3600)) // options.cache.expire: number of seconds. default an hour
          }).write();
        } else {
          // console.log('get from cached_data');
          cached_data = requestDB.get(`${options.cache.key}.data`).value();
        }
        return resolve(cached_data);
      }
      request(options, async function(error, response, body) {
        if (error) {
          return reject(error);
        }
        try {
          if (options.is_raw) {
            return resolve(body);
          }
          if (options.is_xml) {
            return resolve(await xml2js.parseStringPromise(body));
          }
          if (options.json) {
            return resolve(body);
          }
          return resolve(JSON.parse(body));
        } catch(e) {
          console.log('Request body parse error', e, body);
          return reject(e);
        }
      });
    } catch(e) {
      reject(e);
    }
  });
};

exports.do_request = do_request;

exports.getSafe = (fn, defaultVal) => {
  try {
    return fn();
  } catch (e) {
    return defaultVal;
  }
};
