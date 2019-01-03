// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database()

const MAX_LIMIT = 100

// 云函数入口函数
exports.main = async (event, context) => {
  const countResult = await db.collection('musics').count()
  const total = countResult.total

  const batchTimes = Math.ceil(total / 20)

  const tasks  = []
  for (let i = 0; i < batchTimes; i++) {
    const promise = db.collection('musics').skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
    tasks .push(promise)
  }

  return (await Promise.all(tasks )).reduce((acc, cur) => ({
    data: acc.data.concat(cur.data),
    errMsg: acc.errMsg,
  }))
}