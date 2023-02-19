const router = require('express').Router();
const Account = require('../models/account.model');
const FriendRequest = require('../models/friendrequest.model');
const FriendList = require('../models/friendlist.model');
const  FriendBlock = require('../models/friendblock.model');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

router.post('/get_list_blocks', async (req, resp) => {
  let token = req.query.token;
  let index = req.query.index;
  let count = req.query.count;

  // khong du tham so
	if (token === undefined
    || index === undefined
    || count === undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
  }

  let payload = jwt.verify(token, process.env.TOKEN_SECRET);
  let accountId = payload.userId;

  // tham số index hoặc count không phải là kiểu number
  if ((isNaN(index - 0)) || (isNaN(count - 0))) {
    resp.json({
      code: '1003',
      message: 'parameter type is invalid',
    });
    return;
  }

  let blockList = await FriendBlock.find({accountDoBlock_id: accountId}).skip(parseInt(index)).limit(parseInt(count));
  let blockListData = await Promise.all(blockList.map(mapBlockList));
  resp.json({
    code: '1000',
    message: 'OK',
    data: blockListData,
  });
});

router.post('/set_block', async (req, resp) => {
  let token = req.query.token;
  let blockedUserId = req.query.user_id;
  let action = req.query.type;

  // khong du tham so
	if (token === undefined
    || blockedUserId === undefined
    || action === undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
  }

  let payload = jwt.verify(req.query.token, process.env.TOKEN_SECRET);
  let accountDoBlockId = payload.userId;

  // user_id không phải là ObjectId type
  // type không phải là 0 hoặc 1
  if ((!mongoose.Types.ObjectId.isValid(blockedUserId))
    || ((action != "0") && (action != "1"))
    || (blockedUserId == accountDoBlockId)
  ) {
    resp.json({
      code: '1004',
      message: 'parameter value is invalid',
    });
    return;
  }

  // tìm userId
  let blockedUser = await Account.findOne({_id: blockedUserId});
  // khong tim thay user_id trong database
  if(!blockedUser){
    resp.json({
      code: '9995',
      message: 'User is not validated',
    });
    return;
  }
  // block neu action = 0
  if (action == "0"){
    // nếu trong database đã block user rồi thì trả mã lỗi
    let isExistBlock = await FriendBlock.findOne({accountDoBlock_id: accountDoBlockId, blockedUser_id: blockedUserId});
    if (isExistBlock) {
      resp.json({
        code: '1010',
        message: 'Action has been done previously by this user',
      });
      return;
    }

    // block user
    await new FriendBlock({
      accountDoBlock_id: accountDoBlockId,
      blockedUser_id: blockedUserId
    }).save();
    resp.json({
      code: '1000',
      message: 'OK',
    });
    return;
  }

  // unblock
  if (action == "1"){
    // nếu trong database không có 2 người block nhau mà lại yêu cầu unblock
    // trả về lỗi
    let isExistBlock = await FriendBlock.findOne({accountDoBlock_id: accountDoBlockId, blockedUser_id: blockedUserId});
    if (! isExistBlock) {
      resp.json({
        code: '1010',
        message: 'action has been done previously by this user',
      });
      return;
    }

    // unblock user
    await FriendBlock.deleteOne({
      accountDoBlock_id: accountDoBlockId,
      blockedUser_id: blockedUserId
    });
    resp.json({
      code: '1000',
      message: 'OK',
    });
    return;
  }



});

