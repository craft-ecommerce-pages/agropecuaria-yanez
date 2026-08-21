/* Agro Yánez — home. Render de destacados + modal. El carrito lo maneja CraftCart
 * (craft-catalog-engine/v1/cart.js): estado, drawer, checkout WhatsApp + dataLayer.
 * Aquí solo escuchamos 'cart:change' para refrescar los botones de las cards. */
(function(){
'use strict';

let products = [], config = {};
let modalProduct=null, modalQty=1, modalVariants={}, sliderIdx=0, sliderImages=[];

const $=id=>document.getElementById(id);
const $catalog=$('featuredGrid');
const $modalOverlay=$('modalOverlay'),$modalClose=$('modalClose'),$sliderTrack=$('sliderTrack'),
  $sliderPrev=$('sliderPrev'),$sliderNext=$('sliderNext'),$sliderDots=$('sliderDots'),$modalDetail=$('modalDetail');

function normalize(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function formatPrice(p){ return `${config.currency||'$'}${Number(p).toFixed(2)}`; }
function variantOptDisplay(o){ return o&&typeof o==='object'?(o.label||o.name||''):(o||''); }
window.normalize=normalize; window.formatPrice=formatPrice;

function actionsHTML(p){
  const hasV=Array.isArray(p.variantes)&&p.variantes.length>0;
  const items=window.CraftCart?CraftCart.items:[];
  const inQ=items.filter(ci=>String(ci.id)===String(p.id)).reduce((s,ci)=>s+ci.qty,0);
  if(!hasV&&inQ>0) return `<div class="qty-control">
    <button data-action="dec" data-id="${p.id}" data-key="${p.id}">−</button>
    <span class="qty-val">${inQ}</span>
    <button data-action="inc" data-id="${p.id}">+</button></div>`;
  return `<button class="btn-add${inQ>0?' in-cart':''}" ${hasV?`data-open="${p.id}"`:` data-add="${p.id}"`}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
    ${hasV?'Elegir':'Agregar'}</button>`;
}
function updateCardButtons(){
  document.querySelectorAll('.card').forEach(card=>{
    const p=products.find(x=>String(x.id)===String(card.dataset.id)); if(!p) return;
    const actEl=card.querySelector('.card-actions'); if(actEl) actEl.innerHTML=actionsHTML(p);
  });
}

function openModal(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p) return;
  modalProduct=p; modalQty=1; modalVariants={};
  sliderImages=(Array.isArray(p.imagenes)&&p.imagenes.length)?p.imagenes:[p.imagen||'']; sliderIdx=0;
  if($sliderTrack){ $sliderTrack.innerHTML=sliderImages.map(src=>`<div class="slider-slide"><img src="${src}" alt="${p.nombre}" loading="lazy"/></div>`).join(''); $sliderTrack.style.transform='translateX(0)'; }
  if($sliderDots) $sliderDots.innerHTML=sliderImages.map((_,i)=>`<button class="slider-dot${i===0?' active':''}" data-idx="${i}"></button>`).join('');
  if($sliderPrev) $sliderPrev.hidden=sliderImages.length<=1;
  if($sliderNext) $sliderNext.hidden=sliderImages.length<=1;
  renderModalDetail();
  if($modalOverlay) $modalOverlay.classList.add('open'); document.body.style.overflow='hidden';
}
window.openModal=openModal;

function renderModalDetail(){
  if(!$modalDetail||!modalProduct) return;
  const p=modalProduct, catLabels=config.categories||{};
  const hasVariants=Array.isArray(p.variantes)&&p.variantes.length>0;
  let vHTML='', showPrice=p.precio;
  if(hasVariants){
    vHTML=p.variantes.map(g=>`
      <div class="variant-group">
        <div class="variant-label">${g.name}</div>
        <div class="variant-options">
          ${g.options.map(o=>{
            const display=variantOptDisplay(o), optJson=JSON.stringify(o).replace(/'/g,"&#39;");
            return `<button class="variant-option${variantOptDisplay(modalVariants[g.name])===display?' selected':''}" data-group="${g.name}" data-opt='${optJson}'>${display}</button>`;
          }).join('')}
        </div>
      </div>`).join('');
    const sv=Object.values(modalVariants).find(v=>v&&typeof v==='object'&&v.price!=null); if(sv) showPrice=sv.price;
  }
  const allSel=!hasVariants||p.variantes.every(g=>modalVariants[g.name]);
  $modalDetail.innerHTML=`
    <div class="modal-name">${p.nombre}</div>
    <div class="modal-cat">${catLabels[(p.categorias||[])[0]]||(p.categorias||[])[0]||''}</div>
    <div class="modal-price">${formatPrice(showPrice)}</div>
    ${p.descripcion?`<div class="modal-desc">${p.descripcion}</div>`:''}
    ${vHTML}
    ${hasVariants&&!allSel?'<p class="modal-variant-hint">Selecciona todas las opciones</p>':''}
    <div class="modal-actions">
      <div class="modal-qty"><button id="mqDec">−</button><span class="qty-val" id="mqVal">${modalQty}</span><button id="mqInc">+</button></div>
      <button class="btn-modal-add" id="btnModalAdd" ${allSel?'':'disabled'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Agregar al carrito
      </button>
    </div>`;
  $('mqDec')?.addEventListener('click',()=>{ if(modalQty>1){modalQty--;$('mqVal').textContent=modalQty;} });
  $('mqInc')?.addEventListener('click',()=>{ modalQty++;$('mqVal').textContent=modalQty; });
  $('btnModalAdd')?.addEventListener('click',()=>{ window.CraftCart&&CraftCart.add(modalProduct.id,modalVariants,modalQty); closeModal(); });
  $modalDetail.querySelectorAll('.variant-option').forEach(btn=>{ btn.addEventListener('click',()=>{
    try{ modalVariants[btn.dataset.group]=JSON.parse(btn.dataset.opt); }catch(e){ modalVariants[btn.dataset.group]=btn.dataset.opt; }
    const _o=modalVariants[btn.dataset.group]; if(_o&&_o.image){ const _i=sliderImages.indexOf(_o.image); if(_i>=0) slideTo(_i); }
    renderModalDetail();
  }); });
}
function closeModal(){ if($modalOverlay) $modalOverlay.classList.remove('open'); document.body.style.overflow=''; modalProduct=null; }
function slideTo(idx){ sliderIdx=Math.max(0,Math.min(idx,sliderImages.length-1)); if($sliderTrack) $sliderTrack.style.transform=`translateX(-${sliderIdx*100}%)`; if($sliderDots) $sliderDots.querySelectorAll('.slider-dot').forEach((d,i)=>d.classList.toggle('active',i===sliderIdx)); }

// eventos: solo modal/slider (carrito → CraftCart)
document.addEventListener('click',e=>{
  const openBtn=e.target.closest('[data-open]');
  if(openBtn&&!e.target.closest('[data-action]')){ e.preventDefault(); openModal(openBtn.dataset.open); }
});
if($modalOverlay) $modalOverlay.addEventListener('click',e=>{ if(e.target===$modalOverlay) closeModal(); });
if($modalClose) $modalClose.addEventListener('click',closeModal);
if($sliderPrev) $sliderPrev.addEventListener('click',e=>{ e.stopPropagation(); slideTo(sliderIdx-1); });
if($sliderNext) $sliderNext.addEventListener('click',e=>{ e.stopPropagation(); slideTo(sliderIdx+1); });
if($sliderDots) $sliderDots.addEventListener('click',e=>{ const dot=e.target.closest('.slider-dot'); if(dot) slideTo(Number(dot.dataset.idx)); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); if(e.key==='ArrowLeft'&&$modalOverlay?.classList.contains('open')) slideTo(sliderIdx-1); if(e.key==='ArrowRight'&&$modalOverlay?.classList.contains('open')) slideTo(sliderIdx+1); });
const sliderWrap=$('sliderWrap');
if(sliderWrap){ let tX=0; sliderWrap.addEventListener('touchstart',e=>{tX=e.changedTouches[0].clientX;},{passive:true}); sliderWrap.addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-tX; if(Math.abs(dx)>40) slideTo(dx<0?sliderIdx+1:sliderIdx-1); }); }
document.addEventListener('cart:change',updateCardButtons);

