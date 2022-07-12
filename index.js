const express = require("express")
const app = express()
const JWT = require('./utils/JWT')
// app.use(express.urlencoded({extended:false}))
// 导入MySQL模块
const mysql = require('mysql')
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '5000mb'}));
app.use(bodyParser.urlencoded({limit: '5000mb', extended: true}));
app.use(express.json())
const db = mysql.createPool({
    host: '127.0.0.1', // 数据库的IP地址
    user: 'root', // 登录数据库的账号
    password: 'root', // 登录数据库的密码
    database: 'meituan' // 指定要操作哪个数据库
})
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', ['Authorization', 'Content-Type']);
    res.header('Content-Type',  "multipart/form-data");
    next();
});

// 登录
app.post('/login', (req, response) => {
    // 查询数据
    // console.log(req.body)
    const { username, password } = req.body
    db.query(`select * from user where username = '${username}'`, (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        console.log(res)
        // 如果长度为0，代表没查询到
        if (res.length === 0) {
            response.status(422).send({ errors: '账号未注册' })
        } else {
            // 查询到后在判断密码是否正确
            if (password === res[0].password) {
                // 给用户设置一个token传回去
                const token = JWT.generate({ username, password }, '6666h')
                response.send({ ok: 1, token })
            } else {
                response.status(422).send({ errors: '密码不正确' })
            }
        }
    })
})
// 注册
app.post('/register', (req, response) => {
    // 查询数据
    // console.log(req.body)
    const { username, password } = req.body
    const sqlStr = 'insert into user (username,password) values (?,?)'
    db.query(sqlStr, [username, password], (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        // console.log(res,123)
        if (res.affectedRows === 1) {
            console.log("插入数据成功!")
            response.send({ ok: 1 })
        }
    })
})

// 插入数据
// const user = {name: abc.name, menu: JSON.stringify(abc.menu)}
// // 2、待执行的SQL语句，其中英文的 ? 表示占位符
// const sqlStr = 'insert into menuTable (name,menu) values (?,?)'
// db.query(sqlStr, [user.name, user.menu], (err, res) => {
//     if(err) return console.log(err.message)
//     console.log(res)
//     if (res.affectedRows === 1) console.log("插入数据成功!")
// })


// 查询数据
app.get('/menuList', (req, response) => {

    // 查询数据
    db.query('select * from menuTable', (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        // console.log(res)
        // 处理一下函数后在返回
        const data = res.map(item => {
            item.menu = JSON.parse(item.menu)
            return item
        })
        response.send(data)

    })
})

// 增减商品
app.post('/menu', (req, response) => {
    // 需要返回完整菜单数据
    // console.log(req.body)
    const sqlStr = `select * from menuTable where id = ${req.body.id}`
    // 查询要修改的字段
    new Promise((resolve, reject) => {
        db.query(sqlStr, (err, res) => {
            if (err) return console.log(err.message)
            // console.log(JSON.parse(res[0].menu))
            // console.log(!res.length)
            // 如果为true代表没查询到数据 报错
            if (!res.length) {
                response.send({ ok: 0, error: '没查询到数据' })
                return reject('没查询到数据')
            }
            // 查询出来后修改个数
            const data = JSON.parse(res[0].menu).map(item => {
                if (item.id === req.body.card.id) {
                    item.count = req.body.card.count
                }
                return item
            })
            resolve(JSON.stringify(data))
        })
    }).then(arr => {
        // console.log(JSON.stringify(arr), 69)
        // console.log(value)
        const value = JSON.stringify(arr)
        // 修改数据中的数据
        db.query(`update menuTable set menu = ${value} where id = ${req.body.id}`, (err, res) => {
            if (err) return console.log(err.message)
            // 成功
            // console.log(res)
        })
        return ''
    }).then(() => {
        // 执行到这里代表已经修改完成，只要查询完整数据库 传回去即可
        db.query('select * from menuTable', (err, res) => {
            if (err) return console.log(err.message)
            // 成功
            // console.log(res)
            // 处理一下函数后在返回
            const data = res.map(item => {
                item.menu = JSON.parse(item.menu)
                return item
            })
            response.send(data)
        })
    })

})

// 清空购物车
app.delete('/reset/menu', (req, response) => {
    new Promise((resolve, reject) => {
        // 清空原表格
        db.query('truncate table menutable', (err, res) => {
            if (err) return console.log(err.message)
            // 成功
            resolve()
        })
    }).then(() => {
        // 清空完表格 初始化表格
        db.query('insert into menutable select * from menutable_init', (err, res) => {
            if (err) return console.log(err.message)
            // 查询数据
            db.query('select * from menutable', (error, value) => {
                if (error) return console.log(error.message)
                // 成功
                // 处理一下函数后在返回
                const data = value.map(item => {
                    item.menu = JSON.parse(item.menu)
                    return item
                })
                response.send(data)
            })
        })
    })
})

// 添加地址
app.post('/address', (req, response) => {
    const { token, name, phone, province, city, county, address, is_default, areaCode } = req.body
    // console.log(token,name,phone,province,city,county,address,is_default)
    const username = JWT.verify(token).username
    // 如果设置了默认地址 首先把当前用户的地址全部设置成不默认下面在一起更新
    if (is_default === 1) {
        new Promise((resolve, reject) => {
            const sqlStr = 'update address set is_default = 0 where username = ?'
            db.query(sqlStr, [username], (err, res) => {
                if (err) return console.log(err.message)
                console.log(res)
                // 成功
                if (res.affectedRows === 1) console.log('修改默认地址成功！')
            })
        })
    }
    // console.log(JWT.verify(token).username)
    const sqlStr = 'insert into address values (?,?,?,?,?,?,?,?,?,?)'
    db.query(sqlStr, [null, `${JWT.verify(token).username}`, name, phone, province, city, county, address, areaCode, is_default], (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        if (res.affectedRows === 1) console.log('插入数据成功！')
    })

    response.send({ ok: 1 })
})

// 获取地址列表
app.get('/address', (req, response) => {
    // console.log(req.query.token)
    // 拿到token 根据用户的信息拿到他的收货地址
    const username = JWT.verify(req.query.token).username
    // 查询数据
    const sqlStr = 'select id,name,phone,province,city,county,address,is_default from address where username = ?'
    db.query(sqlStr, [username], (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        // console.log(res)
        // 处理一下函数后在返回
        // const data = res.map(item => {
        //     item.menu = JSON.parse(item.menu)
        //     return item
        // })
        response.send(res)
    })
    // response.send()
})

// 获取地址编码
app.get('/address/areaCode', (req, response) => {
    // console.log(req.query.token)
    // 拿到token 根据用户的信息拿到他的收货地址
    // const username = JWT.verify(req.query.token).username
    const code = req.query.id * 1
    // console.log(req.query.id)
    // console.log(Object.prototype.toString.call(code))
    // 查询数据
    // const sqlStr = 'select id,name,phone,province,city,county,address,areaCode,is_default from address where id = ?'
    const sqlStr = 'select *  from address where id = ?'
    db.query(sqlStr, [code], (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        // 处理一下函数后在返回
        const data = res.map(item => {
            delete item.username
            return item
        })
        response.send(data)
    })
})

// 删除地址
app.delete('/address', (req, response) => {
    // console.log(req.query.id)
    const id = req.query.id * 1
    // console.log(Object.prototype.toString.call(id))
    // 查询数据
    const sqlStr = 'delete from address where id = ?'
    db.query(sqlStr, [id], (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        response.send({ ok: 1, res })
    })
})

// 修改地址
app.post('/addressEdit', (req, response) => {
    // console.log(req.query.id)
    const { token, name, phone, province, city, county, address, is_default, areaCode, id } = req.body
    // console.log(req.body)
    // console.log(Object.prototype.toString.call(id))
    // 查询数据
    const sqlStr = 'UPDATE address SET name = ? ,phone = ?,province = ?,city = ? ,county = ? ,address = ?,areaCode = ?,is_default = ? where id = ? '
    // 如果设置了默认地址，首先把全部地址设置成0 下面在单独设置为1
    if (is_default === 1) {
        new Promise((resolve, reject) => {
            const username = JWT.verify(token).username
            const sqlStr = 'update address set is_default = 0 where username = ?'
            db.query(sqlStr, [username], (err, res) => {
                if (err) return console.log(err.message)
                console.log(res)
                // 成功
                if (res.affectedRows === 1) console.log('修改默认地址成功！')
            })
        })
    }
    db.query(sqlStr, [name, phone, province, city, county, address, areaCode, is_default, id], (err, res) => {
        if (err) return console.log(err.message)
        // 成功
        if (res.affectedRows === 1) {
            response.send({ ok: 1, res })
        }
    })
})

// 提交订单 创建订单
app.post('/orders', (req, response) => {
    // const {} = req.body
    // console.log()
    const token = req.headers.authorization.split(' ')[1];
    const { totalAmount, address, goods, remark } = req.body
    console.log(totalAmount, address, JSON.stringify(goods), remark)
    const username = JWT.verify(token).username
    console.log(username)
    // // 如果设置了默认地址 首先把当前用户的地址全部设置成不默认下面在一起更新
    new Promise((resolve, reject) => {
        // 随机数创建一个10位数订单号
        let order_number = ''
        for (let i = 0; i < 10; i++) {
            order_number += String(Math.floor(Math.random() * 10))
        }
        // 当前提交时间
        let d = new Date()
        let create_time = `${d.getFullYear()}-${(d.getMonth() + 1)}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
        resolve({ order_number, create_time })
    }).then(payload => {
        const sqlStr = 'insert into orders values (?,?,?,?,?,?,?,?,?,?,?,?)'
        // const sqlStr = `insert into orders values (null,${payload.order_number}, username, goods, totalAmount, null,address,null,null, ${payload.create_time},null,remark)`

        // db.query(sqlStr, [null, payload.order_number, username, JSON.stringify(goods), totalAmount, null, JSON.stringify(address), null, null, payload.create_time, null, remark], (err, res) => {
        db.query(sqlStr, [null, payload.order_number, username, goods, totalAmount, 0, address, null, 0, payload.create_time, null, remark], (err, res) => {
            if (err) return console.log(err.message)
            // console.log(res)
            // 返回 订单编号
            response.send({ order_no: payload.order_number })

            // 成功
            if (res.affectedRows === 1) console.log('提交订单成功！')
        })
    })
})

// 订单是否支付
app.post('/ordersPay', (req, response) => {
    const { order_no } = req.body
    // console.log(order_no,req.body)
    const sqlStr = 'update orders set status = 1 where order_no = ?'
    // 查询要修改的字段
        db.query(sqlStr,[order_no], (err, res) => {
            if (err) return console.log(err.message)
            console.log(res)
            response.send({ok:1,orders:'已支付',res})
        })
})

// 查询订单
app.get('/ordersInfo', (req, response) => {
    // console.log(req.query)
    const { order_no } = req.query

    const sqlStr = 'select *  from  orders  where order_no = ? '
    // 查询要修改的字段
    db.query(sqlStr,[order_no], (err, res) => {
        if (err) return console.log(err.message)
        const data = res.map(item => {
            delete item.username
            return item
        })
        response.send({ok:1,data})
    })

})
// 获取订单
app.get('/ordersList', (req, response) => {
    // console.log(req.query,321)
    const { status ,is_comment} = req.query
    const token = req.headers.authorization.split(' ')[1];
    const username = JWT.verify(token).username
    // 3 代表查询所有订单
    if (status == 3){
        const sqlStr = 'select *  from orders  where username = ? order by id desc'
        // 查询要修改的字段
        db.query(sqlStr,[username], (err, res) => {
            if (err) return console.log(err.message)
            const data = res.map(item => {
                delete item.username
                item.address = JSON.parse(item.address)
                item.goods = JSON.parse(item.goods)
                return item
            })
            response.send({ok:1,data})
        })
    }else if (status != -1){
        const sqlStr = 'select *  from orders  where username = ? and status = ? order by id desc'
        // 查询要修改的字段 0代表未支付  1代表已支付已送出  2代表已完成
        db.query(sqlStr,[username,status], (err, res) => {
            if (err) return console.log(err.message)
            const data = res.map(item => {
                delete item.username
                item.address = JSON.parse(item.address)
                item.goods = JSON.parse(item.goods)
                return item
            })
            response.send({ok:1,data})
        })
    }else if (is_comment){
        // 待评价
        const sqlStr = 'select *  from orders  where username = ? and status = 2 and is_comment = 0 order by id desc'
        // 查询要修改的字段  1代表已支付已送出  2代表已完成
        db.query(sqlStr,[username], (err, res) => {
            if (err) return console.log(err.message)
            const data = res.map(item => {
                delete item.username
                item.address = JSON.parse(item.address)
                item.goods = JSON.parse(item.goods)
                return item
            })
            response.send({ok:1,data})
        })
    }


})

// 修改订单状态
app.post('/ordersStatus', (req, response) => {
    // console.log(req.query,321)
    const { order_no} = req.body
    // console.log(order_no)
    const sqlStr = 'UPDATE orders SET status = 2 where order_no = ? '
    // 查询要修改的字段
        db.query(sqlStr,[order_no], (err, res) => {
            if (err) return console.log(err.message)

            response.send({ok:1,res})
        })

})

// 提交评价
app.post('/ordersComment' ,(req, response) => {
    // console.log(req.query,321)
    const { state ,order_no} = req.body
    // console.log(req.body)
    // console.log(state)
    // console.log(order_no)
    // 把is_comment 修改成 1
    const sqlStr = 'UPDATE orders SET is_comment = 1 , comment = ? where order_no = ? '
    // // 查询要修改的字段
    db.query(sqlStr,[state,order_no], (err, res) => {
        if (err) return console.log(err.message)

        response.send({ok:1,res})
    })
    // response.send({ok:1})

})

// 获取评论列表
app.get('/commentList' ,(req, response) => {
    const sqlStr = 'select username,comment,create_time from orders where is_comment = 1'
    // // 查询要修改的字段
    db.query(sqlStr, (err, res) => {
        if (err) return console.log(err.message)
        response.send({ok:1,res})
    })

})

app.listen(3001, () => {
    console.log("server start")
})