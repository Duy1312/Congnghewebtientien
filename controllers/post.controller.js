const router = require("express").Router();
const Post = require("../models/post.model");
const Comment = require("../models/comment.model");
const Account = require("../models/account.model");
const FriendBlock = require("../models/friendblock.model");
const FriendList = require("../models/friendlist.model");
const Report = require("../models/report.model");

const cloudinary = require("./cloudinaryConfig");
const uploadFile = require("../middlewares/uploadFile.middleware");
const authMdw = require("../middlewares/auth.middleware");

var mongoose = require("mongoose");

const { resCode, response } = require("../common/response_code");
const { isValidId, isNumber } = require("../common/func");

router.put(
  "/edit_post/:postId",
  uploadFile,
  authMdw.authToken,
  async (req, resp) => {
    const postId = req.params.postId;
    const { described, status } = req.query;

    if (!described || !status) return response(resp, 1002);

    let post = await Post.findById(postId);
    if (!post) {
      // no post found with this ID
      return resp.json({
        code: "1003",
        message: "Resource not found",
      });
    }

    if (post.account_id.toString() !== req.account._id.toString()) {
      // user is not authorized to edit this post
      return resp.json({
        code: "1005",
        message: "Authorization failed",
      });
    }

    if (req.files && req.files.image && req.files.video) {
      // both an image and a video were uploaded, reject the request
      return resp.json({
        code: "1007",
        message: "Upload file failed",
      });
    }

    if (req.query.described.length > 500) {
      // description is too long
      return resp.json({
        code: "1004",
        message: "Parameter value is invalid",
      });
    }

    if (!req.query.described && !req.files) {
      // no content, image or video provided
      return resp.json({
        code: "1002",
        message: "Parameter is not enough",
      });
    }

    if (req.files && req.files.image) {
      // upload image
      try {
        let uploadPromises = req.files.image.map(cloudinary.uploads);
        let data = await Promise.all(uploadPromises);
        // handle data
        post.images = data;
      } catch (error) {
        // upload failed
        console.log(error);
        return resp.json({
          code: "1007",
          message: "Upload file failed",
        });
      }
    }

    if (req.files && req.files.video) {
      // upload video
      try {
        let data = await cloudinary.uploads(req.files.video[0]);
        // handle data
        post.video = data;
      } catch (error) {
        // upload failed
        return resp.json({
          code: "1007",
          message: "Upload file failed",
        });
      }
    }

    // update post in database
    post.described = described;
    post.status = status;
    post = await post.save();

    resp.json({
      code: "1000",
      message: "OK",
      data: {
        id: post._id,
      },
    });
  }
);

router.post("/add_post", uploadFile, authMdw.authToken, async (req, resp) => {
  const { described, status } = req.query;

  if (!described || !status) return response(resp, 1002);

  if (req.files && req.files.image && req.files.video) {
    // có cả ảnh và video => từ chối
    return resp.json({
      code: "1007",
      message: "Upload file failed.",
    });
  }

  if (req.query.described.length > 500) {
    // vượt quá 500 từ
    return resp.json({
      code: "1004",
      message: "Parameter value is invalid.",
    });
  }

  if (!req.query.described && !req.files) {
    // không có nội dung, ảnh và video
    return resp.json({
      code: "1002",
      message: "Parameter is not enough",
    });
  }

  let post = new Post();

  if (req.files && req.files.image) {
    // upload ảnh
    try {
      let uploadPromises = req.files.image.map(cloudinary.uploads);
      let data = await Promise.all(uploadPromises);
      // xử lý data
      post.images = data;
    } catch (error) {
      // lỗi ko xđ
      console.log(error);
      return resp.json({
        code: "1007",
        message: "Upload file failed",
      });
    }
  }

  if (req.files && req.files.video) {
    // upload video
    try {
      let data = await cloudinary.uploads(req.files.video[0]);
      // xử lý data
      post.video = data;
    } catch (error) {
      // lỗi ko xđ
      return resp.json({
        code: "1007",
        message: "Upload file failed",
      });
    }
  }
  // lưu thông tin post vào csdl
  post.account_id = req.account._id;
  post.described = req.query.described;
  post.status = req.query.status;
  post = await post.save();
  // console.log(post);
  resp.json({
    code: "1000",
    message: "OK",
    data: {
      id: post._id,
    },
  });
});

router.post("/like", authMdw.authToken, async (req, resp) => {
  const { id } = req.query;
  if (!id) return response(resp, 1002);

  if (req.query.id.length != 24) {
    return resp.json({ code: "1004", message: "Parameter value is invalid" });
  }

  let post = await Post.findOne({ _id: req.query.id });
  if (post == null) {
    // post không tồn tại
    return resp.json({
      code: "9992",
      message: "Post is not existed",
    });
  }
  if (post.userLike_id.includes(req.account._id)) {
    // người dùng đã thích rồi => xóa lượt thích
    post.userLike_id = post.userLike_id.filter(
      (uli) => !uli.equals(req.account._id)
    );
  } else {
    // người dùng chưa thích => tăng lượt thích
    post.userLike_id.push(req.account._id);
  }
  await post.save();
  resp.json({
    code: "1000",
    message: "OK",
    data: { like: post.userLike_id.length.toString() },
  });
});

