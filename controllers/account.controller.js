const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { resCode, response } = require("../common/response_code");

const { isValidName, isPhoneNumber } = require("../common/func");

// import model
const Account = require("../models/account.model");
const VerifyCode = require("../models/verifycode.model");

// import middleware
const uploadAvatar = require("../middlewares/uploadAvatar.middleware");
const authMdw = require("../middlewares/auth.middleware");

const cloudinary = require("./cloudinaryConfig");

router.post("/login", async (req, resp) => {
  let phoneNumber = req.query.phonenumber;
  let password = req.query.password;
  // console.log(password)
  if (phoneNumber === undefined || password === undefined) {
    return resp.json({
      code: "1002",
      message: "Parameter is not enough",
    });
  }
  let account = await Account.findOne({
    phoneNumber: phoneNumber,
    password: password,
  });
  // khong co nguoi dung nay
  if (account == null) {
    return resp.json({
      code: "9995",
      message: "User is not validated",
    });
  }
  // console.log(account);
  if (!account.active) {
    return resp.json({
      code: "9995",
      message: "User is not validated",
    });
  }

  //Dung password va phonenumber
  let token = jwt.sign(
    {
      userId: account._id,
      phoneNumber: phoneNumber,
      uuid: req.query.uuid,
    },
    process.env.TOKEN_SECRET
  );
  //		const res = await Account.updateOne({ phoneNumber: phoneNumber }, { token: token } );
  // account.online = true;
  account.token = token;
  account.save();
  resp.json({
    code: "1000",
    message: "OK",
    data: {
      id: account._id,
      username: account.username,
      token: token,
      avatar: account.getAvatar(),
    },
  });
});

router.post("/signup", async (req, resp) => {
  const phoneNumber = req.query.phonenumber;
  const password = req.query.password;

  if (!phoneNumber || !password) {
    return response(resp, 1002);
  }

  if (!isPhoneNumber(phoneNumber) || !isValidPassword(password)) {
    return resp.json(resCode.get(1004));
  }

  // tìm tài khoản ứng với số điện thoại vừa lấy đk
  let account = await Account.find({ phoneNumber: phoneNumber });

  if (account.length == 0) {
    // tài khoản chửa tồn tại
    // thêm tài khoản vào database
    await new Account({
      phoneNumber: phoneNumber,
      password: password,
      uuid: req.query.uuid,
    }).save();

    // sinh mã xác thực
    let verifycode = generateVerifyCode();
    // lưu mã xác thực
    await new VerifyCode({
      phoneNumber: phoneNumber,
      code: [verifycode],
    }).save();

    // gửi dữ liệu về cho client
    resp.json(resCode.get(1000));
  } else {
    // tài khoản đã tồn tại
    resp.json(resCode.get(9996));
  }
});

router.post("/logout", async (req, resp) => {
  try {
    let payload = jwt.verify(req.query.token, process.env.TOKEN_SECRET);
    let account = await Account.findOne({ _id: payload.userId });
    if (account == null) {
      return resp.json(resCode.get(1005));
    }
    //		account.online = false;
    account.token = undefined;
    account.save();
    resp.json({
      code: "1000",
      message: "OK",
    });
  } catch (err) {
    resp.json(resCode.get(9998));
  }
});

router.post("/get_verify_code", async (req, resp) => {
  const { phonenumber } = req.query;

  if (!phonenumber) return resp.json(resCode.get(1002));

  if (!isPhoneNumber(phonenumber)) return resp.json(resCode.get(1004));

  let account = await Account.findOne({ phoneNumber: req.query.phonenumber });
  if (account == null) {
    // người dùng chưa đăng ký
    return response(resp, 1004);
  }

  let verify = await VerifyCode.findOne({ phoneNumber: req.query.phonenumber });
  if (verify == null) {
    // người dùng đã active
    resp.json({
      code: "1010",
      message: "Action has been done previously by this user",
    });
    return;
  }

  if (verify.limitedTime) {
    // xử lý limited time
    let milsec = verify.lastUpdate.getTime();
    if (Date.now() - milsec < 120000) {
      resp.json({
        code: "1009",
        message: "Not access",
      });
      return;
    }
  }
  let newCode = generateVerifyCode();
  verify.code.push(newCode);
  verify.lastUpdate = Date.now();
  verify.limitedTime = true;
  await verify.save();
  resp.json({
    code: "1000",
    message: "OK",
    data: {
      verifycode: newCode,
    },
  });
});

