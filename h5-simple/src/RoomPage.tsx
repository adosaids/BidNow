import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Toast } from 'antd-mobile'
import { api } from './request'

interface BidMessage {
  id: number
  userName: string
  price: number
  avatar: string
}

interface BidRecord {
  id: number
  userName: string
  price: number
  time: string
  isWinner?: boolean
}

interface SessionInfo {
  sessionId: number
  goodsName: string
  goodsImage: string
  startPrice: number
  currentPrice: number
  incrementPrice: number
  status: number
  endTime: string
  totalBids: number
}

const RoomPage: React.FC = () => {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(0)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [incrementPrice, setIncrementPrice] = useState(100)
  const [goodsName, setGoodsName] = useState('')
  const [goodsImage, setGoodsImage] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [bidMessages, setBidMessages] = useState<BidMessage[]>([])
  const [bidRecords, setBidRecords] = useState<BidRecord[]>([])
  const [isBidding, setIsBidding] = useState(false)
  const [isPanelExpanded, setIsPanelExpanded] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<number>(0)
  const [bidMultiple, setBidMultiple] = useState(1)
  const [sessionStatus, setSessionStatus] = useState(0)
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([])
  const [playUrl, setPlayUrl] = useState('')
  const [videoLoaded, setVideoLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsPlayerRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>()
  const messageIdRef = useRef(0)
  const heartIdRef = useRef(0)
  const activeSessionIdRef = useRef<number>(0)
  const bidRecordsRef = useRef<BidRecord[]>([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      Toast.show('请先登录')
      navigate('/login', { replace: true })
      return
    }

    const initRoom = async () => {
      try {
        const room = await api.get(`/api/live/room/${roomId}`)
        setViewerCount(room.viewerCount || 0)
        setPlayUrl(room.playUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')
        const activeSession: SessionInfo | undefined = room.goodsList?.find((g: any) => g.status === 1)
        if (activeSession) {
          setActiveSessionId(activeSession.sessionId)
          activeSessionIdRef.current = activeSession.sessionId
          const session = await api.get(`/api/auction/${activeSession.sessionId}`)
          setCurrentPrice(session.currentPrice || session.startPrice)
          setIncrementPrice(session.incrementPrice)
          setGoodsName(session.goodsName || activeSession.goodsName)
          setGoodsImage(session.goodsImage || activeSession.goodsImage || '')
          setSessionStatus(session.status)
          if (session.endTime) {
            setCountdown(Math.max(0, Math.floor((new Date(session.endTime).getTime() - Date.now()) / 1000)))
          }
          // 从后端 ZSet 拉取排行榜（服务端唯一数据源）
          const rank = await api.get(`/api/bid/rank/${activeSession.sessionId}`)
          if (Array.isArray(rank)) {
            const records = rank.map((r: any) => ({
              id: r.userId,
              userName: r.userName || `用户${r.userId}`,
              price: r.bidPrice,
              time: '',
              isWinner: r.rank === 1,
            }))
            setBidRecords(records)
            bidRecordsRef.current = records
          }
        } else {
          setGoodsName(room.goodsList?.[0]?.goodsName || '直播间')
          setCurrentPrice(room.goodsList?.[0]?.startPrice || 0)
          setIncrementPrice(room.goodsList?.[0]?.incrementPrice || 100)
        }
      } catch {
        setGoodsName('竞拍直播间')
        setCurrentPrice(500)
        setIncrementPrice(100)
        setCountdown(300)
        setPlayUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')
        setGoodsImage('https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1080')
        setViewerCount(128)
      }
      setVideoLoaded(true)
    }

    initRoom()

    let reconnectCount = 0
    const maxReconnect = 5

    const connectWs = () => {
      try {
        const ws = new WebSocket('ws://localhost:8082/ws/auction/' + roomId)
        wsRef.current = ws

        ws.onopen = () => {
          reconnectCount = 0
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: Number(roomId), userId: user.id }))
          heartbeatRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'PING' }))
          }, 30000)
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            const myUser = JSON.parse(localStorage.getItem('user') || '{}')
            switch (msg.type) {
              case 'PRICE_UPDATE':
                setCurrentPrice(msg.currentPrice)
                // 其他人的出价才追加弹幕（自己的已在 handleBid 中处理）
                if (myUser.id !== msg.userId) {
                  setBidMessages(prev => [...prev.slice(-5), {
                    id: messageIdRef.current++,
                    userName: msg.userName || `用户${msg.userId}`,
                    price: msg.currentPrice,
                    avatar: '👤',
                  }])
                }
                // 从后端拉取最新排行，用消息自带的 sessionId
                if (msg.sessionId) {
                  fetchRanking(msg.sessionId)
                }
                // 出价被超越提醒
                if (msg.outbidUserId && myUser.id === msg.outbidUserId) {
                  Toast.show(`有人出价更高 ¥${msg.currentPrice}，你被超越了！`)
                }
                break
              case 'AUCTION_START':
                Toast.show('拍卖开始！')
                setSessionStatus(1)
                break
              case 'AUCTION_END':
                Toast.show(`竞拍结束！成交价：¥${msg.dealPrice}`)
                setSessionStatus(2)
                break
              case 'ROOM_USER_COUNT':
                setViewerCount(msg.count)
                break
              case 'GOODS_UPDATE':
                // 商品上架通知：重新加载房间商品列表
                api.get(`/api/live/room/${roomId}`).then(room => {
                  const active: SessionInfo | undefined = room.goodsList?.find((g: any) => g.status === 1)
                  if (active && active.sessionId !== activeSessionIdRef.current) {
                    setActiveSessionId(active.sessionId)
                    activeSessionIdRef.current = active.sessionId
                    setGoodsName(active.goodsName || '')
                    setGoodsImage(active.goodsImage || '')
                    api.get(`/api/auction/${active.sessionId}`).then(s => {
                      setCurrentPrice(s.currentPrice || s.startPrice)
                      setIncrementPrice(s.incrementPrice)
                      setSessionStatus(s.status)
                      if (s.endTime) {
                        setCountdown(Math.max(0, Math.floor((new Date(s.endTime).getTime() - Date.now()) / 1000)))
                      }
                    })
                    fetchRanking(active.sessionId)
                  }
                }).catch(() => {})
                Toast.show(`新商品上架：${msg.goodsName || ''}`)
                break
            }
          } catch {}
        }

        ws.onclose = () => {
          clearInterval(heartbeatRef.current)
          if (reconnectCount < maxReconnect) {
            reconnectCount++
            const delay = Math.min(1000 * Math.pow(2, reconnectCount), 10000)
            console.log(`WebSocket reconnect ${reconnectCount}/${maxReconnect} in ${delay}ms`)
            setTimeout(connectWs, delay)
          }
        }
      } catch {
        if (reconnectCount < maxReconnect) {
          reconnectCount++
          setTimeout(connectWs, 3000)
        }
      }
    }

    connectWs()

    return () => {
      reconnectCount = maxReconnect // 阻止重连
      wsRef.current?.close()
      clearInterval(heartbeatRef.current)
    }
  }, [roomId])

  useEffect(() => {
    if (!videoLoaded || !playUrl || !videoRef.current) {
      return
    }

    const video = videoRef.current
    const loadVideo = async () => {
      try {
        const Hls = (await import('hls.js')).default
        if (Hls.isSupported()) {
          if (hlsPlayerRef.current) {
            hlsPlayerRef.current.destroy()
          }
          hlsPlayerRef.current = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          })
          hlsPlayerRef.current.loadSource(playUrl)
          hlsPlayerRef.current.attachMedia(video)
          hlsPlayerRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {})
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = playUrl
          video.addEventListener('loadedmetadata', () => {
            video.play().catch(() => {})
          })
        }
      } catch (e) {
        console.log('hls.js not available, using native')
        video.src = playUrl
      }
    }
    loadVideo()

    return () => {
      if (hlsPlayerRef.current) {
        hlsPlayerRef.current.destroy()
        hlsPlayerRef.current = null
      }
    }
  }, [playUrl, videoLoaded])

  // 从后端 ZSet 拉取排行榜，整体替换（服务端唯一数据源）
  const fetchRanking = useCallback(async (sessionId: number) => {
    try {
      const rank = await api.get(`/api/bid/rank/${sessionId}`)
      if (Array.isArray(rank)) {
        const records: BidRecord[] = rank.map((r: any) => ({
          id: r.userId,
          userName: r.userName || `用户${r.userId}`,
          price: r.bidPrice,
          time: '',
          isWinner: r.rank === 1,
        }))
        setBidRecords(records)
        bidRecordsRef.current = records
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleBid = useCallback(async () => {
    if (isBidding) return
    setIsBidding(true)
    try {
      const newPrice = currentPrice + incrementPrice * bidMultiple
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await api.post('/api/bid/submit', {
        sessionId: activeSessionId,
        bidPrice: newPrice,
      })
      const overtakeCount = res?.overtakeCount || 0
      setCurrentPrice(newPrice)
      setBidMessages(prev => [...prev.slice(-5), {
        id: messageIdRef.current++,
        userName: user.nickname || '你',
        price: newPrice,
        avatar: '😊',
      }])
      // 从后端拉取最新排行，整体替换
      fetchRanking(activeSessionId)
      if (overtakeCount > 0) {
        Toast.show(`出价成功！¥${newPrice}，已超越 ${overtakeCount} 位用户`)
      } else {
        Toast.show(`出价成功！¥${newPrice}`)
      }
      setBidMultiple(1)
    } catch (e: any) {
      Toast.show(e.message || '出价失败')
    } finally {
      setTimeout(() => setIsBidding(false), 2000)
    }
  }, [currentPrice, isBidding, incrementPrice, bidMultiple, activeSessionId, fetchRanking])

  const handleCustomBid = useCallback(() => {
    const input = prompt('请输入出价金额（必须是加价幅度的整数倍）')
    if (!input) return
    const price = Number(input)
    if (isNaN(price) || price <= currentPrice) {
      Toast.show('请输入有效金额')
      return
    }
    if ((price - currentPrice) % incrementPrice !== 0) {
      Toast.show(`出价必须是加价幅度¥${incrementPrice}的整数倍`)
      return
    }
    const multiple = Math.round((price - currentPrice) / incrementPrice)
    setBidMultiple(multiple)
  }, [currentPrice, incrementPrice])

  const handleLike = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const newHeart = { id: heartIdRef.current++, x: rect.left + rect.width / 2 - 16 }
    setHearts(prev => [...prev, newHeart])
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== newHeart.id)), 1500)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const multiples = [1, 2, 5, 10]
  const nextPrice = currentPrice + incrementPrice * bidMultiple

  if (!videoLoaded) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        加载中...
      </div>
    )
  }

  return (
    <div className="live-container">
      <div className="live-video-area">
        <video
          ref={videoRef}
          className="live-video"
          muted
          autoPlay
          playsInline
          controls
        />
      </div>

      <div className="top-bar">
        <div className="host-info">
          <div className="avatars">
            <div className="avatar" onClick={() => navigate(-1)}>←</div>
          </div>
          <div className="host-text">
            <div className="host-name">{goodsName || '直播间'}</div>
            <div className="like-count">👥 {viewerCount} 人在看</div>
          </div>
          <Button className="follow-btn" color="danger" size="small" onClick={() => navigate('/rooms')}>更多</Button>
        </div>
        <div className="top-right">
          <div className="close-btn" onClick={() => navigate('/rooms')}>✕</div>
        </div>
      </div>

      <div className="collapsible-panel" onClick={() => setIsPanelExpanded(!isPanelExpanded)}>
        {!isPanelExpanded ? (
          <div className="panel-collapsed">
            <span className="panel-icon">🏆</span>
            <span className="panel-text">{goodsName || '实时排行'}</span>
            <span className={`collapsed-time ${countdown > 0 && countdown < 30 ? 'blink-red' : ''}`}>
              {countdown > 0 ? formatTime(countdown) : '已结束'}
            </span>
            <span className="collapsed-price">¥{currentPrice.toLocaleString()}</span>
            <span className="panel-arrow">▼</span>
          </div>
        ) : (
          <div className="panel-expanded">
            <div className="panel-header">
              <span className="panel-icon">🏆</span>
              <span className="panel-text">{goodsName || '实时排行'}</span>
              <span className="panel-arrow">▲</span>
            </div>
            <div className="goods-name-in-panel">{goodsName}</div>
            {sessionStatus !== 2 && (
              <div className="countdown-in-panel">
                <div className={`countdown-number-small ${countdown > 0 && countdown < 30 ? 'blink-red' : ''}`}>
                  {countdown > 0 ? formatTime(countdown) : '--:--'}
                </div>
                <div className="countdown-label-small">剩余时间</div>
              </div>
            )}
            <div className="price-in-panel">
              <div className="price-label-small">当前最高价</div>
              <div className="price-number-small">¥{currentPrice.toLocaleString()}</div>
            </div>
            <div className="ranking-list">
              {bidRecords.slice(0, 5).map((record, index) => (
                <div key={record.id} className={`ranking-item ${record.isWinner ? 'winner' : ''}`}>
                  <span className="ranking-user">
                    <span className="rank-number">{index + 1}</span>
                    {record.userName}
                  </span>
                  <span className="ranking-price">¥{record.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="danmaku-area">
        {bidMessages.map((msg, index) => (
          <div key={msg.id} className="danmaku-item" style={{ animationDelay: `${index * 0.1}s` }}>
            <span className="danmaku-avatar">{msg.avatar}</span>
            <span className="danmaku-text">{msg.userName} 出价 ¥{msg.price}</span>
          </div>
        ))}
      </div>

      <div className="right-icons">
        <div className="icon-btn" onClick={handleLike}>
          <span className="icon-emoji">❤️</span>
        </div>
        <div className="icon-btn">
          <span className="icon-emoji">🛒</span>
        </div>
        <div className="icon-btn">
          <span className="icon-emoji">🎁</span>
        </div>
        <div className="icon-btn">
          <span className="icon-emoji">↗️</span>
        </div>
      </div>

      {hearts.map(heart => (
        <div key={heart.id} className="floating-heart" style={{ left: heart.x }}>❤️</div>
      ))}

      <div className="bottom-bar">
        <div className="input-placeholder">说点什么...</div>
        {sessionStatus !== 2 ? (
          <div className="bid-section">
            <div className="bid-multiples">
              {multiples.map(n => (
                <Button
                  key={n}
                  size="small"
                  color={bidMultiple === n ? 'primary' : 'default'}
                  onClick={() => setBidMultiple(n)}
                  className="multiple-btn"
                >
                  +¥{incrementPrice * n}
                </Button>
              ))}
              <Button size="small" className="multiple-btn" onClick={handleCustomBid}>自定义</Button>
            </div>
            <Button
              className={`bid-btn ${isBidding ? 'bidding' : ''}`}
              onClick={handleBid}
              disabled={isBidding}
              block
            >
              {isBidding ? '出价中...' : `立即出价 ¥${nextPrice.toLocaleString()}`}
            </Button>
          </div>
        ) : (
          <Button className="bid-btn" block disabled>已结束</Button>
        )}
      </div>
    </div>
  )
}

export default RoomPage
