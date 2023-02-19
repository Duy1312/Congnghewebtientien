const router = require('express').Router();

const {resCode, response} = require('../common/response_code');

const Account = require('../models/account.model');
const Post = require('../models/post.model');
const Comment = require('../models/comment.model');
const FriendBlock = require('../models/friendblock.model');

const {isValidId, isNumber} = require('../common/func');

router.post('/set_comment', async (req, resp) => {
	
	const {id, comment} = req.query;
	var {index, count} = req.query;
	const {account} = req;

	if(index === undefined || !count || !id || !comment) return response(resp, 1002);

	index = parseInt(index);
	count = parseInt(count);

	if(!isNumber(index) || !isNumber(count) || index < 0 || count < 1) 
		return response(resp, 1004);

	// kiểm tra khóa tài khoản ng dùng
	if(req.account.isBlock) return response(resp, 1009);
	// kiểm tra số lượng từ của comment(trống hoặc trên 500 từ)
	if(req.query.comment.trim().length == 0 || req.query.comment.length > 500){
		return resp.json({
			code: '1004',
			message: "Parameter value is invalid"
		});
	}

	if(!isValidId(id)){ // độ dài id phải là 24
		return resp.json({code:'1004', message: "Parameter value is invalid"});
	}
	try{
		let post = await Post.findOne({_id: id});	// lấy ra post

		if(!post) response(resp, 9992);

		// kiểm tra bài viết bị khóa
		if(post.banned){
			if(post.banned == "1"){
				return resp.json({
					code: '1011',
					message: "Could not public this post"
				});
			}
			if(post.banned == "2"){
				return resp.json({
					code: '1012',
					message: "Limited access"
				});
			}
		}

		let isBlock = await FriendBlock.findOne({ /* tìm xem mình có bị chủ bài viết chặn ko */
			accountDoBlock_id: post.account_id, 
			blockedUser_id: account._id
		});
				
		// kiểm tra mk bị chủ bài viết chặn
		if(isBlock){
			// console.log(isBlock)
			return resp.json({
				code: '1000',
				message: "OK",
				is_blocked: "1" 
			});
		}

		// tạo danh sách blockId
		const [mikChan, chanMik] = await Promise.all([
			FriendBlock.find({accountDoBlock_id: account._id}), 
			FriendBlock.find({blockedUser_id: account._id})
		])

		const userIdsBlocked = [];
		for(let item of mikChan){ // nhung thang mk chan
			userIdsBlocked.push(item.blockedUser_id);
		}
		for(let item of chanMik) { // nhung thang chan mk
			userIdsBlocked.push(item.accountDoBlock_id);
		}

		// lưu comment
		let myCmt = await new Comment({
			post_id: req.query.id,
			userComment_id: req.account._id,
			content: req.query.comment
		})
			.save();

		// lấy comment
		const comments = await Comment.find({
			post_id: id,
			userComment_id: {$nin: userIdsBlocked}
		})
			.skip(index)
			.limit(count);

		// lấy ra thông tin người comment
		let cmterIds = comments.map(cmt => cmt.userComment_id);

		let cmters = await Account.find({ _id: {$in: cmterIds} });

		resp.json({
			code: '1000',
			message: "OK",
			data: commentMapper(comments, cmters)
		});
	} catch (err){
		console.log(err);
		resp.json({
			code: '1005',
			message: "Unknown error"
		});
	}
});

router.post('/get_comment', async (req, resp) => {
	const {id} = req.query;
	const {account} = req;
	var {index, count} = req.query;
	if(!id || !count || index==undefined) return response(resp, 1002);

	if(!isValidId(id)) return response(resp, 1004);

	if(!isNumber(index) || !isNumber(count)) return response(resp, 1004);

	index = parseInt(index);
	count = parseInt(count);
	if(index < 0 || count < 1) return response(resp, 1004);

	if(account.isBlock) return response(resp, 1009);

	//load post, block list
	const [post, mikChan, chanMik] = await Promise.all([
		Post.findOne({_id: id}),
		FriendBlock.find({accountDoBlock_id: account._id}), 
		FriendBlock.find({blockedUser_id: account._id})
	]);

	if(post == null) return response(resp, 9992);

	if(post.banned) return response(resp, 1010);

	const userIdsBlocked = [];
	for(let item of mikChan){ // nhung thang mk chan
		userIdsBlocked.push(item.blockedUser_id);
	}
	for(let item of chanMik) { // nhung thang chan mk
		userIdsBlocked.push(item.accountDoBlock_id);
	}

	for(let userIdBlocked of userIdsBlocked){ // kiểm tra bị chủ bài post chặn
		if(userIdBlocked.equals(post.account_id)){
			return resp.json({...resCode.get(1000), is_blocked: '1'});
		}
	}

	const comments = await Comment.find({
		post_id: post._id,
		userComment_id: {$nin: userIdsBlocked}
	})	.skip(index)
		.limit(count)
		.populate('userComment_id');
	
	if(comments.length === 0) return response(resp, 9994);

	resp.json({
		...resCode.get(1000),
		data: commentsToData(comments)
	});
});

function commentMapper(cmts, cmters){
	return cmts.map(cmt => {
		let cmter = cmters.find(cmter => cmter._id.equals(cmt.userComment_id));
		return {
			id: cmt._id,
			comment: cmt.content,
			created: cmt.createdTime.getTime().toString(),
			poster: {
				id: cmter._id,
				name: cmter.name,
				avatar: cmter.getAvatar()
			}
		}
	});
}

module.exports = router;

function commentsToData(comments){
	const data = [];
	for(let cmt of comments){
		data.push(commentToData(cmt))
	}
	return data;
}

function commentToData(comment){
	const commenter = comment.userComment_id;
	return {
		id: comment._id,
		comment: comment.content,
		created: comment.createdTime.getTime().toString(),
		poster: {
			id: commenter._id,
			name: commenter.name,
			avatar: commenter.getAvatar()
		}
	}
}