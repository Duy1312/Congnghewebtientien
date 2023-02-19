const multer = require('multer');

function fileFilter(req, file, cb){
	if(file.mimetype.startsWith("image")){
		return cb(null, true);
	}
	let error = new Error("Wrong type file");
	error.code = 'WRONG_TYPE_FILE';
	cb(error, false);
}

module.exports = (req, resp, next) => {
	const upload = multer( {fileFilter: fileFilter} ).single('avatar');
	upload(req, resp, (error) => {
		if(error){
			console.log(error);
			if(error.code === 'WRONG_TYPE_FILE') {
				return resp.json({
					code: "1004",
					message: "Parameter type is invalid."
				});
			}
			resp.json({
				code: "1007",
				message: "Upload file failed."
			});
		}else{
			next();
		}
	})
}
