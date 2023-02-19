const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./account.model');

const friendlistSchema = new mongoose.Schema({
	user1_id: {type: Schema.Types.ObjectId, ref: Account},
	user2_id: {type: Schema.Types.ObjectId, ref: Account},
  	createdTime:{ type: Date, default: Date.now },
});

// tạo model
var FriendList = mongoose.model('FriendList', friendlistSchema);

module.exports = FriendList;
