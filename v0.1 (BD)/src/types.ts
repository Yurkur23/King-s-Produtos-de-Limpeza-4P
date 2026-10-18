export type Category = 'Todos' | 'Limpeza Geral' | 'Limpeza Automotiva' | 'Equipamentos'
export type UserRole = 'cliente' | 'funcionario' | 'admin'
export type OrderStatus = 'Aguardando Pagamento' | 'Confirmado' | 'Em Separação' | 'Enviado' | 'Entregue' | 'Cancelado' | 'Expirado'
export type CustomerView = 'catalog' | 'checkout' | 'orders' | 'confirmation'
export type AdminTab = 'dashboard' | 'products' | 'inventory' | 'orders' | 'reports'
export type AdminSection = 'panel' | 'store' | 'pdv'

export interface Product {
  id: number
  brand: string
  name: string
  description: string
  specs: string[]
  price: number
  category: Exclude<Category, 'Todos'>
  volume: string
  stock: number
  physicalStock?: number
  reservedStock?: number
  minStock: number
  barcode: string
  image: string
  active: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  date: string
  items: CartItem[]
  total: number
  status: OrderStatus
  payment: PaymentMethod
  address: string
  customer: string
  userId: number
  databaseId: string
  channel: 'online' | 'pdv'
  createdAt: string
  paidAt: string | null
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'expired'
  paymentProvider: 'mock' | 'pos'
  expiresAt: string | null
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  cpf?: string
  phone?: string
  sector?: string
}

export type PaymentMethod = 'Pix' | 'Cartão'
export interface Address {
  name: string; email: string; phone: string; cep: string; street: string; number: string;
  complement: string; city: string; state: string
}
export interface SalesReport {
  from: string; to: string; count: number; revenue: number; average: number; delivered: number;
  topProducts: { id: number; name: string; units: number; revenue: number }[]; orders: Order[]
}
