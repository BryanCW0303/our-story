export function PageFrame({ error, children }) {
  return (
    <main>
      {error && <p className="notice error" role="alert">{error}</p>}
      {children}
    </main>
  )
}

export function Missing({ text, href, label }) {
  return (
    <div className="empty pad">
      <p>{text}</p>
      <a className="btn ghost" href={href}>
        {label}
      </a>
    </div>
  )
}
