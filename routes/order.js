const express = require("express");
const orderRouter = express.Router();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

/*---Body Parser---*/
orderRouter.use(bodyParser.urlencoded({ extended: true }));
orderRouter.use(bodyParser.json());

/*---DB connection---*/
const { query } = require('../con');


let orderDetails = {
    shipping: "delivery",
    payment: "credit_card",
    subtotal: 1234,
    freight: 14,
    total: 1300,
    recipient: {
        name: "Luke",
        phone: "0987654321",
        email: "luke@gmail.com",
        address: "市政府站",
        time: "morning"
    }
}

orderRouter.post('/api/1.0/order/checkout', (req, res) => {
    let orderCol = ['prime', 'time', 'status', 'details', 'user_id', 'name', 'price', 'color', 'size', 'qty']
    let orderInsert_Sql = `INSERT INTO checkout (${orderCol}) VALUES ?`
    // let fakePrime = Math.floor(100000 + Math.random() * 900000);
    let prime = req.body.prime;
    let time = Date.now();
    let orderValues = [
        [prime, time, "-1", JSON.stringify(orderDetails), "201807202157", req.body.name, req.body.price, req.body.color, req.body.size, req.body.qty]
    ]
    query(orderInsert_Sql, [orderValues], (err, result, fields) => {
        if (err) throw err;
        let orderData_Sql = `SELECT * FROM checkout WHERE prime = '${req.body.prime}'`;
        query(orderData_Sql, (err, result, fields) => {
            if (err) throw err;
            // reform order data
            let orderData_all = {
                prime: result[0].prime,
                order: result[0].details,
                list: [
                    {
                        id: result[0].id,
                        name: result[0].name,
                        price: result[0].price,
                        color: result[0].color,
                        size: result[0].size,
                        qty: result[0].qty
                    }
                ]
            }
            res.send(orderData_all);


            // Check if prime works
            let prime_check_init = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG'
                },
                body: JSON.stringify({
                    "prime": result[0].prime,
                    "partner_key": 'partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG',
                    "merchant_id": "AppWorksSchool_CTBC",
                    "details": "TapPay Test",
                    "amount": result[0].price,
                    "cardholder": {
                        "phone_number": "+886923456789",
                        "name": "Jane Doe",
                        "email": "Jane@Doe.com",
                        "zip_code": "12345",
                        "address": "123 1st Avenue, City, Country",
                        "national_id": "A123456789"
                    },
                    "remember": true
                })
            }
            fetch('https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime', prime_check_init)
                .then((res) => {
                    return res.json();
                })
                .then((res) => {
                    console.log('check_prime_msg: ', res);  //
                    let prime_status_Sql = `UPDATE checkout SET status=0 WHERE prime='${req.body.prime}'`
                    con.query(prime_status_Sql, (err, result, fields) => {
                        if (err) throw err;
                        console.log('Prime status update success!');
                    })
                })
        })
    })
})

orderRouter.get('/api/1.0/order/payments', (req, res) => {
    let paymentSql = `SELECT user_id, price FROM checkout`;
    query(paymentSql, (err, result, fields) => {
        let user_price = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        for (let i = 0; i < result.length; i++) {
            let item_price = parseInt(result[i].price);
            user_price[result[i].user_id] += item_price;
        }
        let keys = Object.keys(user_price);
        let values = Object.values(user_price);
        let data = []
        for (let j = 0; j < keys.length; j++) {
            let data_item = {}
            data_item['user_id'] = keys[j]
            data_item['total_price'] = values[j];
            data.push(data_item);
        }
        res.json(data);
    })
})

orderRouter.get('api/1.0/checkout_count'), (req, res) => {
    let checkout_count_Sql = `SELECT COUNT(*) FROM checkout`;
    query(checkout_count_Sql, (err, result, fields) => {
        res.send(result[0]['COUNT(*)']);
    })
}



module.exports = orderRouter;