router.post('/get_list_suggested_friends', async (req,resp) => {
  let token = req.query.token;
  let index = req.query.index;
  let count = req.query.count;

  // khong du tham so
	if (token === undefined
    || index === undefined
    || count === undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
  }
  
  let payload = jwt.verify(token, process.env.TOKEN_SECRET);
  let requestUserId = payload.userId;

  // tham số index hoặc count không phải là kiểu number
  if ((isNaN(index - 0)) || (isNaN(count - 0))) {
    resp.json({
      code: '1003',
      message: 'parameter type is invalid',
    });
    return;
  }

  let requestUserObjectId = new mongoose.Types.ObjectId(requestUserId);
  let friendList = await FriendList.aggregate([
    {$match: {$or: [{user1_id: requestUserObjectId}, {user2_id: requestUserObjectId}]}},
    {$project: {_id: 0, u: ["$user1_id", "$user2_id"]}},
    {$unwind: "$u"},
    {$match: {u: {$ne: requestUserObjectId}}},
    {$project: {u: 1}}
  ]);

  let friendBlock = await FriendBlock.find({accountDoBlock_id: requestUserId});
  let isBlockedByUser = await FriendBlock.find({blockedUser_id: requestUserId});
  

  notSuggestedList = friendList.map(friend => (friend.u).toString());
  // thieu nguoi dung bi block can bo sung
  notSuggestedList.push(requestUserId);
  friendBlock.map((friendBlocked) => notSuggestedList.push(friendBlocked.blockedUser_id));
  isBlockedByUser.map((friendBlocked) => notSuggestedList.push(friendBlocked.blockedUser_id));

  suggestedFriends = await Account.find( {_id: {$nin: notSuggestedList }}).skip(parseInt(index)).limit(parseInt(count));
  console.log(suggestedFriends);

  let suggestedFriendData = await Promise.all(suggestedFriends.map((friend) => mapSuggestedFriends(requestUserId, friend)));
  console.log(suggestedFriendData);
  resp.json({
    code: '1000',
    message: 'OK',
    data: {
      list_users: suggestedFriendData
    }
  });
});

router.post('/get_user_friends', async (req,resp) => {
  let token = req.query.token;
  let friendUserId = req.query.user_id;
  let index = req.query.index;
  let count = req.query.count;

  // khong du tham so
	if (token === undefined
    || index === undefined
    || count === undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
	}

  let payload = jwt.verify(token, process.env.TOKEN_SECRET);
  let requestUserId = payload.userId;

  // tham số index hoặc count không phải là kiểu number
  if ((isNaN(index - 0)) || (isNaN(count - 0)) || count == 0) {
    resp.json({
      code: '1003',
      message: 'Parameter type is invalid',
    });
    return;
  }

  // nếu không tìm thấy user_id trong parameter thì tìm danh sách bạn của người gửi trong token
  if (!friendUserId) {
    friendUserId = requestUserId;
  }

  // user_id không phải là ObjectId type
  if (!mongoose.Types.ObjectId.isValid(friendUserId)) {
    resp.json({
      code: '1004',
      message: 'Parameter value is invalid',
    });
    return;
  }

  // tìm userId
  let friendUser = await Account.findOne({_id: friendUserId});
  // khong tim thay user_id trong database
  if(!friendUser){
    resp.json({
      code: '9995',
      message: 'User is not validated',
    });
    return;
  }
  console.log(count)
  let friendUserObjectId = new mongoose.Types.ObjectId(friendUserId);
  let friendUserList = await FriendList.aggregate([
    {$match: {$or: [{user1_id: friendUserObjectId}, {user2_id: friendUserObjectId}]}},
    {$project: {_id: 0, createdTime: 1, u: ["$user1_id", "$user2_id"]}},
    {$unwind: "$u"},
    {$match: {u: {$ne: friendUserObjectId}}},
    {$project: {u: 1, requestAccount: requestUserId, createdTime: 1}}
  ]).skip(parseInt(index)).limit(parseInt(count)).exec();
  let friendData = await Promise.all(friendUserList.map(mapFriendUserList));
  console.log(friendData);
  resp.json({
    code: '1000',
    message: 'OK',
    data: {
      friends: friendData,
      total: friendData.length.toString(),
    }
  });
});

router.post('/get_requested_friends', async (req, resp) => {
  let token = req.query.token;
  let index = req.query.index;
  let count = req.query.count;

  // khong du tham so
	if (token === undefined
    || index === undefined
    || count === undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
	}

  let payload = jwt.verify(token, process.env.TOKEN_SECRET);
  let accountGetRequestId = payload.userId;

  // tham số index hoặc count không phải là kiểu number
  if ((isNaN(index - 0)) || (isNaN(count - 0))) {
    resp.json({
      code: '1003',
      message: 'parameter type is invalid',
    });
    return;
  }

  let accountSendRequest = await FriendRequest.find({userGetRequest_id: accountGetRequestId}).skip(parseInt(index)).limit(parseInt(count));
  let requestData = await Promise.all(accountSendRequest.map(mapUserInfo));

   if (requestData.length === 0) {
    return resp.json({
      code: "9994",
      message: 'no data or end of list data',
    })
   }

  resp.json({
    code: '1000',
    message: 'OK',
    data: {
      request: requestData,
      total: requestData.length + "",
    }
  });
  return;
});

