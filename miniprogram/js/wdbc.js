const db = wx.cloud.database({
  env: 'music4-ca0b64' // 填写环境ID
})

const MAX_LIMIT = 20

function getMusicList(successCallback, failCallback)
{
  let musics = db.collection('musics').get({
    success: successCallback,
    fail: failCallback
  })
}

module.exports = {
  getMusicList: getMusicList
}