'use strict';

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─── Constantes ──────────────────────────────────
const CART_KEY       = 'ie_cart_v1';
const LIVRAISON_COST = 3.90;

// ⚠️ AVERTISSEMENT : Ces codes sont visibles côté client.
// En production, la validation et l'application de la réduction
// DOIVENT être faites côté serveur. Ne jamais faire confiance
// au montant de réduction envoyé par le client.
const VALID_COUPONS = { 'ENVIE10': 0.10, 'BIENVENUE': 0.15 };

let discountAmount = 0;

// Accepte uniquement les chemins relatifs dans image/ avec extension connue.
function safeImgSrc(raw) {
  const s = String(raw).trim().substring(0, 200);
  return /^image\/[^/\\]+\.(jpe?g|png|gif|webp|svg)$/i.test(s) ? s : '';
}

// ─── Panier depuis localStorage ──────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function getSubtotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function isLivraisonSelected() {
  const checked = document.querySelector('input[name="retrait"]:checked');
  return checked && checked.value === 'livraison';
}

// ─── Messages d'erreur/succès dans le DOM ────────
function showCouponMsg(text, isError) {
  const el = document.getElementById('coupon-msg');
  el.textContent = text;
  el.className = isError ? 'pay-error' : 'pay-success';
}

function showFormError(text) {
  const el = document.getElementById('form-error');
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}

// ─── Rendu du récapitulatif (API DOM — pas innerHTML) ─
function renderSummary() {
  const cart   = getCart();
  const listEl = document.getElementById('pay-items-list');

  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

  if (cart.length === 0) {
    const li = document.createElement('li');
    li.className = 'pay-empty-msg';
    const lien = document.createElement('a');
    lien.href = 'index.html#specialites';
    lien.textContent = '← Retourner à la boutique';
    li.appendChild(lien);
    listEl.appendChild(li);
  } else {
    cart.forEach(item => {
      const li = document.createElement('li');
      li.className = 'pay-item';

      const img = document.createElement('img');
      img.src     = safeImgSrc(item.image);
      img.alt     = item.name;
      img.width   = 56;
      img.height  = 56;
      img.loading = 'lazy';

      const infoDiv = document.createElement('div');
      const nomEl   = document.createElement('strong');
      nomEl.textContent = item.name;
      const qtyEl   = document.createElement('span');
      qtyEl.className   = 'pay-qty';
      qtyEl.textContent = `× ${item.qty}`;
      infoDiv.appendChild(nomEl);
      infoDiv.appendChild(qtyEl);

      const priceEl = document.createElement('span');
      priceEl.className   = 'pay-price';
      priceEl.textContent = `${(item.price * item.qty).toFixed(2).replace('.', ',')} €`;

      li.appendChild(img);
      li.appendChild(infoDiv);
      li.appendChild(priceEl);
      listEl.appendChild(li);
    });
  }

  updateTotals(cart);
}

function updateTotals(cart) {
  const sub   = getSubtotal(cart);
  const lv    = isLivraisonSelected() ? LIVRAISON_COST : 0;
  const total = Math.max(0, sub + lv - discountAmount);

  document.getElementById('pay-subtotal').textContent = fmt(sub);
  document.getElementById('pay-total').textContent    = fmt(total);

  const lvRow = document.getElementById('pay-livraison-row');
  lvRow.style.display = isLivraisonSelected() ? 'flex' : 'none';

  const discRow = document.getElementById('pay-discount-row');
  discRow.style.display = discountAmount > 0 ? 'flex' : 'none';
  if (discountAmount > 0) {
    document.getElementById('pay-discount-val').textContent = `−${fmt(discountAmount)}`;
  }
}

function fmt(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

// ─── Modes de retrait ────────────────────────────
const livraisonFields = document.getElementById('livraison-fields');
const adresseEl = document.getElementById('adresse');
const cpEl      = document.getElementById('cp');
const villeEl   = document.getElementById('ville');

document.querySelectorAll('input[name="retrait"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isLiv = radio.value === 'livraison';
    livraisonFields.style.display = isLiv ? 'grid' : 'none';
    livraisonFields.setAttribute('aria-hidden', String(!isLiv));
    [adresseEl, cpEl, villeEl].forEach(el => {
      el.required = isLiv;
      el.setAttribute('aria-required', String(isLiv));
    });
    updateTotals(getCart());
  });
});