router.post('/set_request_friend', async (req, resp) => {
  let token = req.query.token;
  let user_id = req.query.user_id;

  // khong du tham so
	if (token === undefined
		|| user_id == undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
	}

  let payload = jwt.verify(token, process.env.TOKEN_SECRET);
  let accountRequest_id = payload.userId;
  let userGetRequest;
  if (mongoose.Types.ObjectId.isValid(user_id)){
    userGetRequest = await Account.findOne({_id: user_id});
  }

  let requested_friends = await FriendRequest.countDocuments({userSendRequest_id: accountRequest_id});

  // user_id khong khop voi user nao trong database
  // hoac nguoi gui ket ban va nguoi nhan la cung mot nguoi
  // user_id khong phai la ObjectID
  if ((!userGetRequest)
    || (user_id == accountRequest_id)
    || (!mongoose.Types.ObjectId.isValid(user_id))) {
      resp.json({
        code: '1004',
        message: 'parameter value is invalid',
      });
      return;
  }

  // Da gui ket ban cho user_id ma lai gui lai lan nua, coi nhu huy yeu cau ket ban
  let deletedRequest = await FriendRequest.findOneAndDelete({userSendRequest_id: accountRequest_id, userGetRequest_id: user_id});
  if (deletedRequest) {
    resp.json({
      code: '1000',
      message: 'OK',
      data: {
        requested_friends: (requested_friends - 1) + '',
      }
    });
    return;
  }

  //sai, toi da 500 ban chu ko phai request, de lam sau[]
  // thoa man toi da 500 request
  if (requested_friends < 500){
    await new FriendRequest({
  		userSendRequest_id: accountRequest_id,
  		userGetRequest_id: user_id,
      createdTime: Date.now(),
  	}).save();
    return resp.json({
      code: "1000",
      message: 'OK',
      data: {
        requested_friends: (requested_friends + 1) + '',
      },
    });
  } else {
    return resp.json({
      code: "9994",
      message: 'no data or end of list data',
      data: {
        requested_friends: requested_friends + ''
      },
    })
  }
});

router.post('/set_accept_friend', async (req, resp) => {
  let token = req.query.token;
  let accountRequestId = req.query.user_id;
  let isAccept = req.query.is_accept;

  // khong du tham so
	if (token === undefined
    || accountRequestId === undefined
    || isAccept === undefined
	) {
		return resp.json({
			code: '1002',
			message: 'Parameter is not enough'
		});
	}

  let payload = jwt.verify(token, process.env.TOKEN_SECRET);
  let accountAcceptId = payload.userId;

  //user_id tham so khong thuoc kieu ObjectId
  // is_accept  khong phai la 0 hoac 1
  if ((!mongoose.Types.ObjectId.isValid(accountRequestId))
    || ((isAccept != '0') && (isAccept != '1'))
  ){
    resp.json({
      code: '1004',
      message: 'Parameter value is invalid',
    });
    return;
  }

  let accountRequest = await Account.findOne({_id: accountRequestId});
  // khong tim thay user_id trong database
  if(!accountRequest){
    resp.json({
      code: '9995',
      message: 'User is not validated',
    });
    return;
  }

  //Da chap thuan hoac xoa bo yeu cau ket ban roi
  let friendRequest = await FriendRequest.findOne({userSendRequest_id: accountRequestId, userGetRequest_id: accountAcceptId});
  if (!friendRequest){
    resp.json({
      code: '1010',
      message: 'Action has been done previously by this user',
    });
    return;
  }

  // chấp nhận yêu cầu kết bạn
  if (isAccept == "1") {
    //Them ban
    await new FriendList({
      user1_id: accountRequestId,
      user2_id: accountAcceptId,
    }).save();
  }

  //Xóa yêu cầu kết bạn khi chấp nhận kết bạn hoặc không chấp nhận yêu cầu kết bạn
  await FriendRequest.findOneAndDelete({userSendRequest_id: accountRequestId, userGetRequest_id: accountAcceptId});
  resp.json({
    code: '1000',
    message: 'OK',
  });
});