router.post("/get_post", authMdw.authToken, async (req, resp) => {
  const id = req.query.id;

  if (!id) return response(resp, 1002);

  if (id.length != 24) {
    return resp.json({ code: "1004", message: "Parameter value is invalid" });
  }
  let post = await Post.findOne({ _id: id });
  if (post == null) {
    // sai id bài post
    return resp.json({ code: "9992", message: "Post is not existed" });
  }
  // console.log(post);
  let proCount = Comment.countDocuments({ post_id: id }).exec();
  let proAuthor = Account.findOne({ _id: post.account_id }).exec();
  try {
    let tmp = await Promise.all([proCount, proAuthor]);
    // console.log(tmp);

    // kiểm tra bị block
    let isBlocked = await FriendBlock.findOne({
      accountDoBlock_id: tmp[1]._id,
      blockedUser_id: req.account._id,
    });
    if (isBlocked)
      return resp.json({ ...resCode.get(1000), data: { is_blocked: "1" } });

    let result = {
      id: post._id,
      described: post.described,
      created: post.createdTime.getTime().toString(),
      modified: post.modified ? post.modified.getTime().toString() : undefined,
      like: post.userLike_id.length.toString(),
      comment: tmp[0].toString(),
      author: {
        id: tmp[1]._id,
        name: tmp[1].name,
        avatar: tmp[1].getAvatar(),
        online: tmp[1].online,
      },
      is_liked: post.userLike_id.includes(req.account._id) ? "1" : "0",
      status: post.status,
      is_blocked: "0",
      can_edit: req.account._id.equals(tmp[1]._id) ? "1" : "0",
      banned: post.banned, // cái này là như nào nhỉ
      can_comment: post.canComment ? "1" : "0",
    };
    if (post.images.length !== 0) {
      result.image = post.images.map((image) => {
        let { url, _id } = image;
        return { id: _id, url: url };
      });
    }
    //	console.log(req.account._id.equals(tmp[1]._id));
    //	console.log(req.account._id, tmp[1]._id);
    if (post.video && post.video.url != undefined) {
      result.video = {
        url: post.video.url,
        thumb: post.getVideoThumb(),
      };
    }

    resp.json({
      code: "1000",
      message: "OK",
      data: result,
    });
  } catch (err) {
    console.log(err);
    resp.json({
      code: "1005",
      message: "Unknown error",
    });
  }
});

router.post("/get_list_posts", authMdw.authToken, async (req, resp) => {
  const { user_id, latitude, longitude, last_id } = req.query;
  var { index, count } = req.query;
  const { account } = req;

  if (index === undefined || !count) return response(resp, 1002);

  index = parseInt(index);
  count = parseInt(count);

  if (!isNumber(index) || !isNumber(count) || index < 0 || count < 1)
    return response(resp, 1004);

  if (last_id && !isValidId(last_id)) return response(resp, 1004);
  try {
    var postList = null;
    if (last_id) {
      // check last_id
      const co = await Post.findOne({ _id: last_id });
      if (co == null) return response(resp, 9992);

      var condition = {};
      if (index > 0) condition._id = { $lt: mongoose.Types.ObjectId(last_id) };
      postList = await Post.find(condition).sort({ _id: -1 }).limit(count);
    } else {
      postList = await Post.find().sort({ _id: -1 }).skip(index).limit(count);
    }
    if (postList.length === 0) return response(resp, 9994);

    if (isValidCoordinates(latitude, longitude)) {
      account.coordinates = { latitude, longitude };
      account.save();
    }

    const [mikChan, chanMik] = await Promise.all([
      FriendBlock.find({ accountDoBlock_id: account._id }),
      FriendBlock.find({ blockedUser_id: account._id }),
    ]);

    const userIdsBlocked = [];
    for (let item of mikChan) {
      // nhung thang mk chan
      userIdsBlocked.push(item.blockedUser_id);
    }
    for (let item of chanMik) {
      // nhung thang chan mk
      userIdsBlocked.push(item.accountDoBlock_id);
    }
    // console.log(userIdsBlocked);
    //const friendList = await FriendList.find({$or: [{user1_id: account._id}, {user2_id: account._id}]});
    // console.log(friendList)
    // console.log('owner: ',account._id)
    // console.log(friendList);
    //	const friendIds = [];
    // for(let item of friendList){
    // 	if(item.user1_id.equals(account._id)){ // user2 la ban mk
    // 		friendIds.push(item.user2_id);
    // 	} else {
    // 		friendIds.push(item.user1_id);
    // 	}
    // }
    // var condition = { account_id: { $nin: userIdsBlocked} };

    const data = {};
    data.last_id = postList[postList.length - 1]._id;

    data.new_items = "0";
    if (last_id) {
      // xu ly neu co bai post moi
      const prePostCount = await Post.find({
        _id: { $gte: last_id },
      }).countDocuments();
      let newItem = prePostCount - index;
      if (newItem > 0) data.new_items = newItem.toString();
    }

    var posts = [];
    for (let post of postList) {
      posts.push(mapPostToData(post, account._id));
    }

    // kiem tra mk va chu bai viet co chan nhau ko
    for (let post of posts) {
      for (let blockId of userIdsBlocked) {
        if (blockId.toString() == post.account_id) {
          post.is_blocked = "1";
        }
      }
    }

    // dem comment
    posts = await Promise.all(
      posts.map(async (post) => {
        const count = await countComment(post);
        const newPost = { ...post, comment: count.toString() };
        return newPost;
      })
    );
    // map author to post
    posts = await Promise.all(posts.map(mapAuthorToPost));

    data.posts = posts;

    resp.json({
      code: "1000",
      message: "OK",
      data: data,
    });
  } catch (err) {
    console.log(err);
    response(resp, 1005);
  }
});