// ─── Code promo ──────────────────────────────────
document.getElementById('coupon-btn').addEventListener('click', () => {
  const inputEl = document.getElementById('coupon-input');
  const raw     = inputEl.value.trim();
  const code    = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 20);

  if (!code) return;

  const pct = VALID_COUPONS[code];
  if (pct) {
    const sub = getSubtotal(getCart());
    discountAmount = Math.round(sub * pct * 100) / 100;
    showCouponMsg(`Code "${code}" appliqué : −${(pct * 100).toFixed(0)} % sur votre commande !`, false);
    updateTotals(getCart());
  } else {
    showCouponMsg('Code promo invalide ou expiré.', true);
  }
});

// ─── Stripe Elements ─────────────────────────────
const STRIPE_PK = 'pk_test_VOTRE_CLE_STRIPE_ICI';

let stripe, cardElement, cardComplete = false;

window.addEventListener('load', () => {
  if (typeof Stripe === 'undefined') {
    const errEl = document.getElementById('stripe-card-element');
    const msg = document.createElement('p');
    msg.className = 'pay-error';
    msg.textContent = '⚠️ Stripe n\'a pas pu se charger. Vérifiez votre connexion internet.';
    errEl.appendChild(msg);
    return;
  }

  stripe = Stripe(STRIPE_PK);
  const elements = stripe.elements({
    fonts: [{
      cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap'
    }]
  });

  cardElement = elements.create('card', {
    hidePostalCode: true,
    style: {
      base: {
        fontSize: '15px',
        fontFamily: '"Inter", Arial, sans-serif',
        color: '#5A4A42',
        '::placeholder': { color: '#8A7668' },
        iconColor: '#D79A55'
      },
      invalid: { color: '#c0392b', iconColor: '#c0392b' }
    }
  });

  cardElement.mount('#stripe-card-element');

  cardElement.on('change', event => {
    const errEl = document.getElementById('stripe-error');
    errEl.textContent = event.error ? event.error.message : '';
    cardComplete = !event.empty && !event.error && event.complete;
    refreshSubmitBtn();
  });
});

// ─── Activation du bouton "Confirmer & payer" ─────
const cgvCheckbox   = document.getElementById('cgv-accept');
const submitBtn     = document.getElementById('submit-btn');
const submitText    = document.getElementById('submit-text');
const submitSpinner = document.getElementById('submit-spinner');

function refreshSubmitBtn() {
  const ready = cgvCheckbox.checked && cardComplete && getCart().length > 0;
  submitBtn.disabled = !ready;
  submitBtn.setAttribute('aria-disabled', String(!ready));
}

cgvCheckbox.addEventListener('change', refreshSubmitBtn);

// ─── Soumission du formulaire ─────────────────────
document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showFormError('');

  if (getCart().length === 0) {
    showFormError('Votre panier est vide. Ajoutez des produits avant de commander.');
    return;
  }

  if (!e.target.checkValidity()) {
    e.target.reportValidity();
    return;
  }

  submitText.style.display = 'none';
  submitSpinner.style.display = 'inline-block';
  submitBtn.disabled = true;

  try {
    // ══════════════════════════════════════════════════════════
    // INTÉGRATION BACKEND (à décommenter avec votre vrai serveur)
    // ══════════════════════════════════════════════════════════
    //
    // const response = await fetch('/api/create-payment-intent', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     cart:      getCart(),
    //     livraison: isLivraisonSelected(),
    //     coupon:    document.getElementById('coupon-input').value.trim()
    //   })
    // });
    // if (!response.ok) throw new Error('Erreur serveur.');
    // const { clientSecret } = await response.json();
    //
    // const result = await stripe.confirmCardPayment(clientSecret, {
    //   payment_method: {
    //     card: cardElement,
    //     billing_details: {
    //       name:  `${document.getElementById('prenom').value} ${document.getElementById('nom').value}`,
    //       email: document.getElementById('email').value,
    //       phone: document.getElementById('tel').value
    //     }
    //   }
    // });
    //
    // if (result.error) throw new Error(result.error.message);
    // localStorage.removeItem(CART_KEY);
    // window.location.href = '/confirmation.html?ref=' + result.paymentIntent.id;
    //
    // ══════════════════════════════════════════════════════════

    // Mode démo (sans backend) :
    await new Promise(r => setTimeout(r, 1500));
    const demoMsg = document.getElementById('demo-msg');
    demoMsg.style.display = 'block';

  } catch (err) {
    const errEl = document.getElementById('stripe-error');
    errEl.textContent = err.message || 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    submitText.style.display = '';
    submitSpinner.style.display = 'none';
    refreshSubmitBtn();
  }
});

// ─── Init ────────────────────────────────────────
renderSummary();
refreshSubmitBtn();
