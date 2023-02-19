const router = require("express").Router();
const Account = require("../models/account.model");
const PushSetting = require("../models/pushsetting.model");
const Devtoken = require("../models/devtoken.model");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { count } = require("../models/account.model");
const { request } = require("express");

router.post("/set_push_settings", async (req, resp) => {
  let likeComment = req.query.like_comment;
  let fromFriends = req.query.from_friends;
  let requestedFriend = req.query.requested_friend;
  let suggestedFriend = req.query.suggested_friend;
  let birthday = req.query.birthday;
  let video = req.query.video;
  let report = req.query.report;
  let soundOn = req.query.sound_on;
  let notificationOn = req.query.notification_on;
  let vibrantOn = req.query.vibrant_on;
  let ledOn = req.query.led_on;
  let payload = jwt.verify(req.query.token, process.env.TOKEN_SECRET);
  let userId = payload.userId;

  let input = [
    likeComment,
    fromFriends,
    requestedFriend,
    suggestedFriend,
    birthday,
    video,
    report,
    soundOn,
    notificationOn,
    vibrantOn,
    ledOn,
  ];

  let isValidInput = true;
  let countUndefinedInputs = 0;
  for (i = 0; i < input.length; i++) {
    if (typeof input[i] !== "undefined" && input[i] != "0" && input[i] != "1") {
      isValidInput = false;
      break;
    }

    if (typeof input[i] === "undefined") {
      countUndefinedInputs++;
    }
  }

  // nếu tất cả tham số input đều trống thì dữ liệu input không hợp lê
  if (countUndefinedInputs == input.length) {
    isValidInput = false;
  }

  if (isValidInput == false) {
    resp.json({
      code: "1004",
      message: "parameter value is invalid",
    });
    return;
  }

  let pushSettingInput = {};
  if (typeof likeComment !== "undefined")
    pushSettingInput.likeComment = likeComment;
  if (typeof fromFriends !== "undefined")
    pushSettingInput.fromFriends = fromFriends;
  if (typeof requestedFriend !== "undefined")
    pushSettingInput.requestedFriend = requestedFriend;
  if (typeof suggestedFriend !== "undefined")
    pushSettingInput.suggestedFriend = suggestedFriend;
  if (typeof birthday !== "undefined") pushSettingInput.birthday = birthday;
  if (typeof video !== "undefined") pushSettingInput.video = video;
  if (typeof report !== "undefined") pushSettingInput.report = report;
  if (typeof soundOn !== "undefined") pushSettingInput.soundOn = soundOn;
  if (typeof notificationOn !== "undefined")
    pushSettingInput.notificationOn = notificationOn;
  if (typeof vibrantOn !== "undefined") pushSettingInput.vibrantOn = vibrantOn;
  if (typeof ledOn !== "undefined") pushSettingInput.ledOn = ledOn;

  // nếu chưa tồn tại push setting trong database thì thêm mới
  let pushSetting = await PushSetting.findOne({ account_id: userId });
  if (!pushSetting) {
    await new PushSetting({ account_id: userId, ...pushSettingInput }).save();
    resp.json({
      code: "1000",
      message: "OK",
    });
    return;
  }

  console.log({ account_id: userId, ...pushSettingInput });
  const res = await PushSetting.updateOne(
    { account_id: userId },
    pushSettingInput
  );
  console.log(pushSettingInput);
  // không có bản ghi nào bị sửa đổi => pushSettingInput hoàn toàn trùng vs dữ liệu trong database
  // trả về lỗi hành động đã thực hiện trước đó
  if (res.nModified == 0) {
    resp.json({
      code: "1010",
      message: "Action has done previously by this user",
    });
    return;
  } else {
    resp.json({
      code: "1000",
      message: "OK",
    });
    return;
  }
});

router.post("/get_push_settings", async (req, resp) => {
  let payload = jwt.verify(req.query.token, process.env.TOKEN_SECRET);
  let userId = payload.userId;

  let pushSetting = await PushSetting.findOne({ account_id: userId });
  if (!pushSetting) pushSetting = {};
  // nếu không tồn tại giá trị của pushSetting
  // giá trị mặc định trả về là 1
  pushSetting.likeComment = pushSetting.likeComment
    ? pushSetting.likeComment
    : 1;
  pushSetting.fromFriends = pushSetting.fromFriends
    ? pushSetting.fromFriends
    : 1;
  pushSetting.requestedFriend = pushSetting.requestedFriend
    ? pushSetting.requestedFriend
    : 1;
  pushSetting.suggestedFriend = pushSetting.suggestedFriend
    ? pushSetting.suggestedFriend
    : 1;
  pushSetting.birthday = pushSetting.birthday ? pushSetting.birthday : 1;
  pushSetting.video = pushSetting.video ? pushSetting.video : 1;
  pushSetting.report = pushSetting.report ? pushSetting.report : 1;
  pushSetting.soundOn = pushSetting.soundOn ? pushSetting.soundOn : 1;
  pushSetting.notificationOn = pushSetting.notificationOn
    ? pushSetting.notificationOn
    : 1;
  pushSetting.vibrantOn = pushSetting.vibrantOn ? pushSetting.vibrantOn : 1;
  pushSetting.ledOn = pushSetting.ledOn ? pushSetting.ledOn : 1;

  // không có bản ghi nào bị sửa đổi => pushSettingInput hoàn toàn trùng vs dữ liệu trong database
  // trả về lỗi hành động đã thực hiện trước đó
  resp.json({
    code: "1000",
    message: "OK",
    data: pushSetting,
  });
});

router.post("/set_devtoken", async (req, resp) => {
  let payload = jwt.verify(req.query.token, process.env.TOKEN_SECRET);
  let userId = payload.userId;
  let token = req.query.token;
  let devtype = req.query.devtype;
  let devtoken = req.query.devtoken;
  // khong du tham so
  if (token === undefined || devtype == undefined || devtoken == undefined) {
    return resp.json({
      code: "1002",
      message: "Parameter is not enough",
    });
  }

  let isValidDevtype = true;
  let isValidDevtoken = true;
  if (devtype != "0" && devtype != "1") isValidDevtype = false;
  if (!devtoken) isValidDevtoken = false;

  if (!isValidDevtype || !isValidDevtoken) {
    resp.json({
      code: "1004",
      message: "Parameter value is invalid",
    });
  } else {
    device = await Devtoken.findOne({
      token: req.query.token,
      devtype: devtype,
      devtoken: devtoken,
    });
    if (!device) {
      await new Devtoken({
        token: req.query.token,
        devtype: devtype,
        devtoken: devtoken,
      }).save();
    }
    resp.json({
      code: "1000",
      message: "OK",
      data: "You has posted set_devtoken",
    });
  }
});

module.exports = router;
