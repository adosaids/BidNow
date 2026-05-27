import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { Button, Card, List, Space, Toast, Badge, FloatingBubble } from 'antd-mobile'

type PageType = 'home' | 'live' | 'result' | 'history'

interface AuctionItem {
  id: number
  name: string
  image: string
  startPrice: number
  currentPrice: number
  increment: number
  status: number
}

interface BidRecord {
  id: number
  userName: string
  price: number
  time: string
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null)
  const [countdown, setCountdown] = useState(300)
  const [bidRecords, setBidRecords] = useState<BidRecord[]>([])
  const [currentPrice, setCurrentPrice] = useState(0)

  const mockAuctions: AuctionItem[] = [
    { id: 1, name: '和田玉吊坠', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400', startPrice: 0, currentPrice: 500, increment: 100, status: 1 },
    { id: 2, name: '清代青花瓷瓶', image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400', startPrice: 1000, currentPrice: 2500, increment: 200, status: 0 },
    { id: 3, name: '天然翡翠手镯', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', startPrice: 500, currentPrice: 1200, increment: 50, status: 0 }
  ]

  const mockHistory: BidRecord[] = [
    { id: 1, userName: '你', price: 500, time: '10:30:00' },
    { id: 2, userName: '用户A', price: 400, time: '10:29:55' },
    { id: 3, userName: '用户B', price: 300, time: '10:29:50' }
  ]

  useEffect(() => {
    if (currentPage === 'live' && selectedAuction) {
      setCurrentPrice(selectedAuction.currentPrice)
      setBidRecords(mockHistory)
      setCountdown(300)
    }
  }, [currentPage, selectedAuction])

  useEffect(() => {
    if (currentPage === 'live' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (currentPage === 'live' && countdown === 0) {
      Toast.show('竞拍结束！')
      setCurrentPage('result')
    }
  }, [countdown, currentPage])

  const handleBid = useCallback(() => {
    if (!selectedAuction) return
    const newPrice = currentPrice + selectedAuction.increment
    setCurrentPrice(newPrice)
    setBidRecords([
      { id: Date.now(), userName: '你', price: newPrice, time: new Date().toLocaleTimeString() },
      ...bidRecords
    ])
    Toast.show(`🎉 出价成功！当前价格：¥${newPrice}`)
  }, [selectedAuction, currentPrice, bidRecords])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const renderHome = () => (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px', color: '#d4af37' }}>🔥 实时竞拍</div>
      <List>
        {mockAuctions.map(item => (
          <List.Item key={item.id} onClick={() => { setSelectedAuction(item); setCurrentPage('live'); }}>
            <Card style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <img src={item.image} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} alt="" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>{item.name}</div>
                  <div style={{ color: '#ff4d4f', fontSize: '18px', fontWeight: 'bold' }}>¥{item.currentPrice}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>加价幅度：¥{item.increment}</div>
                </div>
              </div>
            </Card>
          </List.Item>
        ))}
      </List>
      <FloatingBubble onClick={() => setCurrentPage('history')} style={{ right: 24, bottom: 80 }}>
        <span>📋</span>
      </FloatingBubble>
    </div>
  )

  const renderLive = () => (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Button size="small" onClick={() => setCurrentPage('home')}>← 返回</Button>
          <Badge content="直播中" color="#ff4d4f">
            <span style={{ fontSize: '14px' }}>LIVE</span>
          </Badge>
        </div>
        <div style={{ width: '100%', height: '200px', background: '#333', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '48px' }}>📺</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: countdown < 30 ? '#ff4d4f' : '#d4af37' }}>
            {formatTime(countdown)}
          </div>
          <div style={{ fontSize: '14px', color: '#999' }}>剩余时间</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ff4d4f' }}>¥{currentPrice}</div>
          <div style={{ fontSize: '14px', color: '#999' }}>当前价格</div>
        </div>
        <Button 
          block 
          size="large" 
          color="primary" 
          style={{ 
            height: '56px', 
            fontSize: '20px', 
            fontWeight: 'bold', 
            borderRadius: '28px',
            '--background-color': '#d4af37',
          } as React.CSSProperties} 
          onClick={handleBid}
        >
          立即出价 +¥{selectedAuction?.increment || 100}
        </Button>
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>🏆 实时排行榜</div>
          <List style={{ background: '#2a2a2a', borderRadius: '12px' }}>
            {bidRecords.map((record, index) => (
              <List.Item key={record.id} style={{ background: index === 0 ? '#3d2914' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ color: index === 0 ? '#d4af37' : '#fff' }}>
                    {index === 0 ? '👑 ' : ''}{record.userName}
                  </span>
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{record.price}</span>
                </div>
              </List.Item>
            ))}
          </List>
        </div>
      </div>
    </div>
  )

  const renderResult = () => (
    <div style={{ padding: '32px 16px', background: 'linear-gradient(180deg, #d4af37 0%, #fff 100%)', minHeight: '100vh', textAlign: 'center' }}>
      <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎉</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>恭喜您中标！</div>
      <div style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>和田玉吊坠</div>
      <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ff4d4f', marginBottom: '32px' }}>¥{currentPrice}</div>
      <Space direction="vertical" block>
        <Button 
          block 
          size="large" 
          color="primary" 
          style={{ 
            height: '52px', 
            borderRadius: '26px',
            '--background-color': '#d4af37',
          } as React.CSSProperties}
        >
          立即支付
        </Button>
        <Button block size="large" onClick={() => setCurrentPage('home')}>返回首页</Button>
      </Space>
    </div>
  )

  const renderHistory = () => (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <Button size="small" onClick={() => setCurrentPage('home')}>← 返回</Button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>我的竞拍记录</div>
      </div>
      <List>
        {mockAuctions.map(item => (
          <List.Item key={item.id}>
            <Card style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.name}</span>
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{item.currentPrice}</span>
              </div>
            </Card>
          </List.Item>
        ))}
      </List>
    </div>
  )

  return (
    <>
      {currentPage === 'home' && renderHome()}
      {currentPage === 'live' && renderLive()}
      {currentPage === 'result' && renderResult()}
      {currentPage === 'history' && renderHistory()}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
