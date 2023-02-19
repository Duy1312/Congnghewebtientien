const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./account.model');

const friendblockSchema = new mongoose.Schema({
	accountDoBlock_id: {type: Schema.Types.ObjectId, ref: Account},
	blockedUser_id: {type: Schema.Types.ObjectId, ref: Account},
	createdTime:{ type: Date, default: Date.now },
});

// tạo model
var FriendBlock = mongoose.model('FriendBlock', friendblockSchema);

module.exports = FriendBlock;