router.post("/check_verify_code", async (req, resp) => {
  const { phonenumber, code_verify } = req.query;

  if (!phonenumber || !code_verify) return response(resp, 1002);

  if (!isPhoneNumber(phonenumber)) return response(resp, 1004);

  let account = await Account.findOne({ phoneNumber: req.query.phonenumber });
  if (account == null) {
    return response(resp, 1004);
  }
  let verifyCode = await VerifyCode.findOne({
    phoneNumber: req.query.phonenumber,
  });
  //	console.log(verifyCode);
  if (verifyCode == null) {
    // người dùng đã active
    return response(resp, 1010);
  }
  let dung = verifyCode.code.find((item) => item === req.query.code_verify);
  if (dung) {
    // đúng code_verify
    //xoa verify code
    verifyCode.deleteOne();

    // tao token
    let token = jwt.sign(
      {
        userId: account._id,
        phoneNumber: phonenumber,
      },
      process.env.TOKEN_SECRET
    );

    account.token = token;

    account.active = true;
    account.save();

    resp.json({
      code: "1000",
      message: "OK",
      data: {
        token: token,
        id: account._id,
        active: "1",
      },
    });
  } else {
    // sai code_verify
    response(resp, 9993);
  }
});

router.post("/change_password", authMdw.authToken, async (req, resp) => {
  let password = req.query.password;
  let newPassword = req.query.new_password;

  if (!password || !newPassword) return response(resp, 1002);
  // kiểm tra mật khẩu
  if (req.account.password !== password) {
    return resp.json({
      code: "1004",
      message: "Parameter value is invalid",
    });
  }

  if (!isValidPassword(newPassword)) {
    //mật khẩu mới không hợp lệ
    return resp.json({
      code: "1004",
      message: "Parameter value is invalid",
    });
  }

  // kiểm tra giống nhau
  let n = lcs(password, newPassword);
  if (n / password.length >= 0.8 || n / newPassword.length >= 0.8) {
    return resp.json({
      code: "1004",
      message: "Parameter value is invalid",
    });
  }
  req.account.password = newPassword;
  await req.account.save();
  resp.json({
    code: "1000",
    message: "OK",
  });
});

function isValidPassword(password) {
  // được phép là chữ, số, gạch dưới, độ dài từ 6 -> 30 kí tự
  const regChar = /^[\w_]{6,30}$/;
  // số điện thoại
  const regPhone = /^0\d{9}$/;
  if (!regChar.test(password)) {
    return false;
  }
  if (regPhone.test(password)) {
    return false;
  }
  return true;
}

function lcs(s1, s2) {
  let result = [];
  let firstRaw = [];
  for (let i = 0; i <= s1.length; i++) firstRaw.push(0);
  result.push(firstRaw);

  for (let i = 0; i < s2.length; i++) {
    let tmp = [];
    tmp.push(0);
    for (let j = 0; j < s1.length; j++) {
      tmp.push(s1[i] === s2[j] ? 1 + result[i][j] : 0);
    }
    result.push(tmp);
  }
  let maxLength = result[0][0];
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++)
      if (result[i][j] > maxLength) maxLength = result[i][j];
  }
  return maxLength;
}

function generateVerifyCode() {
  let num = [];
  let char = [];
  // tạo số lượng số
  let amountNum = Math.ceil(Math.random() * 5);
  // tạo số
  for (let i = 0; i < amountNum; i++) {
    num.push(Math.floor(Math.random() * 10));
  }
  // tạo chữ
  for (let i = 0; i < 6 - amountNum; i++) {
    let charCode = Math.floor(Math.random() * 26) + 97;
    char.push(String.fromCharCode(charCode));
  }
  // nhét số vào chữ
  for (let item of num) {
    let index = Math.floor(Math.random() * (char.length + 1));
    char.splice(index, 0, item);
  }
  return char.join("");
}

module.exports = router;
