const router = require("express").Router();
const { response, resCode } = require("../common/response_code");
const { isValidName, isPhoneNumber, isValidId } = require("../common/func");

// import model
const Account = require("../models/account.model");
const FriendList = require("../models/friendlist.model");
const FriendBlock = require("../models/friendblock.model");

// import middleware
const uploadAvatarOrCoverImage = require("../middlewares/uploadAvatarOrCoverImage.middleware");
const uploadAvatar = require("../middlewares/uploadAvatar.middleware");
const authMdw = require("../middlewares/auth.middleware");

const cloudinary = require("./cloudinaryConfig");

router.post(
  "/change_info_after_signup",
  uploadAvatar,
  authMdw.authToken,
  async (req, resp) => {
    let account = req.account;

    if (!req.query.username) {
      // tên trống
      return response(resp, 1002);
    }

    if (!isValidName(req.query.username)) {
      // tên không hợp lệ
      return resp.json({
        code: "1004",
        message: "Parameter value is invalid",
      });
    }

    // nếu có avatar mới gửi lên => xóa avatar cũ nếu có
    if (req.file && account.avatar) {
      cloudinary.remove(account.avatar.publicId);
    }

    // upload avatar mới
    if (req.file) {
      try {
        let data = await cloudinary.uploads(req.file);
        account.avatar = data;
      } catch (err) {
        console.log(err);
        return resp.json({
          code: "1007",
          message: "Upload file failed",
        });
      }
    }
    // lưu lại thông tin
    account.name = req.query.username;
    account.save();

    resp.json({
      code: "1000",
      message: "OK",
      data: {
        id: account._id,
        username: account.name,
        phonenumber: account.phoneNumber,
        created: account.createdTime.getTime().toString(),
        avatar: account.getAvatar(),
      },
    });
  }
);

router.post(
  "/set_user_info",
  uploadAvatarOrCoverImage,
  authMdw.authToken,
  async (req, resp) => {
    const { username, description, address, city, country, link } = req.query;
    const { account } = req;
    // ko gửi thông tin gì lên
    if (
      !username &&
      !description &&
      !address &&
      !city &&
      !country &&
      !link &&
      !req.files
    )
      return response(resp, 1002);

    // mô tả hơn 150 kí tự
    if (description && description.length > 150) return response(resp, 1004);

    // tài khoản đã bị khóa
    if (account.isBlocked) return response(resp, 1009);

    // tên sai định dạng
    if (username && !isValidName(username)) return response(resp, 1004);

    // đường dẫn bị cấm

    account.name = username;
    account.description = description;
    account.address = address;
    account.city = city;
    account.country = country;
    account.link = link;

    // upload avatar
    if (req.files && req.files.avatar) {
      if (account.avatar) {
        //xóa avatar cũ
        cloudinary.remove(account.avatar.publicId);
      }
      // upload avatar mới
      try {
        let data = await cloudinary.uploads(req.files.avatar[0]);
        account.avatar = data;
      } catch (err) {
        console.log(err);
        return response(resp, 1007);
      }
    }

    // upload cover_image
    if (req.files && req.files.cover_image) {
      if (account.coverImage) {
        //xóa cover_image cũ
        cloudinary.remove(account.coverImage.publicId);
      }

      // upload cover_image
      try {
        let data = await cloudinary.uploads(req.files.cover_image[0]);
        account.coverImage = data;
      } catch (err) {
        console.log(err);
        return response(resp, 1007);
      }
    }

    await account.save();

    resp.json({
      code: "1000",
      message: "OK",
      data: {
        avatar: account.getAvatar(),
        cover_image:
          account.coverImage != undefined ? account.coverImage.url : "",
        username: account.name,
        link: account.link,
        city: account.city,
        country: account.country,
        created: account.createdTime.getTime().toString(),
        description: account.description,
      },
    });
  }
);

router.post("/get_user_info", authMdw.authToken, async (req, resp) => {
  const { user_id } = req.query;
  const { account } = req;

  if (account.isBlocked) return response(resp, 1009);

  var user = null;
  let isFriend = false;
  if (user_id) {
    if (!isValidId(user_id)) return response(resp, 1004);

    user = await Account.findOne({ _id: user_id });

    if (!user) return response(resp, 9995);

    if (user.isBlocked) return response(resp, 9995);

    const [friend, isBlocked] = await Promise.all([
      FriendList.findOne({
        $or: [
          { user1_id: account._id, user2_id: user_id },
          { user1_id: user_id, user2_id: account._id },
        ],
      }),
      FriendBlock.findOne({
        $or: [
          { accountDoBlock_id: user_id, blockedUser_id: account._id },
          { accountDoBlock_id: account._id, blockedUser_id: user_id },
        ],
      }),
    ]);

    if (friend) isFriend = true;
    if (isBlocked) return response(resp, 9995);
  } else {
    user = account;
  }
  const friendNum = await FriendList.find({
    $or: [{ user1_id: user._id }, { user2_id: user._id }],
  }).countDocuments();

  resp.json({
    code: "1000",
    message: "OK",
    data: {
      id: user._id,
      username: user.name,
      created: user.createdTime.getTime().toString(),
      description: user.description,
      avatar: user.getAvatar(),
      cover_image: user.cover_image ? user.cover_image.url : undefined,
      link: user.link,
      address: user.address,
      city: user.city,
      country: user.country,
      listing: friendNum,
      isFriend: isFriend ? "1" : 0,
    },
  });
});
const PushSetting = require("../models/pushsetting.model");
router.post("/check_new_version", authMdw.authToken, async (req, res) => {
  try {
    const lastUpdate = req.query.last_update;
    if (!lastUpdate) {
      return response(res, 1002); // Missing parameter
    }

    const { accountId } = req;
    const [notifications, account] = await Promise.all([
      PushSetting.countDocuments({ recipient: accountId, read: false }),

      Account.findById(accountId),
    ]);

    res.json({
      code: "1000",
      message: "OK",
      data: {
        notifications: notifications,

        accountStatus: Account.active,
      },
    });
  } catch (error) {
    console.error(error);
    res.json({
      code: "1003",
      message: "Internal Server Error",
    });
  }
});
module.exports = router;
