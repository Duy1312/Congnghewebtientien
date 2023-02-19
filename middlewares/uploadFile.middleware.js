const multer = require('multer');

function fileFilter(req, file, cb){
	// console.log(file);
	if(file.mimetype.startsWith("image") || file.mimetype.startsWith("video")){
		return cb(null, true);
	}
	let error = new Error("Wrong type file");
	error.code = 'WRONG_TYPE_FILE';
	cb(error, false);
}

module.exports = (req, resp, next) => {
	const upload = multer( {fileFilter: fileFilter} )
		.fields([
			{name: 'image', maxCount: 4},
			{name: 'video', maxCount: 1}
		]);
	upload(req, resp, (error) => {
		if(error){
			console.log(error);
			if(error.code === 'LIMIT_UNEXPECTED_FILE'){
				// vượt quá 4 ảnh
				return resp.json({
					code: '1008',
					message: "Maximum number of images"
				});
			}
			if(error.code === 'WRONG_TYPE_FILE') {
				return resp.json({
					code: '1003',
					message: "Parameter type is invalid"
				});
			}
			resp.json({
				code: '1007',
				message: "Upload file failed"
			});
		}else{
			next();
		}
	})
}
