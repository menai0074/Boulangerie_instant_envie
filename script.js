'use strict';

// ─── Année footer ───────────────────────────────
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─── Menu hamburger ─────────────────────────────
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    });
  });
}

// ─── Header scroll shadow ────────────────────────
const siteHeader = document.getElementById('site-header');
if (siteHeader) {
  const onScroll = () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ─── Navigation active au scroll ─────────────────
(function initActiveNav() {
  const navLinks = document.querySelectorAll('[data-nav]');
  if (navLinks.length === 0) return;

  const sections = [];
  navLinks.forEach(link => {
    const id = link.dataset.nav;
    const section = document.getElementById(id);
    if (section) sections.push({ id, section, link });
  });

  if (sections.length === 0) return;

  const onNavScroll = () => {
    const scrollY = window.scrollY + 100;
    let current = sections[0];

    sections.forEach(item => {
      if (item.section.offsetTop <= scrollY) {
        current = item;
      }
    });

    navLinks.forEach(l => l.classList.remove('is-active'));
    if (current) current.link.classList.add('is-active');
  };

  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();
})();

// ─── Cookie consent RGPD ─────────────────────────
const COOKIE_CONSENT_KEY = 'ie_cookie_consent';

(function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const existingConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (existingConsent) return;

  setTimeout(() => {
    banner.style.display = 'block';
  }, 800);

  const acceptBtn = document.getElementById('cookie-accept');
  const refuseBtn = document.getElementById('cookie-refuse');

  function closeBanner(value) {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      console.warn('localStorage indisponible pour le consentement cookies.');
    }
    banner.style.display = 'none';
  }

  if (acceptBtn) acceptBtn.addEventListener('click', () => closeBanner('accepted'));
  if (refuseBtn) refuseBtn.addEventListener('click', () => closeBanner('functional'));
})();

// Gestion du bouton "Gérer les cookies" dans le footer
function initCookieManageLinks() {
  const manageLinks = document.querySelectorAll('#footer-cookie-manage, #footer-cookie-manage-2');
  manageLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      try { localStorage.removeItem(COOKIE_CONSENT_KEY); } catch { /* */ }
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.style.display = 'block';
    });
  });
}
initCookieManageLinks();

// ─── Intersection Observer — animations au scroll ─
(function initScrollAnimations() {
  const els = document.querySelectorAll('.animate-on-scroll');
  if (els.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback : tout rendre visible immédiatement
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  els.forEach(el => observer.observe(el));
})();

// ─── Panier (localStorage) ───────────────────────
const CART_KEY = 'ie_cart_v1';

// Accepte uniquement les chemins relatifs dans image/ avec extension connue.
// Bloque les URLs javascript:, data:, http:// ou tout chemin hors du dossier.
function safeImgSrc(raw) {
  const s = String(raw).trim().substring(0, 200);
  return /^image\/[^/\\]+\.(jpe?g|png|gif|webp|svg)$/i.test(s) ? s : '';
}

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  catch { console.warn('localStorage indisponible.'); }
  renderCart();
}

function addToCart(product) {
  if (!product.id || typeof product.price !== 'number' || product.price <= 0) return;

  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, 20);
  } else {
    cart.push({
      id:    String(product.id).substring(0, 50),
      name:  String(product.name).substring(0, 100),
      price: Math.round(product.price * 100) / 100,
      image: safeImgSrc(product.image),
      qty:   1
    });
  }
  saveCart(cart);
  showToast(String(product.name).substring(0, 60) + ' ajouté au panier');
}

function removeFromCart(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
}

function getTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function renderCart() {
  const cart     = getCart();
  const count    = cart.reduce((s, i) => s + i.qty, 0);
  const badge    = document.getElementById('cart-count');
  const itemsEl  = document.getElementById('cart-items');
  const totalEl  = document.getElementById('cart-total');
  const footerEl = document.getElementById('cart-footer');
  const cartBtn  = document.getElementById('cart-toggle');

  if (!itemsEl) return;

  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
  if (cartBtn) {
    cartBtn.setAttribute('aria-label', `Voir mon panier (${count} article${count > 1 ? 's' : ''})`);
  }

  while (itemsEl.firstChild) itemsEl.removeChild(itemsEl.firstChild);

  if (cart.length === 0) {
    const p = document.createElement('p');
    p.className = 'cart-empty';
    p.textContent = 'Votre panier est vide — ';
    const lien = document.createElement('a');
    lien.href = '#specialites';
    lien.textContent = 'Découvrir nos produits';
    p.appendChild(lien);
    itemsEl.appendChild(p);
    if (footerEl) footerEl.style.display = 'none';
  } else {
    cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-item';

      const imgSrc = safeImgSrc(item.image);
      if (imgSrc) {
        const img = document.createElement('img');
        img.src     = imgSrc;
        img.alt     = item.name;
        img.width   = 52;
        img.height  = 52;
        img.loading = 'lazy';
        row.appendChild(img);
      }

      const info = document.createElement('div');
      info.className = 'cart-item-info';
      const nom = document.createElement('strong');
      nom.textContent = item.name;
      const detail = document.createElement('span');
      detail.textContent = `${item.price.toFixed(2).replace('.', ',')} € × ${item.qty}`;
      info.appendChild(nom);
      info.appendChild(detail);

      const right = document.createElement('div');
      right.className = 'cart-item-right';
      const total = document.createElement('span');
      total.className = 'cart-item-total';
      total.textContent = `${(item.price * item.qty).toFixed(2).replace('.', ',')} €`;
      const suppr = document.createElement('button');
      suppr.className = 'cart-remove';
      suppr.dataset.removeId = item.id;
      suppr.setAttribute('aria-label', `Retirer ${item.name} du panier`);
      suppr.textContent = '✕';
      right.appendChild(total);
      right.appendChild(suppr);

      row.appendChild(info);
      row.appendChild(right);
      itemsEl.appendChild(row);
    });
    if (footerEl) footerEl.style.display = 'block';
  }

  if (totalEl) {
    totalEl.textContent = getTotal(cart).toFixed(2).replace('.', ',') + ' €';
  }
}

const cartItemsEl = document.getElementById('cart-items');
if (cartItemsEl) {
  cartItemsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-id]');
    if (btn) removeFromCart(btn.dataset.removeId);
  });
}

document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('[data-product-id]');
    if (!card) return;
    addToCart({
      id:    card.dataset.productId,
      name:  card.dataset.productName,
      price: parseFloat(card.dataset.productPrice),
      image: card.dataset.productImage || ''
    });
  });
});

// ─── Panneau panier ──────────────────────────────
const cartPanel   = document.getElementById('cart-panel');
const cartOverlay = document.getElementById('cart-overlay');
const cartToggle  = document.getElementById('cart-toggle');
const cartClose   = document.getElementById('cart-close');

function openCart() {
  if (!cartPanel || !cartOverlay) return;
  cartPanel.classList.add('is-open');
  cartOverlay.classList.add('is-open');
  cartPanel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (cartClose) cartClose.focus();
}
function closeCart() {
  if (!cartPanel || !cartOverlay) return;
  cartPanel.classList.remove('is-open');
  cartOverlay.classList.remove('is-open');
  cartPanel.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (cartToggle) cartToggle.focus();
}

if (cartToggle)  cartToggle.addEventListener('click', openCart);
if (cartClose)   cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

// ─── Toast ──────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

// ─── Formulaire newsletter ────────────────────────
(function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msgEl   = document.getElementById('newsletter-msg');
    const emailEl = document.getElementById('newsletter-email');
    const consent = document.getElementById('newsletter-consent');

    if (!msgEl || !emailEl || !consent) return;

    const email = emailEl.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msgEl.textContent = 'Veuillez saisir une adresse e-mail valide.';
      msgEl.className = 'newsletter-feedback is-error';
      emailEl.focus();
      return;
    }

    if (!consent.checked) {
      msgEl.textContent = 'Veuillez accepter les conditions pour vous inscrire.';
      msgEl.className = 'newsletter-feedback is-error';
      consent.focus();
      return;
    }

    // Ici : connexion à un vrai service e-mail (Mailchimp, Brevo, etc.)
    // Simulation pour le moment :
    msgEl.textContent = 'Merci ! Vous êtes inscrit(e) à notre newsletter.';
    msgEl.className = 'newsletter-feedback is-success';
    form.reset();
  });
})();

// ─── Formulaire contact ───────────────────────────
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msgEl   = document.getElementById('contact-form-msg');
    const rgpdEl  = document.getElementById('contact-rgpd');

    if (!msgEl || !rgpdEl) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!rgpdEl.checked) {
      msgEl.textContent = 'Veuillez accepter la politique de confidentialité pour envoyer votre message.';
      msgEl.className = 'is-error';
      rgpdEl.focus();
      return;
    }

    // Ici : envoyer via fetch vers un backend (Formspree, EmailJS, etc.)
    // Simulation :
    msgEl.textContent = 'Message envoyé ! Nous vous répondrons sous 24h ouvrées.';
    msgEl.className = 'is-success';
    form.reset();
  });
})();

// ─── Init ────────────────────────────────────────
renderCart();
