const {status} = require('../db');
const {response} = require('../common/response_code');

module.exports = (req, resp, next) => {
	if(status.connected) return next();
	response(resp, 1001);
}