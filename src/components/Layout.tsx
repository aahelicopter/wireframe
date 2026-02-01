import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, ClipboardCheck, AlertCircle, DollarSign, Network } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/controls', label: 'Controls', icon: FileText },
    { path: '/coverage', label: 'Coverage', icon: LayoutDashboard },
    { path: '/tests', label: 'Tests', icon: ClipboardCheck },
    { path: '/issues', label: 'Issues', icon: AlertCircle },
    { path: '/fs-line-items', label: 'Financial Statements', icon: DollarSign },
    { path: '/network-graph', label: 'Network Graph', icon: Network },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-primary-foreground border-r border-border">
        <div className="p-6">
          <h1 className="text-2xl font-bold">SoxHub</h1>
          <p className="text-sm text-muted-foreground mt-1">Audit Control Management</p>
        </div>
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-primary-foreground text-primary'
                    : 'text-primary-foreground hover:bg-primary-foreground/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
