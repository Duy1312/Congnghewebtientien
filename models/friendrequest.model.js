const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./account.model');

const friendrequestSchema = new mongoose.Schema({
	userSendRequest_id: {type: Schema.Types.ObjectId, ref: Account},
	userGetRequest_id: {type: Schema.Types.ObjectId, ref: Account},
  createdTime:{ type: Date, default: Date.now },
});

// tạo model
var FriendRequest = mongoose.model('FriendRequest', friendrequestSchema);

module.exports = FriendRequest;
