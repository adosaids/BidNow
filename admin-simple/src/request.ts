const BASE_URL = 'http://localhost:8082'

async function request(url: string, options?: RequestInit) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  }
  const finalOptions: RequestInit = { ...options, headers, credentials: 'include' }
  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  } else {
    delete finalOptions.body
  }
  const res = await fetch(`${BASE_URL}${url}`, finalOptions)
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (data.code !== 200) throw new Error(data.message || '请求失败')
  return data.data
}

export const api = {
  get: (url: string) => request(url),
  post: (url: string, body?: any) => {
    if (body !== undefined) {
      return request(url, { method: 'POST', body: JSON.stringify(body) })
    } else {
      return request(url, { method: 'POST' })
    }
  },
  put: (url: string, body?: any) => {
    if (body !== undefined) {
      return request(url, { method: 'PUT', body: JSON.stringify(body) })
    } else {
      return request(url, { method: 'PUT' })
    }
  },
  delete: (url: string) => request(url, { method: 'DELETE' }),
}
