import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, Layout, Menu, theme, Button, Table, Input, Space, Modal, Form, message, Popconfirm, Tag, Descriptions, Select, Card, Upload } from 'antd'
import { ShoppingOutlined, TrophyOutlined, OrderedListOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, PlayCircleOutlined, PauseCircleOutlined, EyeOutlined, CameraOutlined, LogoutOutlined, InboxOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import { api } from './request'
import LoginPage from './login'

const { Header, Sider, Content } = Layout
const { Dragger } = Upload

type PageType = 'product' | 'auction' | 'order' | 'live'

interface Product {
  id?: number
  name: string
  description: string
  category: string
  stock?: number
  images?: string[]
  createTime?: string
}

interface Auction {
  id?: number
  goodsId?: number
  startPrice?: number
  incrementPrice?: number
  ceilingPrice?: number
  durationSeconds?: number
  status?: number
  startTime?: string
  endTime?: string
  currentPrice?: number
  currentWinnerId?: number
  totalBids?: number
}

interface Order {
  id?: number
  sessionId?: number
  goodsId?: number
  userId?: number
  dealPrice?: number
  status?: number
  payTime?: string
  createTime?: string
}

interface LiveRoom {
  id?: number
  roomName?: string
  coverUrl?: string
  status?: number
  viewerCount?: number
  createTime?: string
  streamKey?: string
  pushUrl?: string
  playUrl?: string
}

const App: React.FC = () => {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [currentPage, setCurrentPage] = useState<PageType>('product')
  const [collapsed, setCollapsed] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [rooms, setRooms] = useState<LiveRoom[]>([])
  const [productModalVisible, setProductModalVisible] = useState(false)
  const [auctionModalVisible, setAuctionModalVisible] = useState(false)
  const [goodsModalVisible, setGoodsModalVisible] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<LiveRoom | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null)
  const [productForm] = Form.useForm()
  const [auctionForm] = Form.useForm()
  const [goodsForm] = Form.useForm()
  const [roomGoodsForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [roomGoods, setRoomGoods] = useState<any[]>([])
  const [roomGoodsLoading, setRoomGoodsLoading] = useState(false)

  if (!token) {
    return <LoginPage onLogin={(t) => { localStorage.setItem('token', t); setToken(t) }} />
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken('')
    message.success('已退出登录')
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      const pageData = await api.get('/api/goods/list?page=1&size=100')
      setProducts(pageData?.records || [])
    } catch (e) {
      message.error('加载商品列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadAuctions = async () => {
    setLoading(true)
    try {
      const [pageData, goodsData] = await Promise.all([
        api.get('/api/auction/list?page=1&size=100'),
        api.get('/api/goods/list?page=1&size=100'),
      ])
      const goodsList = goodsData?.records || []
      setProducts(goodsList)
      const goodsMap: Record<number, string> = {}
      goodsList.forEach((g: Product) => { if (g.id) goodsMap[g.id] = g.name })
      const auctionsWithName = (pageData?.records || []).map((a: Auction) => ({ ...a, goodsName: goodsMap[a.goodsId!] || `商品#${a.goodsId}` }))
      setAuctions(auctionsWithName)
    } catch (e) {
      message.error('加载竞拍列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    try {
      const pageData = await api.get('/api/order/list?page=1&size=100')
      setOrders(pageData?.records || [])
    } catch (e) {
      message.error('加载订单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadRooms = async () => {
    setLoading(true)
    try {
      const pageData = await api.get('/api/live/room/list?page=1&size=100')
      setRooms(pageData?.records || [])
    } catch (e) {
      message.error('加载直播间列表失败')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (currentPage === 'product') loadProducts()
    if (currentPage === 'auction') loadAuctions()
    if (currentPage === 'order') loadOrders()
    if (currentPage === 'live') loadRooms()
  }, [currentPage])

  const handleAddProduct = () => {
    setEditingProduct(null)
    productForm.resetFields()
    setProductModalVisible(true)
  }

  const handleEditProduct = (record: Product) => {
    setEditingProduct(record)
    productForm.setFieldsValue(record)
    setProductModalVisible(true)
  }

  const handleSaveProduct = async () => {
    try {
      const values = await productForm.validateFields()
      await api.post('/api/goods', values)
      message.success(editingProduct ? '修改成功' : '新增成功')
      setProductModalVisible(false)
      productForm.resetFields()
      loadProducts()
    } catch (e) {
      message.error('保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.get(`/api/goods/delete/${id}`)
      message.success('删除成功')
      loadProducts()
    } catch (e) {
      message.error('删除失败')
    }
  }

  const handleAddAuction = async () => {
    setEditingAuction(null)
    auctionForm.resetFields()
    try {
      const pageData = await api.get('/api/goods/list?page=1&size=100')
      setProducts(pageData?.records || [])
    } catch {}
    setAuctionModalVisible(true)
  }

  const handleEditAuction = (record: Auction) => {
    setEditingAuction(record)
    auctionForm.setFieldsValue(record)
    setAuctionModalVisible(true)
  }

  const handleSaveAuction = async () => {
    try {
      const values = await auctionForm.validateFields()
      await api.post('/api/auction', values)
      message.success(editingAuction ? '修改成功' : '新增成功')
      setAuctionModalVisible(false)
      auctionForm.resetFields()
      loadAuctions()
    } catch (e) {
      message.error('保存失败')
    }
  }

  const handleStart = async (id: number) => {
    try {
      await api.put(`/api/auction/start/${id}`)
      message.success('竞拍已开始')
      loadAuctions()
    } catch (e) {
      message.error('开始竞拍失败')
    }
  }

  const handleCancel = async (id: number) => {
    try {
      message.success('竞拍已取消')
      loadAuctions()
    } catch (e) {
      message.error('取消竞拍失败')
    }
  }

  const handleDeleteAuction = async (id: number) => {
    try {
      await api.get(`/api/auction/delete/${id}`)
      message.success('删除成功')
      loadAuctions()
    } catch (e) {
      message.error('删除失败')
    }
  }

  const handleCreateRoom = async () => {
    try {
      const values = await goodsForm.validateFields()
      const newRoom = await api.post('/api/live/room', values)
      message.success('直播间创建成功')
      setGoodsModalVisible(false)
      goodsForm.resetFields()
      loadRooms()
    } catch (e) {
      console.error(e)
    }
  }

  const handleStartLive = async (room: LiveRoom) => {
    try {
      await api.put(`/api/live/room/start/${room.id}`)
      message.success('已开播！')
      loadRooms()
    } catch (e) {
      message.error('开播失败')
    }
  }

  const handleStopLive = async (id: number) => {
    try {
      await api.put(`/api/live/room/stop/${id}`)
      setRooms(prev => prev.map(r => r.id === id ? { ...r, status: 2 } : r))
      message.success('已停播')
    } catch (e) {
      message.error('停播失败')
    }
  }

  const handleDeleteRoom = async (id: number) => {
    try {
      await api.get(`/api/live/room/delete/${id}`)
      setRooms(prev => prev.filter(r => r.id !== id))
      message.success('删除成功')
    } catch (e) {
      message.error('删除失败')
    }
  }

  const handleOpenGoodsModal = async (room: LiveRoom) => {
    setCurrentRoom(room)
    setGoodsModalVisible(true)
    setRoomGoodsLoading(true)
    try {
      const [roomData, auctionData, goodsData] = await Promise.all([
        api.get(`/api/live/room/${room.id}`),
        api.get('/api/auction/list?page=1&size=100'),
        api.get('/api/goods/list?page=1&size=100'),
      ])
      setRoomGoods(roomData?.goodsList || [])
      const goodsMap: Record<number, string> = {}
      const goodsList = goodsData?.records || []
      goodsList.forEach((g: Product) => { if (g.id) goodsMap[g.id] = g.name })
      const auctionsWithName = (auctionData?.records || []).map((a: Auction) => ({ ...a, goodsName: goodsMap[a.goodsId!] || `商品#${a.goodsId}` }))
      setAuctions(auctionsWithName)
    } catch {
      setRoomGoods([])
    } finally {
      setRoomGoodsLoading(false)
    }
    roomGoodsForm.resetFields()
  }

  const handleAddRoomGoods = async () => {
    try {
      const values = await roomGoodsForm.validateFields()
      await api.post('/api/live/room/goods', {
        roomId: currentRoom!.id,
        sessionId: values.sessionId,
      })
      message.success('商品已上架')
      roomGoodsForm.resetFields()
      handleOpenGoodsModal(currentRoom!)
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.message || '上架失败')
    }
  }

  const handleRemoveRoomGoods = async (sessionId: number) => {
    try {
      const g = roomGoods.find((g: any) => g.sessionId === sessionId)
      if (g?._id) await api.delete(`/api/live/room/goods/${g._id}`)
      message.success('已下架')
      handleOpenGoodsModal(currentRoom!)
    } catch {
      message.error('下架失败')
    }
  }

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return { text: '未开始', color: 'default' }
      case 1: return { text: '进行中', color: 'green' }
      case 2: return { text: '已结束', color: 'red' }
      default: return { text: '未知', color: 'default' }
    }
  }

  const getLiveStatusText = (status: number) => {
    switch (status) {
      case 0: return { text: '未开播', color: 'default' }
      case 1: return { text: '直播中', color: 'green' }
      case 2: return { text: '已停播', color: 'red' }
      default: return { text: '未知', color: 'default' }
    }
  }

  return (
    <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          <div style={{ height: 64, margin: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
            {collapsed ? '拍' : '竞拍直播后台'}
          </div>
          <Menu
            theme="dark"
            selectedKeys={[currentPage]}
            mode="inline"
            items={[
              { key: 'product', icon: <ShoppingOutlined />, label: '商品管理', onClick: () => setCurrentPage('product') },
              { key: 'auction', icon: <TrophyOutlined />, label: '竞拍管理', onClick: () => setCurrentPage('auction') },
              { key: 'order', icon: <OrderedListOutlined />, label: '订单管理', onClick: () => setCurrentPage('order') },
              { key: 'live', icon: <CameraOutlined />, label: '直播管理', onClick: () => setCurrentPage('live') },
            ]}
          />
        </Sider>
        <Layout>
          <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 18, fontWeight: 500 }}>竞拍直播管理系统</div>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
          </Header>
          <Content style={{ margin: '24px', background: '#fff', padding: 24, borderRadius: 8 }}>
            {currentPage === 'product' && (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>商品管理</div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProduct}>新增商品</Button>
                </div>
                <Table
                  loading={loading}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 80 },
                    { title: '商品名称', dataIndex: 'name' },
                    { title: '分类', dataIndex: 'category' },
                    { title: '库存', dataIndex: 'stock' },
                    { title: '描述', dataIndex: 'description', ellipsis: true },
                    { title: '创建时间', dataIndex: 'createTime' },
                    {
                      title: '操作', width: 200,
                      render: (_, record) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditProduct(record)}>编辑</Button>
                          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id!)}>
                            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
                          </Popconfirm>
                        </Space>
                      )
                    }
                  ]}
                  dataSource={products}
                  rowKey="id"
                />
              </div>
            )}

            {currentPage === 'auction' && (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>竞拍场次管理</div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAuction}>新增竞拍</Button>
                </div>
                <Table
                  loading={loading}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 80 },
                    { title: '竞拍商品', dataIndex: 'goodsName' },
                    { title: '起拍价', dataIndex: 'startPrice', render: (val) => val !== undefined ? `¥${val}` : '-' },
                    { title: '当前价格', dataIndex: 'currentPrice', render: (val) => val !== undefined ? `¥${val}` : '-' },
                    { title: '状态', dataIndex: 'status', render: (val) => { const { text, color } = getStatusText(val); return <Tag color={color}>{text}</Tag>; } },
                    { title: '开始时间', dataIndex: 'startTime' },
                    { title: '结束时间', dataIndex: 'endTime' },
                    {
                      title: '操作', width: 100,
                      render: (_, record) => (
                        <Popconfirm title="确定删除？" onConfirm={() => handleDeleteAuction(record.id!)}>
                          <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
                        </Popconfirm>
                      )
                    }
                  ]}
                  dataSource={auctions}
                  rowKey="id"
                />
              </div>
            )}

            {currentPage === 'order' && (
              <div>
                <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 500 }}>订单管理</div>
                <Table
                  loading={loading}
                  columns={[
                    { title: '订单ID', dataIndex: 'id', width: 100 },
                    { title: '场次ID', dataIndex: 'sessionId' },
                    { title: '商品ID', dataIndex: 'goodsId' },
                    { title: '用户ID', dataIndex: 'userId' },
                    { title: '成交价', dataIndex: 'dealPrice', render: (val) => val !== undefined ? `¥${val}` : '-' },
                    { title: '状态', dataIndex: 'status', render: (val) => <Tag color={val === 1 ? 'green' : 'default'}>{val === 1 ? '已支付' : '待支付'}</Tag> },
                    { title: '创建时间', dataIndex: 'createTime' },
                  ]}
                  dataSource={orders}
                  rowKey="id"
                />
              </div>
            )}

            {currentPage === 'live' && (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>直播管理</div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCurrentRoom(null); goodsForm.resetFields(); setGoodsModalVisible(true); }}>创建直播间</Button>
                </div>
                <Table
                  loading={loading}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 80 },
                    { title: '直播间名称', dataIndex: 'roomName' },
                    { title: '状态', dataIndex: 'status', render: (val) => { const { text, color } = getLiveStatusText(val); return <Tag color={color}>{text}</Tag>; } },
                    { title: '观看人数', dataIndex: 'viewerCount' },
                    { title: '创建时间', dataIndex: 'createTime' },
                    {
                      title: '操作', width: 460,
                      render: (_, record) => (
                        <Space>
                          {record.status === 0 && (
                            <Popconfirm title="确定开播？" onConfirm={() => handleStartLive(record)}>
                              <Button type="primary" icon={<PlayCircleOutlined />}>开播</Button>
                            </Popconfirm>
                          )}
                          {(record.status === 0 || record.status === 1) && (
                            <Popconfirm title="确定停播？" onConfirm={() => handleStopLive(record.id!)}>
                              <Button danger icon={<PauseCircleOutlined />}>停播</Button>
                            </Popconfirm>
                          )}
                          <Button icon={<ShoppingOutlined />} onClick={() => handleOpenGoodsModal(record)}>管理商品</Button>
                          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteRoom(record.id!)}>
                            <Button danger icon={<DeleteOutlined />}>删除</Button>
                          </Popconfirm>
                        </Space>
                      )
                    }
                  ]}
                  dataSource={rooms}
                  rowKey="id"
                />
              </div>
            )}
          </Content>
        </Layout>

        <Modal
          title={editingProduct ? '编辑商品' : '新增商品'}
          open={productModalVisible}
          onOk={handleSaveProduct}
          onCancel={() => setProductModalVisible(false)}
          width={600}
        >
          <Form form={productForm} layout="vertical">
            <Form.Item name="name" label="商品名称" rules={[{ required: true }]}>
              <Input placeholder="请输入商品名称" />
            </Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Input placeholder="请输入分类" />
            </Form.Item>
            <Form.Item name="stock" label="库存数量">
              <Input type="number" placeholder="请输入库存数量" />
            </Form.Item>
            <Form.Item name="description" label="商品描述" rules={[{ required: true }]}>
              <Input.TextArea rows={4} placeholder="请输入商品描述" />
            </Form.Item>
            <Form.Item label="上传图片">
              <Upload
                name="file"
                accept="image/*"
                action="/api/upload/image"
                headers={{ Authorization: `Bearer ${token}` }}
                showUploadList={false}
                onChange={(info) => {
                  if (info.file.status === 'done') {
                    const url = info.file.response?.data
                    if (url) {
                      const current = productForm.getFieldValue('images') || []
                      productForm.setFieldsValue({ images: [...current, url] })
                      message.success('上传成功')
                    }
                  } else if (info.file.status === 'error') {
                    message.error('上传失败')
                  }
                }}
              >
                <Button icon={<PlusOutlined />}>上传图片</Button>
              </Upload>
            </Form.Item>
            <Form.List name="images">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item {...rest} name={[name]} rules={[{ required: true, message: '请输入图片URL' }]}>
                        <Input placeholder="输入图片URL" style={{ width: 400 }} />
                      </Form.Item>
                      <Button danger onClick={() => remove(name)}>删除</Button>
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>手动添加图片URL</Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form>
        </Modal>

        <Modal
          title={editingAuction ? '编辑竞拍' : '新增竞拍'}
          open={auctionModalVisible}
          onOk={handleSaveAuction}
          onCancel={() => setAuctionModalVisible(false)}
          width={600}
        >
          <Form form={auctionForm} layout="vertical">
            <Form.Item name="goodsId" label="竞拍商品" rules={[{ required: true, message: '请选择商品' }]}>
              <Select
                placeholder="请选择商品"
                showSearch
                optionFilterProp="label"
                options={products.map(p => ({ label: `${p.name} (${p.category})`, value: p.id }))}
              />
            </Form.Item>
            <Form.Item name="startPrice" label="起拍价" rules={[{ required: true }]}>
              <Input type="number" placeholder="请输入起拍价" />
            </Form.Item>
            <Form.Item name="incrementPrice" label="加价幅度" rules={[{ required: true }]}>
              <Input type="number" placeholder="请输入加价幅度" />
            </Form.Item>
            <Form.Item name="ceilingPrice" label="封顶价">
              <Input type="number" placeholder="请输入封顶价（可选）" />
            </Form.Item>
            <Form.Item name="durationSeconds" label="持续时间（秒）">
              <Input type="number" placeholder="请输入持续时间" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="创建直播间"
          open={goodsModalVisible && !currentRoom}
          onOk={handleCreateRoom}
          onCancel={() => setGoodsModalVisible(false)}
          width={500}
        >
          <Form form={goodsForm} layout="vertical">
            <Form.Item name="roomName" label="直播间名称" rules={[{ required: true }]}>
              <Input placeholder="请输入直播间名称" />
            </Form.Item>
            <Form.Item label="封面图片">
              <Upload
                name="file"
                accept="image/*"
                action="/api/upload/image"
                headers={{ Authorization: `Bearer ${token}` }}
                showUploadList={false}
                onChange={(info) => {
                  if (info.file.status === 'done') {
                    const url = info.file.response?.data
                    if (url) {
                      goodsForm.setFieldsValue({ coverUrl: url })
                      message.success('上传成功')
                    }
                  } else if (info.file.status === 'error') {
                    message.error('上传失败')
                  }
                }}
              >
                <Button icon={<PlusOutlined />}>上传封面</Button>
              </Upload>
            </Form.Item>
            <Form.Item name="coverUrl" label="封面图URL">
              <Input placeholder="也可手动输入封面图URL（可选）" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={currentRoom ? `管理商品 - ${currentRoom.roomName}` : '管理商品'}
          open={!!currentRoom && goodsModalVisible}
          onCancel={() => { setGoodsModalVisible(false); setCurrentRoom(null) }}
          footer={null}
          width={650}
        >
          <div style={{ marginBottom: 16 }}>
            <Form form={roomGoodsForm} layout="inline" onFinish={handleAddRoomGoods}>
              <Form.Item name="sessionId" label="选择拍卖场次" rules={[{ required: true, message: '请选择' }]}>
                <Select
                  placeholder="选择竞拍场次"
                  style={{ width: 300 }}
                  showSearch
                  optionFilterProp="label"
                  options={auctions
                    .filter(a => a.status !== 2 && !roomGoods.some(g => g.sessionId === a.id))
                    .map(a => ({ label: `场次#${a.id} - ${(a as any).goodsName || '商品#' + a.goodsId} (起拍¥${a.startPrice})`, value: a.id }))}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">上架</Button>
              </Form.Item>
            </Form>
          </div>
          <Table
            loading={roomGoodsLoading}
            dataSource={roomGoods}
            rowKey="sessionId"
            columns={[
              { title: '场次ID', dataIndex: 'sessionId', width: 80 },
              { title: '商品名称', dataIndex: 'goodsName' },
              { title: '起拍价', dataIndex: 'startPrice', render: (v: number) => `¥${v || 0}` },
              { title: '加价幅度', dataIndex: 'incrementPrice', render: (v: number) => `¥${v || 0}` },
              { title: '状态', dataIndex: 'status', render: (v: number) => { const { text, color } = getStatusText(v); return <Tag color={color}>{text}</Tag>; } },
              {
                title: '操作', width: 180,
                render: (_: any, record: any) => (
                  <Space>
                    {record.status === 0 && (
                      <Popconfirm title="确定开始竞拍？倒计时将立即启动" onConfirm={async () => {
                        try {
                          await api.put(`/api/auction/start/${record.sessionId}`)
                          message.success('竞拍已开始！')
                          handleOpenGoodsModal(currentRoom!)
                        } catch { message.error('开始失败') }
                      }}>
                        <Button type="primary" size="small" icon={<PlayCircleOutlined />}>开始拍卖</Button>
                      </Popconfirm>
                    )}
                    <Popconfirm title="确定下架？" onConfirm={() => handleRemoveRoomGoods(record.sessionId)}>
                      <Button danger size="small">下架</Button>
                    </Popconfirm>
                  </Space>
                )
              }
            ]}
            pagination={false}
          />
        </Modal>
      </Layout>
    </ConfigProvider>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
