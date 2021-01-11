const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const request = low(new FileSync('db/request.json'));
request.defaults({
}).write();

module.exports = {
  db: {
    request,
  },
};