async function init(){
  try{ const r=await fetch('./config.json',{cache:'no-store'}); if(r.ok) config=await r.json(); }catch(e){}
  if(config.store_name) document.title=config.site_title||config.store_name;
  try{ const res=await fetch('./productos.json',{cache:'no-store'}); products=await res.json(); }
  catch(e){ if($catalog) $catalog.innerHTML='<p class="text-center" style="padding:40px;color:var(--text-light)">Cargando productos...</p>'; return; }
  window.__products=products; window.__config=config;

  if($catalog){
    const featured=products.filter(p=>p.destacado||(p.categorias||[]).includes('mas_vendidos')).slice(0,5);
    const toShow=featured.length?featured:products.slice(0,5);
    if(!toShow.length){ $catalog.innerHTML='<p class="text-center" style="padding:40px;color:var(--text-light)">No hay productos disponibles aún.</p>'; }
    else toShow.forEach((p,i)=>{
      const imgs=(Array.isArray(p.imagenes)&&p.imagenes.length)?p.imagenes:[p.imagen||''];
      const hasVariants=Array.isArray(p.variantes)&&p.variantes.length>0;
      const card=document.createElement('div'); card.className='card'; card.dataset.id=p.id; card.style.animationDelay=`${i*0.06}s`;
      card.innerHTML=`
        <div class="card-img" data-open="${p.id}">
          <img src="${imgs[0]}" alt="${p.nombre}" loading="lazy" onerror="this.style.opacity=0"/>
          <div class="card-img-overlay"><button class="btn-add-hover" data-open="${p.id}">${hasVariants?'Elegir opciones':'Ver producto'}</button></div>
        </div>
        <div class="card-body">
          <div class="card-cat">${(p.categorias||[])[0]||'General'}</div>
          <div class="card-name">${p.nombre}</div>
          ${p.descripcion?`<div class="card-desc">${p.descripcion}</div>`:''}
          <div class="card-footer">
            <div class="card-price">${formatPrice(p.precio)}</div>
            <div class="card-actions">${actionsHTML(p)}</div>
          </div>
        </div>`;
      $catalog.appendChild(card);
    });
  }

  CraftCart.init({ products, config, storageKey:'ay_cart' });
}
init().catch(e=>console.error(e));
})();
