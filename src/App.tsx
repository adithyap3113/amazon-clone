import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, CircleHelp, Heart, MapPin, Menu, Minus, Plus, Search, ShoppingCart, SlidersHorizontal, Sparkles, Star, Trash2, Truck, X } from 'lucide-react'
import { categories, products, type Product } from './data/products'

type Page = 'home' | 'product' | 'cart' | 'checkout' | 'success'
type CartLine = { product: Product; quantity: number }
type Suggestion = { kind: 'term'; label: string } | { kind: 'product'; product: Product }
const money = (n: number) => `$${n.toFixed(2)}`

function App() {
  const [page, setPage] = useState<Page>('home')
  const [cart, setCart] = useState<CartLine[]>([])
  const [query, setQuery] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const searchRef = useRef<HTMLFormElement>(null)
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('featured')
  const [maxPrice, setMaxPrice] = useState(200)
  const [primeOnly, setPrimeOnly] = useState(false)
  const [selected, setSelected] = useState<Product>(products[0])
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const count = cart.reduce((n, item) => n + item.quantity, 0)
  const subtotal = cart.reduce((n, item) => n + item.product.price * item.quantity, 0)

  const suggestions = useMemo<Suggestion[]>(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return []
    const matches = products.filter(p => [p.title, p.category, p.description, ...(p.tags ?? [])].join(' ').toLocaleLowerCase().includes(term))
    const terms = new Map<string, string>()
    matches.forEach(p => {
      const words = [...(p.tags ?? []), ...p.title.split(/[^a-zA-Z0-9]+/), ...p.category.split(/[^a-zA-Z0-9]+/)]
      words.filter(word => word.length > 1).forEach(word => {
        const key = word.toLocaleLowerCase()
        if (key.includes(term) || (p.tags ?? []).some(tag => tag.toLocaleLowerCase().includes(term))) terms.set(key, word)
      })
    })
    const termSuggestions = [...terms.values()].slice(0, 3).map(label => ({ kind: 'term' as const, label }))
    const productSuggestions = matches.slice(0, 4).map(product => ({ kind: 'product' as const, product }))
    return [...termSuggestions, ...productSuggestions].slice(0, 6)
  }, [query])

  useEffect(() => {
    if (!suggestionsOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSuggestionsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [suggestionsOpen])

  const visible = useMemo(() => {
    const searchTerm = submittedQuery.trim().toLocaleLowerCase()
    let list = products.filter(p => {
      const searchableText = [p.title, p.category, p.description, ...(p.tags ?? [])].join(' ').toLocaleLowerCase()
      return (category === 'All' || p.category === category) && p.price <= maxPrice && (!primeOnly || p.prime) && (!searchTerm || searchableText.includes(searchTerm))
    })
    if (sort === 'price-low') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-high') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating)
    return list
  }, [category, maxPrice, primeOnly, submittedQuery, sort])

  const goHome = () => { setPage('home'); setCategory('All'); setSubmittedQuery(''); setQuery(''); window.scrollTo(0, 0) }
  const addToCart = (p: Product, quantity = 1) => { setCart(current => { const line = current.find(i => i.product.id === p.id); return line ? current.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + quantity } : i) : [...current, { product: p, quantity }] }) }
  const changeQty = (id: number, delta: number) => setCart(c => c.map(i => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))
  const openProduct = (p: Product) => { setSelected(p); setPage('product'); window.scrollTo(0, 0) }
  const submitSearch = (value: string) => { const term = value.trim(); setQuery(term); setSubmittedQuery(term); setCategory('All'); if (!term) { setMaxPrice(200); setPrimeOnly(false) } setSuggestionsOpen(false); setActiveSuggestion(-1); setPage('home'); window.scrollTo(0, 0) }
  const doSearch = (e: React.FormEvent) => { e.preventDefault(); submitSearch(query) }
  const chooseSuggestion = (suggestion: Suggestion) => {
    if (suggestion.kind === 'product') {
      setQuery(suggestion.product.title)
      setSubmittedQuery('')
      setSuggestionsOpen(false)
      setActiveSuggestion(-1)
      openProduct(suggestion.product)
    } else submitSearch(suggestion.label)
  }
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setSuggestionsOpen(false); setActiveSuggestion(-1); return }
    if (e.key === 'ArrowDown' && suggestionsOpen && suggestions.length) { e.preventDefault(); setActiveSuggestion(i => (i + 1) % suggestions.length); return }
    if (e.key === 'ArrowUp' && suggestionsOpen && suggestions.length) { e.preventDefault(); setActiveSuggestion(i => (i <= 0 ? suggestions.length - 1 : i - 1)); return }
    if (e.key === 'Enter' && activeSuggestion >= 0 && suggestionsOpen) { e.preventDefault(); chooseSuggestion(suggestions[activeSuggestion]) }
  }
  const selectCategory = (c: string) => { setCategory(c); setSubmittedQuery(''); setQuery(''); setPage('home'); setMobileMenu(false); window.scrollTo(0, 0) }
  const beginCheckout = () => { setPage('checkout'); setCheckoutError(''); window.scrollTo(0, 0) }
  const placeOrder = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = new FormData(e.currentTarget); if (!form.get('name') || !form.get('address') || !form.get('city') || !form.get('zip') || !form.get('email')) { setCheckoutError('Please fill in all required fields to continue.'); return } setOrderNumber(`AMZ-${Math.floor(10000000 + Math.random() * 89999999)}`); setCart([]); setPage('success'); window.scrollTo(0, 0) }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={goHome} aria-label="Amazon home"><span className="brand-word">amazon</span><span className="brand-smile" /></button>
      <button className="location"><MapPin size={17}/><span><small>Deliver to</small><b>New York 10001</b></span></button>
      <form className="search" ref={searchRef} onSubmit={doSearch} role="search"><button type="button" className="search-dept" onClick={() => selectCategory(category === 'All' ? 'Electronics' : 'All')}>{category === 'All' ? 'All' : category}<ChevronDown size={14}/></button><input value={query} onChange={e => { setQuery(e.target.value); setSuggestionsOpen(Boolean(e.target.value.trim())); setActiveSuggestion(-1) }} onFocus={() => { if (query.trim()) setSuggestionsOpen(true) }} onKeyDown={onSearchKeyDown} placeholder="Search everything you love" aria-label="Search products" aria-autocomplete="list" aria-expanded={suggestionsOpen && Boolean(query.trim())} aria-controls="search-suggestions"/><button type="submit" className="search-submit" aria-label="Search"><Search size={21}/></button>
        {suggestionsOpen && query.trim() && <div className="suggestion-dropdown" id="search-suggestions" role="listbox" aria-label="Search suggestions">
          {suggestions.length ? suggestions.map((suggestion, index) => suggestion.kind === 'term' ? <button type="button" role="option" aria-selected={activeSuggestion === index} className={`suggestion-row term-suggestion${activeSuggestion === index ? ' active' : ''}`} key={`term-${suggestion.label}`} onMouseEnter={() => setActiveSuggestion(index)} onClick={() => chooseSuggestion(suggestion)}><Search size={15}/><span>{suggestion.label}</span><small>Search term</small></button> : <button type="button" role="option" aria-selected={activeSuggestion === index} className={`suggestion-row product-suggestion${activeSuggestion === index ? ' active' : ''}`} key={`product-${suggestion.product.id}`} onMouseEnter={() => setActiveSuggestion(index)} onClick={() => chooseSuggestion(suggestion)}><img src={suggestion.product.image} alt=""/><span>{suggestion.product.title}<small>{suggestion.product.category} · {money(suggestion.product.price)}</small></span><ChevronRight size={15}/></button>) : <div className="no-suggestions"><Search size={15}/> No suggestions found</div>}
        </div>}
      </form>
      <button className="account"><small>Hello, sign in</small><b>Account & Lists</b></button><button className="orders"><small>Returns</small><b>& Orders</b></button>
      <button className="cart-button" onClick={() => { setPage('cart'); window.scrollTo(0,0) }}><span className="cart-icon"><ShoppingCart size={28}/><i>{count}</i></span><b>Cart</b></button>
    </header>
    <nav className="subnav"><button className="all-menu" onClick={() => setMobileMenu(v => !v)}><Menu size={18}/> All</button><div className="nav-links">{['Today’s Deals','Customer Service','Registry','Gift Cards','Sell'].map(x => <button key={x} onClick={() => selectCategory('All')}>{x}</button>)}</div><span className="nav-promo">A little something for every day ✨</span></nav>
    {mobileMenu && <div className="mobile-cats"><div><b>Shop by category</b><button onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={19}/></button></div>{categories.map(c => <button key={c} onClick={() => selectCategory(c)}>{c}<ChevronRight size={16}/></button>)}</div>}

    {page === 'home' && <main>
      <section className="hero"><div className="hero-copy"><span className="eyebrow"><Sparkles size={14}/> THE EVERYDAY EDIT</span><h1>Little finds.<br/><em>Big joy.</em></h1><p>Thoughtful picks to make your everyday a little more extraordinary.</p><button className="dark-button" onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}>Explore the edit <ArrowRight size={16}/></button></div><div className="hero-image"><div className="hero-chip">A little more you <Heart size={14} fill="currentColor"/></div></div><div className="hero-pagination"><span className="active"/><span/><span/></div></section>
      <section className="category-strip"><div className="section-heading"><div><span className="eyebrow muted">FIND YOUR THING</span><h2>Shop by category</h2></div><button onClick={() => selectCategory('All')}>See everything <ArrowRight size={15}/></button></div><div className="category-cards">{[{name:'Electronics',image:'photo-1498049794561-7780e7231661'},{name:'Home & Kitchen',image:'photo-1616486338812-3dadae4b4ace'},{name:'Fashion',image:'photo-1483985988355-763728e1935b'},{name:'Beauty',image:'photo-1596462502278-27bfdc403348'},{name:'Outdoors',image:'photo-1472396961693-142e6e269027'}].map(c => <button className="category-card" key={c.name} onClick={() => selectCategory(c.name)}><img src={`https://images.unsplash.com/${c.image}?auto=format&fit=crop&w=400&q=80`} alt=""/><span>{c.name}<ChevronRight size={15}/></span></button>)}</div></section>
      <section className="shop" id="shop"><div className="shop-heading"><div><span className="eyebrow muted">CURATED FOR YOU</span><h2>{submittedQuery ? `Results for “${submittedQuery}”` : category === 'All' ? 'The everyday edit' : category}</h2><p>{visible.length} lovely finds, picked for you</p></div><div className="shop-controls"><button className="filter-toggle" onClick={() => setShowFilters(v => !v)}><SlidersHorizontal size={15}/> Filters</button><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Top rated</option></select></label></div></div>
        <div className="shop-layout">{showFilters && <aside className="filters"><div className="filter-title">Filters <button onClick={() => { setMaxPrice(200); setPrimeOnly(false) }}>Clear</button></div><b>Category</b>{categories.map(c => <button key={c} className={category===c?'chosen':''} onClick={() => selectCategory(c)}>{c}</button>)}<b>Price</b><label className="range-label">Up to {money(maxPrice)}</label><input type="range" min="20" max="200" step="5" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}/><label className="check-label"><input type="checkbox" checked={primeOnly} onChange={e => setPrimeOnly(e.target.checked)}/> Prime eligible</label><b>Customer reviews</b><div className="review-filter" onClick={() => setSort('rating')}>★★★★☆ <span>& up</span></div></aside>}
          <div className="product-grid">{visible.map(p => <ProductCard key={p.id} product={p} onOpen={() => openProduct(p)} onAdd={() => addToCart(p)}/>)}</div>
          {visible.length === 0 && <div className="empty-results"><Search size={30}/><h3>No products found</h3><p>Try a different search or clear your filters.</p><button className="dark-button" onClick={() => { setSubmittedQuery(''); setQuery(''); setCategory('All'); setMaxPrice(200); setPrimeOnly(false) }}>Clear filters</button></div>}
        </div>
      </section>
      <section className="newsletter"><div><span className="eyebrow">A NOTE FROM US</span><h2>Good things, in your inbox.</h2><p>Fresh finds and little things worth knowing. No clutter, ever.</p></div><form onSubmit={e => {e.preventDefault(); (e.currentTarget.querySelector('input') as HTMLInputElement).value=''; alert('You’re on the list. See you in your inbox!')}}><input type="email" required placeholder="Your email address"/><button>Count me in <ArrowRight size={15}/></button></form></section>
    </main>}

    {page === 'product' && <main className="page-wrap"><button className="back-link" onClick={goHome}><ArrowLeft size={16}/> Back to shopping</button><div className="detail"><div className="detail-image"><img src={selected.image} alt={selected.title}/></div><div className="detail-copy"><span className="eyebrow muted">{selected.category.toUpperCase()}</span><h1>{selected.title}</h1><div className="rating-line"><Stars rating={selected.rating}/><b>{selected.rating}</b><a href="#reviews">{selected.reviews.toLocaleString()} ratings</a></div><hr/><div className="detail-price">{money(selected.price)} {selected.oldPrice && <del>{money(selected.oldPrice)}</del>}</div>{selected.oldPrice && <p className="deal-line">Save {money(selected.oldPrice-selected.price)} with this deal</p>}<p>{selected.description}</p><div className="delivery-box"><Truck size={19}/><div><b>{selected.delivery}</b><span>Order within 8 hrs 24 mins</span></div></div><p className="stock">In Stock</p><button className="add-button full" onClick={() => addToCart(selected)}>Add to Cart</button><button className="buy-button full" onClick={() => {addToCart(selected); setPage('cart')}}>Buy Now</button><div className="detail-meta"><span>Ships from <b>Everyday Market</b></span><span>Sold by <b>Everyday Market</b></span><span>Returns <b>30-day returns</b></span></div></div></div></main>}

    {page === 'cart' && <main className="page-wrap"><button className="back-link" onClick={goHome}><ArrowLeft size={16}/> Continue shopping</button><div className="cart-page"><section className="cart-list"><div className="cart-title-row"><h1>Your shopping cart</h1><span>Price</span></div>{cart.length === 0 ? <div className="empty-cart"><ShoppingCart size={34}/><h2>Your cart is waiting</h2><p>Find something lovely for your everyday.</p><button className="dark-button" onClick={goHome}>Start shopping <ArrowRight size={16}/></button></div> : cart.map(line => <article className="cart-item" key={line.product.id}><button className="cart-item-img" onClick={() => openProduct(line.product)}><img src={line.product.image} alt=""/></button><div className="cart-item-info"><button className="cart-item-name" onClick={() => openProduct(line.product)}>{line.product.title}</button><span className="stock">In Stock</span><span className="small-muted">{line.product.delivery}</span><div className="cart-actions"><div className="quantity"><button aria-label="Decrease quantity" onClick={() => changeQty(line.product.id,-1)}><Minus size={13}/></button><span>{line.quantity}</span><button aria-label="Increase quantity" onClick={() => changeQty(line.product.id,1)}><Plus size={13}/></button></div><span className="action-divider"/><button className="remove" onClick={() => setCart(c => c.filter(i => i.product.id !== line.product.id))}><Trash2 size={14}/> Delete</button></div></div><b className="item-price">{money(line.product.price * line.quantity)}</b></article>)}<div className="subtotal-row">Subtotal ({count} {count===1?'item':'items'}): <b>{money(subtotal)}</b></div></section>{cart.length > 0 && <aside className="checkout-card"><div className="free-delivery"><Check size={16}/><span>Your order qualifies for <b>FREE delivery</b></span></div><p>Subtotal ({count} {count===1?'item':'items'}): <b>{money(subtotal)}</b></p><button className="buy-button full" onClick={beginCheckout}>Proceed to checkout <ArrowRight size={15}/></button><span className="secure-note">Secure transaction</span></aside>}</div></main>}

    {page === 'checkout' && <main className="page-wrap"><button className="back-link" onClick={() => setPage('cart')}><ArrowLeft size={16}/> Back to cart</button><div className="checkout-layout"><section className="checkout-main"><div className="checkout-heading"><span className="eyebrow muted">ALMOST YOURS</span><h1>Checkout</h1><p>A few details and your everyday finds are on their way.</p></div><form id="address-form" onSubmit={placeOrder} className="address-form"><div className="form-section"><div className="form-step">1</div><div className="form-fields"><h2>Shipping address</h2><div className="field-grid"><label>Full name<input name="name" placeholder="Jamie Taylor" required/></label><label>Email address<input name="email" type="email" placeholder="jamie@example.com" required/></label><label className="span-two">Street address<input name="address" placeholder="123 Main Street" required/></label><label>City<input name="city" placeholder="New York" required/></label><label>ZIP code<input name="zip" placeholder="10001" required/></label><label className="span-two">Delivery instructions <span className="optional">(optional)</span><input name="instructions" placeholder="Gate code, leave at door…"/></label></div></div></div><div className="form-section"><div className="form-step">2</div><div className="form-fields"><h2>Payment method</h2><div className="mock-payment"><div className="mock-radio"/><div><b>Pay on delivery</b><span>Payment is simulated for this demo. No card needed.</span></div><span className="payment-tag">MOCK</span></div><p className="privacy-note"><CircleHelp size={14}/> Your details stay right here in this demo.</p></div></div>{checkoutError && <p className="error-message">{checkoutError}</p>}</form></section><aside className="order-summary"><h2>Order summary</h2>{cart.map(i => <div className="summary-item" key={i.product.id}><img src={i.product.image} alt=""/><span>{i.product.title}<small>Qty: {i.quantity}</small></span><b>{money(i.product.price*i.quantity)}</b></div>)}<div className="summary-line"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="summary-line"><span>Shipping</span><span className="free-text">FREE</span></div><div className="summary-total"><b>Order total</b><strong>{money(subtotal)}</strong></div><button className="buy-button full" type="submit" form="address-form">Place your order <ArrowRight size={15}/></button><p className="summary-foot">By placing your order, you agree to our demo terms. No payment will be collected.</p></aside></div></main>}

    {page === 'success' && <main className="page-wrap success-wrap"><div className="success-card"><div className="success-icon"><Check size={34}/></div><span className="eyebrow muted">IT’S A DONE DEAL</span><h1>Thank you for your order!</h1><p>Your order has been placed. We’ve sent a confirmation to your inbox.</p><div className="order-number">Order number <b>{orderNumber}</b></div><div className="success-delivery"><Truck size={20}/><span><b>Your finds are on their way</b><small>Estimated delivery: October 8–10</small></span></div><button className="dark-button" onClick={goHome}>Back to shopping <ArrowRight size={16}/></button></div></main>}
    <footer><button className="back-top" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Back to top <ChevronDown size={14}/></button><div className="footer-main"><button className="brand footer-brand" onClick={goHome}><span className="brand-word">amazon</span><span className="brand-smile"/></button><span>Find your everyday little joys.</span><div>{categories.slice(1).map(c=><button key={c} onClick={()=>selectCategory(c)}>{c}</button>)}</div></div><div className="footer-bottom">© 2026 Everyday Market · A shopping experience demo · Made for curious people</div></footer>
  </div>
}

