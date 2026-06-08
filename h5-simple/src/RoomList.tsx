import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Toast } from 'antd-mobile'
import { api } from './request'

interface LiveRoom {
  id: number
  roomName: string
  anchorName: string
  coverUrl: string
  viewerCount: number
  goodsName: string
  status?: number
}

const RoomListPage: React.FC = () => {
  const [rooms, setRooms] = useState<LiveRoom[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      Toast.show('请先登录')
      navigate('/login', { replace: true })
      return
    }

    const loadRooms = async () => {
      try {
        const data = await api.get('/api/live/room/list?status=1')
        const list = Array.isArray(data) ? data : (data?.records || [])
        setRooms(list)
      } catch {
        setRooms([
          {
            id: 1,
            roomName: '玉石专场直播',
            anchorName: '王老板',
            coverUrl: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400',
            viewerCount: 128,
            goodsName: '和田玉吊坠',
            status: 1
          },
          {
            id: 2,
            roomName: '瓷器精品拍卖',
            anchorName: '李掌柜',
            coverUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400',
            viewerCount: 256,
            goodsName: '青花瓷瓶',
            status: 1
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    loadRooms()
  }, [navigate])

  return (
    <div className="room-list-page">
      <NavBar className="room-list-header" onBack={() => navigate('/profile')}>
        正在直播 ({rooms.length})
      </NavBar>
      <div className="room-grid">
        {loading ? (
          <div className="room-empty">
            <div className="room-empty-icon">⏳</div>
            <div>加载中...</div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="room-empty">
            <div className="room-empty-icon">📺</div>
            <div>暂无直播房间</div>
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="room-card" onClick={() => navigate(`/room/${room.id}`)}>
              <div className="room-cover">
                <img src={room.coverUrl} alt={room.roomName} />
                <span className="room-viewer">👥 {room.viewerCount} 人</span>
              </div>
              <div className="room-info">
                <div className="room-name">{room.roomName}</div>
                <div className="room-anchor">{room.anchorName}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RoomListPage
