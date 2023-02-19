const mongoose = require('mongoose');

const verifyCodeSchema = new mongoose.Schema({
	phoneNumber: String,
	code: [String],
	lastUpdate: Date,
	limitedTime: Boolean
});

var VerifyCode = mongoose.model('VerifyCode', verifyCodeSchema);

module.exports = VerifyCode;