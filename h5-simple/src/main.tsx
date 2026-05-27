import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Button, Toast } from 'antd-mobile'
import './index.css'

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

const App: React.FC = () => {
  const [countdown, setCountdown] = useState(300)
  const [currentPrice, setCurrentPrice] = useState(500)
  const [bidMessages, setBidMessages] = useState<BidMessage[]>([])
  const [bidRecords, setBidRecords] = useState<BidRecord[]>([
    { id: 1, userName: '你', price: 500, time: '10:30:00', isWinner: true },
    { id: 2, userName: '用户A', price: 400, time: '10:29:55' },
    { id: 3, userName: '用户B', price: 300, time: '10:29:50' },
    { id: 4, userName: '用户C', price: 200, time: '10:29:45' },
  ])
  const [isBidding, setIsBidding] = useState(false)
  const [isPanelExpanded, setIsPanelExpanded] = useState(false)
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([])
  const messageIdRef = useRef(0)
  const heartIdRef = useRef(0)

  const mockUsers = ['用户A', '用户B', '用户C', '用户D', '用户E']
  const mockAvatars = ['👨', '👩', '🧑', '👴', '👵']

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      Toast.show('🎉 竞拍结束！恭喜中标！')
    }
  }, [countdown])

  useEffect(() => {
    const interval = setInterval(() => {
      const randomUserIndex = Math.floor(Math.random() * mockUsers.length)
      const newPrice = currentPrice + 50 + Math.floor(Math.random() * 100)
      const newMessage: BidMessage = {
        id: messageIdRef.current++,
        userName: mockUsers[randomUserIndex],
        price: newPrice,
        avatar: mockAvatars[randomUserIndex],
      }
      setBidMessages(prev => [...prev.slice(-5), newMessage])
      setCurrentPrice(newPrice)
      setBidRecords(prev => [
        { id: Date.now(), userName: newMessage.userName, price: newPrice, time: new Date().toLocaleTimeString(), isWinner: true },
        ...prev.map(r => ({ ...r, isWinner: false }))
      ])
    }, 8000)
    return () => clearInterval(interval)
  }, [currentPrice])

  const handleBid = useCallback(() => {
    if (isBidding) return
    setIsBidding(true)
    const newPrice = currentPrice + 100
    setCurrentPrice(newPrice)
    const newMessage: BidMessage = {
      id: messageIdRef.current++,
      userName: '你',
      price: newPrice,
      avatar: '😊',
    }
    setBidMessages(prev => [...prev.slice(-5), newMessage])
    setBidRecords(prev => [
      { id: Date.now(), userName: '你', price: newPrice, time: new Date().toLocaleTimeString(), isWinner: true },
      ...prev.map(r => ({ ...r, isWinner: false }))
    ])
    Toast.show(`🎉 出价成功！¥${newPrice}`)
    setTimeout(() => setIsBidding(false), 2000)
  }, [currentPrice, isBidding])

  const handleLike = useCallback((e: React.MouseEvent) => {
    const newHeart = {
      id: heartIdRef.current++,
      x: e.clientX - 300,
    }
    setHearts(prev => [...prev, newHeart])
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id))
    }, 1500)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="live-container">
      <div className="live-bg">
        <img 
          src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1080" 
          alt="商品背景" 
          className="bg-image"
        />
      </div>

      <div className="top-bar">
        <div className="host-info">
          <div className="avatars">
            <div className="avatar">👩</div>
            <div className="avatar avatar-2">👨</div>
          </div>
          <div className="host-text">
            <div className="host-name">竞拍大师直播间</div>
            <div className="like-count">12.5万 本场点赞</div>
          </div>
          <Button className="follow-btn" color="danger" size="small">关注</Button>
        </div>
        <div className="top-right">
          <span className="viewer-count">👥 5万</span>
          <div className="close-btn">✕</div>
        </div>
      </div>

      <div className="collapsible-panel" onClick={() => setIsPanelExpanded(!isPanelExpanded)}>
        {!isPanelExpanded ? (
          <div className="panel-collapsed">
            <span className="panel-icon">🏆</span>
            <span className="panel-text">实时排行</span>
            <span className={`collapsed-time ${countdown < 30 ? 'blink-red' : ''}`}>
              {formatTime(countdown)}
            </span>
            <span className="collapsed-price">¥{currentPrice.toLocaleString()}</span>
            <span className="panel-arrow">▼</span>
          </div>
        ) : (
          <div className="panel-expanded">
            <div className="panel-header">
              <span className="panel-icon">🏆</span>
              <span className="panel-text">实时排行</span>
              <span className="panel-arrow">▲</span>
            </div>
            <div className="countdown-in-panel">
              <div className={`countdown-number-small ${countdown < 30 ? 'blink-red' : ''}`}>
                {formatTime(countdown)}
              </div>
              <div className="countdown-label-small">剩余时间</div>
            </div>
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
        <Button 
          className={`bid-btn ${isBidding ? 'bidding' : ''}`}
          onClick={handleBid}
          disabled={isBidding}
          block
        >
          {isBidding ? '出价中...' : `立即出价 +¥100`}
        </Button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
