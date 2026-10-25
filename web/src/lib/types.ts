// Sedap POS — tipe data API
export type Role = 'admin' | 'cashier'
export type OrderType = 'dine-in' | 'takeaway' | 'delivery'
export type PaymentMethod = 'cash' | 'qris' | 'debit' | 'credit'
export type OrderStatus = 'open' | 'paid' | 'void'

export interface AuthUser {
  id: number
  name: string
  username: string
  role: Role
}

export interface Category {
  id: number
  name: string
  emoji: string
  sort: number
  product_count?: number
}

export interface ProductModifier {
  id: number
  group_name: string
  name: string
  price: number
}

export interface Product {
  id: number
  category_id: number
  category_name?: string
  name: string
  description: string
  emoji: string
  price: number
  cost: number
  stock: number // -1 = tidak dilacak
  low_stock_at: number
  is_available: number
  sort: number
  photo_url?: string | null
  modifiers?: ProductModifier[]
  modifier_ids?: number[]
}

export interface Modifier extends ProductModifier {
  product_count?: number
}

export interface Table {
  id: number
  name: string
  capacity: number
  status: 'available' | 'occupied' | 'reserved'
}

export interface Shift {
  id: number
  user_id: number
  started_at: string
  ended_at: string | null
  starting_cash: number
  ending_cash: number | null
  status: 'open' | 'closed'
  user_name?: string
  expected_cash?: number
  cash_total?: number
  qris_total?: number
  debit_total?: number
  credit_total?: number
  revenue_total?: number
  orders_count?: number
  items_sold?: number
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number | null
  name: string
  unit_price: number
  qty: number
  modifiers: string
  line_total: number
  notes: string
}

export interface Order {
  id: number
  order_number: string
  type: OrderType
  table_id: number | null
  table_name: string | null
  shift_id: number | null
  user_id: number
  customer_name: string
  customer_phone: string
  subtotal: number
  discount: number
  tax_rate: number
  service_rate: number
  tax_amount: number
  service_amount: number
  total: number
  payment_method: PaymentMethod | null
  paid_amount: number | null
  change_amount: number | null
  status: OrderStatus
  notes: string
  created_at: string
  paid_at: string | null
  items?: OrderItem[]
  cashier_name?: string
  item_count?: number
}

export interface Rates {
  tax_enabled: boolean
  tax_pct: number
  service_enabled: boolean
  service_pct: number
}

export interface Meta {
  store_name: string
  tagline: string
  receipt_footer: string
  logo_url?: string | null
  rates: Rates
}

export interface StoreInfo {
  store_name: string
  tagline: string
  logo_url?: string | null
}

export interface Summary {
  orders_count: number
  revenue: number
  avg_order: number
  items_sold: number
  est_cost: number
  est_profit: number
  cash_total: number
  qris_total: number
  debit_total: number
  credit_total: number
  tax_service: number
}

export interface DashboardData {
  kpi: Summary
  trend: { date: string; revenue: number; orders_count: number }[]
  top_products: { name: string; qty: number; revenue: number }[]
  recent_orders: {
    id: number
    order_number: string
    type: OrderType
    total: number
    payment_method: PaymentMethod | null
    paid_at: string | null
    status: OrderStatus
    cashier_name: string
  }[]
  low_stock: { id: number; name: string; emoji: string; stock: number; low_stock_at: number }[]
  category_mix: { category: string; revenue: number }[]
}

export interface SalesReport {
  from: string
  to: string
  summary: Summary
  prev: Summary
  best_sellers: { name: string; qty: number; revenue: number; avg_price: number }[]
  hourly: { hour: number; revenue: number; orders_count: number }[]
  daily: { date: string; revenue: number; orders_count: number }[]
  by_type: { type: OrderType; orders_count: number; revenue: number }[]
}

export interface Settings {
  [key: string]: string
}
