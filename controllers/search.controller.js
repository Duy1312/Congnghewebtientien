const router = require('express').Router();
const Post = require('../models/post.model');
const Account = require('../models/account.model');
const Comment = require('../models/comment.model');
const SavedSearch = require('../models/savedsearch.model');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

router.post('/del_saved_search', async (req, resp) => {
	let token = req.query.token;
	let searchId = req.query.search_id;
	let all = req.query.all;
	let payload = jwt.verify(token, process.env.TOKEN_SECRET);
	let accountId = payload.userId;
	// khong du tham so
	if (token === undefined
		|| (searchId == undefined && all == undefined)
		|| (searchId == undefined && all == 0)
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
	}
	// tham so khong hop le
	if ((all != 1 && all != 0) && (!mongoose.Types.ObjectId.isValid(searchId))) {
		console.log("hahaha")
		resp.json({
			code: '1004',
			message: 'Parameter value is invalid',
		});
		return;
	}

	// xoa tat ca
	if (all == 1) {
		const deletedInfo = await SavedSearch.deleteMany({account_id: accountId });
		if (deletedInfo.deletedCount) {
			resp.json({
				code: '1000',
				message: 'OK'
			});
			return;
		} else {
			resp.json({
				code: '9994',
				message: 'No data or end of list data',
			});
			return;
		}

	}

	let savedSearch = await SavedSearch.findOne({ _id: searchId }).exec();
	if (savedSearch) {
		await SavedSearch.deleteMany({ keyword: savedSearch.keyword, account_id: accountId });
		return resp.json({
			code: "1000",
			message: 'OK',
		})
	} else {
		return resp.json({
			code: '1004',
			message: 'Parameter value is invalid',
		})
	}

});

router.post('/get_saved_search', async (req, resp) => {
	let token = req.query.token;
	let index = req.query.index;
	let count = req.query.count;
	let payload = jwt.verify(token, process.env.TOKEN_SECRET);
	let AccountId = payload.userId;

	// khong du tham so
	if (token === undefined
		|| index == undefined
		|| count == undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
	}

	// kieu tham so khong hop le
	if ((isNaN(index - 0)) || (isNaN(count - 0))) {
		resp.json({
			code: '1003',
			message: 'Parameter type is invalid',
		});
		return;
	}

	let searchList = await SavedSearch.find({account_id: AccountId }).skip(parseInt(index)).limit(parseInt(count)).exec();
	console.log(searchList);

	if (searchList.length) {
		searchListData = searchList.map(savedSearch => {
			return {
				id: savedSearch._id,
				keyword: savedSearch.keyword,
				created: Date.parse(savedSearch.createdTime) + '',
			}
		});

		return resp.json({
			code: '1000',
			message: 'OK',
			data: searchListData,
		});
	} else {
		return resp.json({
			code: '9994',
			message: 'No data or end of list data',
		})
	}
});

router.post('/search', async (req, resp) => {
	let token = req.query.token;
	let keyword = req.query.keyword;
	//let user_id = req.query.user_id;
	let index = req.query.index;
	let count = req.query.count;
	let payload = jwt.verify(token, process.env.TOKEN_SECRET);
	let mainAccountId = payload.userId;

	// khong du tham so
	if (token === undefined
		|| keyword == undefined
		|| index == undefined
		|| count == undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
	}

	// kieu tham so khong hop le
	if ((isNaN(index - 0)) || (isNaN(count - 0))) {
		resp.json({
			code: '1003',
			message: 'parameter type is invalid',
		});
		return;
	}

	new SavedSearch({
		account_id: mainAccountId,
		keyword: keyword,
	}).save();

	// find post
	let posts = await Post.find(
		{ $text: { $search: keyword } },
		{ score: { $meta: "textScore" } }
	).sort({ score: { $meta: "textScore" } }).skip(parseInt(index)).limit(parseInt(count)).exec();
	let postsData = await Promise.all(posts.map(mapPostData));

	if (posts.length) {
		resp.json({
			code: '1000',
			message: 'OK',
			data: postsData,
		});
	} else {
		resp.json({
			code: '9994',
			message: 'No data or end of list data',
		})
	}

});

// map data from posts array to return data for client
async function mapPostData(post) {
	let likeCount = post.userLike_id.length;
	let commentCount = await Comment.where({ post_id: post._id }).countDocuments();
	let is_liked = (post.userLike_id.indexOf(post.account_id) != -1) ? 'true' : 'false';
	let author = await Account.findOne({ _id: post.account_id });

	return {
		id: post._id,
		image: post.image,
		video: {
			thumb: '',
			url: '',
		},
		like: likeCount + '',
		comment: commentCount + "",
		is_liked: is_liked,
		author: {
			id: author._id,
			username: author.name,
			avatar: author.linkAvatar,
		},
		described: post.described,
	}
}

module.exports = router;
