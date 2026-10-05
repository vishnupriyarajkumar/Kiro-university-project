/**
 * icons.js — 3D Fluent Emoji icon helper
 *
 * Uses Microsoft's open-source Fluent Emoji 3D set via jsDelivr CDN.
 * CDN pattern: https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/<emoji>_3d.png
 *
 * Usage:
 *   import { icon, replaceIcons } from './icons.js';
 *
 *   // In HTML strings:
 *   `<div>${icon('tomato', 48)}</div>`
 *
 *   // Auto-replace data-icon attributes after DOM render:
 *   replaceIcons(containerEl);
 */

const CDN = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets';

/**
 * Map of friendly names → actual emoji character (used to build CDN URLs).
 * Each emoji URL is: CDN/<emoji>_3d.png
 */
export const ICONS = {
  // Core app icons
  tomato:        '🍅',
  timer:         '⏰',
  stopwatch:     '⏱️',
  log:           '📝',
  history:       '📅',
  stats:         '📊',
  report:        '📄',
  home:          '🏠',
  fire:          '🔥',
  trophy:        '🏆',
  star:          '⭐',
  clock:         '🕐',
  calendar:      '📅',
  chart:         '📈',
  lightning:     '⚡',
  rocket:        '🚀',
  bulb:          '💡',
  sparkles:      '✨',
  mic:           '🎙️',
  check:         '✅',
  cross:         '❌',
  laptop:        '💻',
  seedling:      '🌱',
  leaves:        '🌿',
  sun:           '☀️',
  moon:          '🌙',
  wave:          '👋',
  muscle:        '💪',
  brain:         '🧠',
  heart:         '❤️',
  confetti:      '🎉',
  medal:         '🏅',
  crown:         '👑',
  diamond:       '💎',
  target:        '🎯',
  hourglass:     '⏳',
  compass:       '🧭',
  magnifier:     '🔍',
  bell:          '🔔',
  lock:          '🔒',
  key:           '🔑',
  gear:          '⚙️',
  refresh:       '🔄',
  download:      '⬇️',
  upload:        '⬆️',
  link:          '🔗',
  pin:           '📌',
  bookmark:      '🔖',
  folder:        '📁',
  inbox:         '📥',
  pencil:        '✏️',
  palette:       '🎨',
  music:         '🎵',
  headphones:    '🎧',
};

/**
 * Return an <img> tag for a 3D Fluent emoji by name.
 * @param {string} name - key from ICONS map
 * @param {number} [size=32] - width/height in px
 * @param {string} [alt] - alt text (defaults to the name)
 */
export function icon(name, size = 32, alt = '') {
  const emoji = ICONS[name];
  if (!emoji) return '';
  const url = `${CDN}/${encodeURIComponent(emoji)}_3d.png`;
  const altText = alt || name;
  return `<img src="${url}" width="${size}" height="${size}" alt="${altText}" class="icon-3d" draggable="false" loading="lazy" />`;
}

/**
 * Return a raw CDN URL for a 3D Fluent emoji by name.
 * Useful for CSS background-image or preloading.
 */
export function iconUrl(name) {
  const emoji = ICONS[name];
  if (!emoji) return '';
  return `${CDN}/${encodeURIComponent(emoji)}_3d.png`;
}

/**
 * Replace all [data-icon="name"] elements in a container with 3D icon <img> tags.
 * Call after dynamic HTML is inserted into the DOM.
 *
 * Usage in HTML: <span data-icon="tomato" data-size="40"></span>
 */
export function replaceIcons(container = document) {
  container.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    const size = parseInt(el.dataset.size || '32', 10);
    const alt  = el.dataset.alt || name;
    el.innerHTML = icon(name, size, alt);
  });
}
