const mongoose = require('mongoose');
const { Schema } = mongoose;
const Post = require('./post.model');
const Account = require('./account.model');

const commentSchema = new mongoose.Schema({
	post_id: {type: Schema.Types.ObjectId, ref: Post},
	userComment_id: {type: Schema.Types.ObjectId, ref: Account},
	content: { type: String, trim: true },
  	createdTime:{ type: Date, default: Date.now },
});

var Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;