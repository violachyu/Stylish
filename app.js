const express = require("express");
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const njwt = require('njwt');
const fetch = require('node-fetch');
app.use(express.static('products_upload'));
app.use(express.static('marketing_upload'));
app.use('/admin', express.static(__dirname + '/public'));
app.use('/', express.static(__dirname + '/stylish_public'));
app.set('json spaces', 2);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/*---Route Managing---*/
const productRoutes = require('./routes/products.js');
const userRoutes = require('./routes/user.js');
const orderRoutes = require('./routes/order.js');
const marketingRoutes = require('./routes/marketing.js');
app.use('/', productRoutes);  //第一個變數為路徑變數
app.use('/', userRoutes);
app.use('/', orderRoutes);
app.use('/', marketingRoutes);


/*---DB connection---*/
// Use pool to reuse connections
const { query } = require('./con');

// Create Fake Data
app.get('/fake_data', (req, res) => {
    let fake_values = [];
    for (let i = 0; i < 5000; i++) {
        function getRandom(min, max) {
            return Math.floor(Math.random() * max) + min;
        };
        let id_random = getRandom(1, 5);
        let price_random = getRandom(100, 900);

        fake_values.push([id_random, price_random]);
    }

    let fake_Sql = `INSERT INTO checkout(user_id, price) VALUES ?; `
    query(fake_Sql, [fake_values], (err, result, fields) => {
        if (err) throw err;
    })

    res.send('insert fake data success!')
})


// Mid term
app.get('/api/1.0/order/data', (req, res) => {
    // console.log(req.body);
    fetch('http://arthurstylish.com:1234/api/1.0/order/data', {
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then((res) => {
            // console.log('1', res.body);
            return res.json();
        })
        .then((data) => {
            // // insert into order_data table
            // let order_data = [];
            // let order_ps = [];
            // let order_pc = [];
            // for (let i = 0; i < 1; i++) {
            //     for (let j = 0; j < data[i].list.length; j++) {
            //         let order_item = [];
            //         let order_ps_item = [];
            //         let order_pc_item = [];

            //         let order_item_order_id = i;
            //         let order_item_id = data[i].list[j].id
            //         let order_item_price = data[i].list[j].price
            //         let order_item_qty = data[i].list[j].qty
            //         let order_item_total = parseInt(order_item_price * order_item_qty);
            //         let order_ps_size = data[i].list[j].size
            //         let order_pc_color = data[i].list[j].color.name

            //         order_ps_item.push(order_item_id, order_ps_size, order_item_qty);
            //         order_pc_item.push(order_item_id, order_pc_color, order_item_qty);
            //         order_item.push(order_item_order_id, order_item_id, order_item_price, order_item_qty, order_item_total);

            //         order_data.push(order_item);
            //         order_ps.push(order_ps_item);
            //         order_pc.push(order_pc_item);
            //     }
            // }
            // let order_data_sql = `INSERT INTO order_data(order_id, product_id, price, qty, total) VALUES ?`
            // let order_ps_sql = `INSERT INTO order_ps(p_id, size, qty) VALUES ?`
            // let order_pc_sql = `INSERT INTO order_pc(p_id, color, qty) VALUES ?`

            let get_product_sql = `SELECT price, sum(qty) AS qty_per_price FROM order_data GROUP BY product_id`
            let get_total = `SELECT SUM(qty) AS qty_all, SUM(total) AS rev_all FROM order_data`
            let get_size_sql = `SELECT p_id, size, SUM(qty) AS qty_per_size FROM order_ps group by size, p_id ORDER BY qty_per_size DESC;`
            let get_pie_sql = `SELECT color, SUM(qty) AS qty_per_color FROM order_pc GROUP BY color`
            // query(order_data_sql, [order_data], (err, result, fields) => {
            //     if (err) throw err;
            //     query(order_ps_sql, [order_ps], (err, result, fields) => {
            //         if (err) throw err;
            //         query(order_pc_sql, [order_pc], (err, result, fields) => {
            //             if (err) throw err;

            // get data
            query(get_product_sql, (err, result, fields) => {
                let product_price = result;
                let qty_per_price = []
                for (let p = 0; p < product_price.length; p++) {
                    qty_per_price.push(product_price[p].qty_per_price);
                }
                // console.log('product-price', qty_per_price);    //
                query(get_total, (err, result, fields) => {
                    if (err) throw err;
                    let total_qty = result[0].qty_all
                    let total_rev = result[0].rev_all;
                    // console.log('total', total_qty);   // [{qty_all: 550, rev_all: 55819}]

                    query(get_size_sql, (err, result, fields) => {
                        if (err) throw err;
                        let size_data = result;
                        for (let n = 0; n < size_data.length; n++) {

                        }
                        let sizeS_x = [];
                        // let sizeS_x_final;
                        let sizeS_y = [];
                        let sizeM_x = [];
                        // let sizeM_x_final;
                        let sizeM_y = [];
                        let sizeL_x = [];
                        // let sizeL_x_final;
                        let sizeL_y = [];
                        // console.log('size', size_data); //
                        for (let m = 0; m < size_data.length; m++) {
                            if (size_data[m].size == 'S') {
                                sizeS_x.push(`product${size_data[m].p_id}`)
                                // sizeS_x_final = sizeS_x.slice(0, 5)
                                sizeS_y.push(size_data[m].qty_per_size)
                            } else if (size_data[m].size == 'M') {
                                sizeM_x.push(`product${size_data[m].p_id}`)
                                // sizeM_x_final = sizeM_x.slice(0, 5)
                                sizeM_y.push(size_data[m].qty_per_size)
                            } else if (size_data[m].size == 'L') {
                                sizeL_x.push(`product${size_data[m].p_id}`)
                                // sizeL_x_final = sizeL_x.slice(0, 5)
                                sizeL_y.push(size_data[m].qty_per_size)
                            }
                        }



                        query(get_pie_sql, (err, result, fields) => {
                            if (err) throw err;
                            let pie_raw = result;
                            let pie_data_color = [];
                            let pie_data_value = [];
                            for (let k = 0; k < pie_raw.length; k++) {
                                pie_data_color.push(pie_raw[k].color);
                                // console.log(pie_raw[k].qty_per_color / total_qty)   //
                                pie_data_value.push(Math.floor(pie_raw[k].qty_per_color / total_qty * 100));
                            }
                            // console.log('pie_color_value', pie_data_color, pie_data_value);   //

                            res.json({ total_rev, qty_per_price, sizeS_x, sizeS_y, sizeM_x, sizeM_y, sizeL_x, sizeL_y, pie_data_color, pie_data_value });
                            // product-price [ RowDataPacket { product_id: '5', 'sum(qty)': 9 } ]
                            // total [ RowDataPacket { 'SUM(total)': 4797 } ]
                            // size [ RowDataPacket { size: 'L', qty_per_size: 664 } ]
                            // pie [ RowDataPacket { color: 'Fuchsia', qty_per_color: 616 } ]
                        })
                        //         })
                        //     })
                        // })
                    })
                })
            })

        })
})



app.listen(3000, () => {
    console.log("appAWS is running!");
})

// app.use(express.static('public'));

module.exports = app;




