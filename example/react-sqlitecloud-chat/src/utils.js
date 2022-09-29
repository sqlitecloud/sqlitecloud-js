const moment = require('moment');

const logThis = (msg) => {
  let prefix = moment().format('YYYY/MM/DD HH:mm:ss.SSS');
  console.log(prefix + " - " + msg);
}
module.exports.logThis = logThis;