/**
 * main.js — Codevera Solutions
 * ─────────────────────────────────────────────────────────────
 * Page orchestration, payment logic, contact form, smooth scroll.
 * Each page calls only the renderers it needs.
 * ─────────────────────────────────────────────────────────────
 */

/* ── Page Detection ───────────────────────────────────────── */
const PAGE = (() => {
  const path = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  return path === '' ? 'index' : path;
})();

/* ── Razorpay Payment Handler ─────────────────────────────── */
function handlePayment(productId, amount, tierName = '') {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  if (amount === 0) {
    // Free plan — redirect to contact / signup
    window.location.href = `index.html#contact?product=${productId}&tier=${tierName}`;
    return;
  }

  // Check if Razorpay is loaded
  if (typeof Razorpay === 'undefined') {
    // Fallback: open WhatsApp with order intent
    const msg = encodeURIComponent(
      `Hi! I'd like to purchase "${product.name}"${tierName ? ` (${tierName} plan)` : ''} for ₹${amount}. Please share payment details.`
    );
    window.open(`https://wa.me/${SITE.whatsapp}?text=${msg}`, '_blank');
    return;
  }

  /* ── Razorpay Options (production-ready structure) ── */
  const options = {
    key: SITE.razorpayKey,
    amount: amount * 100, // paise
    currency: product.currencyCode || 'INR',
    name: SITE.name + ' Solutions',
    description: product.name + (tierName ? ` — ${tierName}` : ''),
    image: 'https://codevera.in/logo.png', // Replace with actual logo URL
    prefill: {
      name: '',
      email: '',
      contact: '',
    },
    notes: {
      product_id: productId,
      tier: tierName,
    },
    theme: { color: '#4f46e5' },
    handler(response) {
      // Payment success
      console.log('Payment successful:', response);
      showPaymentSuccess(product.name, tierName, response.razorpay_payment_id);
    },
    modal: {
      ondismiss() {
        console.log('Payment cancelled');
      },
    },
  };

  const rzp = new Razorpay(options);
  rzp.on('payment.failed', err => {
    console.error('Payment failed:', err.error);
    alert(`Payment failed: ${err.error.description}. Please try again or contact us.`);
  });
  rzp.open();
}

function showPaymentSuccess(productName, tierName, paymentId) {
  const overlay = document.createElement('div');
  overlay.className = 'payment-success-overlay';
  overlay.innerHTML = `
    <div class="payment-success-modal">
      <div class="success-icon">🎉</div>
      <h2>Payment Successful!</h2>
      <p>Thank you for purchasing <strong>${productName}</strong>${tierName ? ` (${tierName})` : ''}.</p>
      <p class="payment-id">Payment ID: <code>${paymentId}</code></p>
      <p>You'll receive download / access details at your email within a few minutes.</p>
      <div style="display:flex;gap:1rem;justify-content:center;margin-top:2rem">
        <a href="mailto:${SITE.email}" class="btn btn-primary">Contact Support</a>
        <button class="btn btn-secondary" onclick="this.closest('.payment-success-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

/* ── Contact Form ─────────────────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    // Firebase-ready lead format
    const lead = {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      service: data.service || '',
      budget: data.budget || '',
      message: data.message,
      source: 'website_contact_form',
      page: PAGE,
      timestamp: new Date().toISOString(),
      status: 'new',
    };

    console.log('Lead captured (Firebase-ready):', lead);
    // TODO: Replace with Firebase write:
    // firebase.firestore().collection('leads').add(lead);

    // WhatsApp direct option
    if (data.whatsapp === 'yes') {
      const msg = encodeURIComponent(
        `Hi! I'm ${data.name}.\nService: ${data.service || 'General'}\nBudget: ${data.budget || 'TBD'}\n\n${data.message}`
      );
      window.open(`https://wa.me/${SITE.whatsapp}?text=${msg}`, '_blank');
      return;
    }

    // Mailto fallback
    const subject = `[Codevera] ${data.service || 'Project Inquiry'} from ${data.name}`;
    const body = `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || '—'}\nService: ${data.service || '—'}\nBudget: ${data.budget || '—'}\n\n${data.message}`;
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // UI feedback
    const btn = form.querySelector('button[type=submit]');
    const orig = btn.textContent;
    btn.textContent = '✓ Message Sent!';
    btn.disabled = true;
    setTimeout(() => {
      form.reset();
      btn.textContent = orig;
      btn.disabled = false;
    }, 3000);
  });
}

/* ── Smooth Scroll ────────────────────────────────────────── */
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
  });
}

/* ── Scroll Animations ────────────────────────────────────── */
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ── Number Counter Animation ─────────────────────────────── */
function animateCounters() {
  const stats = document.querySelectorAll('.stat-number');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.textContent;
      const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (isNaN(num)) return;
      const suffix = raw.replace(/[0-9]/g, '');
      let start = 0;
      const duration = 1200;
      const step = num / (duration / 16);
      const timer = setInterval(() => {
        start = Math.min(start + step, num);
        el.textContent = Math.round(start) + suffix;
        if (start >= num) clearInterval(timer);
      }, 16);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  stats.forEach(el => observer.observe(el));
}

/* ── Keyboard Accessibility ───────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

/* ── Page Bootstrap ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Universal
  renderNav(PAGE);
  renderFooter();
  renderWhatsApp();
  initSmoothScroll();
  initScrollAnimations();

  // Page-specific
  switch (PAGE) {
    case 'index':
      renderStats();
      renderServices();
      renderProjectFilters();
      renderProjects();
      renderTestimonials();
      renderSaas();
      renderBlog(3);
      initContactForm();
      animateCounters();
      break;

    case 'products':
      renderProductFilters();
      renderProductsGrid();
      break;

    case 'product':
      renderProductDetail();
      initScrollAnimations();
      break;

    case 'blog':
      renderBlog();
      break;
  }

  // Global reveal after all renders
  setTimeout(observeReveal, 100);
});
