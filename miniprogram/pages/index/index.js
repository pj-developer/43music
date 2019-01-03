//index.js
const app = getApp()
const common = require('../../js/common.js')
const control = require('../../js/control.js')
const audio = wx.getBackgroundAudioManager()
const screenWidth = wx.getSystemInfoSync().windowWidth

Page({
  data: {
    musicList: [],
    musicListLen: 0,
    showMscList: false,
    lyric: [],
    currentMusic: null,
    currentMusicIndex: 0,
    isPlaying: false,
    playModeIndex: 0,
    playModeImg: 'order.png',
    playModeTitle: '列表循环',
    showMscListLen: true,
    static: control.musicServerUrl,
    loadLrc: false,
    startTime: '00:00',
    endTime: '00:00',
    musicDuration: 60,
    currentSecond: 0,
    toLrcView: null,
    selectedLrcText: null,
    scrollMscTitleTimeout: null,
    cdRotateTimeout: null,
    cdRotateStep: 0,
    marqueeDistance: 0,
    maxMarqueeDistance: null,
    isBackend: false
  },

  onLoad: function() {
    let that = this
    // 歌单获取
    // control.getMusicList(that, () => {  
    //   // console.log(that.data.musicList)
    //   that.setData({
    //     musicListLen: that.data.musicList.length,
    //     currentMusic: that.data.musicList[0],
    //     currentMusicIndex: 0
    //   })
    //   // 歌词加载
    //   control.getLyric(that, () => {
    //     control.loadMusic(that, audio)
    //   })
    // })
    wx.showLoading({
      title: '加载中',
    })
    // 调用云函数获取歌单
    wx.cloud.callFunction({
      name: 'getMusicList',
      data: {},
      complete: res => {
        wx.hideLoading()
        if (res.result.errMsg == 'collection.get:ok'){
          let data = res.result.data
          that.setData({
            musicList: data,
            musicListLen: data.length,
            currentMusic: data[0],
            currentMusicIndex: 0
          })
          // 歌词加载
          control.getLyric(that, () => {
            control.loadMusic(that, audio)
          })
        }else{
          common.showToast('获取歌单失败')
          console.log(res.errMsg)
        }
      }
    })
  },
  onShow: function () { // 用户再次进入小程序页面时开启定时任务
    let that = this
    if(that.data.isPlaying){
      let mscTitleLen = that.data.currentMusic.name.length * 17  // 17为字体大小
      if (mscTitleLen > screenWidth / 2) {
        // 开始滚动歌曲标题
        control.scrollMscTitle(that)
      }
      // 开始旋转CD背景图
      control.rotateCD(that)
    }

    that.setData({
      isBackend: false
    })
  },
  onHide: function(){ // 用户离开小程序页面时清除掉定时任务
    let that = this
    // 清除定时器
    that.clearRotateTimeout()
    that.clearScrollTimeout()

    that.setData({
      isBackend: true
    })
  },
  playMusic: function(){
    let that = this
    if(that.data.isPlaying){
      audio.pause()
      // 清除CD背景图旋转定时器
      that.clearRotateTimeout()
    }else{
      audio.play()
      // 非后台运行才开启定时器
      if(!that.data.isBackend){
        // 判断歌曲标题长度是否超出，超出则启动滚动定时器
        let mscTitleLen = that.data.currentMusic.name.length * 17  // 17为字体大小
        if (mscTitleLen > screenWidth / 2) {
          let maxDistance = that.data.maxMarqueeDistance == null ? mscTitleLen / 2 + wx.getSystemInfoSync().windowWidth / 4 : that.data.maxMarqueeDistance
          that.setData({
            maxMarqueeDistance: maxDistance
          })
          // 开始滚动歌曲标题
          control.scrollMscTitle(that)
        }
        // 开始旋转CD背景图
        control.rotateCD(that)
      }
    }
    that.setData({
      isPlaying: !that.data.isPlaying
    })
  },
  preMusic: function(){
    let that = this
    // 切歌前先清除定时器
    that.clearRotateTimeout()
    that.clearScrollTimeout()
    let crtMscIndex = that.data.currentMusicIndex
    let mscListLen = that.data.musicListLen
    crtMscIndex--
    // 计算当前应当播放歌曲的歌单索引
    crtMscIndex = crtMscIndex < 0 ? mscListLen-1 : crtMscIndex

    that.setData({
      currentMusic: that.data.musicList[crtMscIndex],
      currentMusicIndex: crtMscIndex,
      isPlaying: false  // 切歌时先停止播放
    })
    //加载歌词
    control.getLyric(that)
    // 加载并播放音乐
    control.loadMusic(that, audio, () => {
      control.rewriteonCanplay(audio)
      that.playMusic()
    })

  },
  nextMusic: function(){
    let that = this
    // 切歌前先清除定时器
    that.clearRotateTimeout()
    that.clearScrollTimeout()
    let crtMscIndex = that.data.currentMusicIndex
    let mscListLen = that.data.musicListLen
    crtMscIndex++
    // 计算当前应当播放歌曲的歌单索引
    crtMscIndex = crtMscIndex > mscListLen-1 ? 0 : crtMscIndex

    that.setData({
      currentMusic: that.data.musicList[crtMscIndex],
      currentMusicIndex: crtMscIndex,
      isPlaying: false  // 切歌时先停止播放
    })
    //加载歌词
    control.getLyric(that)
    // 加载并播放音乐
    control.loadMusic(that, audio, () => {
      control.rewriteonCanplay(audio)
      that.playMusic()
    })
  },
  changeMusic: function(event){
    let that = this
    // 切歌前先清除定时器
    that.clearRotateTimeout()
    that.clearScrollTimeout()
    // 计算当前应当播放歌曲的歌单索引
    let crtMscIndex = event.currentTarget.dataset.index

    that.setData({
      currentMusic: that.data.musicList[crtMscIndex],
      currentMusicIndex: crtMscIndex,
      isPlaying: false  // 切歌时先停止播放
    })
    //加载歌词
    control.getLyric(that)
    // 加载并播放音乐
    control.loadMusic(that, audio, () => {
      control.rewriteonCanplay(audio)
      that.playMusic()
    })

    that.hideMusicList()
  },
  changeMusicByBackend: function(index){
    let that = this
    // 切歌前先清除定时器
    that.clearRotateTimeout()
    that.clearScrollTimeout()

    that.setData({
      currentMusic: that.data.musicList[index],
      currentMusicIndex: index
    })
    // 加载并播放音乐
    control.loadMusic(that, audio, () => {
      control.rewriteonCanplay(audio)
      that.playMusic()
    })
  },
  seekMusic: function(event){
    let that = this
    // 清除定时器
    that.clearRotateTimeout()
    that.setData({
      isPlaying: false
    })
    
    audio.seek(event.detail.value)
    setTimeout(() => {
      audio.play()
      // 开始旋转CD背景图
      control.rotateCD(that)
      that.setData({
        isPlaying: true
      })
    }, 500)
  },
  seekMscChanging: function(){
    audio.pause()
  },
  changePlayMode: function(){
    let that = this
    let index = that.data.playModeIndex + 1
    index = index > 2 ? 0 : index
    control.togglePlayMode(that, index)
  },
  showLrc: function(){
    let that = this
    that.setData({
      loadLrc: that.data.loadLrc ? false : true
    })
  },
  showMusicList: function(){
    let that = this
    control.musicListAnimation(that, true)
  },
  hideMusicList: function(){
    let that = this
    control.musicListAnimation(that, false)
  },
  clearRotateTimeout: function(){
    let that = this
    if(that.data.cdRotateTimeout != null){
      clearTimeout(that.data.cdRotateTimeout)
    }
  },
  clearScrollTimeout: function(){
    let that = this
    if (that.data.scrollMscTitleTimeout != null){
      clearTimeout(that.data.scrollMscTitleTimeout)
    }
  }
})
