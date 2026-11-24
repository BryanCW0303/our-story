import { useState } from 'react'
import { api } from '../../api.js'
import Modal from '../../components/Modal.jsx'

export default function LoginForm({ onClose, onLoggedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLoggedIn(await api('login/', { method: 'POST', json: { username, password } }))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="登入" onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="form">
        <label>
          帳號
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </label>
        <label>
          密碼
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>
            {busy ? '登入中…' : '登入'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
