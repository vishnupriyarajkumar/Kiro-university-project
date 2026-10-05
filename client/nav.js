/**
 * Injects the shared site navigation bar into every page.
 * Call mountNav() once per page, passing the current page key.
 * Valid keys: 'home' | 'timer' | 'log' | 'history' | 'stats' | 'report'
 *
 * Features:
 *   - Glassmorphism sticky nav with active-page highlight
 *   - Mobile hamburger menu with animated open/close
 *   - Keyboard accessible (Escape closes the menu)
 */

const NAV_LINKS = [
  { key: 'home',    href: '/',             label: '🏠 Home'    },
  { key: 'timer',   href: '/timer.html',   label: '🍅 Timer'   },
  { key: 'log',     href: '/log.html',     label: '📝 Log'     },
  { key: 'history', href: '/history.html', label: '📅 History' },
  { key: 'stats',   href: '/stats.html',   label: '📊 Stats'   },
  { key: 'report',  href: '/report.html',  label: '📄 Report'  },
];

/** Render and prepend the nav bar to <body>. */
export function mountNav(activeKey) {
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Site navigation');

  // Brand logo
  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = '/';
  brand.setAttribute('aria-label', 'Pomodoro Logger home');
  brand.innerHTML = '<span class="brand-icon">🍅</span> Pomodoro';
  nav.appendChild(brand);

  // Hamburger button — visible only on mobile via CSS
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Toggle navigation menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-controls', 'nav-links');
  hamburger.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;
  nav.appendChild(hamburger);

  // Links group
  const group = document.createElement('div');
  group.className = 'nav-links-group';
  group.id = 'nav-links';

  NAV_LINKS.forEach(({ key, href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'nav-link' + (key === activeKey ? ' active' : '');
    a.textContent = label;
    if (key === activeKey) {
      a.setAttribute('aria-current', 'page');
    }
    group.appendChild(a);
  });

  nav.appendChild(group);
  document.body.prepend(nav);

  // Wire hamburger toggle
  wireHamburger(hamburger, group);
}

/** Animate hamburger lines and toggle the nav-links-group open/closed. */
function wireHamburger(btn, group) {
  let isOpen = false;

  function openMenu() {
    isOpen = true;
    group.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    animateHamburger(btn, true);
  }

  function closeMenu() {
    isOpen = false;
    group.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    animateHamburger(btn, false);
  }

  btn.addEventListener('click', () => {
    if (isOpen) closeMenu();
    else openMenu();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  // Close when a nav link is clicked (single-page navigation)
  group.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => { if (isOpen) closeMenu(); });
  });

  // Close when clicking outside the nav
  document.addEventListener('click', (e) => {
    if (isOpen && !btn.closest('nav').contains(e.target)) closeMenu();
  });
}

/** Animate the three hamburger spans into an X (open) or back (close). */
function animateHamburger(btn, open) {
  const [top, mid, bot] = btn.querySelectorAll('span');
  if (open) {
    top.style.transform   = 'translateY(7px) rotate(45deg)';
    mid.style.opacity     = '0';
    mid.style.transform   = 'scaleX(0)';
    bot.style.transform   = 'translateY(-7px) rotate(-45deg)';
  } else {
    top.style.transform   = '';
    mid.style.opacity     = '';
    mid.style.transform   = '';
    bot.style.transform   = '';
  }
}
