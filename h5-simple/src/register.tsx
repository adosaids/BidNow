import React, { useState } from 'react'
import { Form, Input, Button, Toast } from 'antd-mobile'
import { useNavigate, Link } from 'react-router-dom'
import { api } from './request'

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (values: { username: string; nickname: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      Toast.show('两次密码不一致')
      return
    }
    setLoading(true)
    try {
      const data = await api.post('/api/auth/register', {
        username: values.username,
        nickname: values.nickname,
        password: values.password,
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      Toast.show('注册成功')
      navigate('/rooms', { replace: true })
    } catch (e: any) {
      Toast.show(e.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">注册新账号</div>
        <Form onFinish={handleRegister} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="请输入昵称" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input type="password" placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true, message: '请确认密码' }]}>
            <Input type="password" placeholder="确认密码" />
          </Form.Item>
          <Button block type="submit" color="primary" size="large" loading={loading} className="auth-btn">
            注册
          </Button>
        </Form>
        <div className="auth-footer">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage