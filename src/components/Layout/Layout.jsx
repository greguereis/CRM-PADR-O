import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <Header onMenuClick={toggleSidebar} />
      
      {/* Main content - ajusta margem no desktop */}
      <main className="pt-14 min-h-screen lg:ml-64">
        <div className="p-3 sm:p-4 md:p-6 max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}