// 我們一起做過的事：影片、LEGO、遊戲。
// 要加一項：把封面圖（寬 600px 左右的 .jpg）放進 src/assets/covers/，在下面對應的類別加一行，
// 並在 src/assets/covers/SOURCES.md 記下圖片來源，然後重新建置前端。

const files = import.meta.glob('./assets/covers/*.jpg', { eager: true, query: '?url', import: 'default' })

/** The bundled URL of a cover, by its file name without the extension. */
export const coverUrl = (name) => files[`./assets/covers/${name}.jpg`]

export const ACTIVITIES = [
  {
    id: 'film',
    name: '影片',
    en: 'Films & Shows',
    verb: '看過',
    unit: '部',
    icon: 'act-film',
    color: '#f8dfd6',
    items: [
      { cover: 'film-your-name', title: '你的名字', sub: 'Your Name' },
      { cover: 'film-hells-kitchen', title: '地獄廚房', sub: "Hell's Kitchen" },
      { cover: 'film-teach-you-a-lesson', title: '鐵拳教育', sub: 'Teach You a Lesson' },
      { cover: 'film-good-doctor-s1', title: '良醫墨菲 第一季', sub: 'The Good Doctor · Season 1' },
      { cover: 'film-good-doctor-s2', title: '良醫墨菲 第二季', sub: 'The Good Doctor · Season 2' },
      { cover: 'film-cyberpunk-edgerunners', title: 'Cyberpunk：邊緣行者', sub: 'Cyberpunk: Edgerunners' },
    ],
  },
  {
    id: 'lego',
    name: 'LEGO',
    en: 'Brick by brick',
    verb: '拼過',
    unit: '盒',
    icon: 'act-lego',
    color: '#f6ecc8',
    items: [
      { cover: 'lego-72153', title: 'Venusaur, Charizard and Blastoise', sub: '72153' },
      { cover: 'lego-40892', title: 'Kanto Region Badge Collection', sub: '40892' },
      { cover: 'lego-40906', title: 'Restaurants of the World: Japan', sub: '40906' },
      { cover: 'lego-72046', title: 'Game Boy', sub: '72046' },
      { cover: 'lego-43019', title: 'Football', sub: '43019' },
    ],
  },
  {
    id: 'game',
    name: '遊戲',
    en: 'Games',
    verb: '玩過',
    unit: '款',
    icon: 'act-game',
    color: '#dfe5f3',
    items: [
      { cover: 'game-feed-the-cups', title: '杯杯倒滿', sub: 'Feed the Cups' },
      { cover: 'game-overcooked-2', title: 'Overcooked! 2', sub: '煮過頭 2' },
      { cover: 'game-stardew-valley', title: '星露谷物語', sub: 'Stardew Valley' },
    ],
  },
]
