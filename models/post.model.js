const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./account.model');

const postSchema = new mongoose.Schema({
	account_id: {type: Schema.Types.ObjectId, ref: Account},
	described: String,
	images: [{url: String, publicId: String}],
	video: {url: String, publicId: String},
	userLike_id: {type: [Schema.Types.ObjectId], ref: Account},
  	createdTime:{ type: Date, default: Date.now },
  	modified: Date,
  	status: String,
  	canComment: {type: Boolean, default: true},
  	banned: String
});
postSchema.index({ described: "text"});

var Post = mongoose.model('Post', postSchema);

Post.prototype.getVideoThumb = function() {
	const videoTailReg = /\.((wmv$)|(mp4$)|(avi$)|(wmv$)|(mov$)|(flv$))/gi
	if(this.video != undefined){
		return this.video.url.replace(videoTailReg, ".jpg");
	}
}

module.exports = Post;
