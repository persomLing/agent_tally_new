/**
 * 保存用户授权信息云函数
 * 更新用户的 nickName、avatarUrl，并将 authorized 置为 true。
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

  const { nickName, avatarUrl } = event

  if (!nickName || !avatarUrl) {
    return {
      success: false,
      errorCode: 'AUTH_FAILED',
      message: '授权信息不完整',
    }
  }

  try {
    const now = Date.now()
    const updateData = {
      nickName,
      avatarUrl,
      authorized: true,
      firstAuthorizedAt: now,
      updatedAt: now,
    }

    await usersCollection.where({ openid: OPENID }).update({ data: updateData })

    // 查询更新后的数据
    const result = await usersCollection.where({ openid: OPENID }).get()

    if (result.data.length === 0) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        message: '用户不存在',
      }
    }

    return {
      success: true,
      data: result.data[0],
    }
  } catch (err) {
    return {
      success: false,
      errorCode: 'SERVICE_ERROR',
      message: err.message || '服务异常，请稍后重试',
    }
  }
}
