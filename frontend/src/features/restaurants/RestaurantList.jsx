/** The place's favourite restaurants. */
export default function RestaurantList({ place, restaurants, authed }) {
  if (!restaurants) return <p className="muted center">載入中…</p>
  if (!restaurants.length) {
    return (
      <div className="empty">
        <p>這裡還沒有餐廳。</p>
        <p className="muted">{authed ? '按「新增餐廳」記下第一間。' : '登入後就可以新增。'}</p>
      </div>
    )
  }
  return (
    <ul className="restaurant-list">
      {restaurants.map((restaurant) => (
        <li key={restaurant.id}>
          <a href={`#/p/${place.slug}/food/${restaurant.id}`}>
            <strong>{restaurant.name}</strong>
            <span>{restaurant.must_order && <>必點 · {restaurant.must_order}</>}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
