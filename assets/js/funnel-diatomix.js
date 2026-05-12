function openWhatsApp() {
  const url = encodeURIComponent(window.location.href);
  const msg = encodeURIComponent('Hola, quiero más información de este producto ') + url;
  window.open('https://wa.me/593988115201?text=' + msg, '_blank');
}

// Nav hamburger
document.getElementById('navHamburger')?.addEventListener('click', function () {
  document.getElementById('navLinks').classList.toggle('open');
});
