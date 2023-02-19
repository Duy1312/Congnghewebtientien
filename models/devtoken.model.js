const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./account.model');

const devtokenSchema = new mongoose.Schema({
	token: String,
	devtype: String,
  devtoken: String,
});

var Devtoken = mongoose.model('Devtoken', devtokenSchema);

module.exports = Devtoken;