const jwt = require("jsonwebtoken")

const secret = "xjx-anydata"
// 封装
const JWT = {
    // 生成token
    generate (value,expires) {
        // 加密数据，密钥，过期时间
        return jwt.sign(value,secret,{expiresIn: expires})
    },
    // 校验token
    verify(token){
        try {
            return jwt.verify(token,secret)
        }catch (e) {
            return false
        }
    }
}

module.exports = JWT