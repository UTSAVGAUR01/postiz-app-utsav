import { useEffect, useState } from 'react'
import { postizIntegrations } from '../api'

export default function ProvidersPage() {
  const [integrations, setIntegrations] = useState([])
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setIntegrations(await postizIntegrations.list()) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function disconnect(id, name) {
    if (!confirm(`Disconnect ${name}?`)) return
    try {
      await postizIntegrations.disconnect(id)
      setMsg(`${name} disconnected`)
      load()
    } catch (e) { setError(e.message) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Connected Providers</h1>
        <a className="btn btn-primary btn-sm" href="http://localhost:4007" target="_blank" rel="noreferrer">
          Connect via Postiz ↗
        </a>
      </div>

      <div className="alert alert-info">
        To connect a new social account, open <a href="http://localhost:4007" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>Postiz</a> → Settings → Channels. Make sure the provider's credentials are saved in the <strong>Credentials</strong> tab first.
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Provider</th>
              <th>Type</th>
              <th>Connected</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map(ig => (
              <tr key={ig.id}>
                <td>
                  <div className="flex items-center gap-2">
                    {ig.picture && <img src={ig.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
                    <strong>{ig.name || ig.profile}</strong>
                  </div>
                </td>
                <td><span className="badge badge-starting" style={{ textTransform: 'capitalize' }}>{ig.providerIdentifier}</span></td>
                <td className="text-muted">{ig.type}</td>
                <td className="text-muted">{ig.createdAt ? new Date(ig.createdAt).toLocaleDateString() : '—'}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => disconnect(ig.id, ig.name || ig.profile)}>
                    Disconnect
                  </button>
                </td>
              </tr>
            ))}
            {!loading && integrations.length === 0 && (
              <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: 28 }}>
                No connected accounts yet.{' '}
                <a href="http://localhost:4007" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>Connect one via Postiz →</a>
              </td></tr>
            )}
            {loading && (
              <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /> Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
