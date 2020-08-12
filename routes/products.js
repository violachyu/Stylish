const express = require("express");
const productsRouter = express.Router();

const bodyParser = require('body-parser');
const funcPack = require('./function.js');
require('dotenv').config();

productsRouter.use(bodyParser.urlencoded({ extended: true }));
productsRouter.use(bodyParser.json());

/*---DB connection---*/
const { query } = require('../con');

/*---AWS S3---*/
const multer = require('multer'); //在 Node.js 引入 Multer //multer的作用範圍？只有在文件內
const aws = require('aws-sdk')
const multerS3 = require('multer-s3')
var s3 = new aws.S3({ apiVersion: '2006-03-01' })

const productsUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'stylishers3',
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString())
        }
    })
})

// var myBucket = 'stylishers3';
// var myKey = process.env.AWS_ACCESS_KEY_ID;
// s3.createBucket({ Bucket: myBucket }, function (err, data) {
//     if (err) { console.log(err); } else {
//         params = { Bucket: myBucket, Key: myKey, Body: 'Hello!' };
//         s3.putObject(params, function (err, data) {
//             if (err) { console.log(err) } else {
//                 console.log("Successfully uploaded data to myBucket/myKey");
//             }
//         });
//     }
// });


/*---Backend---*/
let productColumn = ["id", "title", "description", "price", "texture", "wash", "place", "note", "story", "main_image", "category"];
productsRouter.post('/api/1.0/admin/product', productsUpload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'otherImages', maxCount: 8 }]), (req, res) => {

    /*--- Insert into product table ---*/
    let sql = `INSERT INTO products(${productColumn}) VALUES ?`;
    let values = [
        [req.body.id, req.body.title, req.body.description, req.body.price, req.body.texture, req.body.wash, req.body.place, req.body.note, req.body.story, req.files.mainImage[0].filename, req.body.category]
    ];
    query(sql, [values], (err, result, fields) => {
        if (err) throw err;
        console.log(result);

        /*--- Manipulating "Size"---*/
        // 1. retrieve p_id, s_name from req.body
        // 2. convert s_name to s_id
        // 3. 排列組合 p_id, size_id
        // 4. insert data to table
        let sizeSql = `SELECT * FROM size`;
        query(sizeSql, (err, result, fields) => {
            if (err) throw err;
            let sizeMap = funcPack.sizeResult(result)
            let size_id_list = funcPack.get_size_ids(req.body.sizes, sizeMap);   //convert size_name to size_id [1,2,3]
            let psTable_list = funcPack.generate_product_size(req.body.id, size_id_list); //排列組合
            // insert data to product_size table
            let psSql = `INSERT INTO product_size(p_id, size_id) VALUES ?`
            query(psSql, [psTable_list], (err, result, fields) => {
                if (err) throw err;

                /*---Manipulating "Color"---*/
                // 1. Retrieve p_id, color_name from req.body
                // 2. convert c_name to c_id {white:1, pink:2...}
                // 3. 排列組合 p_id, c_id
                // 4. insert data to table
                let colorSql = `SELECT id, name FROM color `;
                query(colorSql, (err, result, fields) => {
                    if (err) throw err;
                    // colorResult = mapping 
                    let colorMap = funcPack.colorResult(result);
                    let color_id_list = funcPack.get_size_ids(req.body.name, colorMap);   //convert color_name to color_id [1,2,3]
                    let pcTable_list = funcPack.generate_product_size(req.body.id, color_id_list); //排列組合 [[1,1],[1,2],[1,3]]
                    // insert data to product_color table
                    let pcSql = `INSERT INTO product_color(p_id, color_id) VALUES ?`
                    query(pcSql, [pcTable_list], (err, result, fields) => {
                        if (err) throw err;

                        /*---Manipulating "Variant"---*/
                        // 1. Retrieve p_id, color_id, size_id from above(size/color manipulation program)
                        // 2. 排列組合 p_id, s_id, c_id
                        // 3. insert data to table
                        let varSql = `INSERT INTO product_variant(p_id, size_id, color_id, stock) VALUES ?`
                        let pvTable_list = funcPack.generate_product_variant(req.body.id, size_id_list, color_id_list, 20)    //[[1,1,1],[1,1,2],[1,1,3]...]
                        query(varSql, [pvTable_list], (err, result, fields) => {
                            if (err) throw err;


                            /*---Manipulating Image---*/
                            // 1. get other image from req.files
                            // 2. split multiple images
                            // 3. insert image into DB

                            let imgSql = `INSERT INTO image(p_id, other_image) VALUES ?`
                            let splitImg = funcPack.generate_product_img(req.body.id, funcPack.split_otherImages(req.files)); //排列組合p_id以及multiple other_image
                            query(imgSql, [splitImg], (err, result, fields) => {
                                if (err) throw err;
                                res.send("Product Info Insert Complete!");
                            })
                        });
                    });
                });
            });
        });
    });
})

