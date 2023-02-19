const express = require("express");
const app = express();
const PORT = process.env.PORT || 8888;

// var bodyParser = require('body-parser')
// // parse application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ extended: false }))
// // parse application/json
// app.use(bodyParser.json())

//load biến môi trường từ file .env
require("dotenv").config();

//connect db
const { connectDB } = require("./db.js");
connectDB();

// middlewares
const authMdw = require("./middlewares/auth.middleware");
const checkDBConnection = require("./middlewares/checkDBConnection.middleware");

// controllers
const accountController = require("./controllers/account.controller");
const postController = require("./controllers/post.controller");
const friendController = require("./controllers/friend.controller");
const searchController = require("./controllers/search.controller");
const pushController = require("./controllers/push.controller");
const commentController = require("./controllers/comment.controller");
const videoController = require("./controllers/video.controller");
const userController = require("./controllers/user.controller");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/it4895q", checkDBConnection);
app.use("/it4895q", accountController);
app.use("/it4895q", userController);
app.use("/it4895q", postController);

app.use("/it4895q", authMdw.authToken);

app.use("/it4895q", pushController);
app.use("/it4895q", friendController);
app.use("/it4895q", commentController);
app.use("/it4895q", searchController);
app.use("/it4895q", videoController);

app.get("/", (req, resp) => {
  resp.send("Hello World");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
