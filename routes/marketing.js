const express = require("express");
const marketingRouter = express.Router();
const multer = require('multer');
const path = require('path');
const marketingUpload = multer({ dest: 'marketing_upload/' });
// const bodyParser = require('body-parser');

// marketingRouter.use(bodyParser.urlencoded({ extended: true }));
// marketingRouter.use(bodyParser.json());

/*---DB connection---*/
const { query } = require('../con');


/*---Backend---*/
// Insert camapign details to DB
marketingRouter.post('/marketing_success', marketingUpload.single('camp_picture'), (req, res) => {
    let campaignSql = `INSERT INTO campaign(product_id, picture, story) VALUES ?`
    let values = [[req.body.camp_id, req.file.filename, req.body.camp_story]];
    query(campaignSql, [values], (err, result, fields) => {
        console.log("req.file", req.file);
        if (err) throw err;
        res.send("Campaign Insert Complete!");
    })
});
// Generate campaign details
marketingRouter.get('/api/1.0/marketing/:id', (req, res) => {
    let id = req.params.id
    if (id == 'campaigns') {
        let showCampaign = `SELECT * FROM campaign`;
        query(showCampaign, (err, result, fields) => {
            function reform_campaign(rawData) {
                let campaignObject = {};
                for (let i = 0; i < rawData.length; i++) {
                    rawData[i]['picture'] = `https://localhost:3000/${rawData[i]['picture']}`
                    campaignObject['data'] = rawData;
                }
                return campaignObject;
            }
            res.send(reform_campaign(result));
        })
    } else if (id == 'hots') {

    }
})



module.exports = marketingRouter;