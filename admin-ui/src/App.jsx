import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CredentialsPage from './pages/CredentialsPage'
import ProvidersPage from './pages/ProvidersPage'
import PostsPage from './pages/PostsPage'

export default function App() {
  const [auth, setAuth] = useState(() => localStorage.getItem('postiz_auth'))

  function login(token) {
    localStorage.setItem('postiz_auth', token)
    setAuth(token)
  }

  function logout() {
    localStorage.removeItem('postiz_auth')
    setAuth(null)
  }

  if (!auth) return <LoginPage onLogin={login} />

  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/credentials" element={<CredentialsPage />} />
        <Route path="/providers"   element={<ProvidersPage />} />
        <Route path="/posts"       element={<PostsPage />} />
      </Routes>
    </Layout>
  )
}
