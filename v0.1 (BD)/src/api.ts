import type { User, Product, CartItem, Order, Address, PaymentMethod, SalesReport } from './types'
let csrfToken: string | null = null
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
async function request<T>(path: string, method = 'GET', data?: unknown, key?: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const headers: Record<string, string> = {}
    if (method !== 'GET') headers['Content-Type'] = 'application/json'
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
    if (key) headers['Idempotency-Key'] = key
    const response = await fetch(`/api${path}`, {
      method, headers, credentials: 'same-origin', signal: controller.signal,
      body: method === 'GET' ? undefined : JSON.stringify(data ?? {}),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      const detail = result.details?.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join(' ')
      throw new ApiError(response.status, detail || result.error || 'Não foi possível concluir a operação.')
    }
    return result as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(0, 'Sem conexão com o servidor. Confira sua conexão e tente novamente.')
  } finally { clearTimeout(timer) }
}
export interface AppConfig { paymentMode: 'mock' | 'disabled'; demoAccounts: boolean; reservationMinutes: number }
export const api = {
  config: () => request<AppConfig>('/config'),
  session: async () => {
    const session = await request<{ user: User | null; csrfToken: string | null }>('/auth/session')
    csrfToken = session.csrfToken
    return session.user
  },
  login: async (email: string, password: string) => {
    const result = await request<{ user: User; csrfToken: string }>('/auth/login', 'POST', { email, password })
    csrfToken = result.csrfToken
    return result.user
  },
  register: (data: { name: string; email: string; phone: string; password: string }) => request('/auth/register', 'POST', data),
  logout: async () => { await request('/auth/logout', 'POST'); csrfToken = null },
  products: (admin = false) => request<Product[]>(`/products${admin ? '?includeInactive=true' : ''}`),
  orders: () => request<Order[]>('/orders'),
  cart: () => request<CartItem[]>('/cart'),
  setCartItem: (id: number, quantity: number) => request<CartItem[]>(`/cart/items/${id}`, 'PUT', { quantity }),
  checkout: (payment: PaymentMethod, address: Address, key: string) => request<Order>('/orders', 'POST', { payment, address }, key),
  sale: (items: CartItem[], payment: PaymentMethod, key: string) => request<Order>('/pdv/sales', 'POST', {
    payment, items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
  }, key),
  confirmPayment: (id: string) => request<Order>(`/orders/${id}/payments/mock-confirm`, 'POST'),
  cancelOrder: (id: string) => request<Order>(`/orders/${id}/cancel`, 'POST'),
  updateStatus: (id: string, status: string) => request<Order>(`/orders/${id}/status`, 'PATCH', { status }),
  saveProduct: (p: Product | Omit<Product, 'id'>, create = false) => {
    const { brand, name, description, specs, volume, price, category, minStock, barcode, active } = p
    const image = p.image || '/icons/icon-192.png'
    const data = { brand, name, description, specs, volume, price, category, minStock, barcode, image, active }
    return create ? request<Product>('/products', 'POST', { ...data, stock: p.stock })
      : request<Product>(`/products/${(p as Product).id}`, 'PATCH', data)
  },
  receiveStock: (id: number, quantity: number) => request(`/inventory/${id}/receipts`, 'POST', { quantity, reason: 'Entrada de mercadoria pelo painel' }),
  report: (from: string, to: string) => request<SalesReport>(`/reports/sales?from=${from}&to=${to}`),
}
