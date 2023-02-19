const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./account.model');
const Post = require('./post.model');

const reportSchema = new mongoose.Schema({
	reporterId: {type: Schema.Types.ObjectId, ref: Account},
  	postId: {type: Schema.Types.ObjectId, ref: Post},
  	subject: String,
  	details: String,
});

var Report = mongoose.model('Report', reportSchema);

module.exports = Report;