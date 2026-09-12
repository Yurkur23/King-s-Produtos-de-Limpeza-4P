import { useState, useMemo, useRef, useEffect } from 'react'
import kingsEmblem from './imports/unnamed-removebg-preview.png'

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = 'Todos' | 'Limpeza Geral' | 'Limpeza Automotiva' | 'Equipamentos'
type UserRole = 'cliente' | 'funcionario' | 'admin'
type OrderStatus = 'Aguardando Pagamento' | 'Confirmado' | 'Em Separação' | 'Enviado' | 'Entregue'
type CustomerView = 'catalog' | 'checkout' | 'orders' | 'confirmation'
type AdminTab = 'dashboard' | 'products' | 'inventory' | 'orders' | 'reports'
type AdminSection = 'panel' | 'store' | 'pdv'

interface Product {
  id: number
  brand: string
  name: string
  description: string
  specs: string[]
  price: number
  category: Exclude<Category, 'Todos'>
  volume: string
  stock: number
  minStock: number
  barcode: string
  image: string
  active: boolean
}

interface CartItem {
  product: Product
  quantity: number
}

interface Order {
  id: string
  date: string
  items: CartItem[]
  total: number
  status: OrderStatus
  payment: 'Pix' | 'Cartão'
  address: string
  customer: string
}

interface User {
  id: number
  name: string
  email: string
  password: string
  role: UserRole
  cpf?: string
  phone?: string
  sector?: string
}

// ─── Mock Users ───────────────────────────────────────────────────────────────

