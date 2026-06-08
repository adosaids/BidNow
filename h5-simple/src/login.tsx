import React, { useState } from 'react'
import { Form, Input, Button, Toast } from 'antd-mobile'
import { useNavigate, Link } from 'react-router-dom'
import { api } from './request'

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const data = await api.post('/api/auth/login', values)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      Toast.show('登录成功')
      navigate('/rooms', { replace: true })
    } catch (e: any) {
      Toast.show(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">欢迎来到拍卖平台</div>
        <Form onFinish={handleLogin} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input type="password" placeholder="请输入密码" />
          </Form.Item>
          <Button block type="submit" color="primary" size="large" loading={loading} className="auth-btn">
            登录
          </Button>
        </Form>
        <div className="auth-footer">
          还没有账号？<Link to="/register">立即注册</Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage