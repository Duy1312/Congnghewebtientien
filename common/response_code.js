const resCode = new Map();

resCode.set(1000, {code: "1000", message: "OK"});
resCode.set(1001, {code: "1001", message: "Can not connect to DB"});
resCode.set(1002, {code: "1002", message: "Parameter is not enough"});
resCode.set(1003, {code: "1003", message: "Parameter type is invalid"});
resCode.set(1004, {code: "1004", message: "Parameter value is invalid"});
resCode.set(1005, {code: "1005", message: "Unknown error"});
resCode.set(1006, {code: "1006", message: "File size is too big"});
resCode.set(1007, {code: "1007", message: "Update file failed"});
resCode.set(1008, {code: "1008", message: "Maximum number of images"});
resCode.set(1009, {code: "1009", message: "Not access"});
resCode.set(1010, {code: "1010", message: "Action has been done previously by this user"});
resCode.set(1011, {code: "1011", message: "Could not publish this post"});
resCode.set(1012, {code: "1012", message: "Limited access"});
resCode.set(9992, {code: "9992", message: "Post is not existed"});
resCode.set(9993, {code: "9993", message: "Code verify is incorrect"});
resCode.set(9994, {code: "9994", message: "No data or end of list data"});
resCode.set(9995, {code: "9995", message: "User is not validated"});
resCode.set(9996, {code: "9996", message: "User existed"});
resCode.set(9997, {code: "9997", message: "Method is invalid"});
resCode.set(9998, {code: "9998", message: "Token is invalid"});
resCode.set(9999, {code: "9999", message: "Exception error"});

const response = (res, code) => {
	if(resCode.has(code)) return res.json(resCode.get(code));
}


module.exports.response = response;
module.exports.resCode = resCode;