const mongoose = require('mongoose');

const status = {connected: false};

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useCreateIndex: true
		});
		status.connected = true;
		console.log("ket noi csdl thanh cong");
	} catch (error) {
		console.log(error);
	}
}

module.exports.status = status;
module.exports.connectDB = connectDB;