productsRouter.get('/api/1.0/products/:pageName', (req, res) => {
    //Generate sizeMap
    let sizeMap_Sql = `SELECT * FROM size`;
    query(sizeMap_Sql, (err, result, fields) => {
        if (err) throw err;
        let sizeMap = funcPack.sizeResult(result);   //sizeMap = {S:1, M:2, ...}
        //Generate colorMap
        let colorSql = `SELECT id, name FROM color `;
        query(colorSql, (err, result, fields) => {
            if (err) throw err;
            let colorMap = funcPack.colorResult(result); //colorMap = {white:1, pink:2, ...}
            //Generate colorTemplate
            let colorTemplate_Sql = `SELECT * FROM color`
            query(colorTemplate_Sql, (err, result, fields) => {
                if (err) throw err;
                let colorTemplate = result;

                /*---Paging---*/
                // Get product count
                let paging_number = parseInt(req.query.paging);
                if (!paging_number) {
                    paging_number = 0;
                }
                let start = paging_number * 6
                let end = paging_number * 6 + 6
                let count_Sql = '';
                let productSql = '';

                /*---Product Search---*/
                let pageName = req.params.pageName;
                let keyword = req.query.keyword;
                let id = req.query.id;

                if (pageName == 'all') {
                    count_Sql = `SELECT COUNT(DISTINCT id) FROM products`;
                    productSql = `SELECT * FROM products LIMIT ${start}, ${end}`;
                } else if (pageName == 'women') {
                    count_Sql = `SELECT COUNT(DISTINCT id) FROM products WHERE category = 'women'`;
                    productSql = `SELECT * FROM products WHERE category = 'women' LIMIT ${start}, ${end}`;
                } else if (pageName == 'men') {
                    count_Sql = `SELECT COUNT(DISTINCT id) FROM products WHERE category = 'men'`;
                    productSql = `SELECT * FROM products WHERE category = 'men' LIMIT ${start}, ${end}`;
                } else if (pageName == 'accessories') {
                    count_Sql = `SELECT COUNT(DISTINCT id) FROM products WHERE category = 'accessories'`;
                    productSql = `SELECT * FROM products WHERE category = 'accessories' LIMIT ${start}, ${end}`;
                } else if (pageName == 'search') {
                    count_Sql = `SELECT COUNT(DISTINCT id) FROM products WHERE title LIKE '%${keyword}%';`;
                    productSql = `SELECT * FROM products WHERE title LIKE '%${keyword}%'`
                } else if (pageName == 'details') {
                    count_Sql = `SELECT COUNT(DISTINCT id) FROM products WHERE id = ${id};`;
                    productSql = `SELECT * FROM products WHERE id = ${id}`
                }

                query(count_Sql, (err, result, fields) => {
                    if (err) throw err;
                    let count = result[0]['COUNT(DISTINCT id)']

                    //Get productData
                    query(productSql, (err, result, fields) => {
                        if (err) throw err;
                        let productData = result;
                        //Get sizeData
                        let sizeSql = `SELECT *  FROM product_size`
                        query(sizeSql, (err, result, fields) => {
                            if (err) throw err;
                            let sizeData = result;
                            //Get colorData
                            let colorSql = `SELECT * FROM product_color`
                            query(colorSql, (err, result, fields) => {
                                if (err) throw err;
                                let colorData = result;
                                //Get variantData
                                let variantSql = `SELECT * FROM product_variant`
                                query(variantSql, (err, result, fields) => {
                                    if (err) throw err;
                                    let variantData = result;
                                    //Get imageData
                                    let imageSql = `SELECT * FROM image`
                                    query(imageSql, (err, result, fields) => {
                                        if (err) throw err;
                                        let imageData = result;
                                        let reformed_Obj = funcPack.reform_response_object(productData, sizeData, sizeMap, colorData, colorMap, colorTemplate, variantData, imageData);

                                        /*---NextPaging---*/
                                        // Get limited row data
                                        let limitation = Math.floor(count / 6);
                                        let nextpaging = paging_number + 1;
                                        if (paging_number < limitation) {
                                            reformed_Obj['next_paging'] = nextpaging;
                                        }
                                        /*---Send Response Area---*/
                                        if (reformed_Obj['data'].length == 1) {
                                            reformed_Obj['data'] = reformed_Obj.data[0]
                                        }
                                        res.send(reformed_Obj);

                                    });
                                });
                            });
                        });
                    });
                })
            })
        })
    })
})


module.exports = productsRouter;