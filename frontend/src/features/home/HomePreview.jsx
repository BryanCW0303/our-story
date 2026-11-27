import './HomePreview.css'

const designs = [
  ['letter', '雙城書信'],
  ['atlas', '夜航圖誌'],
  ['folio', '足跡週刊'],
]

export default function HomePreview({ children }) {
  const selected = new URLSearchParams(window.location.search).get('design')
  if (!designs.some(([id]) => id === selected)) return children

  function designUrl(id) {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('design', id)
    else url.searchParams.delete('design')
    return url.href
  }

  return <div className="home-preview" data-design={selected}>
    <nav className="design-picker" aria-label="首頁樣板">
      {designs.map(([id, name]) => <a key={id} href={designUrl(id)} aria-current={id === selected ? 'page' : undefined}>{name}</a>)}
      <a href={designUrl(null)}>原版首頁</a>
    </nav>
    {children}
  </div>
}
