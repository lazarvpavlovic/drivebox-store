import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import './style.css'

function App() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [orders, setOrders] = useState([])
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', city: '', note: '' })
  const [login, setLogin] = useState({ email: '', password: '' })
  const [product, setProduct] = useState({ name: '', description: '', price: '', category: 'Auto oprema', image_url: '', stock: '10' })

  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0), [cart])
  const count = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart])

  async function loadProducts() {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false })
    if (error) setNotice(`Greška pri učitavanju proizvoda: ${error.message}`)
    else setProducts(data || [])
    setLoading(false)
  }

  async function loadOrders() {
    if (!supabase || !session) return
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) setNotice(`Greška pri učitavanju porudžbina: ${error.message}`)
    else setOrders(data || [])
  }

  useEffect(() => {
    loadProducts()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { loadOrders() }, [session])

  function addToCart(item) {
    setCart(current => {
      const found = current.find(row => row.id === item.id)
      return found
        ? current.map(row => row.id === item.id ? { ...row, qty: row.qty + 1 } : row)
        : [...current, { ...item, qty: 1 }]
    })
    setNotice(`${item.name} je dodat u korpu.`)
  }

  function changeQty(id, qty) {
    setCart(current => current.map(row => row.id === id ? { ...row, qty: Math.max(1, qty) } : row))
  }

  async function submitOrder(event) {
    event.preventDefault()
    if (!supabase) return setNotice('Prodavnica još nije povezana sa bazom.')
    const { error } = await supabase.rpc('create_drivebox_order', {
      p_customer_name: customer.name,
      p_phone: customer.phone,
      p_address: customer.address,
      p_city: customer.city,
      p_note: customer.note,
      p_items: cart.map(item => ({ product_id: item.id, quantity: item.qty }))
    })
    if (error) setNotice(`Porudžbina nije poslata: ${error.message}`)
    else {
      setNotice('Hvala! Porudžbina je poslata.')
      setCart([])
      setCustomer({ name: '', phone: '', address: '', city: '', note: '' })
      setCartOpen(false)
    }
  }

  async function signIn(event) {
    event.preventDefault()
    if (!supabase) return setNotice('Prvo poveži Supabase podešavanja.')
    const { error } = await supabase.auth.signInWithPassword(login)
    if (error) setNotice(`Prijava nije uspela: ${error.message}`)
    else setNotice('Uspešno ste prijavljeni.')
  }

  async function saveProduct(event) {
    event.preventDefault()
    if (!supabase) return
    const { error } = await supabase.from('products').insert({
      name: product.name,
      description: product.description,
      price: Number(product.price),
      category: product.category,
      image_url: product.image_url || null,
      stock: Number(product.stock || 0),
      is_active: true
    })
    if (error) setNotice(`Proizvod nije sačuvan: ${error.message}`)
    else {
      setNotice('Proizvod je dodat.')
      setProduct({ name: '', description: '', price: '', category: 'Auto oprema', image_url: '', stock: '10' })
      loadProducts()
    }
  }

  async function updateOrderStatus(id, status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) setNotice(`Status nije promenjen: ${error.message}`)
    else { setNotice('Status porudžbine je promenjen.'); loadOrders() }
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#">DRIVE<span>BOX</span><b>.</b></a>
        <nav><a href="#shop">Proizvodi</a><a href="#about">O nama</a></nav>
        <button className="cart-button" onClick={() => setCartOpen(true)}>Korpa <strong>{count}</strong></button>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">AUTO OPREMA • DODACI • STIL</p>
          <h1>UNAPREDI<br /><em>SVOJU VOŽNJU.</em></h1>
          <p className="hero-copy">Praktična oprema. Pametni dodaci. Bolja svakodnevna vožnja.</p>
          <a className="primary-link" href="#shop">POGLEDAJ PONUDU</a>
        </div>
        <div className="hero-mark">DB<span> / </span>01</div>
      </section>

      {notice && <button className="notice" onClick={() => setNotice('')}>{notice} <b>×</b></button>}
      {!supabase && <p className="setup-warning">Prodavnica još nije povezana sa Supabase bazom. Potrebno je uneti hosting podešavanja pre objavljivanja.</p>}

      <main id="shop" className="shop section">
        <div className="section-heading"><div><p className="eyebrow">IZDVOJENO IZ PONUDE</p><h2>Naši proizvodi<span>.</span></h2></div><p>Oprema za svaki kilometar.</p></div>
        {loading ? <p>Učitavanje proizvoda...</p> : products.length === 0 ? <div className="empty"><h3>Ponuda stiže uskoro.</h3><p>Trenutno nema aktivnih proizvoda.</p></div> :
          <div className="product-grid">
            {products.map(item => <article className="product-card" key={item.id}>
              <div className="product-image">{item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>DRIVEBOX</span>}</div>
              <div className="product-info"><p className="category">{item.category || 'Auto oprema'}</p><h3>{item.name}</h3><p className="description">{item.description}</p>
                <div className="product-bottom"><strong>{Number(item.price).toLocaleString('sr-RS')} RSD</strong><button onClick={() => addToCart(item)}>DODAJ +</button></div>
              </div>
            </article>)}
          </div>}
      </main>

      <section id="about" className="about section"><p className="eyebrow">DRIVEBOX FILOZOFIJA</p><h2>Detalji koji prave<br /><em>razliku.</em></h2><p>Pažljivo odabrana auto-oprema za udobniju, praktičniju i lepšu vožnju.</p></section>
      <footer><a className="brand" href="#">DRIVE<span>BOX</span><b>.</b></a><span>© {new Date().getFullYear()} DRIVEBOX</span><button className="admin-link" onClick={() => setAdminOpen(true)}>ADMIN</button></footer>

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><section className="dialog" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={() => setCartOpen(false)}>×</button><p className="eyebrow">VAŠA KUPOVINA</p><h2>Korpa<span>.</span></h2>
        {cart.length === 0 ? <p>Korpa je trenutno prazna.</p> : <>
          {cart.map(item => <div className="cart-row" key={item.id}><div><b>{item.name}</b><small>{Number(item.price).toLocaleString('sr-RS')} RSD / kom.</small></div><div className="quantity"><button onClick={() => changeQty(item.id, item.qty - 1)}>−</button><span>{item.qty}</span><button onClick={() => changeQty(item.id, item.qty + 1)}>+</button><button className="remove" onClick={() => setCart(c => c.filter(x => x.id !== item.id))}>×</button></div></div>)}
          <h3 className="total">Ukupno: {total.toLocaleString('sr-RS')} RSD</h3>
          <form className="checkout" onSubmit={submitOrder}><h3>Podaci za dostavu</h3>
            <input required placeholder="Ime i prezime" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
            <input required placeholder="Broj telefona" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
            <input required placeholder="Adresa" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
            <input required placeholder="Grad" value={customer.city} onChange={e => setCustomer({ ...customer, city: e.target.value })} />
            <textarea placeholder="Napomena (opciono)" value={customer.note} onChange={e => setCustomer({ ...customer, note: e.target.value })} />
            <p className="payment">Plaćanje pouzećem</p><button className="primary-button" type="submit">POŠALJI PORUDŽBINU</button>
          </form>
        </>}
      </section></div>}

      {adminOpen && <div className="overlay" onClick={() => setAdminOpen(false)}><section className="dialog admin-dialog" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={() => setAdminOpen(false)}>×</button><p className="eyebrow">UPRAVLJANJE PRODAVNICOM</p><h2>Admin<span>.</span></h2>
        {!session ? <form className="checkout" onSubmit={signIn}><input type="email" required placeholder="Admin email" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} /><input type="password" required placeholder="Lozinka" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} /><button className="primary-button">PRIJAVI SE</button></form> : <>
          <button className="secondary-button" onClick={() => supabase.auth.signOut()}>ODJAVI SE</button>
          <h3>Dodaj proizvod</h3><form className="checkout" onSubmit={saveProduct}>
            <input required placeholder="Naziv proizvoda" value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} />
            <textarea placeholder="Opis" value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })} />
            <input required type="number" min="0" placeholder="Cena u RSD" value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })} />
            <input placeholder="Kategorija" value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })} />
            <input placeholder="URL fotografije" value={product.image_url} onChange={e => setProduct({ ...product, image_url: e.target.value })} />
            <input type="number" min="0" placeholder="Količina" value={product.stock} onChange={e => setProduct({ ...product, stock: e.target.value })} />
            <button className="primary-button">SAČUVAJ PROIZVOD</button>
          </form>
          <h3>Porudžbine</h3>{orders.length === 0 ? <p>Nema porudžbina.</p> : orders.map(order => <div className="order-card" key={order.id}><b>{order.customer_name || 'Kupac'} — {order.phone || ''}</b><p>{order.address || ''}, {order.city || ''}</p><select value={order.status || 'new'} onChange={e => updateOrderStatus(order.id, e.target.value)}><option value="new">Nova</option><option value="processing">U obradi</option><option value="shipped">Poslata</option><option value="completed">Završena</option><option value="cancelled">Otkazana</option></select></div>)}
        </>}
      </section></div>}
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
