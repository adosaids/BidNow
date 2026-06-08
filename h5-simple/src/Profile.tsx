import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Button, Toast, Dialog, Radio, Space } from 'antd-mobile'
import { api } from './request'

interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
}

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '待支付', color: '#faad14' },
  1: { text: '已支付', color: '#52c41a' },
  3: { text: '已失效', color: '#999' },
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [orders, setOrders] = useState<any[]>([])

  const loadOrders = () => {
    api.get('/api/order/my').then(data => {
      setOrders(Array.isArray(data) ? data : (data?.records || []))
    }).catch(() => {})
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
    loadOrders()
  }, [])

  const handlePay = (order: any) => {
    const monthly = order.dealPrice ? (order.dealPrice / 3).toFixed(2) : '0'
    Dialog.confirm({
      title: '选择付款方式',
      content: (
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 'bold' }}>
            金额：¥{order.dealPrice}
          </div>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>
            • 立即支付：一次性付清 ¥{order.dealPrice}
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>
            • 先用后付：分3期，每期 ¥{monthly}，30天后还款
          </div>
        </div>
      ),
      confirmText: '立即支付',
      cancelText: '先用后付',
      onConfirm: async () => {
        try {
          await api.put(`/api/order/pay/${order.id}`, { paymentMode: 0 })
          Toast.show('支付成功')
          loadOrders()
        } catch {
          Toast.show('支付失败')
        }
      },
      onCancel: async () => {
        try {
          await api.put(`/api/order/pay/${order.id}`, { paymentMode: 1, installments: 3 })
          Toast.show('已开通先用后付，30天后还款')
          loadOrders()
        } catch {
          Toast.show('操作失败')
        }
      },
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    Toast.show('已退出登录')
    navigate('/login', { replace: true })
  }

  const getInstallmentText = (order: any) => {
    if (order.paymentMode !== 1 || !order.installments) return null
    const monthly = (order.dealPrice / order.installments).toFixed(2)
    return `分${order.installments}期 · 每期¥${monthly}`
  }

  return (
    <div className="profile-page">
      <NavBar onBack={() => navigate('/rooms')}>个人中心</NavBar>
      <div className="profile-header">
        <div className="profile-avatar">{user?.nickname?.[0] || '👤'}</div>
        <div className="profile-name">{user?.nickname || user?.username || '未登录'}</div>
        <div className="profile-username">@{user?.username}</div>
      </div>
      <div className="profile-section">
        <div className="profile-section-title">我的订单</div>
        {orders.length === 0 ? (
          <div className="profile-empty">暂无订单</div>
        ) : (
          <div className="order-list">
            {orders.map((order: any) => (
              <div
                key={order.id}
                className={`order-card ${order.status === 0 ? 'order-pending' : ''}`}
                onClick={() => order.status === 0 && handlePay(order)}
              >
                <div className="order-info">
                  <div className="order-id">订单 #{order.id}</div>
                  <div className="order-price">¥{order.dealPrice}</div>
                  {getInstallmentText(order) && (
                    <div className="order-installment">{getInstallmentText(order)}</div>
                  )}
                </div>
                <div className="order-status" style={{ color: statusMap[order.status]?.color || '#999' }}>
                  {statusMap[order.status]?.text || '未知'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="profile-logout">
        <Button block color="danger" onClick={handleLogout}>退出登录</Button>
      </div>
    </div>
  )
}

export default ProfilePage