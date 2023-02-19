const jwt = require('jsonwebtoken');
const Account = require('../models/account.model');

module.exports.authToken = async (req, resp, next) => {
    console.log(req.query)
    console.log(req.query.token)
	try{
		let payload = jwt.verify(req.query.token, process.env.TOKEN_SECRET);
		let account = await Account.findOne({token: req.query.token});
		if(account == null){
			return resp.json({
				code: "9998",
				message: "Token is invalid"
			});
		}
		req.payload = payload;
		req.account = account;
		next();
	}catch(err){
		console.log(err);
		resp.json({
			code: "9998",
			message: "Token is invalid"
		});
	}
}