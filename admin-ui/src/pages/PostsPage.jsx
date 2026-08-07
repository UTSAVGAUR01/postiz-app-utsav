import { useEffect, useState } from 'react'
import { aiContent, postizPosts } from '../api'

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
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [generated, setGenerated] = useState(null)

  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [audience, setAudience] = useState('Indian young adults')
  const [tone, setTone] = useState('bold and energetic')
  const [goal, setGoal] = useState('engagement and shares')
  const [language, setLanguage] = useState('Hinglish')
  const [brandVoice, setBrandVoice] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [apiKey, setApiKey] = useState('')

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('Copied to clipboard')
      setTimeout(() => setCopyStatus(''), 1200)
    } catch {
      setCopyStatus('Copy failed in browser permissions')
    }
  }

  async function generateWithAI() {
    setGenError('')
    setGenerated(null)
    setCopyStatus('')

    if (!topic.trim()) {
      setGenError('Topic is required to generate content.')
      return
    }

    setGenLoading(true)
    try {
      const output = await aiContent.generate({
        topic,
        platform,
        audience,
        tone,
        goal,
        language,
        brandVoice,
        keyPoints,
        apiKey,
      })
      setGenerated(output)
    } catch (e) {
      setGenError(e.message)
    } finally {
      setGenLoading(false)
    }
  }

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
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="card-title" style={{ marginBottom: 6 }}>AI Post Studio</div>
            <div className="text-muted">Generate trendy post copy, hashtags, and image prompts for viral reach.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={generateWithAI} disabled={genLoading}>
            {genLoading ? <><span className="spinner" />Generating…</> : 'Generate with AI'}
          </button>
        </div>

        <div className="grid-3 mt-4">
          <div className="form-group">
            <label>Topic</label>
            <input className="form-control" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Example: Monsoon street food reels in Mumbai" />
          </div>
          <div className="form-group">
            <label>Platform</label>
            <select className="form-control" value={platform} onChange={e => setPlatform(e.target.value)}>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="x">X / Twitter</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div className="form-group">
            <label>Audience</label>
            <input className="form-control" value={audience} onChange={e => setAudience(e.target.value)} />
          </div>
        </div>

        <div className="grid-3">
          <div className="form-group">
            <label>Tone</label>
            <input className="form-control" value={tone} onChange={e => setTone(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Goal</label>
            <input className="form-control" value={goal} onChange={e => setGoal(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Language</label>
            <input className="form-control" value={language} onChange={e => setLanguage(e.target.value)} />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label>Brand Voice (optional)</label>
            <textarea className="form-control" rows={3} value={brandVoice} onChange={e => setBrandVoice(e.target.value)} placeholder="Playful, premium, youth-driven..." />
          </div>
          <div className="form-group">
            <label>Must Include Points (optional)</label>
            <textarea className="form-control" rows={3} value={keyPoints} onChange={e => setKeyPoints(e.target.value)} placeholder="Comma or newline separated points" />
          </div>
        </div>

        <div className="form-group">
          <label>AI API Key (optional if server has AI_API_KEY)</label>
          <input type="password" className="form-control" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste key for this session" />
        </div>

        {genError && <div className="alert alert-error">{genError}</div>}
        {copyStatus && <div className="alert alert-success">{copyStatus}</div>}

        {generated && (
          <div className="card" style={{ background: '#0f172a', marginBottom: 0 }}>
            <div className="flex justify-between items-center mb-2">
              <div className="card-title" style={{ marginBottom: 0 }}>Generated Output</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => copy([generated.caption, generated.hashtags?.join(' ') || '', generated.cta].filter(Boolean).join('\n\n'))}
              >
                Copy Full Post
              </button>
            </div>

            <div className="form-group">
              <label>Hook</label>
              <div className="form-control" style={{ minHeight: 42, whiteSpace: 'pre-wrap' }}>{generated.hook || '—'}</div>
            </div>

            <div className="form-group">
              <label>Caption</label>
              <div className="form-control" style={{ minHeight: 92, whiteSpace: 'pre-wrap' }}>{generated.caption || '—'}</div>
            </div>

            <div className="form-group">
              <label>Hashtags</label>
              <div className="form-control" style={{ minHeight: 42, whiteSpace: 'pre-wrap' }}>
                {(generated.hashtags || []).join(' ') || '—'}
              </div>
            </div>

            <div className="form-group">
              <label>Image Prompts</label>
              <div className="form-control" style={{ minHeight: 92, whiteSpace: 'pre-wrap' }}>
                {(generated.imagePrompts || []).length
                  ? generated.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')
                  : '—'}
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>CTA</label>
                <div className="form-control" style={{ minHeight: 42, whiteSpace: 'pre-wrap' }}>{generated.cta || '—'}</div>
              </div>
              <div className="form-group">
                <label>Best Post Time</label>
                <div className="form-control" style={{ minHeight: 42, whiteSpace: 'pre-wrap' }}>{generated.bestPostTime || '—'}</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Trend Angle</label>
              <div className="form-control" style={{ minHeight: 42, whiteSpace: 'pre-wrap' }}>{generated.trendAngle || '—'}</div>
            </div>
          </div>
        )}
      </div>

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
