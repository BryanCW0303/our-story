import { useEffect, useRef, useState } from 'react'
import { createBook, duration } from './scene.js'
import './storybook.css'

export default function Storybook() {
  const canvas = useRef(null)
  const clock = useRef(0)
  const playing = useRef(false)
  const [status, setStatus] = useState('loading')
  const [running, setRunning] = useState(false)
  const [time, setTime] = useState(0)
  function play(value) {
    playing.current = value
    setRunning(value)
  }
  useEffect(() => {
    let book, animation, last, observer, drawnTime, cancelled = false
    function render(now) {
      if (playing.current && last != null && !document.hidden) {
        clock.current = Math.min(duration, clock.current + (now - last) / 1000)
        if (clock.current === duration) play(false)
        setTime(clock.current)
      }
      last = now
      if (drawnTime !== clock.current) {
        book.render(clock.current)
        drawnTime = clock.current
      }
      animation = requestAnimationFrame(render)
    }
    async function load() {
      try {
        book = createBook(canvas.current)
        await book.start()
        if (cancelled) return
        observer = new ResizeObserver(() => { book.resize(); drawnTime = undefined })
        observer.observe(canvas.current)
        book.resize()
        setStatus('ready')
        play(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        render(performance.now())
      } catch (error) {
        console.error(error)
        if (!cancelled) setStatus('error')
      }
    }
    load()
    return () => {
      cancelled = true
      cancelAnimationFrame(animation)
      observer?.disconnect()
      book?.dispose()
    }
  }, [])
  function seek(value) {
    clock.current = value
    setTime(value)
  }
  return <main className="storybook" aria-label="一週年立體書">
    <div className="storybook-stage">
      <canvas ref={canvas} aria-label="西雅圖紙雕場景，從超市、水岸到夜巴" />
      {status === 'loading' && <p role="status">正在展開書頁…</p>}
      {status === 'error' && <p role="alert">立體場景未能載入，請確認瀏覽器支援 WebGL 後重新整理。</p>}
    </div>
    <nav aria-label="立體書播放控制">
      <a href="#/">回到首頁</a>
      <button disabled={status !== 'ready'} onClick={() => {
        if (clock.current >= duration) seek(0)
        play(!playing.current)
      }}>{running ? '暫停' : time >= duration ? '重播' : '播放'}</button>
      <input aria-label="播放進度" type="range" min="0" max={duration} step=".05"
        disabled={status !== 'ready'} value={time} onChange={e => seek(Number(e.target.value))} />
    </nav>
  </main>
}
