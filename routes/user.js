/*---Express & Routes---*/
const express = require("express");
const userRouter = express.Router();

/*---other dependencies---*/
const path = require('path');
const funcPack = require('./function.js');
const request = require('request');
const fetch = require('node-fetch');

/*---hash crypto---*/
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
let signingKey = "mySecretKey";
const cookieParser = require('cookie-parser');
userRouter.use(cookieParser());

/*---body parser---*/
const bodyParser = require('body-parser');
userRouter.use(bodyParser.urlencoded({ extended: true }));
userRouter.use(bodyParser.json());

/*---DB connection---*/
const { query } = require('../con');

/*---Backend---*/
// Sign Up
userRouter.post('/api/1.0/user/signup', (req, res) => {
    // 1. hashing pwddata
    const hash = crypto.createHash('sha256');
    let pwdHash = hash.update(req.body.password).digest('hex');

    // 2. make token with email: use JWT
    // 2.1 set secret key(signing key) by random function
    const payload = { email: req.body.email }
    const expireTime = { expiresIn: 3600 }
    var signupToken = jwt.sign(payload, signingKey, expireTime);

    //3. check DB, see if email exists 
    let verifySql = `SELECT email FROM user WHERE email = '${req.body.email}'`
    query(verifySql, (err, result, fields) => {
        if (result[0] == undefined) {
            // 4. insert into
            let insert_user_dataSql = `INSERT INTO user(provider, name, email, picture, password, access_token, access_expired) VALUES ?`;
            let signup_raw = [['native', req.body.name, req.body.email, "https://schoolvoyage.ga/images/123498.png", pwdHash, signupToken, "3600"]]
            query(insert_user_dataSql, [signup_raw], (err, result, fields) => {
                if (err) throw err;
                //5. select data from Mysql & reform
                let get_user_dataSql = `SELECT * FROM user WHERE email = '${req.body.email}'`;
                query(get_user_dataSql, (err, result, fields) => {
                    let signupResult = {};
                    let userData = {};
                    let allData = {};
                    userData["id"] = result[0]['user_id']
                    userData['provider'] = result[0]['provider']
                    userData['name'] = result[0]['name']
                    userData['email'] = result[0]['email']
                    userData['picture'] = result[0]['picture']
                    allData['access_token'] = result[0]['access_token']
                    allData['access_expired'] = result[0]['access_expired']
                    allData['user'] = userData;
                    signupResult['data'] = allData;
                    res.cookie('access_token', signupToken);
                    res.status(200).redirect('/profile.html');
                });
            });
        } else {
            res.status(403).send('Someone has used this email, please try another one.')
        }
    })
})

// Sign In
userRouter.post('/api/1.0/user/signin', (req, res) => {
    if (!req.body.name) {
        // request for data from FB server
        fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${req.body.access_token}`,
            {
                method: "GET"
            })
            .then((response) => {   //把本質為promise的response變成json
                return response.json();
            })
            .then((data) => {
                // generate token from server
                let payload = { access_token: req.body.access_token }
                let expireTime = { expiresIn: 3600 }
                let FB_gen_Token = jwt.sign(payload, signingKey, expireTime)

                let insertFBdata_Sql = `INSERT INTO user(provider, name, email, picture, access_token, access_expired) VALUES ?`
                let insertFBdata = [[req.body.provider, data.name, data.email, data.picture.data.url, FB_gen_Token, "3600"]]
                con.query(insertFBdata_Sql, [insertFBdata], (err, result, fields) => {
                    if (err) throw err;
                    res.cookie('access_token', FB_gen_Token);

                    //reform data
                    let FBallData = {
                        "data": {
                            "access_token": FB_gen_Token,
                            "access_expired": 3600,
                            "user": {
                                "id": data.id,
                                "provider": "facebook",
                                "name": data.name,
                                "email": data.email,
                                "picture": data.picture.data.url
                            }
                        }
                    }
                    res.send(FBallData);
                })
            })

    } else {
        // 1. hashing pwddata
        let hash = crypto.createHash('sha256');
        let pwdHash = hash.update(req.body.password).digest('hex');

        //2. select user's info from DB
        let si_veri_Sql = `SELECT * FROM user WHERE email = '${req.body.email}'`
        query(si_veri_Sql, (err, result, fields) => {
            //3. compare frontend data with DB data
            if (result[0] == undefined) {
                res.send('Invalid Login!')
            } else {
                //4. reform & render user's info
                let signinResult = {};
                let userData = {};
                let allData = {};
                userData["id"] = result[0]['user_id']
                userData['provider'] = result[0]['provider']
                userData['name'] = result[0]['name']
                userData['email'] = result[0]['email']
                userData['picture'] = result[0]['picture']
                allData['access_token'] = result[0]['access_token']
                allData['access_expired'] = result[0]['access_expired']
                allData['user'] = userData;
                signinResult['data'] = allData;
                //5. store token in cookie
                res.cookie('access_token', result[0].access_token);
                // console.log('signin: org_cookie', res); //
                res.redirect('/profile.html');
            }
        })
    }
})

userRouter.get('/user/profile', (req, res) => {
    let profileData_Sql = `SELECT * FROM user WHERE access_token = '${req.headers.authorization}'`
    query(profileData_Sql, (err, result, fields) => {
        let profileData_all = {
            'data': {
                'id': result[0].user_id,
                'provider': result[0].provider,
                "name": result[0].name,
                "email": result[0].email,
                "picture": result[0].picture
            }
        }
        res.json(profileData_all); //用res.json來送data到前端！

    })
})


/*---Error Handling---*/


module.exports = userRouter;