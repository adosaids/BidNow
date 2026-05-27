import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, Layout, Menu, theme, Button, Table, Input, Space, Modal, Form, message, Popconfirm, Tag, Descriptions } from 'antd'
import { ShoppingOutlined, TrophyOutlined, OrderedListOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, PlayCircleOutlined, PauseCircleOutlined, EyeOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'

const { Header, Sider, Content } = Layout

type PageType = 'product' | 'auction' | 'order'

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState<PageType>('product')
  const {
    token: { colorBgContainer }
  } = theme.useToken()

  const renderContent = () => {
    if (currentPage === 'product') {
      return <ProductPage />
    } else if (currentPage === 'auction') {
      return <AuctionPage />
    } else {
      return <OrderPage />
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          商家后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          items={[
            { key: 'product', icon: <ShoppingOutlined />, label: '商品管理' },
            { key: 'auction', icon: <TrophyOutlined />, label: '竞拍管理' },
            { key: 'order', icon: <OrderedListOutlined />, label: '订单管理' }
          ]}
          onClick={({ key }) => setCurrentPage(key as PageType)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <div style={{ paddingLeft: 24, fontSize: 16, fontWeight: 500 }}>
            竞拍平台商家管理系统
          </div>
        </Header>
        <Content style={{ margin: '24px', background: colorBgContainer, padding: 24, borderRadius: 6 }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
}

interface Product {
  id?: number
  name: string
  description: string
  price?: number
  stock?: number
  createTime?: string
}

const ProductPage: React.FC = () => {
  const [data, setData] = React.useState<Product[]>([])
  const [modalVisible, setModalVisible] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [keyword, setKeyword] = React.useState('')
  const [form] = Form.useForm()

  React.useEffect(() => {
    setData([
      { id: 1, name: '和田玉吊坠', description: '新疆和田羊脂白玉吊坠，质地细腻', price: 2999, stock: 1, createTime: '2026-05-20 10:00:00' },
      { id: 2, name: '清代青花瓷瓶', description: '清乾隆年间青花瓷瓶，保存完好', price: 88888, stock: 1, createTime: '2026-05-20 11:00:00' }
    ])
  }, [])

  const handleAdd = () => {
    setEditingProduct(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Product) => {
    setEditingProduct(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleModalOk = async () => {
    try {
      await form.validateFields()
      message.success(editingProduct?.id ? '编辑成功' : '新增成功')
      setModalVisible(false)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="搜索商品名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增商品</Button>
      </div>
      <Table
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '商品名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '价格', dataIndex: 'price', render: (val) => `¥${val}` },
          { title: '库存', dataIndex: 'stock' },
          { title: '创建时间', dataIndex: 'createTime' },
          {
            title: '操作', width: 180,
            render: (_, record) => (
              <Space>
                <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
                <Popconfirm title="确定删除？" onConfirm={() => message.success('删除成功')}>
                  <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
        dataSource={data}
        rowKey="id"
        pagination={{ total: 2 }}
      />
      <Modal
        title={editingProduct ? '编辑商品' : '新增商品'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item name="description" label="商品描述" rules={[{ required: true, message: '请输入商品描述' }]}>
            <Input.TextArea rows={3} placeholder="请输入商品描述" />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
            <Input type="number" placeholder="请输入价格" />
          </Form.Item>
          <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入库存' }]}>
            <Input type="number" placeholder="请输入库存" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

interface Auction {
  id?: number
  productName?: string
  startPrice?: number
  currentPrice?: number
  status?: number
  startTime?: string
  endTime?: string
}

const AuctionPage: React.FC = () => {
  const [data, setData] = React.useState<Auction[]>([])

  React.useEffect(() => {
    setData([
      { id: 1, productName: '和田玉吊坠', startPrice: 0, currentPrice: 500, status: 0, startTime: '-', endTime: '-' },
      { id: 2, productName: '清代青花瓷瓶', startPrice: 1000, currentPrice: 2500, status: 1, startTime: '2026-05-21 10:00:00', endTime: '2026-05-21 11:00:00' }
    ])
  }, [])

  const getStatusText = (status: number) => {
    const map: Record<number, { text: string; color: string }> = {
      0: { text: '待开始', color: 'default' },
      1: { text: '进行中', color: 'processing' },
      2: { text: '已结束', color: 'success' },
      3: { text: '已取消', color: 'error' }
    }
    return map[status] || { text: '未知', color: 'default' }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 500 }}>竞拍场次管理</div>
      <Table
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '商品名称', dataIndex: 'productName' },
          { title: '起拍价', dataIndex: 'startPrice', render: (val) => `¥${val}` },
          { title: '当前价格', dataIndex: 'currentPrice', render: (val) => val ? `¥${val}` : '-' },
          { title: '状态', dataIndex: 'status', render: (val) => { const { text, color } = getStatusText(val); return <Tag color={color}>{text}</Tag>; } },
          { title: '开始时间', dataIndex: 'startTime' },
          { title: '结束时间', dataIndex: 'endTime' },
          {
            title: '操作', width: 200,
            render: (_, record) => (
              <Space>
                {record.status === 0 && (
                  <Popconfirm title="确定开始竞拍？" onConfirm={() => message.success('竞拍已开始')}>
                    <Button type="primary" icon={<PlayCircleOutlined />}>开始竞拍</Button>
                  </Popconfirm>
                )}
                {(record.status === 0 || record.status === 1) && (
                  <Popconfirm title="确定取消竞拍？" onConfirm={() => message.success('竞拍已取消')}>
                    <Button danger icon={<PauseCircleOutlined />}>取消竞拍</Button>
                  </Popconfirm>
                )}
              </Space>
            )
          }
        ]}
        dataSource={data}
        rowKey="id"
        pagination={{ total: 2 }}
      />
    </div>
  )
}

interface Order {
  id?: number
  orderNo?: string
  productName?: string
  userName?: string
  finalPrice?: number
  status?: number
  createTime?: string
  payTime?: string
}

const OrderPage: React.FC = () => {
  const [data, setData] = React.useState<Order[]>([])
  const [detailModalVisible, setDetailModalVisible] = React.useState(false)
  const [currentOrder, setCurrentOrder] = React.useState<Order | null>(null)

  React.useEffect(() => {
    setData([
      { id: 1, orderNo: 'ORD202605210001', productName: '和田玉吊坠', userName: '张三', finalPrice: 500, status: 0, createTime: '2026-05-21 10:30:00' },
      { id: 2, orderNo: 'ORD202605210002', productName: '清代青花瓷瓶', userName: '李四', finalPrice: 2500, status: 1, createTime: '2026-05-21 11:00:00', payTime: '2026-05-21 11:05:00' }
    ])
  }, [])

  const getStatusText = (status: number) => {
    const map: Record<number, { text: string; color: string }> = {
      0: { text: '待支付', color: 'orange' },
      1: { text: '已支付', color: 'green' },
      2: { text: '已发货', color: 'blue' },
      3: { text: '已完成', color: 'success' },
      4: { text: '已取消', color: 'red' }
    }
    return map[status] || { text: '未知', color: 'default' }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 500 }}>订单管理</div>
      <Table
        columns={[
          { title: '订单号', dataIndex: 'orderNo', width: 180 },
          { title: '商品名称', dataIndex: 'productName' },
          { title: '买家', dataIndex: 'userName' },
          { title: '成交价格', dataIndex: 'finalPrice', render: (val) => `¥${val}` },
          { title: '状态', dataIndex: 'status', render: (val) => { const { text, color } = getStatusText(val); return <Tag color={color}>{text}</Tag>; } },
          { title: '创建时间', dataIndex: 'createTime' },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" icon={<EyeOutlined />} onClick={() => { setCurrentOrder(record); setDetailModalVisible(true); }}>查看详情</Button>
              </Space>
            )
          }
        ]}
        dataSource={data}
        rowKey="id"
        pagination={{ total: 2 }}
      />
      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[<Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>]}
        width={600}
      >
        {currentOrder && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="订单号">{currentOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="商品名称">{currentOrder.productName}</Descriptions.Item>
            <Descriptions.Item label="买家">{currentOrder.userName}</Descriptions.Item>
            <Descriptions.Item label="成交价格">¥{currentOrder.finalPrice}</Descriptions.Item>
            <Descriptions.Item label="订单状态">{getStatusText(currentOrder.status).text}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{currentOrder.createTime}</Descriptions.Item>
            <Descriptions.Item label="支付时间">{currentOrder.payTime || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
