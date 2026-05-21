/**
 * 登录云函数
 * 获取用户 OPENID，查询数据库；若用户不存在则创建新用户记录。
 * 返回 CloudResult<UserProfile>
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return {
      success: false,
      errorCode: 'NO_OPENID',
      message: '无法获取用户身份',
    }
  }

  try {
    const result = await usersCollection.where({ openid: OPENID }).get()

    if (result.data.length > 0) {
      // 用户已存在，直接返回
      return {
        success: true,
        data: result.data[0],
      }
    }

    // 创建新用户
    const now = Date.now()
    const newUser = {
      openid: OPENID,
      nickName: '',
      avatarUrl: '',
      authorized: false,
      createdAt: now,
      updatedAt: now,
    }

    const addResult = await usersCollection.add({ data: newUser })

    return {
      success: true,
      data: {
        ...newUser,
        _id: addResult._id,
      },
    }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message || '服务异常，请稍后重试',
    }
  }
}
