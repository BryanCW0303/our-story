import * as THREE from 'three'

export const duration = 33
const png = ['market', 'produce', 'tree', 'lamp', 'bench', 'stop', 'ferry', 'yogurt', 'him-walk', 'her-walk', 'cart', 'him-sit', 'her-sit', 'bus']
const webp = ['map', 'bay', 'tile', 'walkway', 'road', 'aisle', 'street', 'cabin', 'bag', 'hands']
const ease = (time, from, to) => THREE.MathUtils.smoothstep(time, from, to)
const vec = (x, y, z) => new THREE.Vector3(x, y, z)

// Each key specifies a target and an eye offset. The same camera crosses all three stages.
const shots = [
  [0, -13, .9, 0, 1, 5.3, 9.5], [2, -14.7, 1, .5, .4, 2.9, 7.9],
  [6.4, -12.1, 1, .7, .2, 2.7, 7.6], [8, -11, 1.32, 1.32, 0, .35, 2.85],
  [8.9, -11, 1.32, 1.32, 0, .35, 2.85], [10.4, -.03, 1.36, .97, 0, .45, 3.15],
  [11.7, -.03, 1.36, .97, 0, .45, 3.15], [15, -.1, .95, -.3, 1.1, 4, 10.3],
  [17.6, -.1, .95, -.3, 1.1, 4, 10.3], [20.1, 5.4, .05, 0, .1, 21, 13],
  [21.5, 9, .05, 0, .1, 20, 12], [23.4, 12.7, 1.05, .15, .7, 3.1, 8.5],
  [25.3, 13.2, 1.05, .4, .7, 3.1, 8.5], [27.1, 13, 1.1, .65, .05, 1.55, 5.5],
  [29.7, 13, 1.1, .65, .05, 1.55, 5.5], [31.6, 13, .96, 1.03, 0, .15, 2.48],
  [33, 13, .96, 1.03, 0, .15, 2.48],
]