const MOCK_USERS: User[] = [
  { id: 1, name: 'Carlos Administrador', email: 'admin@kings.com.br', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Rafael Funcionário', email: 'funcionario@kings.com.br', password: 'func123', role: 'funcionario', sector: 'Atendimento' },
  { id: 3, name: 'Maria Silva', email: 'cliente@email.com', password: 'cliente123', role: 'cliente', cpf: '012.345.678-90', phone: '(11) 98765-4321' },
]

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PRODUCTS: Product[] = [
  // ── VONIXX ──
  {
    id: 1, brand: 'VONIXX', name: 'Intense', volume: '500ml', price: 44,
    description: 'Limpador de interiores automotivos de alto desempenho. Atua sobre plásticos, painéis, couro, borracha e revestimentos internos, removendo sujeiras e deixando superfícies levemente hidratadas sem aspecto gorduroso.',
    specs: ['Superfícies internas', 'pH neutro', 'Não resseca materiais', 'Pronto para uso'],
    category: 'Limpeza Automotiva', stock: 18, minStock: 5, barcode: '7898615710101',
    image: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 2, brand: 'VONIXX', name: 'Glazy', volume: '500ml', price: 38,
    description: 'O Glazy da Vonixx serve para limpar, condicionar e proteger vidros e superfícies lisas de automóveis ou eletrônicos. Ele cria uma película de toque liso que diminui o atrito das palhetas do limpador, evitando riscos e marcas d\'água. O produto também possui uma versão específica (Anti-Fog) que impede o embaçamento interno dos vidros em dias frios ou chuvosos.',
    specs: ['Efeito hidrofóbico', 'Sem amônia', 'Para vidros e espelhos', 'Sem manchas'],
    category: 'Limpeza Automotiva', stock: 24, minStock: 5, barcode: '7898615710102',
    image: 'https://images.unsplash.com/photo-1527515637462-cff94edd56f9?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 3, brand: 'VONIXX', name: 'Delet', volume: '500ml', price: 38,
    description: 'Vonixx Delet é um limpador de alta performance desenvolvido para remover sujeiras severas, óleos e graxas de pneus e borrachas. Ele elimina o aspecto encardido e marrom, devolvendo a cor preta original e deixando a superfície totalmente preparada para receber condicionadores.',
    specs: ['Reação química visível', 'Remove contaminação ferrosa', 'Remove alcatrão', 'Seguro para pinturas envernizadas'],
    category: 'Limpeza Automotiva', stock: 3, minStock: 5, barcode: '7898615710103',
    image: 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 4, brand: 'VONIXX', name: 'Prizm', volume: '500ml', price: 44,
    description: 'Quick detailer com tecnologia SiO2 para acabamento brilhoso e proteção de curta duração entre lavagens. Ideal para retoques rápidos, remove poeira fina e marcas leves enquanto deposita uma fina camada de proteção.',
    specs: ['Tecnologia SiO2', 'Brilho intenso', 'Proteção rápida', 'Uso entre lavagens'],
    category: 'Limpeza Automotiva', stock: 15, minStock: 5, barcode: '7898615710104',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 5, brand: 'VONIXX', name: 'Plus', volume: '500ml', price: 42,
    description: 'Limpador multiuso concentrado para uso externo e interno. Dilúível em diferentes concentrações conforme o nível de sujeira, atuando desde a limpeza leve de tecidos e carpetes até descontaminação pesada de rodas e pneus.',
    specs: ['Concentrado (diluível)', 'Multiuso interno/externo', 'Alta versatilidade', 'Fórmula biodegradável'],
    category: 'Limpeza Automotiva', stock: 30, minStock: 8, barcode: '7898615710105',
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 6, brand: 'VONIXX', name: 'Sio2 Pro', volume: '500ml', price: 56,
    description: 'Selante cerâmico spray profissional com alta concentração de SiO2. Proporciona proteção duradoura, repelência à água com efeito beading pronunciado e brilho intenso. Compatível com carrocerias enceradas ou com coating.',
    specs: ['Alta concentração SiO2', 'Durabilidade de até 3 meses', 'Efeito beading extremo', 'Superfícies pintadas, cromadas e plásticas'],
    category: 'Limpeza Automotiva', stock: 8, minStock: 4, barcode: '7898615710106',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 7, brand: 'VONIXX', name: 'Restaurax', volume: '500ml', price: 65,
    description: 'Restaurax é um renovador de alta performance desenvolvido para restaurar e proteger plásticos internos e externos. Ele renova superfícies desgastadas pelo tempo, devolve o brilho original da peça e evita que ela resseque ou desbote devido à ação dos raios UV.',
    specs: ['Restaura plásticos desbotados', 'Resistente à lavagem', 'Sem silicone oleoso', 'Para uso interno e externo'],
    category: 'Limpeza Automotiva', stock: 2, minStock: 5, barcode: '7898615710107',
    image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 8, brand: 'VONIXX', name: 'V-Floc', volume: '500ml', price: 32,
    description: 'Snow foam concentrado para pré-lavagem automotiva. Gera espuma densa que envolve a carroceria, amolecendo e suspendendo partículas de sujeira pesada antes da lavagem com água, reduzindo o risco de marcar a pintura.',
    specs: ['Pré-lavagem sem contato', 'Espuma densa e aderente', 'Compatível com lança-espuma', 'Seguro para pinturas e plásticos'],
    category: 'Limpeza Automotiva', stock: 22, minStock: 5, barcode: '7898615710108',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=600&fit=crop&auto=format', active: true,
  },
  // ── MAGIL CLEAN ──
  {
    id: 9, brand: 'MAGIL CLEAN', name: 'Ultra Limpador', volume: '1,15L', price: 68,
    description: 'Limpador multiuso profissional de alta concentração. Eficaz na remoção de gordura, fuligem, graxas e sujeiras incrustadas em ambientes domésticos, comerciais e industriais. Pode ser diluído para economizar e adaptar ao uso.',
    specs: ['Alta concentração', 'Diluível 1:10 a 1:50', 'Uso doméstico e industrial', 'Remove gordura pesada'],
    category: 'Limpeza Geral', stock: 12, minStock: 4, barcode: '7897452310001',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 10, brand: 'MAGIL CLEAN', name: 'Ultra Limpador', volume: '5L', price: 162,
    description: 'Versão econômica 5L do Ultra Limpador Magil Clean para uso intensivo. Ideal para empresas, oficinas e estabelecimentos com alta demanda de limpeza. Mesmo poder de remoção de gordura e sujeira com melhor custo por uso.',
    specs: ['Embalagem econômica 5L', 'Alta concentração', 'Uso profissional', 'Custo reduzido por litro'],
    category: 'Limpeza Geral', stock: 6, minStock: 3, barcode: '7897452310002',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&h=600&fit=crop&auto=format', active: true,
  },
  // ── JANU ──
  {
    id: 11, brand: 'JANU', name: 'Janu Black', volume: '1L', price: 38,
    description: 'Renovador e escurecedor de pneus e borrachas. Proporciona acabamento escuro, uniforme e brilhante nos pneus, restaurando a aparência de novo. Também atua em borrachas de para-choque e peças externas de borracha.',
    specs: ['Renova cor dos pneus', 'Efeito brilho intenso', 'Resistente à água', 'Aplicação rápida'],
    category: 'Limpeza Automotiva', stock: 4, minStock: 5, barcode: '7899871220011',
    image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 12, brand: 'JANU', name: 'Janu Black', volume: '5L', price: 90,
    description: 'Embalagem profissional 5L do Janu Black para quem usa em grande volume. Ideal para lava-rápidos, detailers e oficinas. Mesmo resultado de acabamento escuro e brilhante nos pneus com excelente rendimento.',
    specs: ['Embalagem profissional 5L', 'Alto rendimento', 'Ideal para lava-rápidos', 'Brilho e escurecimento intenso'],
    category: 'Limpeza Automotiva', stock: 7, minStock: 3, barcode: '7899871220012',
    image: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600&h=600&fit=crop&auto=format', active: true,
  },
  // ── SIGMA ──
  {
    id: 13, brand: 'SIGMA', name: 'Snow Pump', volume: '2L', price: 75,
    description: 'Bomba de espuma manual para aplicação de snow foam e produtos de pré-lavagem. Gera espuma densa com ajuste de concentração no bocal. Compatível com qualquer shampoo ou snow foam. Reservatório translúcido para controle de nível.',
    specs: ['Reservatório 2L translúcido', 'Bocal com regulagem de espuma', 'Compatível com qualquer produto', 'Resistente a produtos químicos'],
    category: 'Limpeza Automotiva', stock: 9, minStock: 3, barcode: '7895631340013',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=600&fit=crop&auto=format', active: true,
  },
  {
    id: 14, brand: 'SIGMA', name: 'Banqueta para Mecânico', volume: 'Unidade', price: 299,
    description: 'Banqueta giratória resistente para mecânicos e profissionais de detailing. Altura ajustável com rodízios de borracha para deslizamento suave no piso. Assento acolchoado para longas jornadas de trabalho. Suporta até 120 kg.',
    specs: ['Altura regulável', 'Rodízios emborrachados', 'Assento acolchoado', 'Capacidade 120 kg', 'Estrutura em aço'],
    category: 'Equipamentos', stock: 3, minStock: 2, barcode: '7895631340014',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=600&fit=crop&auto=format', active: true,
  },
]

const INITIAL_ORDERS: Order[] = [
  { id: 'KNG-2408-001', date: '15/08/2024', items: [{ product: INITIAL_PRODUCTS[0], quantity: 2 }, { product: INITIAL_PRODUCTS[7], quantity: 1 }], total: 120, status: 'Entregue', payment: 'Pix', address: 'Rua das Flores, 123 — Centro, São Paulo/SP', customer: 'Maria Silva' },
  { id: 'KNG-2408-002', date: '18/08/2024', items: [{ product: INITIAL_PRODUCTS[5], quantity: 1 }, { product: INITIAL_PRODUCTS[12], quantity: 1 }], total: 131, status: 'Em Separação', payment: 'Cartão', address: 'Av. Paulista, 456 — Bela Vista, São Paulo/SP', customer: 'João Pereira' },
  { id: 'KNG-2408-003', date: '20/08/2024', items: [{ product: INITIAL_PRODUCTS[3], quantity: 1 }, { product: INITIAL_PRODUCTS[4], quantity: 1 }, { product: INITIAL_PRODUCTS[1], quantity: 1 }], total: 124, status: 'Confirmado', payment: 'Pix', address: 'Rua Augusta, 789 — Consolação, São Paulo/SP', customer: 'Ana Costa' },
  { id: 'KNG-2408-004', date: '21/08/2024', items: [{ product: INITIAL_PRODUCTS[9], quantity: 1 }, { product: INITIAL_PRODUCTS[10], quantity: 1 }], total: 106, status: 'Aguardando Pagamento', payment: 'Cartão', address: 'Rua Oscar Freire, 321 — Jardins, São Paulo/SP', customer: 'Carlos Mendes' },
  { id: 'KNG-2408-005', date: '22/08/2024', items: [{ product: INITIAL_PRODUCTS[6], quantity: 1 }, { product: INITIAL_PRODUCTS[2], quantity: 1 }], total: 103, status: 'Confirmado', payment: 'Pix', address: 'Al. Santos, 654 — Cerqueira César, São Paulo/SP', customer: 'Fernanda Lima' },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

const STATUS_COLORS: Record<OrderStatus, string> = {
  'Aguardando Pagamento': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  'Confirmado': 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  'Em Separação': 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  'Enviado': 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  'Entregue': 'bg-green-500/15 text-green-400 border border-green-500/30',
}

const CATEGORIES: Category[] = ['Todos', 'Limpeza Automotiva', 'Limpeza Geral', 'Equipamentos']

// ─── Login Page ──────────────────────────────────────────────────────────────

interface LoginPageProps {
  onLogin: (user: User) => void
  registeredUsers: User[]
  onRegister: (user: User) => void
}

function LoginPage({ onLogin, registeredUsers, onRegister }: LoginPageProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Register form
  const [reg, setReg] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)

  const allUsers = [...MOCK_USERS, ...registeredUsers]

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
      if (user) {
        onLogin(user)
      } else {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.')
      }
      setLoading(false)
    }, 700)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (!reg.name || !reg.email || !reg.password) {
      setRegError('Preencha todos os campos obrigatórios.')
      return
    }
    if (reg.password !== reg.confirm) {
      setRegError('As senhas não coincidem.')
      return
    }
    if (reg.password.length < 6) {
      setRegError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (allUsers.find(u => u.email.toLowerCase() === reg.email.toLowerCase())) {
      setRegError('Este e-mail já está cadastrado.')
      return
    }
    const newUser: User = {
      id: Date.now(),
      name: reg.name,
      email: reg.email,
      password: reg.password,
      role: 'cliente',
      phone: reg.phone,
    }
    onRegister(newUser)
    setRegSuccess(true)
    setTimeout(() => {
      setTab('login')
      setEmail(reg.email)
      setRegSuccess(false)
      setReg({ name: '', email: '', phone: '', password: '', confirm: '' })
    }, 2000)
  }

  const fillDemo = (role: UserRole) => {
    const u = MOCK_USERS.find(u => u.role === role)!
    setEmail(u.email)
    setPassword(u.password)
    setError('')
    setTab('login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0A0A' }}>
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12 relative overflow-hidden" style={{ background: '#111111', borderRight: '1px solid #2C2C2C' }}>
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.06]" style={{ background: '#F5C800' }} />
          <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full opacity-[0.04]" style={{ background: '#F5C800' }} />
          <svg className="absolute bottom-0 right-0 opacity-5" width="300" height="300" viewBox="0 0 300 300" fill="none">
            <path d="M50 260L120 80L180 160L240 80L300 260H50Z" stroke="#F5C800" strokeWidth="2" fill="none"/>
            <circle cx="50" cy="55" r="22" stroke="#F5C800" strokeWidth="2" fill="none"/>
            <circle cx="150" cy="30" r="18" stroke="#F5C800" strokeWidth="2" fill="none"/>
            <circle cx="250" cy="55" r="22" stroke="#F5C800" strokeWidth="2" fill="none"/>
          </svg>
        </div>

        <div className="relative z-10">
          <div className="mb-16">
            <KingsLogo size="lg" />
          </div>

          <h1 className="font-display font-900 text-5xl uppercase leading-none tracking-wide text-ktext mb-4">
            Produtos de<br /><span className="text-ky">Limpeza</span>
          </h1>
          <p className="text-kmuted text-sm leading-relaxed max-w-xs">
            Plataforma de vendas online e gestão integrada para clientes, funcionários e administradores.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <p className="font-display font-700 text-xs uppercase tracking-widest text-kmuted">Acesso rápido — protótipo</p>
          {[
            { role: 'cliente' as UserRole, label: 'Cliente', email: 'cliente@email.com', color: 'border-kborder hover:border-ky/50' },
            { role: 'funcionario' as UserRole, label: 'Funcionário', email: 'funcionario@kings.com.br', color: 'border-kborder hover:border-blue-500/50' },
            { role: 'admin' as UserRole, label: 'Administrador', email: 'admin@kings.com.br', color: 'border-kborder hover:border-purple-500/50' },
          ].map(item => (
            <button
              key={item.role}
              onClick={() => fillDemo(item.role)}
              className={`w-full text-left p-3 border transition-all ${item.color}`}
              style={{ background: '#0D0D0D' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-700 text-sm uppercase tracking-wide text-ktext">{item.label}</p>
                  <p className="text-xs text-kmuted mt-0.5">{item.email}</p>
                </div>
                <svg className="text-kmuted" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </div>
            </button>
          ))}
          <p className="text-xs text-kmuted/60">Clique para preencher as credenciais automaticamente</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <KingsLogo size="md" />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-kborder mb-8">
            {[
              { key: 'login', label: 'Entrar' },
              { key: 'register', label: 'Criar conta' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key as 'login' | 'register'); setError(''); setRegError('') }}
                className={`font-display font-700 text-sm uppercase tracking-wider pb-3 pr-6 border-b-2 transition-all ${
                  tab === t.key ? 'border-ky text-ky' : 'border-transparent text-kmuted hover:text-ktext'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5 fade-in">
              <div>
                <h2 className="font-display font-900 text-3xl uppercase tracking-wide text-ktext mb-1">Bem-vindo</h2>
                <p className="text-sm text-kmuted">Entre com suas credenciais para acessar</p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-display font-700 uppercase tracking-wider text-kmuted mb-1.5">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="seu@email.com"
                    className="kings-input"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-700 uppercase tracking-wider text-kmuted mb-1.5">Senha</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      className="kings-input pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-kmuted hover:text-ky transition-colors"
                    >
                      {showPw ? (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 border border-red-500/30 bg-red-500/10">
                  <svg className="text-red-400 shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="kings-btn-primary w-full justify-center py-3.5 text-base mt-2"
              >
                {loading ? (
                  <svg className="animate-spin" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                ) : null}
                {loading ? 'Autenticando...' : 'Entrar'}
              </button>

              {/* Mobile demo shortcuts */}
              <div className="lg:hidden pt-2">
                <p className="text-xs text-kmuted font-display uppercase tracking-wider mb-2">Acesso rápido — demo</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['cliente', 'funcionario', 'admin'] as UserRole[]).map(r => (
                    <button key={r} type="button" onClick={() => fillDemo(r)} className="kings-btn-secondary text-xs py-1.5 px-2 justify-center capitalize">
                      {r === 'funcionario' ? 'Func.' : r === 'admin' ? 'Admin' : 'Cliente'}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 fade-in">
              <div>
                <h2 className="font-display font-900 text-3xl uppercase tracking-wide text-ktext mb-1">Criar conta</h2>
                <p className="text-sm text-kmuted">Cadastre-se para comprar na Kings</p>
              </div>

              {regSuccess ? (
                <div className="flex flex-col items-center py-10 gap-3 fade-in">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <svg width="28" height="28" fill="none" stroke="#22C55E" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="font-display font-700 text-lg uppercase text-ktext">Cadastro realizado!</p>
                  <p className="text-sm text-kmuted text-center">Redirecionando para o login...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 pt-1">
                    {[
                      { field: 'name', label: 'Nome completo *', placeholder: 'Seu nome', type: 'text' },
                      { field: 'email', label: 'E-mail *', placeholder: 'seu@email.com', type: 'email' },
                      { field: 'phone', label: 'Telefone', placeholder: '(11) 90000-0000', type: 'tel' },
                      { field: 'password', label: 'Senha *', placeholder: 'Mínimo 6 caracteres', type: 'password' },
                      { field: 'confirm', label: 'Confirmar senha *', placeholder: 'Repita a senha', type: 'password' },
                    ].map(f => (
                      <div key={f.field}>
                        <label className="block text-xs font-display font-700 uppercase tracking-wider text-kmuted mb-1.5">{f.label}</label>
                        <input
                          type={f.type}
                          value={reg[f.field as keyof typeof reg]}
                          onChange={e => setReg(r => ({ ...r, [f.field]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="kings-input"
                        />
                      </div>
                    ))}
                  </div>

                  {regError && (
                    <div className="flex items-center gap-2 p-3 border border-red-500/30 bg-red-500/10">
                      <svg className="text-red-400 shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <p className="text-red-400 text-xs">{regError}</p>
                    </div>
                  )}

                  <button type="submit" className="kings-btn-primary w-full justify-center py-3.5 text-base">
                    Criar minha conta
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Bootstrap Icons ─────────────────────────────────────────────────────────

function BsIcon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    'speedometer2': (<>
      <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4M3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.39.39 0 0 0-.029-.518z"/>
      <path fillRule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A8 8 0 0 1 0 10m8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3"/>
    </>),
    'box-seam': <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2zm3.564 1.426L5.596 5 8 5.961 14.154 3.5zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>,
    'layers': <path d="M8.235 1.559a.5.5 0 0 0-.47 0l-7.5 4a.5.5 0 0 0 0 .882L3.188 8 .264 9.559a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882L12.813 8l2.922-1.559a.5.5 0 0 0 0-.882zm3.515 7.008L14.438 10 8 13.433 1.562 10 4.25 8.567l3.515 1.874a.5.5 0 0 0 .47 0zM8 9.433 1.562 6 8 2.567 14.438 6z"/>,
    'bag': (<>
      <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
    </>),
    'bar-chart': <path d="M4 11H2v3h2zm5-4H7v7h2zm5-5v12h-2V2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"/>,
    'gear': (<>
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
    </>),
    'shop': <path d="M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.37 2.37 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976zm1.78 4.275a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 1 0 2.75 0V5.37a.5.5 0 0 0-.12-.325L12.27 2H3.73L1.12 5.045A.5.5 0 0 0 1 5.37v.255a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0M1.5 8.5A.5.5 0 0 1 2 9v6h1v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h6V9a.5.5 0 0 1 1 0v6h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1V9a.5.5 0 0 1 .5-.5M4 15h3v-5H4zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zm3 0h-2v3h2z"/>,
    'display': <path d="M0 4s0-2 2-2h12s2 0 2 2v6s0 2-2 2h-4q0 1 .25 1.5H11a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h.75Q6 13 6 12H2s-2 0-2-2zm1.398-.855a.76.76 0 0 0-.254.302A1.46 1.46 0 0 0 1 4v6c0 .325.078.502.145.602q.105.156.302.254c.106.05.248.085.398.117.552.114 2.66.114 3.212 0 .15-.032.292-.067.398-.117a.76.76 0 0 0 .302-.254A1.46 1.46 0 0 0 6 10V4c0-.325-.078-.502-.145-.602a.76.76 0 0 0-.302-.254C5.447 3.045 4.728 3 4 3s-1.447.045-1.553.145z"/>,
    'cash-coin': (<>
      <path fillRule="evenodd" d="M11 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8m5-4a5 5 0 1 1-10 0 5 5 0 0 1 10 0"/>
      <path d="M9.438 11.944c.047.596.518 1.06 1.363 1.116v.44h.375v-.443c.875-.061 1.386-.529 1.386-1.207 0-.618-.39-.936-1.09-1.1l-.296-.07v-1.2c.376.043.614.248.671.532h.658c-.047-.575-.54-1.024-1.329-1.073V9.5h-.375v.45c-.747.073-1.255.522-1.255 1.158 0 .562.378.92 1.007 1.066l.248.061v1.272c-.384-.058-.639-.27-.696-.563h-.668zm1.36-1.354c-.369-.085-.569-.26-.569-.522 0-.294.216-.514.572-.578v1.1zm.432.746c.449.104.655.272.655.569 0 .339-.257.571-.709.614v-1.195z"/>
      <path d="M1 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4.083q.088-.517.258-1H3a2 2 0 0 0-2-2V3a2 2 0 0 0 2-2h10a2 2 0 0 0 2 2v3.528c.38.34.717.728 1 1.154V1a1 1 0 0 0-1-1z"/>
      <path d="M9.998 5.083 10 5a2 2 0 1 0-3.132 1.65 6 6 0 0 1 3.13-1.567"/>
    </>),
    'exclamation-triangle': (<>
      <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
      <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
    </>),
    'bag-check': (<>
      <path fillRule="evenodd" d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
      <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
    </>),
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 16 16" className={className}>
      {paths[name] ?? null}
    </svg>
  )
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function KingsLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const imgPx = size === 'lg' ? 52 : size === 'sm' ? 28 : 38
  const textCls = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl'
  return (
    <div className="flex items-center gap-2">
      <img
        src={kingsEmblem}
        alt="Kings"
        width={imgPx}
        height={imgPx}
        className="shrink-0 select-none"
        style={{ objectFit: 'contain' }}
      />
      <span className={`font-display font-900 tracking-widest uppercase text-ktext ${textCls}`}>
        KINGS
      </span>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  currentUser: User
  onLogout: () => void
  cartCount: number
  cartOpen: boolean
  onCartToggle: () => void
  customerView: CustomerView
  onCustomerViewChange: (v: CustomerView) => void
  adminTab: AdminTab
  onAdminTabChange: (t: AdminTab) => void
  adminSection: AdminSection
  onAdminSectionChange: (s: AdminSection) => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  cliente: 'Cliente',
  funcionario: 'Funcionário',
  admin: 'Administrador',
}

const ROLE_COLORS: Record<UserRole, string> = {
  cliente: 'bg-ky/10 text-ky border border-ky/30',
  funcionario: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  admin: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
}

function Header({ currentUser, onLogout, cartCount, cartOpen, onCartToggle, customerView, onCustomerViewChange, adminTab, onAdminTabChange, adminSection, onAdminSectionChange }: HeaderProps) {
  const role = currentUser.role
  const initials = currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-kborder" style={{ background: '#0D0D0D' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <KingsLogo />

          {/* Navigation */}
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {role === 'cliente' && (
              <>
                <NavBtn active={customerView === 'catalog'} onClick={() => onCustomerViewChange('catalog')}>Loja</NavBtn>
                <NavBtn active={customerView === 'orders'} onClick={() => onCustomerViewChange('orders')}>Meus Pedidos</NavBtn>
              </>
            )}

            {role === 'admin' && (
              <>
                {/* Section pills */}
                <div className="flex items-center gap-0.5 mr-2">
                  {([
                    { key: 'panel', icon: 'gear',    label: 'Painel' },
                    { key: 'store', icon: 'shop',    label: 'Loja' },
                    { key: 'pdv',   icon: 'display', label: 'PDV' },
                  ] as { key: AdminSection; icon: string; label: string }[]).map(s => (
                    <button
                      key={s.key}
                      onClick={() => onAdminSectionChange(s.key)}
                      className={`font-display font-700 text-xs uppercase tracking-wider px-2.5 py-1 transition-all flex items-center gap-1.5 ${
                        adminSection === s.key
                          ? 'bg-ky text-kb'
                          : 'text-kmuted hover:text-ktext border border-kborder hover:border-ky/50'
                      }`}
                    >
                      <BsIcon name={s.icon} size={13} /> {s.label}
                    </button>
                  ))}
                </div>

                {adminSection === 'store' && (
                  <>
                    <div className="w-px h-5 bg-kborder mx-1 shrink-0" />
                    <NavBtn active={customerView === 'catalog'} onClick={() => onCustomerViewChange('catalog')}>Catálogo</NavBtn>
                    <NavBtn active={customerView === 'orders'} onClick={() => onCustomerViewChange('orders')}>Pedidos de Clientes</NavBtn>
                  </>
                )}
                {adminSection === 'pdv' && (
                  <>
                    <div className="w-px h-5 bg-kborder mx-1 shrink-0" />
                    <span className="font-display text-sm font-700 uppercase tracking-widest text-ky px-2">Mini-PDV</span>
                  </>
                )}
              </>
            )}

            {role === 'funcionario' && (
              <span className="font-display text-sm font-700 uppercase tracking-widest text-ky">Mini-PDV</span>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {(role === 'cliente' || (role === 'admin' && adminSection === 'store')) && (
              <button
                onClick={onCartToggle}
                className={`relative flex items-center gap-2 kings-btn-secondary text-sm ${cartOpen ? 'border-ky text-ky' : ''}`}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                <span className="hidden sm:inline">Carrinho</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ky text-kb text-xs font-bold flex items-center justify-center font-display">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 border border-kborder hover:border-ky/50 transition-colors px-2 py-1.5"
              >
                <div className={`w-6 h-6 flex items-center justify-center text-xs font-display font-800 shrink-0 ${
                  role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                  role === 'funcionario' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-ky text-kb'
                }`}>
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-display font-700 text-xs uppercase tracking-wide leading-none">{currentUser.name.split(' ')[0]}</p>
                  <span className={`kings-badge text-[10px] px-1.5 py-0 mt-0.5 inline-block ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
                </div>
                <svg className="text-kmuted" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 z-50 border border-kborder shadow-2xl fade-in" style={{ background: '#111111' }}>
                    <div className="p-3 border-b border-kborder">
                      <p className="font-display font-700 text-sm uppercase tracking-wide">{currentUser.name}</p>
                      <p className="text-xs text-kmuted mt-0.5">{currentUser.email}</p>
                      <span className={`kings-badge text-xs mt-1.5 inline-block ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); onLogout() }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-kmuted hover:text-red-400 hover:bg-red-500/5 transition-colors text-left"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        <span className="font-display font-700 text-xs uppercase tracking-wider">Sair da conta</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function NavBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`font-display font-700 text-sm uppercase tracking-wider px-3 py-1.5 transition-all ${
        active ? 'text-ky border-b-2 border-ky' : 'text-kmuted hover:text-ktext'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd, onSelect }: { product: Product; onAdd: (p: Product) => void; onSelect: (p: Product) => void }) {
  const lowStock = product.stock <= product.minStock

  return (
    <div className="kings-card kings-card-hover flex flex-col group fade-in cursor-pointer" onClick={() => onSelect(product)}>
      <div className="relative overflow-hidden bg-kcard2" style={{ aspectRatio: '4/3' }}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=300&fit=crop&auto=format` }}
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="kings-badge bg-kb/80 text-ky border border-ky/30">{product.brand}</span>
          {lowStock && (
            <span className="kings-badge bg-red-500/90 text-white">Estoque baixo</span>
          )}
        </div>
        <div className="absolute inset-0 bg-ky/0 group-hover:bg-ky/5 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="kings-badge bg-kb/90 text-ky border border-ky px-4 py-2 text-sm">Ver detalhes</span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <p className="text-xs text-ky/70 font-display font-700 uppercase tracking-widest mb-0.5">{product.volume}</p>
          <h3 className="font-display font-700 text-base uppercase tracking-wide text-ktext leading-tight">{product.name}</h3>
          <p className="text-xs text-kmuted mt-1 leading-relaxed line-clamp-2">{product.description}</p>
        </div>
        <div className="flex items-end justify-between mt-auto pt-2 border-t border-kborder">
          <div>
            <span className="font-display font-800 text-xl text-ky">{fmt(product.price)}</span>
            <p className="text-xs text-kmuted">{product.stock > 0 ? `${product.stock} em estoque` : 'Indisponível'}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(product) }}
            disabled={product.stock === 0}
            className="kings-btn-primary text-sm py-2 px-3"
          >
            + Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProductDetailModal({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (p: Product) => void }) {
  const lowStock = product.stock <= product.minStock

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto pointer-events-auto fade-in"
          style={{ background: '#111111', border: '1px solid #2C2C2C' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-kmuted hover:text-ky transition-colors bg-kb border border-kborder"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2">
            {/* Image */}
            <div className="relative bg-kcard2 overflow-hidden" style={{ minHeight: '280px' }}>
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                style={{ minHeight: '280px' }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=600&fit=crop' }}
              />
              {lowStock && (
                <div className="absolute bottom-3 left-3">
                  <span className="kings-badge bg-red-500/90 text-white">Estoque baixo</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col p-6 gap-4">
              {/* Brand + category */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="kings-badge bg-ky/10 text-ky border border-ky/30 text-sm">{product.brand}</span>
                <span className="kings-badge bg-kcard border border-kborder text-kmuted">{product.category}</span>
              </div>

              {/* Name */}
              <div>
                <p className="text-xs text-kmuted font-display uppercase tracking-widest">{product.volume}</p>
                <h2 className="font-display font-900 text-3xl uppercase tracking-wide text-ktext leading-none mt-1">
                  {product.name}
                </h2>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 border-y border-kborder py-4">
                <span className="font-display font-900 text-4xl text-ky">{fmt(product.price)}</span>
                <span className={`font-display font-700 text-sm uppercase ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {product.stock > 0 ? `${product.stock} disponíveis` : 'Indisponível'}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-kmuted leading-relaxed flex-1">{product.description}</p>

              {/* Specs */}
              {product.specs.length > 0 && (
                <div>
                  <p className="font-display font-700 text-xs uppercase tracking-wider text-kmuted mb-2">Características</p>
                  <div className="flex flex-wrap gap-2">
                    {product.specs.map(spec => (
                      <span key={spec} className="text-xs border border-kborder text-ktext px-2 py-1 font-display font-600 uppercase tracking-wide">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Barcode */}
              <p className="text-xs text-kmuted font-display">Cód.: {product.barcode}</p>

              {/* CTA */}
              <button
                onClick={() => { onAdd(product); onClose() }}
                disabled={product.stock === 0}
                className="kings-btn-primary w-full justify-center py-3 text-base"
              >
                + Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Store View ───────────────────────────────────────────────────────────────

function StoreView({ products, onAddToCart }: { products: Product[]; onAddToCart: (p: Product) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('Todos')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false
      if (category !== 'Todos' && p.category !== category) return false
      if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.brand.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [products, category, query])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden kings-card mb-8 p-8 sm:p-12" style={{ background: 'linear-gradient(135deg, #111 0%, #1a1a00 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-full opacity-5">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <circle cx="150" cy="100" r="120" stroke="#F5C800" strokeWidth="40"/>
          </svg>
        </div>
        <div className="relative z-10 max-w-xl">
          <span className="kings-badge bg-ky/10 text-ky border border-ky/20 mb-4 inline-block">Produtos de Limpeza</span>
          <h1 className="font-display font-900 text-4xl sm:text-5xl uppercase tracking-wide text-ktext leading-none mb-3">
            Limpeza com<br /><span className="text-ky">qualidade Kings</span>
          </h1>
          <p className="text-kmuted text-sm leading-relaxed">
            Vonixx, Magil Clean, Janu e Sigma — as melhores marcas de detailing e limpeza num só lugar.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-kmuted" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="kings-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`kings-badge transition-all cursor-pointer border ${
                category === c
                  ? 'bg-ky text-kb border-ky'
                  : 'bg-transparent text-kmuted border-kborder hover:border-ky hover:text-ky'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-kmuted font-display uppercase tracking-wider">
          {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} onAdd={onAddToCart} onSelect={setSelectedProduct} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="text-kborder mb-4" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p className="font-display font-700 text-lg uppercase text-kmuted">Nenhum produto encontrado</p>
          <p className="text-xs text-kmuted mt-1">Tente outro termo ou categoria</p>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(p) => { onAddToCart(p); setSelectedProduct(null) }}
        />
      )}
    </div>
  )
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

interface CartDrawerProps {
  cart: CartItem[]
  onUpdate: (id: number, qty: number) => void
  onRemove: (id: number) => void
  onCheckout: () => void
  onClose: () => void
}

function CartDrawer({ cart, onUpdate, onRemove, onCheckout, onClose }: CartDrawerProps) {
  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col slide-in" style={{ background: '#0D0D0D', borderLeft: '1px solid #2C2C2C' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-kborder">
          <h2 className="font-display font-800 text-xl uppercase tracking-wider text-ktext">Carrinho</h2>
          <button onClick={onClose} className="text-kmuted hover:text-ktext transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <svg className="text-kborder" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <p className="font-display font-700 text-lg uppercase text-kmuted">Carrinho vazio</p>
              <p className="text-xs text-kmuted">Adicione produtos para começar</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-3 kings-card p-3">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover shrink-0 bg-kcard2"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=80&h=80&fit=crop' }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-700 text-sm uppercase tracking-wide leading-tight line-clamp-2">{item.product.name}</h4>
                  <p className="text-ky font-display font-800 text-sm mt-1">{fmt(item.product.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onUpdate(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 border border-kborder text-ktext hover:border-ky hover:text-ky transition-colors flex items-center justify-center text-sm font-bold"
                    >−</button>
                    <span className="font-display font-700 text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdate(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-6 h-6 border border-kborder text-ktext hover:border-ky hover:text-ky transition-colors flex items-center justify-center text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >+</button>
                    <button
                      onClick={() => onRemove(item.product.id)}
                      className="ml-auto text-kmuted hover:text-red-400 transition-colors"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-kborder space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display font-700 uppercase tracking-wider text-kmuted text-sm">Subtotal</span>
              <span className="font-display font-800 text-2xl text-ky">{fmt(total)}</span>
            </div>
            <button onClick={onCheckout} className="kings-btn-primary w-full justify-center py-3 text-base">
              Finalizar Compra
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            <button onClick={onClose} className="kings-btn-secondary w-full justify-center text-sm">
              Continuar comprando
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Checkout View ────────────────────────────────────────────────────────────

interface CheckoutViewProps {
  cart: CartItem[]
  onConfirm: (method: 'Pix' | 'Cartão') => void
  onBack: () => void
}

function CheckoutView({ cart, onConfirm, onBack }: CheckoutViewProps) {
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [payment, setPayment] = useState<'Pix' | 'Cartão'>('Pix')
  const [form, setForm] = useState({ name: 'Maria Silva', email: 'maria.silva@email.com', phone: '(11) 98765-4321', cep: '01310-100', street: 'Av. Paulista', number: '1000', complement: 'Apto 42', city: 'São Paulo', state: 'SP' })
  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-kmuted hover:text-ky transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="font-display font-900 text-3xl uppercase tracking-wide">Finalizar Compra</h1>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {['Endereço', 'Pagamento'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-800 text-sm ${
              (step === 'address' && i === 0) || (step === 'payment' && i <= 1)
                ? 'bg-ky text-kb' : 'bg-kcard border border-kborder text-kmuted'
            }`}>
              {step === 'payment' && i === 0 ? (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              ) : i + 1}
            </div>
            <span className={`font-display font-700 text-sm uppercase tracking-wide ${
              (step === 'address' && i === 0) || (step === 'payment') ? 'text-ktext' : 'text-kmuted'
            }`}>{s}</span>
            {i < 1 && <div className="w-12 h-px bg-kborder ml-2" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {step === 'address' ? (
            <div className="kings-card p-6 space-y-4">
              <h2 className="font-display font-800 text-lg uppercase tracking-wide border-b border-kborder pb-3">Dados de Entrega</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Nome completo</label>
                  <input className="kings-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">E-mail</label>
                  <input className="kings-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Telefone</label>
                  <input className="kings-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">CEP</label>
                  <input className="kings-input" value={form.cep} onChange={e => setForm({...form, cep: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Estado</label>
                  <input className="kings-input" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Endereço</label>
                  <input className="kings-input" value={form.street} onChange={e => setForm({...form, street: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Número</label>
                  <input className="kings-input" value={form.number} onChange={e => setForm({...form, number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Complemento</label>
                  <input className="kings-input" value={form.complement} onChange={e => setForm({...form, complement: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Cidade</label>
                  <input className="kings-input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
              </div>
              <button onClick={() => setStep('payment')} className="kings-btn-primary w-full justify-center py-3 mt-2">
                Continuar para Pagamento
              </button>
            </div>
          ) : (
            <div className="kings-card p-6 space-y-4">
              <h2 className="font-display font-800 text-lg uppercase tracking-wide border-b border-kborder pb-3">Forma de Pagamento</h2>

              {/* Payment selection */}
              <div className="grid grid-cols-2 gap-3">
                {(['Pix', 'Cartão'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPayment(m)}
                    className={`kings-card p-4 text-left transition-all border ${payment === m ? 'border-ky' : 'border-kborder hover:border-kcard2'}`}
                  >
                    <div className={`text-2xl mb-2 ${payment === m ? 'text-ky' : 'text-kmuted'}`}>
                      {m === 'Pix' ? '⚡' : '💳'}
                    </div>
                    <div className="font-display font-700 text-sm uppercase tracking-wide">{m}</div>
                    <div className="text-xs text-kmuted mt-0.5">
                      {m === 'Pix' ? 'Aprovação imediata' : 'Crédito ou débito'}
                    </div>
                  </button>
                ))}
              </div>

              {payment === 'Pix' ? (
                <div className="flex flex-col items-center py-6 gap-4">
                  <div className="w-40 h-40 bg-white p-3 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" width="128" height="128">
                      {/* Simplified QR code pattern */}
                      {[0,1,2,3,4,5,6].map(row =>
                        [0,1,2,3,4,5,6].map(col => {
                          const pattern = [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]]
                          return pattern[row][col] ? (
                            <rect key={`${row}-${col}`} x={col * 14} y={row * 14} width="14" height="14" fill="#0A0A0A" />
                          ) : null
                        })
                      )}
                      {/* Random inner dots */}
                      {[30,44,58,30,44,58].map((x, i) => (
                        <rect key={`d${i}`} x={x} y={[30,30,30,44,44,44][i]} width="12" height="12" fill={Math.random() > 0.5 ? '#0A0A0A' : 'white'} />
                      ))}
                    </svg>
                  </div>
                  <p className="text-sm text-kmuted text-center">Escaneie o QR code com seu aplicativo bancário</p>
                  <div className="kings-card border border-kborder w-full p-3 text-center">
                    <p className="text-xs text-kmuted mb-1 font-display uppercase tracking-wider">Chave Pix</p>
                    <p className="font-display font-700 text-sm text-ky">kings@produtoslimpeza.com.br</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Número do cartão</label>
                    <input className="kings-input" placeholder="0000 0000 0000 0000" defaultValue="4532 1234 5678 9010" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Validade</label>
                      <input className="kings-input" placeholder="MM/AA" defaultValue="12/27" />
                    </div>
                    <div>
                      <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">CVV</label>
                      <input className="kings-input" placeholder="123" defaultValue="456" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Nome no cartão</label>
                    <input className="kings-input" defaultValue="MARIA C SILVA" />
                  </div>
                  <div>
                    <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Parcelas</label>
                    <select className="kings-input">
                      <option>1x de {fmt(total)} (sem juros)</option>
                      <option>2x de {fmt(total / 2)} (sem juros)</option>
                      <option>3x de {fmt(total / 3)} (sem juros)</option>
                    </select>
                  </div>
                </div>
              )}

              <button onClick={() => onConfirm(payment)} className="kings-btn-primary w-full justify-center py-3">
                Confirmar Pedido — {fmt(total)}
              </button>
              <button onClick={() => setStep('address')} className="kings-btn-secondary w-full justify-center text-sm">
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="kings-card p-5 h-fit space-y-3">
          <h3 className="font-display font-800 text-base uppercase tracking-wide border-b border-kborder pb-3">Resumo</h3>
          {cart.map(item => (
            <div key={item.product.id} className="flex justify-between text-sm gap-2">
              <span className="text-kmuted line-clamp-1 flex-1">{item.product.name} ×{item.quantity}</span>
              <span className="font-display font-700 shrink-0">{fmt(item.product.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-kborder pt-3 flex justify-between items-center">
            <span className="font-display font-700 uppercase tracking-wide text-sm text-kmuted">Frete</span>
            <span className="font-display font-700 text-green-400 text-sm">Grátis</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-display font-800 uppercase tracking-wide">Total</span>
            <span className="font-display font-900 text-2xl text-ky">{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Order Confirmation ───────────────────────────────────────────────────────

function OrderConfirmation({ orderId, onContinue }: { orderId: string; onContinue: () => void }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center fade-in">
      <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
        <svg width="36" height="36" fill="none" stroke="#22C55E" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h1 className="font-display font-900 text-4xl uppercase tracking-wide mb-2">Pedido Confirmado!</h1>
      <p className="text-kmuted text-sm mb-2">Seu pedido foi registrado com sucesso.</p>
      <p className="font-display font-700 text-ky text-lg mb-8">{orderId}</p>
      <div className="kings-card p-5 text-left space-y-2 mb-8">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400">✓</span>
          <span className="text-ktext">Pedido registrado no sistema</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400">✓</span>
          <span className="text-ktext">Pagamento sendo processado</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-kmuted">○</span>
          <span className="text-kmuted">Você receberá confirmação por e-mail</span>
        </div>
      </div>
      <button onClick={onContinue} className="kings-btn-primary px-8 py-3">
        Continuar Comprando
      </button>
    </div>
  )
}

// ─── Orders View ──────────────────────────────────────────────────────────────

function OrdersView({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<Order | null>(null)

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelected(null)} className="text-kmuted hover:text-ky transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="font-display font-900 text-2xl uppercase tracking-wide">Pedido {selected.id}</h1>
            <p className="text-xs text-kmuted">{selected.date}</p>
          </div>
          <span className={`kings-badge ml-auto ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
        </div>

        <div className="grid gap-4">
          <div className="kings-card p-5">
            <h3 className="font-display font-700 text-sm uppercase tracking-wider text-kmuted mb-3">Itens do Pedido</h3>
            <div className="space-y-3">
              {selected.items.map(item => (
                <div key={item.product.id} className="flex gap-3 items-center">
                  <img src={item.product.image} alt={item.product.name} className="w-12 h-12 object-cover bg-kcard2" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=60&h=60&fit=crop' }} />
                  <div className="flex-1">
                    <p className="font-display font-700 text-sm uppercase">{item.product.name}</p>
                    <p className="text-xs text-kmuted">Qtd: {item.quantity}</p>
                  </div>
                  <span className="font-display font-800 text-ky">{fmt(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-kborder mt-4 pt-4 flex justify-between">
              <span className="font-display font-700 uppercase tracking-wide text-kmuted">Total</span>
              <span className="font-display font-900 text-2xl text-ky">{fmt(selected.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="kings-card p-5">
              <h3 className="font-display font-700 text-sm uppercase tracking-wider text-kmuted mb-2">Entrega</h3>
              <p className="text-sm text-ktext">{selected.address}</p>
            </div>
            <div className="kings-card p-5">
              <h3 className="font-display font-700 text-sm uppercase tracking-wider text-kmuted mb-2">Pagamento</h3>
              <p className="text-sm text-ktext">{selected.payment}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <h1 className="font-display font-900 text-3xl uppercase tracking-wide mb-6">Meus Pedidos</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center gap-3">
          <svg className="text-kborder" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <p className="font-display font-700 text-lg uppercase text-kmuted">Nenhum pedido ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <button
              key={order.id}
              onClick={() => setSelected(order)}
              className="w-full kings-card kings-card-hover p-5 text-left"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display font-800 text-base text-ky">{order.id}</span>
                    <span className={`kings-badge ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                  </div>
                  <p className="text-xs text-kmuted">{order.date} — {order.payment}</p>
                  <p className="text-xs text-kmuted mt-1">{order.items.length} item(ns)</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-900 text-xl text-ky">{fmt(order.total)}</p>
                  <p className="text-xs text-kmuted mt-0.5">Ver detalhes →</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Mini-PDV View ────────────────────────────────────────────────────────────

function PDVView({ products, onSaleComplete }: { products: Product[]; onSaleComplete: (items: CartItem[]) => void }) {
  const [query, setQuery] = useState('')
  const [sale, setSale] = useState<CartItem[]>([])
  const [completed, setCompleted] = useState(false)
  const barcodeRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    if (!query) return []
    return products.filter(p =>
      p.active && p.stock > 0 && (
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query)
      )
    ).slice(0, 6)
  }, [products, query])

  const saleTotal = sale.reduce((s, i) => s + i.product.price * i.quantity, 0)

  const addToSale = (p: Product) => {
    setSale(prev => {
      const existing = prev.find(i => i.product.id === p.id)
      if (existing) {
        if (existing.quantity >= p.stock) return prev
        return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product: p, quantity: 1 }]
    })
    setQuery('')
    barcodeRef.current?.focus()
  }

  const finalizeSale = () => {
    if (sale.length === 0) return
    onSaleComplete(sale)
    setCompleted(true)
    setTimeout(() => {
      setSale([])
      setCompleted(false)
    }, 3000)
  }

  if (completed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" fill="none" stroke="#22C55E" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="font-display font-900 text-4xl uppercase tracking-wide text-ktext mb-2">Venda Finalizada!</h2>
        <p className="font-display font-800 text-3xl text-ky">{fmt(saleTotal)}</p>
        <p className="text-kmuted text-sm mt-4">Estoque atualizado automaticamente</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-ky" />
        <h1 className="font-display font-900 text-3xl uppercase tracking-wide">Mini-PDV</h1>
        <span className="kings-badge bg-ky/10 text-ky border border-ky/20 ml-2">Venda Presencial</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Search Panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="kings-card p-5">
            <label className="block font-display font-700 text-sm uppercase tracking-wider text-kmuted mb-3">
              Código de Barras ou Nome do Produto
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-kmuted" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="4" y1="9" x2="4" y2="15"/><line x1="8" y1="6" x2="8" y2="18"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="16" y1="6" x2="16" y2="18"/><line x1="20" y1="9" x2="20" y2="15"/>
              </svg>
              <input
                ref={barcodeRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Digite o código ou nome..."
                className="kings-input pl-10 text-base"
                autoFocus
              />
            </div>

            {results.length > 0 && (
              <div className="mt-3 border border-kborder divide-y divide-kborder">
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToSale(p)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-ky/5 text-left transition-colors group"
                  >
                    <img src={p.image} alt={p.name} className="w-10 h-10 object-cover bg-kcard2 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=40&h=40&fit=crop' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-700 text-sm uppercase group-hover:text-ky transition-colors">{p.name}</p>
                      <p className="text-xs text-kmuted">{p.barcode} — {p.stock} em estoque</p>
                    </div>
                    <span className="font-display font-800 text-ky shrink-0">{fmt(p.price)}</span>
                  </button>
                ))}
              </div>
            )}

            {query && results.length === 0 && (
              <p className="text-sm text-kmuted mt-3 text-center py-4">Nenhum produto encontrado</p>
            )}
          </div>

          {/* Quick product grid */}
          <div className="kings-card p-5">
            <h3 className="font-display font-700 text-sm uppercase tracking-wider text-kmuted mb-3">Acesso Rápido</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.filter(p => p.active && p.stock > 0).slice(0, 6).map(p => (
                <button
                  key={p.id}
                  onClick={() => addToSale(p)}
                  className="kings-card kings-card-hover p-3 text-left"
                >
                  <p className="font-display font-700 text-xs uppercase leading-tight line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-ky font-display font-800 text-sm">{fmt(p.price)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sale Panel */}
        <div className="lg:col-span-2">
          <div className="kings-card p-5 sticky top-20">
            <h2 className="font-display font-800 text-lg uppercase tracking-wide border-b border-kborder pb-3 mb-4">
              Venda Atual
            </h2>
            {sale.length === 0 ? (
              <div className="text-center py-10">
                <p className="font-display font-700 text-sm uppercase text-kmuted">Nenhum item adicionado</p>
                <p className="text-xs text-kmuted mt-1">Use a busca para adicionar produtos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                {sale.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 bg-kdark border border-kborder">
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-700 text-xs uppercase line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-kmuted">{fmt(item.product.price)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSale(s => s.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0))} className="w-5 h-5 border border-kborder text-xs hover:border-ky flex items-center justify-center">−</button>
                      <span className="font-display font-700 text-xs w-5 text-center">{item.quantity}</span>
                      <button onClick={() => setSale(s => s.map(i => i.product.id === item.product.id && i.quantity < i.product.stock ? { ...i, quantity: i.quantity + 1 } : i))} className="w-5 h-5 border border-kborder text-xs hover:border-ky flex items-center justify-center">+</button>
                    </div>
                    <span className="font-display font-700 text-xs text-ky shrink-0">{fmt(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            {sale.length > 0 && (
              <>
                <div className="border-t border-kborder pt-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-display font-700 uppercase tracking-wide text-kmuted text-sm">{sale.reduce((s, i) => s + i.quantity, 0)} item(ns)</span>
                    <span className="font-display font-900 text-3xl text-ky">{fmt(saleTotal)}</span>
                  </div>
                </div>
                <button onClick={finalizeSale} className="kings-btn-primary w-full justify-center py-3">
                  Finalizar Venda
                </button>
                <button onClick={() => setSale([])} className="kings-btn-secondary w-full justify-center text-sm mt-2">
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Admin View ───────────────────────────────────────────────────────────────

interface AdminViewProps {
  products: Product[]
  orders: Order[]
  onUpdateProduct: (p: Product) => void
  onAddStock: (id: number, qty: number) => void
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void
}

function AdminView({ products, orders, onUpdateProduct, onAddStock, onUpdateOrderStatus }: AdminViewProps) {
  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [stockInput, setStockInput] = useState<Record<number, string>>({})
  const [reportPeriod, setReportPeriod] = useState('agosto-2024')

  const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.active)
  const totalRevenue = orders.filter(o => o.status === 'Entregue').reduce((s, o) => s + o.total, 0)
  const todayOrders = orders.filter(o => o.date === '22/08/2024').length

  const TABS: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard',  icon: 'speedometer2' },
    { key: 'products',  label: 'Produtos',   icon: 'box-seam' },
    { key: 'inventory', label: 'Estoque',    icon: 'layers' },
    { key: 'orders',    label: 'Pedidos',    icon: 'bag' },
    { key: 'reports',   label: 'Relatórios', icon: 'bar-chart' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 fade-in">
      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-kborder mb-8 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`font-display font-700 text-sm uppercase tracking-wider px-4 py-3 whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
              tab === t.key ? 'border-ky text-ky' : 'border-transparent text-kmuted hover:text-ktext'
            }`}
          >
            <BsIcon name={t.icon} size={15} />
            {t.label}
            {t.key === 'inventory' && lowStockProducts.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs inline-flex items-center justify-center font-display">{lowStockProducts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Receita Total', value: fmt(totalRevenue), sub: 'pedidos entregues', color: 'text-ky', icon: 'cash-coin' },
              { label: 'Produtos Ativos', value: String(products.filter(p => p.active).length), sub: `de ${products.length} cadastrados`, color: 'text-blue-400', icon: 'box-seam' },
              { label: 'Alertas de Estoque', value: String(lowStockProducts.length), sub: 'abaixo do mínimo', color: 'text-red-400', icon: 'exclamation-triangle' },
              { label: 'Pedidos Hoje', value: String(todayOrders), sub: new Date().toLocaleDateString('pt-BR'), color: 'text-green-400', icon: 'bag-check' },
            ].map(card => (
              <div key={card.label} className="kings-card p-5">
                <div className={`mb-3 ${card.color}`}><BsIcon name={card.icon} size={22} /></div>
                <p className="text-xs text-kmuted font-display uppercase tracking-wider mb-1">{card.label}</p>
                <p className={`font-display font-900 text-3xl ${card.color}`}>{card.value}</p>
                <p className="text-xs text-kmuted mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="kings-card p-5">
              <h3 className="font-display font-800 text-base uppercase tracking-wide mb-4 border-b border-kborder pb-3">Pedidos Recentes</h3>
              <div className="space-y-2">
                {orders.slice(0, 4).map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-kborder/50 last:border-0">
                    <div>
                      <p className="font-display font-700 text-sm text-ky">{o.id}</p>
                      <p className="text-xs text-kmuted">{o.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-700 text-sm">{fmt(o.total)}</p>
                      <span className={`kings-badge text-xs ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="kings-card p-5">
              <h3 className="font-display font-800 text-base uppercase tracking-wide mb-4 border-b border-kborder pb-3 flex items-center gap-2">
                Alertas de Estoque
                {lowStockProducts.length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{lowStockProducts.length}</span>}
              </h3>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-kmuted text-center py-8">Nenhum alerta de estoque</p>
              ) : (
                <div className="space-y-2">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-kborder/50 last:border-0">
                      <div>
                        <p className="font-display font-700 text-sm">{p.name}</p>
                        <p className="text-xs text-kmuted">Mínimo: {p.minStock} unid.</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-800 text-lg text-red-400">{p.stock}</p>
                        <p className="text-xs text-kmuted">em estoque</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-900 text-2xl uppercase tracking-wide">Cadastro de Produtos</h2>
            <button className="kings-btn-primary">+ Novo Produto</button>
          </div>

          {editProduct && (
            <div className="kings-card p-6 border border-ky/30 space-y-4">
              <h3 className="font-display font-800 text-lg uppercase tracking-wide text-ky mb-4">Editando: {editProduct.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Nome</label>
                  <input className="kings-input" value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Preço (R$)</label>
                  <input className="kings-input" type="number" step="0.01" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Categoria</label>
                  <select className="kings-input" value={editProduct.category} onChange={e => setEditProduct({ ...editProduct, category: e.target.value as Product['category'] })}>
                    {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Estoque Mínimo</label>
                  <input className="kings-input" type="number" value={editProduct.minStock} onChange={e => setEditProduct({ ...editProduct, minStock: parseInt(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-kmuted font-display uppercase tracking-wider mb-1">Descrição</label>
                  <textarea className="kings-input resize-none h-20" value={editProduct.description} onChange={e => setEditProduct({ ...editProduct, description: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { onUpdateProduct(editProduct); setEditProduct(null) }} className="kings-btn-primary">Salvar Alterações</button>
                <button onClick={() => setEditProduct(null)} className="kings-btn-secondary">Cancelar</button>
              </div>
            </div>
          )}

          <div className="kings-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kborder bg-kdark">
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Produto</th>
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden sm:table-cell">Categoria</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Preço</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden md:table-cell">Estoque</th>
                  <th className="text-center p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Status</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr key={p.id} className={`border-b border-kborder/50 hover:bg-kcard/50 transition-colors ${idx % 2 === 1 ? 'bg-kdark/30' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="w-10 h-10 object-cover bg-kcard2 hidden sm:block shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=40&h=40&fit=crop' }} />
                        <div>
                          <p className="font-display font-700 uppercase text-xs">{p.name}</p>
                          <p className="text-xs text-kmuted">{p.barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-kmuted hidden sm:table-cell">{p.category}</td>
                    <td className="p-4 text-right font-display font-800 text-ky">{fmt(p.price)}</td>
                    <td className="p-4 text-right hidden md:table-cell">
                      <span className={`font-display font-700 ${p.stock <= p.minStock ? 'text-red-400' : 'text-ktext'}`}>{p.stock}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`kings-badge ${p.active ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-kcard text-kmuted border border-kborder'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditProduct(p)} className="text-kmuted hover:text-ky transition-colors">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => onUpdateProduct({ ...p, active: !p.active })} className={`text-xs font-display font-700 uppercase transition-colors ${p.active ? 'text-kmuted hover:text-red-400' : 'text-kmuted hover:text-green-400'}`}>
                          {p.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-900 text-2xl uppercase tracking-wide">Controle de Estoque</h2>
            {lowStockProducts.length > 0 && (
              <span className="kings-badge bg-red-500/15 text-red-400 border border-red-500/30 text-sm">
                ⚠ {lowStockProducts.length} alerta{lowStockProducts.length > 1 ? 's' : ''} de reposição
              </span>
            )}
          </div>

          <div className="kings-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kborder bg-kdark">
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Produto</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden sm:table-cell">Mínimo</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Atual</th>
                  <th className="text-center p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden md:table-cell">Status</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Entrada</th>
                </tr>
              </thead>
              <tbody>
                {products.filter(p => p.active).map((p, idx) => {
                  const isLow = p.stock <= p.minStock
                  return (
                    <tr key={p.id} className={`border-b border-kborder/50 ${isLow ? 'bg-red-500/5' : idx % 2 === 1 ? 'bg-kdark/30' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isLow && <span className="text-red-400 shrink-0">⚠</span>}
                          <span className="font-display font-700 uppercase text-xs">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-kmuted hidden sm:table-cell">{p.minStock}</td>
                      <td className="p-4 text-right">
                        <span className={`font-display font-900 text-lg ${isLow ? 'text-red-400' : 'text-green-400'}`}>{p.stock}</span>
                      </td>
                      <td className="p-4 text-center hidden md:table-cell">
                        <span className={`kings-badge ${isLow ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-green-500/15 text-green-400 border border-green-500/30'}`}>
                          {isLow ? 'Repor' : 'OK'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qtd"
                            value={stockInput[p.id] || ''}
                            onChange={e => setStockInput(s => ({ ...s, [p.id]: e.target.value }))}
                            className="kings-input text-center w-16 text-sm py-1.5"
                          />
                          <button
                            onClick={() => {
                              const qty = parseInt(stockInput[p.id] || '0')
                              if (qty > 0) {
                                onAddStock(p.id, qty)
                                setStockInput(s => ({ ...s, [p.id]: '' }))
                              }
                            }}
                            className="kings-btn-primary text-xs py-1.5 px-3"
                          >
                            + Entrada
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders (Admin) */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <h2 className="font-display font-900 text-2xl uppercase tracking-wide">Gerenciar Pedidos</h2>
          <div className="kings-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kborder bg-kdark">
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Pedido</th>
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden sm:table-cell">Cliente</th>
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden md:table-cell">Data</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Total</th>
                  <th className="text-center p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Status</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Atualizar</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => (
                  <tr key={o.id} className={`border-b border-kborder/50 hover:bg-kcard/50 transition-colors ${idx % 2 === 1 ? 'bg-kdark/30' : ''}`}>
                    <td className="p-4">
                      <p className="font-display font-800 text-ky text-sm">{o.id}</p>
                      <p className="text-xs text-kmuted">{o.payment}</p>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <p className="font-display font-700 text-sm">{o.customer}</p>
                    </td>
                    <td className="p-4 text-xs text-kmuted hidden md:table-cell">{o.date}</td>
                    <td className="p-4 text-right font-display font-800 text-ky">{fmt(o.total)}</td>
                    <td className="p-4 text-center">
                      <span className={`kings-badge ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={o.status}
                        onChange={e => onUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                        className="kings-input text-xs py-1 w-auto"
                        style={{ width: 'auto', minWidth: '140px' }}
                      >
                        {(['Aguardando Pagamento', 'Confirmado', 'Em Separação', 'Enviado', 'Entregue'] as OrderStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-900 text-2xl uppercase tracking-wide">Relatório de Vendas</h2>
            <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)} className="kings-input w-auto">
              <option value="agosto-2024">Agosto 2024</option>
              <option value="julho-2024">Julho 2024</option>
              <option value="junho-2024">Junho 2024</option>
            </select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total de Pedidos', value: String(orders.length) },
              { label: 'Receita Bruta', value: fmt(orders.reduce((s, o) => s + o.total, 0)) },
              { label: 'Ticket Médio', value: fmt(orders.reduce((s, o) => s + o.total, 0) / orders.length) },
              { label: 'Pedidos Entregues', value: String(orders.filter(o => o.status === 'Entregue').length) },
            ].map(card => (
              <div key={card.label} className="kings-card p-4">
                <p className="text-xs text-kmuted font-display uppercase tracking-wider mb-1">{card.label}</p>
                <p className="font-display font-900 text-2xl text-ky">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Sales table */}
          <div className="kings-card overflow-hidden">
            <div className="p-4 border-b border-kborder">
              <h3 className="font-display font-800 text-base uppercase tracking-wide">Detalhamento de Pedidos — Agosto 2024</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kborder bg-kdark">
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Pedido</th>
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden sm:table-cell">Cliente</th>
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden md:table-cell">Data</th>
                  <th className="text-left p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted hidden lg:table-cell">Pagamento</th>
                  <th className="text-right p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Valor</th>
                  <th className="text-center p-4 font-display font-700 text-xs uppercase tracking-wider text-kmuted">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => (
                  <tr key={o.id} className={`border-b border-kborder/50 ${idx % 2 === 1 ? 'bg-kdark/30' : ''}`}>
                    <td className="p-4 font-display font-700 text-ky text-xs">{o.id}</td>
                    <td className="p-4 text-xs hidden sm:table-cell">{o.customer}</td>
                    <td className="p-4 text-xs text-kmuted hidden md:table-cell">{o.date}</td>
                    <td className="p-4 text-xs text-kmuted hidden lg:table-cell">{o.payment}</td>
                    <td className="p-4 text-right font-display font-800 text-sm">{fmt(o.total)}</td>
                    <td className="p-4 text-center"><span className={`kings-badge ${STATUS_COLORS[o.status]}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-kborder bg-kdark">
                  <td colSpan={4} className="p-4 font-display font-800 text-sm uppercase tracking-wider hidden md:table-cell">Total Geral</td>
                  <td colSpan={4} className="p-4 md:hidden font-display font-800 text-sm uppercase tracking-wider">Total</td>
                  <td className="p-4 text-right font-display font-900 text-xl text-ky">{fmt(orders.reduce((s, o) => s + o.total, 0))}</td>
                  <td className="p-4" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Top products */}
          <div className="kings-card p-5">
            <h3 className="font-display font-800 text-base uppercase tracking-wide border-b border-kborder pb-3 mb-4">Produtos Mais Vendidos</h3>
            <div className="space-y-3">
              {[
                { name: 'Detergente Concentrado Kings', units: 18, revenue: 160.20 },
                { name: 'Sabão em Pó Ultra Enzimático', units: 12, revenue: 202.80 },
                { name: 'Limpa Vidros Cristal Total', units: 10, revenue: 119.00 },
                { name: 'Shampoo Automotivo Neutro', units: 7, revenue: 160.30 },
                { name: 'Cera Líquida Automotiva Kings', units: 5, revenue: 194.50 },
              ].map((item, i) => (
                <div key={item.name} className="flex items-center gap-4">
                  <span className="font-display font-900 text-2xl text-kborder w-6 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-700 text-sm uppercase line-clamp-1">{item.name}</p>
                    <div className="h-1.5 bg-kcard2 mt-1.5 w-full">
                      <div
                        className="h-full bg-ky"
                        style={{ width: `${(item.units / 18) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-800 text-ky text-sm">{fmt(item.revenue)}</p>
                    <p className="text-xs text-kmuted">{item.units} unid.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([])
  const [customerView, setCustomerView] = useState<CustomerView>('catalog')
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard')
  const [adminSection, setAdminSection] = useState<AdminSection>('panel')
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
  const [lastOrderId, setLastOrderId] = useState('')

  const role = currentUser?.role

  const handleLogin = (user: User) => {
    setCurrentUser(user)
    setCartOpen(false)
    setCustomerView('catalog')
    setAdminTab('dashboard')
    setAdminSection('panel')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCart([])
    setCartOpen(false)
    setCustomerView('catalog')
    setAdminSection('panel')
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateCart = (id: number, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== id))
    else setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.min(qty, i.product.stock) } : i))
  }

  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.product.id !== id))

  const handleCheckout = (payment: 'Pix' | 'Cartão') => {
    const id = `KNG-${Date.now().toString().slice(-6)}`
    const newOrder: Order = {
      id,
      date: new Date().toLocaleDateString('pt-BR'),
      items: [...cart],
      total: cart.reduce((s, i) => s + i.product.price * i.quantity, 0),
      status: payment === 'Pix' ? 'Aguardando Pagamento' : 'Confirmado',
      payment,
      address: 'Av. Paulista, 1000 — Bela Vista, São Paulo/SP',
      customer: currentUser?.name ?? 'Cliente',
    }
    setOrders(prev => [newOrder, ...prev])
    setProducts(prev => prev.map(p => {
      const item = cart.find(i => i.product.id === p.id)
      return item ? { ...p, stock: p.stock - item.quantity } : p
    }))
    setCart([])
    setCartOpen(false)
    setLastOrderId(id)
    setCustomerView('confirmation')
  }

  const handleSaleComplete = (items: CartItem[]) => {
    setProducts(prev => prev.map(p => {
      const item = items.find(i => i.product.id === p.id)
      return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
    }))
    const id = `PDV-${Date.now().toString().slice(-6)}`
    setOrders(prev => [{
      id, date: new Date().toLocaleDateString('pt-BR'),
      items, total: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
      status: 'Entregue', payment: 'Pix', address: 'Venda Presencial', customer: 'Cliente Balcão',
    }, ...prev])
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  // ── Not authenticated → Login ──
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        registeredUsers={registeredUsers}
        onRegister={(u) => setRegisteredUsers(prev => [...prev, u])}
      />
    )
  }

  // ── Authenticated ──
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        cartCount={cartCount}
        cartOpen={cartOpen}
        onCartToggle={() => setCartOpen(o => !o)}
        customerView={customerView}
        onCustomerViewChange={setCustomerView}
        adminTab={adminTab}
        onAdminTabChange={setAdminTab}
        adminSection={adminSection}
        onAdminSectionChange={setAdminSection}
      />

      <main>
        {/* ── Cliente ── */}
        {role === 'cliente' && (
          <>
            {customerView === 'catalog' && (
              <StoreView products={products} onAddToCart={(p) => { addToCart(p); setCartOpen(true) }} />
            )}
            {customerView === 'checkout' && (
              <CheckoutView cart={cart} onConfirm={handleCheckout} onBack={() => { setCustomerView('catalog'); setCartOpen(true) }} />
            )}
            {customerView === 'confirmation' && (
              <OrderConfirmation orderId={lastOrderId} onContinue={() => setCustomerView('catalog')} />
            )}
            {customerView === 'orders' && (
              <OrdersView orders={orders.filter(o => o.customer === currentUser.name)} />
            )}
            {cartOpen && customerView !== 'checkout' && customerView !== 'confirmation' && (
              <CartDrawer
                cart={cart}
                onUpdate={updateCart}
                onRemove={removeFromCart}
                onCheckout={() => { setCartOpen(false); setCustomerView('checkout') }}
                onClose={() => setCartOpen(false)}
              />
            )}
          </>
        )}

        {/* ── Funcionário ── */}
        {role === 'funcionario' && (
          <PDVView products={products} onSaleComplete={handleSaleComplete} />
        )}

        {/* ── Admin ── */}
        {role === 'admin' && (
          <>
            {/* Admin panel section */}
            {adminSection === 'panel' && (
              <AdminView
                products={products}
                orders={orders}
                onUpdateProduct={(p) => setProducts(prev => prev.map(x => x.id === p.id ? p : x))}
                onAddStock={(id, qty) => setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: p.stock + qty } : p))}
                onUpdateOrderStatus={(id, status) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))}
              />
            )}

            {/* Store section — full store access for admin */}
            {adminSection === 'store' && (
              <>
                {customerView === 'catalog' && (
                  <StoreView products={products} onAddToCart={(p) => { addToCart(p); setCartOpen(true) }} />
                )}
                {customerView === 'checkout' && (
                  <CheckoutView cart={cart} onConfirm={handleCheckout} onBack={() => { setCustomerView('catalog'); setCartOpen(true) }} />
                )}
                {customerView === 'confirmation' && (
                  <OrderConfirmation orderId={lastOrderId} onContinue={() => setCustomerView('catalog')} />
                )}
                {customerView === 'orders' && (
                  <OrdersView orders={orders} />
                )}
                {cartOpen && customerView !== 'checkout' && customerView !== 'confirmation' && (
                  <CartDrawer
                    cart={cart}
                    onUpdate={updateCart}
                    onRemove={removeFromCart}
                    onCheckout={() => { setCartOpen(false); setCustomerView('checkout') }}
                    onClose={() => setCartOpen(false)}
                  />
                )}
              </>
            )}

            {/* PDV section */}
            {adminSection === 'pdv' && (
              <PDVView products={products} onSaleComplete={handleSaleComplete} />
            )}
          </>
        )}
      </main>

      <footer className="mt-16 border-t border-kborder py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <KingsLogo size="sm" />
          <p className="text-xs text-kmuted font-display uppercase tracking-wider">© 2024 Kings Produtos de Limpeza — Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