function Stars({ rating }: { rating: number }) { return <span className="stars" aria-label={`${rating} out of 5 stars`}>{[1,2,3,4,5].map(n=><Star key={n} size={13} fill={n<=Math.round(rating)?'currentColor':'none'} strokeWidth={1.5}/>)}</span> }
function ProductCard({ product, onOpen, onAdd }: { product: Product; onOpen: () => void; onAdd: () => void }) { return <article className="product-card"><button className="product-image" onClick={onOpen}><img src={product.image} alt={product.title}/>{product.badge && <span className="badge">{product.badge}</span>}<span className="heart"><Heart size={17}/></span></button><div className="product-info"><span className="category-label">{product.category}</span><button className="product-title" onClick={onOpen}>{product.title}</button><div className="rating-row"><Stars rating={product.rating}/><span>{product.reviews.toLocaleString()}</span></div><div className="price"><span className="currency">$</span>{product.price.toFixed(2).split('.')[0]}<span className="cents">.{product.price.toFixed(2).split('.')[1]}</span>{product.oldPrice&&<del>{money(product.oldPrice)}</del>}</div>{product.prime&&<span className="prime"><span>✓</span> prime</span>}<p className="delivery">{product.delivery}</p><button className="add-button" onClick={onAdd}>Add to Cart</button></div></article> }

export default App
