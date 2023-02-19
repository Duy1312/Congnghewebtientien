const router = require('express').Router();
const Account = require('../models/account.model');
const PushSetting = require('../models/pushsetting.model');
const Devtoken = require('../models/devtoken.model');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { count } = require('../models/account.model');
const { request } = require('express');
const Post = require('../models/post.model');


router.post('/get_list_videos', async (req, resp) => {
    let token = req.params.token;
    let user_id = req.params.user_id;
    let inCampaign = req.params.campaign_id;
    let latitude = req.params.latitude;
    let longitude = req.params.longitude;
    let last_id = req.params.last_id;
    let index = req.params.index;
    let count = req.params.count;
    let videoList = await Post.find({'video.url':{ $nin: [ null, "" ] }});
    let postData = videoList.map((post) => {
        return {
            id: post._id,
            name: null,
            video: {
                url: post.video.url, 
                thumb: null,
            },
            described: post.described,
            created: post.createdTime,
            like: post.userLike_id.length,
            comment: "",
            is_liked: "",
            is_blocked: "",
            can_comment: post.canComment,
            can_edit: post.canEdit,
            banned: post.banned,
            state: post.status,
            author: {
                id: post.account_id,
                username: "",
                avatar: "",
            }
        }
    });

    console.log(videoList);
    resp.json({
        code: '1000',
        message: 'OK',
        data: {
            post: postData,
            new_items: null,
            last_id: null
        }
    });


});

module.exports = router;