const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./account.model');

const pushSettingSchema = new mongoose.Schema({
	account_id: {type: Schema.Types.ObjectId, ref: Account},
	likeComment: String,
  fromFriends: String,
  requestedFriend: String,
  suggestedFriend: String,
  birthday: String,
  video: String,
  report: String,
  soundOn: String,
  notificationOn: String,
  vibrantOn: String,
  ledOn: String,
});

var PushSetting = mongoose.model('PushSetting', pushSettingSchema);

module.exports = PushSetting;
