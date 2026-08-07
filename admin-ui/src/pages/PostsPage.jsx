import { useEffect, useState } from 'react'
import { postizPosts } from '../api'

const STATUS_BADGE = {
  PUBLISHED: 'badge-healthy',
  DRAFT: 'badge-starting',
  SCHEDULED: 'badge-starting',
  ERROR: 'badge-unhealthy',
}

export default function PostsPage() {
  const [posts, setPosts] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await postizPosts.list({ limit: 50 })
      setPosts(Array.isArray(data) ? data : data?.posts || data?.items || [])
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Posts</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
          <a className="btn btn-primary btn-sm" href="http://localhost:4007/launches" target="_blank" rel="noreferrer">
            New Post in Postiz ↗
          </a>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Content</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr key={post.id}>
                <td style={{ maxWidth: 400 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                    {post.content || post.text || '(no content)'}
                  </div>
                </td>
                <td>
                  <span className="badge badge-starting" style={{ textTransform: 'capitalize' }}>
                    {post.providerIdentifier || post.provider || '—'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[post.state] || 'badge-starting'}`}>
                    {post.state || '—'}
                  </span>
                </td>
                <td className="text-muted">
                  {post.publishDate ? new Date(post.publishDate).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {!loading && posts.length === 0 && (
              <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 28 }}>No posts yet.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /> Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
