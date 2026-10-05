/**
 * Mounts the sidebar navigation into every page.
 * Call mountNav(activeKey) once at the top of each page module.
 * Valid keys: 'home' | 'timer' | 'log' | 'history' | 'stats' | 'report'
 */

const CDN = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets';

const NAV_ITEMS = [
  { key: 'home',    href: '/',             emoji: '🏠', label: 'Home'    },
  { key: 'timer',   href: '/timer.html',   emoji: '⏰', label: 'Timer'   },
  { key: 'log',     href: '/log.html',     emoji: '📝', label: 'Log'     },
  { key: 'history', href: '/history.html', emoji: '📅', label: 'History' },
  { key: 'stats',   href: '/stats.html',   emoji: '📊', label: 'Stats'   },
  { key: 'report',  href: '/report.html',  emoji: '📄', label: 'Report'  },
];

/** Return a 3D Fluent Emoji <img> tag for the sidebar. */
function navIcon(emoji) {
  const url = `${CDN}/${encodeURIComponent(emoji)}_3d.png`;
  return `<img class="nav-icon-3d" src="${url}" width="20" height="20" alt="" draggable="false" loading="lazy" />`;
}

/** Build and inject the sidebar + mobile toggle into <body>. */
export function mountNav(activeKey) {
  wrapMainContent();

  const sidebar = buildSidebar(activeKey);
  document.body.insertBefore(sidebar, document.body.firstChild);

  const toggle = buildToggle();
  document.body.insertBefore(toggle, document.body.firstChild);

  const overlay = buildOverlay();
  document.body.appendChild(overlay);

  wireMobileMenu(toggle, sidebar, overlay);
}

/** Wrap all existing body children in a .main-content div. */
function wrapMainContent() {
  const children = Array.from(document.body.childNodes);
  const wrapper  = document.createElement('div');
  wrapper.className = 'main-content';
  children.forEach(child => wrapper.appendChild(child));
  document.body.appendChild(wrapper);
}

/** Build the sidebar element. */
function buildSidebar(activeKey) {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.setAttribute('aria-label', 'Site navigation');

  // Brand — 3D tomato
  const brand = document.createElement('a');
  brand.className = 'sidebar-brand';
  brand.href = '/';
  brand.setAttribute('aria-label', 'Pomodoro Logger home');
  brand.innerHTML = `
    <img class="sidebar-brand-icon-3d"
         src="${CDN}/${encodeURIComponent('🍅')}_3d.png"
         width="32" height="32" alt="Pomodoro" draggable="false" />
    <span class="sidebar-brand-name">Pomodoro</span>
  `;
  sidebar.appendChild(brand);

  // Section label
  const sectionLabel = document.createElement('div');
  sectionLabel.className = 'nav-section-label';
  sectionLabel.textContent = 'Navigation';
  sidebar.appendChild(sectionLabel);

  // Nav links
  NAV_ITEMS.forEach(({ key, href, emoji, label }) => {
    const a = document.createElement('a');
    a.href      = href;
    a.className = 'nav-item' + (key === activeKey ? ' active' : '');
    if (key === activeKey) a.setAttribute('aria-current', 'page');
    a.innerHTML = `${navIcon(emoji)}<span class="nav-label">${label}</span>`;
    sidebar.appendChild(a);
  });

  // Spacer + divider + footer
  const spacer = document.createElement('div');
  spacer.className = 'sidebar-spacer';
  sidebar.appendChild(spacer);

  const divider = document.createElement('div');
  divider.className = 'sidebar-divider';
  sidebar.appendChild(divider);

  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';
  footer.innerHTML = `<span class="sidebar-status-dot"></span> Session active`;
  sidebar.appendChild(footer);

  return sidebar;
}

/** Build the mobile hamburger toggle button. */
function buildToggle() {
  const btn = document.createElement('button');
  btn.className = 'sidebar-toggle';
  btn.setAttribute('aria-label', 'Open navigation menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'sidebar');
  btn.innerHTML = `<span></span><span></span><span></span>`;
  return btn;
}

/** Build the translucent overlay for mobile. */
function buildOverlay() {
  const el = document.createElement('div');
  el.className = 'sidebar-overlay';
  return el;
}

/** Wire open/close behavior for the mobile hamburger. */
function wireMobileMenu(toggle, sidebar, overlay) {
  let isOpen = false;

  function open() {
    isOpen = true;
    sidebar.classList.add('open');
    overlay.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    animateHamburger(toggle, true);
  }

  function close() {
    isOpen = false;
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    animateHamburger(toggle, false);
  }

  toggle.addEventListener('click', () => isOpen ? close() : open());
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) close(); });
  sidebar.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => { if (isOpen) close(); });
  });
}

/** Animate hamburger spans into X or back. */
function animateHamburger(btn, open) {
  const [top, mid, bot] = btn.querySelectorAll('span');
  if (open) {
    top.style.transform = 'translateY(7px) rotate(45deg)';
    mid.style.opacity   = '0';
    mid.style.transform = 'scaleX(0)';
    bot.style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    top.style.transform = '';
    mid.style.opacity   = '';
    mid.style.transform = '';
    bot.style.transform = '';
  }
}
