// Q 版圖示：手繪 SVG，畫布 120×120。要加新地點時，在 ICONS 裡用地點的代號（slug）加一項。
// 最後三個 act- 開頭的是「我們一起做過的事」三類的圖示。
const K = '#5a4336' // 描邊顏色
const face = (x, y, gap = 7) => `
  <g stroke="none">
    <circle cx="${x - gap}" cy="${y}" r="2.4" fill="${K}"/><circle cx="${x + gap}" cy="${y}" r="2.4" fill="${K}"/>
    <ellipse cx="${x - gap - 5}" cy="${y + 5}" rx="3.6" ry="2.3" fill="#f29b93" opacity=".8"/>
    <ellipse cx="${x + gap + 5}" cy="${y + 5}" rx="3.6" ry="2.3" fill="#f29b93" opacity=".8"/>
  </g>
  <path d="M${x - 3} ${y + 4}q3 3.6 6 0" stroke-width="2.2"/>`
const ground = (color) => `<ellipse cx="60" cy="108" rx="40" ry="5" fill="${color}" stroke="none"/>`

const ICONS = {
  // 西雅圖：太空針塔
  seattle: `${ground('#c5dccb')}
    <path d="M90 26q2-8 9-5 8-2 8 5z" fill="#fff" stroke-width="2"/>
    <path d="M60 8v16"/>
    <path d="M50 56Q58 84 40 108h12l8-18 8 18h12Q62 84 70 56z" fill="#fffaf2"/>
    <path d="M44 35q16-20 32 0z" fill="#fffaf2"/>
    <rect x="24" y="33" width="72" height="25" rx="12.5" fill="#f2b872"/>
    <circle cx="60" cy="8" r="3" fill="#ef8f7d"/>
    ${face(60, 43, 9)}`,
  // 廣州：廣州塔（小蠻腰）
  guangzhou: `${ground('#f3d5dc')}
    <path d="M60 6v20"/>
    <path d="M40 108C52 84 55 66 53 54 51 42 48 34 47 24h26c-1 10-4 18-6 30-2 12 1 30 13 54z" fill="#f6bccb"/>
    <path d="M48 30l18 20M72 30L54 50M54 58l10 14M66 58L56 72M48 36h24M52 50h16" stroke="#fff" stroke-width="1.8" opacity=".85"/>
    <path d="M90 28v10M85 33h10M26 48v8M22 52h8" stroke="#f2b872" stroke-width="2.6"/>
    <circle cx="60" cy="6" r="3" fill="#f2b872"/>
    ${face(60, 88, 7)}`,
  // 溫哥華（居住地）：UBC 的鐘樓和圖書館
  vancouver: `${ground('#cfdcc6')}
    <rect x="82" y="16" width="18" height="90" rx="3" fill="#f4f1ea"/>
    <circle class="campus-clock" cx="91" cy="31" r="6" fill="#fffaf2" stroke-width="2.2"/>
    <path d="M91 31v-3.500M91 31l2.500 1.500" stroke-width="1.8"/>
    <path d="M88 46v50M94 46v50" stroke-width="1.5" opacity=".3"/>
    <rect x="20" y="62" width="56" height="44" fill="#ece4d2"/>
    <path d="M15 63L48 39l33 24z" fill="#9db6c9"/>
    <path d="M48 39V23"/>
    <path d="M48 21h25l-5 6.500 5 6.500H48z" fill="#2f5d9b" stroke-width="2"/>
    <text x="50.500" y="30.700" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="#f6cf5e" stroke="none">UBC</text>
    <path d="M41 106V95a7 7 0 0 1 14 0v11z" fill="#8a6a58" stroke-width="2.2"/>
    <g fill="#cfe3e8" stroke-width="2"><rect x="26" y="88" width="8" height="12" rx="4"/><rect x="62" y="88" width="8" height="12" rx="4"/></g>
    ${face(48, 74, 8)}`,
  // 東京：東京鐵塔和櫻花
  tokyo: `${ground('#f6d6d2')}
    <path d="M60 6v16"/>
    <path d="M46 71h28l18 37H76Q60 80 44 108H28z" fill="#f08f7e"/>
    <path d="M53 22h14l7 40H46z" fill="#f08f7e"/>
    <path d="M52 28h16l1.400 8H50.600z" fill="#fffaf2" stroke-width="2"/>
    <rect class="tower-light" x="40" y="60" width="40" height="11" rx="4.500" fill="#fffaf2"/>
    <path d="M51 80h18M42 94h9M69 94h9" stroke="#fff" stroke-width="1.8" opacity=".85"/>
    <g fill="#f8c9d4" stroke-width="2">
      <circle cx="98" cy="30" r="6"/><circle cx="22" cy="52" r="4.500"/>
    </g>
    <g fill="#f8c9d4" stroke="none"><circle cx="106" cy="46" r="2.600"/><circle cx="90" cy="48" r="2.200"/><circle cx="30" cy="38" r="2.200"/></g>
    <circle cx="98" cy="30" r="1.600" fill="#ef8f7d" stroke="none"/><circle cx="22" cy="52" r="1.300" fill="#ef8f7d" stroke="none"/>
    ${face(60, 49, 6)}`,
  // 香港：中環（中銀大廈、國金二期、摩天輪）
  hongkong: `<path d="M22 106V54l20-20v72z" fill="#cfe2d4"/>
    <path d="M22 54l20 22M42 54L22 76M22 78l20 22M42 78L22 100" stroke-width="1.5" opacity=".35"/>
    <path d="M35 41V22M42 34V14"/>
    <path d="M52 106V30q0-8 4-12l3 6 4-9 4 9 3-6q4 4 4 12v76z" fill="#bcd9e3"/>
    <path d="M58 76h10M58 86h10M58 96h10" stroke-width="1.6" opacity=".35"/>
    <path d="M94 80l-8 26M94 80l8 26"/>
    <circle cx="94" cy="80" r="16" fill="#fde6da"/>
    <path d="M94 64v32M78 80h32M82.700 68.700l22.600 22.600M105.300 68.700l-22.600 22.600" stroke-width="1.5" opacity=".4"/>
    <circle cx="94" cy="80" r="3.5" fill="#ef8f7d"/>
    <path d="M8 108q7-6 14 0t14 0 14 0 14 0 14 0 14 0 14 0" stroke="#7fb0bf"/>
    ${face(63, 52, 6)}`,
  // 成都：大熊貓
  chengdu: `<path d="M98 16v92" stroke="#93bb7d" stroke-width="8"/>
    <path d="M93 44h10M93 76h10" stroke="#6f9a5c" stroke-width="2"/>
    <path d="M100 30q12-12 18-3-9 8-18 3z" fill="#b3d69a" stroke="#6f9a5c" stroke-width="2"/>
    <circle cx="27" cy="40" r="13" fill="${K}"/><circle cx="79" cy="40" r="13" fill="${K}"/>
    <ellipse cx="53" cy="68" rx="37" ry="33" fill="#fffaf2"/>
    <g stroke="none">
      <ellipse cx="38" cy="64" rx="8.500" ry="10.500" transform="rotate(22 38 64)" fill="${K}"/>
      <ellipse cx="68" cy="64" rx="8.500" ry="10.500" transform="rotate(-22 68 64)" fill="${K}"/>
      <circle cx="39.500" cy="62.500" r="3.200" fill="#fff"/><circle cx="66.500" cy="62.500" r="3.200" fill="#fff"/>
      <ellipse cx="53" cy="76" rx="4.200" ry="3" fill="${K}"/>
      <ellipse cx="27" cy="80" rx="5" ry="3.200" fill="#f29b93" opacity=".8"/><ellipse cx="79" cy="80" rx="5" ry="3.200" fill="#f29b93" opacity=".8"/>
    </g>
    <path d="M48 83q5 5 10 0" stroke-width="2.2"/>`,
  // 重慶：李子壩（輕軌穿樓）
  chongqing: `${ground('#ecdcc0')}
    <path d="M24 82v24" stroke="#b5a99d" stroke-width="7"/>
    <path d="M4 79h112" stroke="#b5a99d" stroke-width="6"/>
    <rect x="8" y="50" width="62" height="26" rx="12" fill="#a9d6c4"/>
    <path d="M8 68h40" stroke-width="1.6" opacity=".35"/>
    <rect x="46" y="12" width="54" height="96" rx="7" fill="#f3dcb8"/>
    <path d="M46 46h54M46 84h54" stroke-width="1.6" opacity=".35"/>
    <g fill="#fffaf2" stroke-width="1.6">
      <rect x="54" y="21" width="9" height="8" rx="2"/><rect x="68.500" y="21" width="9" height="8" rx="2"/><rect x="83" y="21" width="9" height="8" rx="2"/>
      <rect x="54" y="33" width="9" height="8" rx="2"/><rect x="68.500" y="33" width="9" height="8" rx="2"/><rect x="83" y="33" width="9" height="8" rx="2"/>
      <rect x="54" y="91" width="9" height="8" rx="2"/><rect x="68.500" y="91" width="9" height="8" rx="2"/><rect x="83" y="91" width="9" height="8" rx="2"/>
    </g>
    <path d="M56 58h34M56 66h34M56 74h34" stroke-width="1.6" opacity=".25"/>
    ${face(26, 60, 6)}`,
  // 澳門：大三巴牌坊
  macau: `${ground('#d9d0e6')}
    <path d="M24 109l8-11h56l8 11z" fill="#dccfb6"/>
    <rect x="32" y="64" width="56" height="34" fill="#efe2c8"/>
    <g fill="#8a6a58" stroke-width="2">
      <path d="M40 98V86a5 5 0 0 1 10 0v12z"/><path d="M54 98V83a6 6 0 0 1 12 0v15z"/><path d="M70 98V86a5 5 0 0 1 10 0v12z"/>
    </g>
    <rect x="36" y="44" width="48" height="20" fill="#f8eed9"/>
    <rect x="43" y="30" width="34" height="14" fill="#efe2c8"/>
    <g fill="#8a6a58" stroke-width="1.8"><rect x="49" y="34" width="5" height="7" rx="2.500"/><rect x="66" y="34" width="5" height="7" rx="2.500"/></g>
    <path d="M47 30l13-14 13 14z" fill="#f8eed9"/>
    <path d="M60 16V5M56 9h8"/>
    <path d="M98 30l2.500 5 5 2.500-5 2.500-2.500 5-2.500-5-5-2.500 5-2.500z" fill="#f2b872" stroke-width="2"/>
    ${face(60, 51, 8)}`,
  // 溫哥華（旅遊）：煤氣鎮蒸汽鐘
  'vancouver-trip': `${ground('#e4dcc0')}
    <g class="clock-steam" fill="#fff" stroke-width="2"><circle cx="41" cy="13" r="4.500"/><circle cx="34" cy="7" r="3"/><circle cx="79" cy="13" r="4.500"/><circle cx="86" cy="7" r="3"/></g>
    <path d="M46 26v-7M74 26v-7"/>
    <rect x="40" y="96" width="40" height="12" rx="3" fill="#a07c62"/>
    <rect x="46" y="58" width="28" height="38" rx="3" fill="#cfe3e8"/>
    <path d="M46 86h28" stroke-width="1.6" opacity=".35"/>
    <rect x="38" y="28" width="44" height="30" rx="6" fill="#c99a6b"/>
    <path d="M42 28l18-11 18 11z" fill="#a07c62"/>
    <circle cx="60" cy="43" r="10.500" fill="#fffaf2"/>
    <path d="M60 43v-6.500M60 43l4.500 3" stroke-width="2.2"/>
    ${face(60, 70, 6)}`,
  // 京都：伏見稻荷的鳥居
  kyoto: `${ground('#c9ddd6')}
    <path d="M33 108l4-62h11l-2 62z" fill="#e8674a"/>
    <path d="M74 108l-2-62h11l4 62z" fill="#e8674a"/>
    <rect x="25" y="54" width="70" height="10" rx="2.500" fill="#e8674a"/>
    <rect x="54" y="42" width="12" height="12" fill="#f6cf5e" stroke-width="2.2"/>
    <path d="M17 28q43-11 86 0l-4 16q-39-9-78 0z" fill="#e8674a"/>
    <path d="M13 24q47-13 94 0l-2 6q-45-12-90 0z" fill="${K}" stroke-width="2"/>
    <g fill="#5a4336" stroke="none"><rect x="30" y="102" width="19" height="7" rx="2"/><rect x="71" y="102" width="19" height="7" rx="2"/></g>
    <path d="M103 60l3 5 5 1-4 4 1 5-5-2-5 2 1-5-4-4 5-1z" fill="#f2b872" stroke-width="2"/>
    ${face(60, 33, 10)}`,
  // 活動：影片（場記板）
  'act-film': `${ground('#ead6cf')}
    <rect x="24" y="52" width="72" height="52" rx="7" fill="#fffaf2"/>
    <rect x="24" y="46" width="72" height="13" fill="${K}"/>
    <path d="M38 47l-6 11M54 47l-6 11M70 47l-6 11M86 47l-6 11" stroke="#fffaf2" stroke-width="5"/>
    <path d="M22 34l70-15 3 13-70 15z" fill="${K}"/>
    <path d="M35 32l7 11M51 28.600l7 11M67 25.200l7 11M83 21.800l7 11" stroke="#fffaf2" stroke-width="5"/>
    <path d="M103 46l2.500 5 5 2.500-5 2.500-2.500 5-2.500-5-5-2.500 5-2.500z" fill="#f2b872" stroke-width="2"/>
    ${face(60, 78, 9)}`,
  // 活動：LEGO（一塊積木）
  'act-lego': `${ground('#e6dbb9')}
    <rect x="33" y="32" width="22" height="16" rx="4" fill="#f4c95d"/>
    <rect x="65" y="32" width="22" height="16" rx="4" fill="#f4c95d"/>
    <rect x="22" y="44" width="76" height="60" rx="9" fill="#f4c95d"/>
    <path d="M32 55v16" stroke="#fffaf2" stroke-width="3.500" opacity=".8"/>
    ${face(60, 72, 10)}`,
  // 活動：遊戲（手把）
  'act-game': `${ground('#d3dbea')}
    <path d="M30 44h60a18 18 0 0 1 18 18v16a14 14 0 0 1-26 7l-4-7H42l-4 7a14 14 0 0 1-26-7V62a18 18 0 0 1 18-18z" fill="#bccbe8"/>
    <path d="M34 55v14M27 62h14" stroke-width="5"/>
    <circle cx="86" cy="57" r="4.500" fill="#ef8f7d" stroke-width="2.200"/>
    <circle cx="95" cy="67" r="4.500" fill="#f2b872" stroke-width="2.200"/>
    ${face(60, 60, 8)}`,
  // 其他地點（之後在後台新增、還沒畫圖示的）：一個圖釘
  fallback: `${ground('#f3d5dc')}
    <path d="M60 102C42 80 32 66 32 50a28 28 0 0 1 56 0c0 16-10 30-28 52z" fill="#f6bccb"/>
    ${face(60, 48, 8)}`,
}

export default function Landmark({ slug }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke={K}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // The markup above is a fixed set of strings in this file, never user input.
      dangerouslySetInnerHTML={{ __html: ICONS[slug] ?? ICONS.fallback }}
    />
  )
}

/** The landmark on its round, tinted background. */
export function Badge({ place }) {
  return (
    <span className="badge" style={{ background: place.color }}>
      <Landmark slug={place.slug} />
    </span>
  )
}
