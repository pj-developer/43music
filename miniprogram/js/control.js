// 导入数据库操作模块
const wdbc = require('./wdbc.js')
// 导入公共方法模块
const common = require('./common.js')
// 播放模式列表
const playModeList = [
  { title: '列表循环', filename: 'order.png'},
  { title: '单曲循环', filename: 'loop.png' },
  { title: '随机播放', filename: 'random.png' }
]

// 获取音乐列表
function getMusicList(page, callback){
  wdbc.getMusicList(res => {
    page.setData({
      musicList: res.data
    })
    if(callback){
      callback()
    }
  }, err => {
    common.showToast('获取歌单失败')
  })
}

// 载入当前音乐
function loadMusic(page, audio, callback){
  audio.src = common.musicServerUrl + page.data.currentMusic.audio
  audio.title = page.data.currentMusic.name
  audio.epname = page.data.currentMusic.album
  audio.singer = page.data.currentMusic.singer
  audio.coverImgUrl = common.musicServerUrl + page.data.currentMusic.image
  // 歌词标题返回原来的位置
  page.setData({
    marqueeDistance: 0
  })
  // 计算歌曲时长并显示 加载歌曲时暂停播放
  audio.onCanplay(() => {
    if (!audio.duration) {
      setTimeout(() => {
        page.setData({
          musicDuration: parseInt(audio.duration),
          endTime: convertMusicTime(audio.duration)
        })
      }, 500)
    } else {
      page.setData({
        musicDuration: parseInt(audio.duration),
        endTime: convertMusicTime(audio.duration)
      })
    }

    audio.pause()
  })
  
  // 监听播放进度更新事件
  audio.onTimeUpdate(() => {
    let currentTime = audio.currentTime
    let cvtSecond = convertMusicTime(currentTime)
    // 改变进度条滑块显示位置及进度条的值，歌词同步显示
    if(page.data.currentSecond != parseInt(currentTime)){
      page.setData({
        currentSecond: parseInt(currentTime),
        startTime: cvtSecond,
        toLrcView: 'lrcTime' + cvtSecond
      })
    }
    // 歌词同步高亮显示
    wx.createSelectorQuery().select('#' + page.data.toLrcView).fields({
      id: true
    }, function(res){
      if(res != null){
        page.setData({
          selectedLrcText: page.data.toLrcView
        })
      }
    }).exec()
  })
  // 监听音乐自然播放结束事件，处理播放模式逻辑
  audio.onEnded(() => {
    // 进度清空，播放停止
    page.setData({
      currentSecond: 0,
      startTime: '00:00',
      isPlaying: false
    })
    // // 切歌前先清除定时器
    // page.clearRotateTimeout()
    // page.clearScrollTimeout()
    // 判断为哪种播放模式，根据模式计算下一首歌曲的歌单索引
    let playModeIndex = page.data.playModeIndex
    if(playModeIndex == 0){
      // 列表循环
      page.nextMusic()
    }else if(playModeIndex == 1){
      // 单曲循环
      page.changeMusicByBackend(page.data.currentMusicIndex)
    }else{
      // 随机播放 随机生成歌单索引
      let range = page.data.musicListLen - 1
      let rand = Math.random()
      let index = Math.round(rand * range)

      page.changeMusicByBackend(index)
    }
  })
  // 监听播放/暂停事件，改变音乐播放状态isPlaying的值
  audio.onPlay(() => {
    if (!audio.duration) {
      setTimeout(() => {
        page.setData({
          musicDuration: parseInt(audio.duration),
          endTime: convertMusicTime(audio.duration)
        })
      }, 500)
    } else {
      page.setData({
        musicDuration: parseInt(audio.duration),
        endTime: convertMusicTime(audio.duration)
      })
    }
  })
  // audio.onPause(() => {
  //   page.setData({
  //     isPlaying: false
  //   })
  // })

  if(callback){
    callback()
  }
}

// 重写背景音乐播放器onCanplay方法的回调函数
function rewriteonCanplay(audio){
  audio.onCanplay(() => {
    audio.play()
  })
}

// 音乐标题动画
function musicTitleAnimation(page, num){
  let animation = wx.createAnimation({
    duration: 3000,
    timingFunction: 'linear'
  })

  animation.translateX(-num).step()

  page.setData({
    scrollAnimationData: animation.export()
  })

  setTimeout(() => {
    animation.translateX(0).step()
    page.setData({
      scrollAnimationData: animation.export()
    })
  }, 6000)
}

