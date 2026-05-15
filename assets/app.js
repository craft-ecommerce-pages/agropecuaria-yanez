(function(){
'use strict';

let cartItems = [];
let products = [];
let config = {};

const $catalog       = document.getElementById('featuredGrid');
const $cartFab       = document.getElementById('cartFab');
const $cartBadge     = document.getElementById('cartBadge');
const $navCartBadge  = document.getElementById('navCartBadge');
const $cartOverlay   = document.getElementById('cartOverlay');
const $cartDrawer    = document.getElementById('cartDrawer');
const $cartClose     = document.getElementById('cartClose');
const $cartItems     = document.getElementById('cartItems');
const $cartTotal     = document.getElementById('cartTotal');
const $cartItemCount = document.getElementById('cartItemCount');
const $btnCheckout   = document.getElementById('btnCheckout');
const $toast         = document.getElementById('toast');
const $modalOverlay  = document.getElementById('modalOverlay');
const $modalClose    = document.getElementById('modalClose');
const $sliderTrack   = document.getElementById('sliderTrack');
const $sliderPrev    = document.getElementById('sliderPrev');
const $sliderNext    = document.getElementById('sliderNext');
const $sliderDots    = document.getElementById('sliderDots');
const $modalDetail   = document.getElementById('modalDetail');

let modalProduct = null;
let modalQty = 1;
let modalVariants = {};
let sliderIdx = 0;
let sliderImages = [];
let toastTimer;

// Expose for products page
window.normalize = normalize;
window.formatPrice = formatPrice;

function normalize(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }

function variantOptDisplay(o){
  return o&&typeof o==='object'?(o.label||o.name||''):(o||'');
}

function resolveVariantPrice(p, variantes){
  if(!p||!variantes) return Number(p.precio)||0;
  for(const val of Object.values(variantes)){
    if(val&&typeof val==='object'&&val.price!=null) return Number(val.price);
  }
  return Number(p.precio)||0;
}

function formatPrice(p){
  const cur = (config.currency||'$');
  return `${cur}${Number(p).toFixed(2)}`;
}

function showToast(msg){
  if(!$toast) return;
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 2200);
}

function cartKey(id, v){
  if(!v||!Object.keys(v).length) return String(id);
  return id+':'+Object.entries(v).sort().map(([k,val])=>k+'='+variantOptDisplay(val)).join(',');
}

function cartAdd(id, variantes, qty){
  const p = products.find(x=>String(x.id)===String(id));
  if(!p) return;
  const key = cartKey(id, variantes);
  const ex = cartItems.find(i=>i.key===key);
  if(ex){ ex.qty += qty; }
  else{
    const imgs = Array.isArray(p.imagenes)&&p.imagenes.length?p.imagenes:[p.imagen||''];
    const price = resolveVariantPrice(p, variantes);
    cartItems.push({key,id,nombre:p.nombre,precio:price,qty,variantes:variantes||{},imagen:imgs[0]});
  }
  saveCart(); updateCartUI(); updateCardButtons();
  showToast(`${p.nombre} agregado`);
}
window.cartAdd = cartAdd;

function cartRemoveOne(key){
  const idx = cartItems.findIndex(i=>i.key===key);
  if(idx<0) return;
  cartItems[idx].qty--;
  if(cartItems[idx].qty<=0) cartItems.splice(idx,1);
  saveCart(); updateCartUI(); updateCardButtons();
}

function cartDelete(key){
  cartItems = cartItems.filter(i=>i.key!==key);
  saveCart(); updateCartUI(); updateCardButtons();
}

function saveCart(){
  try{ localStorage.setItem('ay_cart', JSON.stringify(cartItems)); }catch(e){}
}

function loadCart(){
  try{
    const s = JSON.parse(localStorage.getItem('ay_cart')||'[]');
    if(Array.isArray(s)) cartItems = s;
  }catch(e){}
}

function cartTotalQty(){ return cartItems.reduce((s,i)=>s+i.qty,0); }
function cartTotalPrice(){ return cartItems.reduce((s,i)=>s+i.precio*i.qty,0); }

function updateCartUI(){
  const qty = cartTotalQty();
  const total = cartTotalPrice();
  if($cartBadge){ $cartBadge.textContent=qty; $cartBadge.classList.toggle('show',qty>0); }
  if($navCartBadge){ $navCartBadge.textContent=qty; $navCartBadge.classList.toggle('show',qty>0); }
  if($cartTotal) $cartTotal.textContent = formatPrice(total);
  if($cartItemCount) $cartItemCount.textContent = `${qty} producto${qty!==1?'s':''}`;
  if($btnCheckout) $btnCheckout.disabled = qty===0;
  if(!$cartItems) return;
  if(!cartItems.length){
    $cartItems.innerHTML = '<div class="cart-empty"><p>Tu carrito está vacío</p></div>';
    return;
  }
  $cartItems.innerHTML = '';
  cartItems.forEach(item=>{
    const vL = item.variantes?Object.values(item.variantes).map(v=>variantOptDisplay(v)).join(' · '):'';
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.imagen||''}" alt="${item.nombre}" onerror="this.style.opacity=0"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.nombre}</div>
        ${vL?`<div class="cart-item-detail">${vL}</div>`:''}
        <div class="cart-item-detail">${item.qty} × ${formatPrice(item.precio)} = ${formatPrice(item.qty*item.precio)}</div>
      </div>
      <button class="cart-item-remove" data-key="${item.key}">✕</button>
    `;
    $cartItems.appendChild(div);
  });
}

function updateCardButtons(){
  document.querySelectorAll('.card').forEach(card=>{
    const id = card.dataset.id;
    const p = products.find(x=>String(x.id)===String(id));
    if(!p) return;
    const hasVariants = Array.isArray(p.variantes)&&p.variantes.length>0;
    const inCartQty = cartItems.filter(ci=>String(ci.id)===String(id)).reduce((s,ci)=>s+ci.qty,0);
    const actEl = card.querySelector('.card-actions');
    if(!actEl) return;
    if(!hasVariants && inCartQty>0){
      actEl.innerHTML = `<div class="qty-control">
        <button data-action="dec" data-id="${id}" data-key="${cartKey(id,{})}">−</button>
        <span class="qty-val">${inCartQty}</span>
        <button data-action="inc" data-id="${id}">+</button>
      </div>`;
    } else {
      actEl.innerHTML = `<button class="btn-add${inCartQty>0?' in-cart':''}" ${hasVariants?`data-open="${id}"`:` data-add="${id}"`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        ${hasVariants?'Elegir':'Agregar'}
      </button>`;
    }
  });
}

function openCart(){
  if($cartOverlay) $cartOverlay.classList.add('open');
  if($cartDrawer) $cartDrawer.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeCart(){
  if($cartOverlay) $cartOverlay.classList.remove('open');
  if($cartDrawer) $cartDrawer.classList.remove('open');
  document.body.style.overflow='';
}

function checkout(){
  const num = (config.whatsapp_number||'').replace(/\D/g,'');
  if(!num){ alert('Número de WhatsApp no configurado'); return; }
  let msg = `${config.whatsapp_message||'Hola! Quiero hacer un pedido:'}\n\n*PEDIDO AGRO YÁNEZ*\n━━━━━━━━━━━━━━━\n`;
  cartItems.forEach(i=>{
    const vL = i.variantes?Object.values(i.variantes).map(v=>variantOptDisplay(v)).join(' · '):'';
    msg += `▸ ${i.nombre}${vL?' ('+vL+')':''}\n  ${i.qty} × ${formatPrice(i.precio)} = ${formatPrice(i.qty*i.precio)}\n`;
  });
  msg += `━━━━━━━━━━━━━━━\n*TOTAL: ${formatPrice(cartTotalPrice())}*\n\n${location.href}`;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank');
  if(window.dataLayer){
    window.dataLayer.push({event:'whatsapp_checkout',ecommerce:{value:cartTotalPrice(),currency:'USD',items:cartItems.map(i=>({item_id:i.id,item_name:i.nombre,quantity:i.qty,price:i.precio}))}});
  }
}

function openModal(id){
  const p = products.find(x=>String(x.id)===String(id));
  if(!p) return;
  modalProduct=p; modalQty=1; modalVariants={};
  sliderImages = (Array.isArray(p.imagenes)&&p.imagenes.length)?p.imagenes:[p.imagen||''];
  sliderIdx=0;
  if($sliderTrack){
    $sliderTrack.innerHTML = sliderImages.map(src=>`<div class="slider-slide"><img src="${src}" alt="${p.nombre}" loading="lazy"/></div>`).join('');
    $sliderTrack.style.transform='translateX(0)';
  }
  if($sliderDots){
    $sliderDots.innerHTML = sliderImages.map((_,i)=>`<button class="slider-dot${i===0?' active':''}" data-idx="${i}"></button>`).join('');
  }
  if($sliderPrev) $sliderPrev.hidden=sliderImages.length<=1;
  if($sliderNext) $sliderNext.hidden=sliderImages.length<=1;
  renderModalDetail();
  if($modalOverlay) $modalOverlay.classList.add('open');
  document.body.style.overflow='hidden';
}
window.openModal = openModal;

function renderModalDetail(){
  if(!$modalDetail||!modalProduct) return;
  const p=modalProduct;
  const hasVariants=Array.isArray(p.variantes)&&p.variantes.length>0;
  const catLabels=config.categories||{};
  let vHTML='';
  let showPrice = p.precio;
  if(hasVariants){
    vHTML=p.variantes.map(g=>`
      <div class="variant-group">
        <div class="variant-label">${g.name}</div>
        <div class="variant-options">
          ${g.options.map(o=>{
            const display = variantOptDisplay(o);
            const optJson = JSON.stringify(o).replace(/'/g,"&#39;");
            return `<button class="variant-option${variantOptDisplay(modalVariants[g.name])===display?' selected':''}" data-group="${g.name}" data-opt='${optJson}'>${display}</button>`;
          }).join('')}
        </div>
      </div>`).join('');
    const selectedVariant = Object.values(modalVariants).find(v=>v&&typeof v==='object'&&v.price!=null);
    if(selectedVariant) showPrice = selectedVariant.price;
  }
  const allSel=!hasVariants||p.variantes.every(g=>modalVariants[g.name]);
  $modalDetail.innerHTML=`
    <div class="modal-name">${p.nombre}</div>
    <div class="modal-cat">${catLabels[p.categoria]||p.categoria}</div>
    <div class="modal-price">${formatPrice(showPrice)}</div>
    ${p.descripcion?`<div class="modal-desc">${p.descripcion}</div>`:''}
    ${vHTML}
    ${hasVariants&&!allSel?'<p class="modal-variant-hint">Selecciona todas las opciones</p>':''}
    <div class="modal-actions">
      <div class="modal-qty">
        <button id="mqDec">−</button>
        <span class="qty-val" id="mqVal">${modalQty}</span>
        <button id="mqInc">+</button>
      </div>
      <button class="btn-modal-add" id="btnModalAdd" ${allSel?'':'disabled'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Agregar al carrito
      </button>
    </div>
  `;
  document.getElementById('mqDec')?.addEventListener('click',()=>{ if(modalQty>1){modalQty--;document.getElementById('mqVal').textContent=modalQty;} });
  document.getElementById('mqInc')?.addEventListener('click',()=>{ modalQty++;document.getElementById('mqVal').textContent=modalQty; });
  document.getElementById('btnModalAdd')?.addEventListener('click',()=>{ cartAdd(modalProduct.id,modalVariants,modalQty); closeModal(); });
  $modalDetail.querySelectorAll('.variant-option').forEach(btn=>{
    btn.addEventListener('click',()=>{
      try{ modalVariants[btn.dataset.group]=JSON.parse(btn.dataset.opt); }catch(e){ modalVariants[btn.dataset.group]=btn.dataset.opt; }
      renderModalDetail();
    });
  });
}

function closeModal(){
  if($modalOverlay) $modalOverlay.classList.remove('open');
  document.body.style.overflow='';
  modalProduct=null;
}

function slideTo(idx){
  sliderIdx=Math.max(0,Math.min(idx,sliderImages.length-1));
  if($sliderTrack) $sliderTrack.style.transform=`translateX(-${sliderIdx*100}%)`;
  if($sliderDots) $sliderDots.querySelectorAll('.slider-dot').forEach((d,i)=>d.classList.toggle('active',i===sliderIdx));
}

// Events
document.addEventListener('click',e=>{
  const rm=e.target.closest('.cart-item-remove');
  if(rm){ e.stopPropagation(); cartDelete(rm.dataset.key); return; }
  const addBtn=e.target.closest('[data-add]');
  if(addBtn){ e.preventDefault(); cartAdd(addBtn.dataset.add,{},1); return; }
  const openBtn=e.target.closest('[data-open]');
  if(openBtn&&!e.target.closest('[data-action]')){ e.preventDefault(); openModal(openBtn.dataset.open); return; }
  const qtyBtn=e.target.closest('[data-action]');
  if(qtyBtn){ e.stopPropagation(); const{action,id,key}=qtyBtn.dataset; if(action==='inc') cartAdd(id,{},1); if(action==='dec'&&key) cartRemoveOne(key); return; }
});

if($cartFab) $cartFab.addEventListener('click',openCart);
document.getElementById('navCartBtn')?.addEventListener('click',openCart);
if($cartOverlay) $cartOverlay.addEventListener('click',closeCart);
if($cartClose) $cartClose.addEventListener('click',closeCart);
if($btnCheckout) $btnCheckout.addEventListener('click',checkout);
if($modalOverlay) $modalOverlay.addEventListener('click',e=>{ if(e.target===$modalOverlay) closeModal(); });
if($modalClose) $modalClose.addEventListener('click',closeModal);
if($sliderPrev) $sliderPrev.addEventListener('click',e=>{ e.stopPropagation(); slideTo(sliderIdx-1); });
if($sliderNext) $sliderNext.addEventListener('click',e=>{ e.stopPropagation(); slideTo(sliderIdx+1); });
if($sliderDots) $sliderDots.addEventListener('click',e=>{ const dot=e.target.closest('.slider-dot'); if(dot) slideTo(Number(dot.dataset.idx)); });
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ closeModal(); closeCart(); }
  if(e.key==='ArrowLeft'&&$modalOverlay?.classList.contains('open')) slideTo(sliderIdx-1);
  if(e.key==='ArrowRight'&&$modalOverlay?.classList.contains('open')) slideTo(sliderIdx+1);
});

// Touch swipe on modal
const sliderWrap = document.getElementById('sliderWrap');
if(sliderWrap){
  let touchStartX=0;
  sliderWrap.addEventListener('touchstart',e=>{ touchStartX=e.changedTouches[0].clientX; },{passive:true});
  sliderWrap.addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-touchStartX; if(Math.abs(dx)>40) slideTo(dx<0?sliderIdx+1:sliderIdx-1); });
}

// Init
async function init(){
  try{ const r=await fetch('./config.json',{cache:'no-store'}); if(r.ok) config=await r.json(); }catch(e){}
  if(config.store_name) document.title=config.site_title||config.store_name;

  try{
    const res=await fetch('./productos.json',{cache:'no-store'});
    products=await res.json();
  }catch(e){ if($catalog) $catalog.innerHTML='<p class="text-center" style="padding:40px;color:var(--text-light)">Cargando productos...</p>'; return; }

  loadCart();
  cartItems=cartItems.filter(ci=>products.find(p=>String(p.id)===String(ci.id)));

  // Expose products globally (for products page)
  window.__products=products;
  window.__config=config;

  // Render featured (mas_vendidos category or destacado flag)
  if($catalog){
    const featured = products.filter(p=>p.destacado||p.categoria==='mas vendidos').slice(0,5);
    const toShow = featured.length ? featured : products.slice(0,5);
    if(!toShow.length){
      $catalog.innerHTML='<p class="text-center" style="padding:40px;color:var(--text-light)">No hay productos disponibles aún.</p>';
    } else {
      toShow.forEach((p,i)=>{
        const imgs=(Array.isArray(p.imagenes)&&p.imagenes.length)?p.imagenes:[p.imagen||''];
        const hasVariants=Array.isArray(p.variantes)&&p.variantes.length>0;
        const card=document.createElement('div');
        card.className='card';
        card.dataset.id=p.id;
        card.style.animationDelay=`${i*0.06}s`;
        card.innerHTML=`
          <div class="card-img" data-open="${p.id}">
            <img src="${imgs[0]}" alt="${p.nombre}" loading="lazy" onerror="this.style.opacity=0"/>
            <div class="card-img-overlay">
              <button class="btn-add-hover" data-open="${p.id}">${hasVariants?'Elegir opciones':'Ver producto'}</button>
            </div>
          </div>
          <div class="card-body">
            <div class="card-cat">${p.categoria||'General'}</div>
            <div class="card-name">${p.nombre}</div>
            ${p.descripcion?`<div class="card-desc">${p.descripcion}</div>`:''}
            <div class="card-footer">
              <div class="card-price">${formatPrice(p.precio)}</div>
              <div class="card-actions">
                <button class="btn-add" ${hasVariants?`data-open="${p.id}"`:` data-add="${p.id}"`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  ${hasVariants?'Elegir':'Agregar'}
                </button>
              </div>
            </div>
          </div>`;
        $catalog.appendChild(card);
      });
    }
  }

  updateCartUI();
}

init().catch(e=>{ console.error(e); });

})();
