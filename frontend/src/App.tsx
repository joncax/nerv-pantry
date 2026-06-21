import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Inventory from '@/pages/Inventory'
import Scanner from '@/pages/Scanner'
import Taloes from '@/pages/Taloes'
import ShoppingList from '@/pages/ShoppingList'
import Meals from '@/pages/Meals'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="taloes" element={<Taloes />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="shopping" element={<ShoppingList />} />
        <Route path="meals" element={<Meals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}