const musicServerUrl = 'http://106.12.221.248:5280/'
const lrcServerUrl = 'https://6d75-music4-ca0b64-1258169457.tcb.qcloud.la/'

function showToast(msg){
  wx.showToast({
    title: msg,
    icon: 'none',
    duration: 2000
  })
}

module.exports = {
  showToast: showToast,
  musicServerUrl: musicServerUrl,
  lrcServerUrl: lrcServerUrl
}