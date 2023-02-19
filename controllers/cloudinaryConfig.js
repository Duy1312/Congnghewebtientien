const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

module.exports.uploads = (file) => {
  return new Promise((resolve, reject) => {
    let folder = "it4895q/" + file.fieldname + "s";

    let stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (err, result) => {
        //				console.log(result);
        if (result) {
          resolve({
            url: result.url,
            publicId: result.public_id,
          });
        } else {
          reject(err);
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

module.exports.remove = (publicId) => {
  try {
    cloudinary.uploader.destroy(publicId, (result) => {
      // console.log(result);
      console.log("remove successed");
    });
  } catch (err) {
    console.log(err);
  }
};