export function createBook(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  const world = new THREE.Scene()
  world.background = new THREE.Color('#e3cfab')
  const camera = new THREE.PerspectiveCamera(33, 16 / 9, .05, 140)
  const sky = new THREE.HemisphereLight(0xfff4db, 0xb19b87, 1.85)
  const sun = new THREE.DirectionalLight(0xffdfae, 2.05)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, far: 50 })
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.normalBias = .016
  sun.shadow.bias = -.00016
  world.add(sky, sun, sun.target)
  const loader = new THREE.TextureLoader()
  const textures = {}
  const geometries = new Set()
  const materials = new Set()
  let closed = false
  function mesh(parent, geometry, params) {
    const material = new THREE.MeshStandardMaterial({ roughness: 1, ...params })
    const item = new THREE.Mesh(geometry, material)
    geometries.add(geometry)
    materials.add(material)
    item.castShadow = item.receiveShadow = true
    parent.add(item)
    return item
  }
  function group(parent, x, y, z) {
    const item = new THREE.Group()
    item.position.set(x, y, z)
    parent.add(item)
    return item
  }
  function box(parent, x, y, z, w, h, d, color) {
    const item = mesh(parent, new THREE.BoxGeometry(w, h, d), { color })
    item.position.set(x, y, z)
    return item
  }
  function card(parent, name, x, y, z, height, width) {
    const texture = textures[name]
    const ratio = texture.image.width / texture.image.height
    const geometry = new THREE.PlaneGeometry(width ?? height * ratio, height)
    geometry.translate(0, height / 2, 0)
    const item = mesh(parent, geometry, { map: texture, side: THREE.DoubleSide, alphaTest: .45 })
    item.position.set(x, y, z)
    return item
  }
  function disk(x, color, print) {
    const g = group(world, x, .19, 0)
    mesh(g, new THREE.CylinderGeometry(5.4, 5.4, .16, 80), { color })
    const top = mesh(g, new THREE.CircleGeometry(5.39, 80), { map: textures[print] })
    top.rotation.x = -Math.PI / 2
    top.position.y = .082
    return group(g, 0, .085, 0)
  }

  let draw
  async function start() {
    await Promise.all([...png.map(n => [n, 'png']), ...webp.map(n => [n, 'webp'])].map(async ([name, ext]) => {
      const texture = await loader.loadAsync('/members/story/' + name + '.' + ext)
      if (closed) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      textures[name] = texture
    }))
    if (closed) return
    const sheet = mesh(world, new THREE.BoxGeometry(55, .18, 29), { color: '#c49d72' })
    sheet.position.y = -.11
    const map = mesh(world, new THREE.PlaneGeometry(55, 29), { map: textures.map })
    map.rotation.x = -Math.PI / 2
    for (const x of [-6.5, 6.5]) {
      for (let n = -2; n <= 2; n++) {
        const dash = box(world, x + n * .39, .023, .4 * Math.cos(n * .5), .22, .024, .09, '#994728')
        dash.rotation.y = n * .09
      }
    }
    const grocery = disk(-13, '#ddc49e', 'tile'), shore = disk(0, '#c9b498', 'walkway'), transit = disk(13, '#79838a', 'road')
    const folds = []
    function hinged(parent, name, x, z, h, w, at) {
      const leaf = card(parent, name, x, 0, z, h, w)
      folds.push({ leaf, at })
      return leaf
    }
    const wall = box(grocery, 0, 2.02, -2.48, 7.8, 4.04, .46, '#946f45')
    card(grocery, 'aisle', 0, .03, wall.position.z + .24, 4, 7.78)
    for (const [i, x] of [-2.9, -.95, 1.05, 3].entries()) hinged(grocery, 'produce', x, -1.16, 1.52, 1.86, .18 + i * .22)
    const path = new THREE.CatmullRomCurve3([vec(-2.8, 0, .72), vec(-1.6, 0, .93), vec(.1, 0, .85), vec(1.65, 0, .7)])
    const walkers = group(grocery, 0, 0, 0)
    function walker(name, x, h) {
      const tex = textures[name]
      tex.repeat.x = .25
      return card(walkers, name, x, 0, 0, h, h * .75)
    }
    const man = walker('him-walk', 0, 1.34), woman = walker('her-walk', -.64, 1.34 * 178 / 173)
    card(walkers, 'cart', .66, 0, .035, .87)
    const bag = card(grocery, 'bag', 2, .45, 1.32, 1.62)
    // Backdrop, printed water, moving ferry, rail, bench and lampposts sit on distinct depth planes.
    hinged(shore, 'bay', 0, -2.9, 3.9, 8.5, 8.4)
    const water = box(shore, 0, .03, -1.45, 8.4, .045, 2.9, '#64a9af')
    const ferry = card(shore, 'ferry', -2, .08, water.position.z, .64)
    hinged(shore, 'market', -2.7, -1, 2.55, 2.45, 8.6)
    for (let i = -4; i <= 4; i++) box(shore, i, .35, -.12, .065, .7, .07, '#627e75')
    for (const y of [.32, .66]) box(shore, 0, y, -.12, 8.15, .055, .055, '#527369')
    for (const x of [-3.8, 3.35]) {
      hinged(shore, 'tree', x, -.45, 2.6, undefined, 8.9)
      hinged(shore, 'lamp', x * .78, .42, 2, undefined, 9)
    }
    hinged(shore, 'bench', 0, .61, 1, 2.05, 8.75)
    const seated = (parent, name, x, z, h) => card(parent, name, x, .04, z, h)
    const him = seated(shore, 'him-sit', -.37, .86, 1.16)
    const her = seated(shore, 'her-sit', .39, .87, 1.19)
    const cup = card(shore, 'yogurt', .19, .64, .96, .24)
    hinged(transit, 'street', 0, -2.4, 3.8, 8.65, 20.3)
    const stop = hinged(transit, 'stop', -2.7, .05, 1.78, undefined, 21.2)
    const lamp = hinged(transit, 'lamp', 3.25, -.2, 2.6, undefined, 21.4)
    const glow = new THREE.PointLight(0xffb35c, 0, 9)
    glow.position.set(lamp.position.x, 2.45, -.1)
    transit.add(glow)
    const bus = card(transit, 'bus', -4, 0, .76, 1.7)
    const cabin = group(transit, 0, 0, .22)
    card(cabin, 'cabin', 0, 0, -.21, 2.42, 4.4)
    const passengerA = seated(cabin, 'him-sit', -.38, .27, 1.25)
    const passengerB = seated(cabin, 'her-sit', .38, .28, 1.285)
    const passing = card(cabin, 'stop', 0, 1.36, -.17, .63)
    const hands = card(transit, 'hands', 0, .08, 1.03, 1.64)
    const focus = new THREE.Vector3(), eye = new THREE.Vector3()
    draw = t => {
      for (const { leaf, at } of folds) leaf.rotation.x = -Math.PI / 2 * (1 - ease(t, at, at + 1.05))
      const progress = ease(t, 1, 7)
      walkers.position.copy(path.getPointAt(progress))
      const tick = Math.floor(t * 8)
      const walking = t > 1 && t < 7
      for (const [i, actor] of [man, woman].entries()) {
        actor.material.map.offset.x = walking ? ((tick + i) % 4) / 4 : .25
        actor.position.y = walking ? .023 * Math.abs(Math.sin((tick + i) * Math.PI / 2)) : 0
      }
      walkers.rotation.y = -Math.atan2(path.getTangentAt(progress).z, path.getTangentAt(progress).x)
      bag.visible = t >= 6.65 && t < 9.65
      bag.rotation.x = -(1 - ease(t, 6.65, 7.55)) * Math.PI / 2
      ferry.position.x = -1.75 + ease(t, 9, 20) * 3.3
      him.rotation.z = .025 * Math.sin(t * 2)
      her.rotation.z = -.025 * Math.sin(t * 2 + .5)
      cup.position.y = .64 + .085 * ease(t, 10, 11.2) * (1 - ease(t, 11.7, 13))
      const night = ease(t, 18.8, 23)
      sky.intensity = 1.85 - .9 * night
      sun.intensity = 2.05 - .72 * night
      sky.color.setRGB(1 - .40 * night, .91 - .25 * night, .78 + .22 * night)
      glow.intensity = 12 * night
      bus.position.x = -3.9 + 4.35 * ease(t, 22.3, 25.4)
      bus.visible = t < 26.6
      bus.rotation.x = -Math.PI / 2 * ease(t, 25.6, 26.6)
      cabin.visible = t >= 25.65
      cabin.rotation.x = -Math.PI / 2 * (1 - ease(t, 25.65, 26.8))
      stop.visible = t < 26
      passing.position.x = 1.78 - 3.56 * ease(t, 27, 29.6)
      passengerA.rotation.z = Math.sin(t * 2.7) * .032
      passengerB.rotation.z = Math.sin(t * 2.1 + .7) * .035
      hands.visible = t >= 30
      hands.rotation.x = -Math.PI / 2 * (1 - ease(t, 30, 31.25))
      const j = shots.findIndex(k => k[0] > t)
      const end = j < 0 ? shots.length - 1 : j
      const a = shots[Math.max(0, end - 1)], b = shots[end]
      const u = ease(t, a[0], b[0])
      const q = a.map((v, i) => THREE.MathUtils.lerp(v, b[i], u))
      focus.set(q[1], q[2], q[3])
      eye.set(q[4], q[5], q[6])
      camera.position.copy(focus).add(eye)
      camera.lookAt(focus)
      sun.target.position.set(focus.x, 0, 0)
      sun.position.set(focus.x - 5, 10, 5)
      renderer.render(world, camera)
    }
  }
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  return { start, resize, render: t => draw?.(t), dispose() {
    closed = true
    for (const texture of Object.values(textures)) texture.dispose()
    for (const material of materials) material.dispose()
    for (const geometry of geometries) geometry.dispose()
    sun.shadow.dispose()
    renderer.dispose()
  } }
}
