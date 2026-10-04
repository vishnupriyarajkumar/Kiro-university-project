/**
 * Injects the shared site navigation bar into every page.
 * Call mountNav() once per page, passing the current page key.
 * Valid keys: 'home' | 'timer' | 'log' | 'history' | 'stats' | 'report'
 */

const NAV_LINKS = [
  { key: 'home',    href: '/',            label: '🏠 Home'    },
  { key: 'timer',   href: '/timer.html',  label: '🍅 Timer'   },
  { key: 'log',     href: '/log.html',    label: '📝 Log'     },
  { key: 'history', href: '/history.html',label: '📅 History' },
  { key: 'stats',   href: '/stats.html',  label: '📊 Stats'   },
  { key: 'report',  href: '/report.html', label: '📄 Report'  },
];

/** Render and prepend the nav bar to <body>. */
export function mountNav(activeKey) {
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Site navigation');

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = '/';
  brand.innerHTML = '<span class="brand-icon">🍅</span> Pomodoro';
  nav.appendChild(brand);

  NAV_LINKS.forEach(({ key, href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'nav-link' + (key === activeKey ? ' active' : '');
    a.textContent = label;
    if (key === activeKey) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });

  document.body.prepend(nav);
}