async function mapBlockList(block){
	let blockUserId = block.blockedUser_id;
  let blockUser = await Account.findOne({_id: blockUserId});
	return {
    id: blockUser._id,
    name: blockUser.name,
    avatar: blockUser.avatar.url,
	}
}

async function mapSuggestedFriends(requestAccountId, friend){

  let friendId = friend._id;

  // Đếm số bạn chung của account gửi yêu cầu kết bạn và account nhận yêu cầu kết bạn
  let mutual = [new mongoose.Types.ObjectId(requestAccountId), new mongoose.Types.ObjectId(friendId)];
  let listSameFriend = await FriendList.aggregate([
    {$match: {$or: [{user1_id: {$in: mutual}}, {user2_id: {$in: mutual}}]}},
    {$project: {_id: 0, u: ["$user1_id", "$user2_id"]}},
    {$unwind: "$u"},
    {$match: {u: {$nin: mutual}}},
    {$group: {_id: "$u", count: {$sum: 1}}},
    {$match: {count: 2}},
    {$project: {_id: 1}}
  ]);
  countSameFriend = listSameFriend.length;
	return {
    user_id: friend._id,
    username: friend.name,
    avatar: friend.avatar.url,
    same_friends: countSameFriend + '',
	}
}

async function mapFriendUserList(friend){
	let accountId = friend.requestAccount;
  let friendOfAccountId = friend.u;
  let friendOfAccount = await Account.findOne({_id:friendOfAccountId});

  // Đếm số bạn chung của account gửi yêu cầu kết bạn và account nhận yêu cầu kết bạn
  let mutual = [new mongoose.Types.ObjectId(accountId), new mongoose.Types.ObjectId(friendOfAccountId)];
  let listSameFriend = await FriendList.aggregate([
    {$match: {$or: [{user1_id: {$in: mutual}}, {user2_id: {$in: mutual}}]}},
    {$project: {_id: 0, u: ["$user1_id", "$user2_id"]}},
    {$unwind: "$u"},
    {$match: {u: {$nin: mutual}}},
    {$group: {_id: "$u", count: {$sum: 1}}},
    {$match: {count: 2}},
    {$project: {_id: 1}}
  ]);
  countSameFriend = listSameFriend.length;
	return {
    id: friendOfAccount._id,
    username: friendOfAccount.name,
    avatar: friendOfAccount.avatar.url,
    same_friends: countSameFriend + '',
    created: Date.parse(friend.createdTime) + '',
	}
}

async function mapUserInfo(request){
	let accountSendRequestId = request.userSendRequest_id;
  let accountGetRequestId = request.userGetRequest_id;
  let accountSendRequest = await Account.findOne({_id:accountSendRequestId});

  // Đếm số bạn chung của account gửi yêu cầu kết bạn và account nhận yêu cầu kết bạn
  let mutual = [new mongoose.Types.ObjectId(accountSendRequestId), new mongoose.Types.ObjectId(accountGetRequestId)];
  let listSameFriend = await FriendList.aggregate([
    {$match: {$or: [{user1_id: {$in: mutual}}, {user2_id: {$in: mutual}}]}},
    {$project: {_id: 0, u: ["$user1_id", "$user2_id"]}},
    {$unwind: "$u"},
    {$match: {u: {$nin: mutual}}},
    {$group: {_id: "$u", count: {$sum: 1}}},
    {$match: {count: 2}},
    {$project: {_id: 1}}
  ]);
  countSameFriend = listSameFriend.length;

	return {
    id: accountSendRequest._id,
    username: accountSendRequest.name,
    avatar: accountSendRequest.avatar.url,
    same_friends: countSameFriend + "",
    created: Date.parse(request.createdTime) + '',
	}
}

module.exports = router;