// cd图旋转动画
function cdImageRotateAnimation(page, num){
  let animation = wx.createAnimation({
    duration: 1000,
    timingFunction: 'linear'
  })

  animation.rotate(num).step()

  page.setData({
    rotateAnimationData: animation.export()
  })
}

// 歌曲列表显/隐动画
function musicListAnimation(page, show){
  let animation = wx.createAnimation({
    duration: 1000,
    timingFunction: 'linear'
  })

  let num = show ? 0 : 300
  animation.translateY(num).step()

  page.setData({
    mscListAnimation: animation.export(),
    showMscList: true
  })

  if(!show){
    setTimeout(function () {
      animation.translateY(0).step()
      page.setData({
        mscListAnimation: animation.export(),
        showMscList: false
      })
    }.bind(page), 200)
  }
}

// 歌曲时长转换
function convertMusicTime(value){
  let m = 0
  let s = parseInt(value)
  if(value > 60){
    m = parseInt(s / 60)
    s = parseInt(s % 60)
  }
  if(s < 10){
    s = '0' + s
  }
  if (m < 10){
    m = '0' + m
  }
  return m + ':' + s
}

// 歌词请求
function getLyric(page, callback){
  let url = common.lrcServerUrl + page.data.currentMusic.lyric
  wx.request({
    url: url,
    dataType: 'json',
    success: res => {
      page.setData({
        lyric: convertLyric(res.data.split('↵')),
      })
      if(callback){
        callback()
      }
    },
    fail: err => {
      common.showToast('歌词下载失败')
      console.log(err)
    }
  })
}

// 歌词格式转换
function convertLyric(lrc){
  let newLrc = []
  for(let row of lrc) {
    let startIndex = row.split(']')[0].length + 1
    let content = row.substring(startIndex, row.length).replace(/^\s+|\s+$/g, "")
    if(content.length == 0){
      continue
    }
    let newRow = {
      time: row.substring(1, 6),
      content: content
    }
    newLrc.push(newRow)
  }

  return newLrc
}

// 切歌
function toggleMusic(page, index){
  page.setData({
    currentMusic: page.data.musicList[index],
    currentMusicIndex: index
  })
  loadMusic(page)
}

// 切换播放模式
function togglePlayMode(page, index){
  let playMode = playModeList[index]
  page.setData({
    playModeIndex: index,
    playModeImg: playMode.filename,
    playModeTitle: playMode.title,
    showMscListLen: index == 1 ? false : true
  })
  
  common.showToast(playMode.title)
}

function rotateCD(page){
  // 被调用时先清除前一个timeout方法
  if (page.data.cdRotateTimeout != null){
    clearTimeout(page.data.cdRotateTimeout)
  }

  // 载入CD背景图旋转动画
  let step = page.data.cdRotateStep + 10
  cdImageRotateAnimation(page, step)

  // 开始定时执行
  page.setData({
    cdRotateStep: step,
    cdRotateTimeout: setTimeout(rotateCD, 1000, page)
  })
}

function scrollMscTitle(page){
  // 被调用时先清除前一个timeout方法
  if (page.data.scrollMscTitleTimeout != null) {
    clearTimeout(page.data.scrollMscTitleTimeout)
  }

  // // 载入音乐标题滚动动画
  // musicTitleAnimation(page, page.data.maxMarqueeDistance)
  // 制作动画效果
  let mqDst = page.data.marqueeDistance + 1
  if(mqDst == 0){
    page.clearScrollTimeout()
    page.setData({
      marqueeDistance: 0
    })
    // 停1.5秒再滚动
    page.setData({
      scrollMscTitleTimeout: setTimeout(scrollMscTitle, 1500, page)
    })
    return
  }
  if(page.data.marqueeDistance > page.data.maxMarqueeDistance){
    mqDst = -parseInt(page.data.maxMarqueeDistance)
  }
  page.setData({
    marqueeDistance: mqDst
  })

  // 开始定时执行
  page.setData({
    scrollMscTitleTimeout: setTimeout(scrollMscTitle, 50, page)
  })
}

module.exports = {
  musicServerUrl: common.musicServerUrl,
  getMusicList: getMusicList,
  loadMusic: loadMusic,
  rewriteonCanplay: rewriteonCanplay,
  musicTitleAnimation: musicTitleAnimation,
  cdImageRotateAnimation: cdImageRotateAnimation,
  musicListAnimation: musicListAnimation,
  convertMusicTime: convertMusicTime,
  getLyric: getLyric,
  toggleMusic: toggleMusic,
  togglePlayMode: togglePlayMode,
  rotateCD: rotateCD,
  scrollMscTitle: scrollMscTitle
}