router.post("/delete_post", authMdw.authToken, async (req, resp) => {
  const { id } = req.query;
  const { account } = req;

  if (!id) return response(resp, 1002);

  if (!isValidId(id)) return response(resp, 1004);

  // người dùng bị khóa tài khoản
  if (account.isBlocked) return response(resp, 1009);

  const post = await Post.findOne({ _id: id });

  if (!post) return response(resp, 9992);

  // bài viết bị khóa
  if (post.banned) return response(resp, 9992);

  if (!post.account_id.equals(account._id)) return response(resp, 1009);

  try {
    await post.deleteOne();

    try {
      // xoa ảnh và video của post
      if (post.images.length > 0) {
        for (image of post.images) {
          cloudinary.remove(image.publicId);
        }
      }

      if (post.video && post.video.publicId)
        cloudinary.remove(post.video.publicId);
    } catch (err) {
      console.log(err);
    }
    // xóa comment
    Comment.deleteMany({ post_id: post._id }).catch((err) => console.log(err));

    response(resp, 1000);
  } catch (err) {
    console.log(err);
    response(resp, 1001);
  }
});

router.post("/report_post", authMdw.authToken, async (req, resp) => {
  const { id, subject, details } = req.query;
  const { account } = req;
  if (!id || !subject || !details) return response(resp, 1002);

  if (!isValidId(id)) return response(resp, 1004);

  // nguoi dung da bi khoa tai khoan
  if (account.isBlocked) return response(resp, 1009);

  const post = await Post.findOne({ _id: id });
  if (post == null) return response(resp, 9992);

  // bai viet da bi khoa
  if (post.banned) return response(resp, 1010);

  await new Report({
    reporterId: account._id,
    postId: id,
    subject,
    details,
  }).save();

  response(resp, 1000);
});

module.exports = router;

function mapPostToData(post, accountId) {
  const data = {
    id: post._id,
    described: post.described,
    created: post.createdTime.getTime().toString(),
    like: post.userLike_id.length.toString(),
    comment: post.comment,
    is_liked: post.userLike_id.includes(accountId) ? "1" : "0",
    can_comment: post.canComment ? "1" : "0",
    banned: post.banned ? "1" : "0",
    status: post.status,
    is_blocked: "0",
    account_id: post.account_id,
  };

  if (post.video && post.video.url) {
    data.video = {
      url: post.video.url,
      thumb: post.getVideoThumb(),
    };
  }

  if (post.images.length != 0) {
    data.image = [];
    for (let i of post.images) {
      data.image.push({
        url: i.url,
        id: i._id,
      });
    }
  }

  return data;
}

function mapAuthorToPost(post) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await Account.findOne({ _id: post.account_id });
      // console.log(data);
      const author = {
        id: data._id,
        username: data.name,
        avatar: data.getAvatar(),
      };
      const newPost = { ...post, author: author, account_id: undefined };
      resolve(newPost);
    } catch (err) {
      reject(err);
    }
  });
}

async function countComment(post) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await Comment.find({ post_id: post.id }).countDocuments();
      resolve(data);
    } catch (err) {
      reject(err);
    }
  });
}

function isValidCoordinates(latitude, longitude) {
  const floatNumReg = /^-?\d+(\.\d+)?$/;

  if (!floatNumReg.test(latitude) || !floatNumReg.test(longitude)) return false;

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (lat < -90 || lat > 90) return false;

  if (lng < -180 || lng > 180) return false;

  return true;
}
router.get("/checkNewItems", async (req, res) => {
  const { last_id, category_id } = req.query;
  if (!last_id || !category_id) {
    return res.json({
      code: "1002",
      message: "Parameters not enough",
    });
  }

  try {
    const items = await Post.find({
      _id: { $gt: last_id },
      category: category_id,
    }).sort({ _id: -1 });

    let count = items.length;

    res.json({
      code: "1000",
      message: "Success",
      data: {
        count: count,
      },
    });
  } catch (error) {
    console.error(error);
    return res.json({
      code: "9999",
      message: "Internal server error",
    });
  }
});
