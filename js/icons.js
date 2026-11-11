/* Convergas IT Ops — inline SVG icon set (stroke-based, 24x24) */
(function () {
  const S = (p) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  const ICONS = {
    grid: S('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    users: S('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.5 14.4A5.5 5.5 0 0 1 20.5 19.4"/>'),
    monitor: S('<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/>'),
    printer: S('<path d="M6 9V3.5h12V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><rect x="6.5" y="14" width="11" height="6.5" rx="1"/><circle cx="17.5" cy="12" r=".9" fill="currentColor" stroke="none"/>'),
    terminal: S('<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M7 9l3 3-3 3M13 15h4"/>'),
    book: S('<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v15.5H7.5A2.5 2.5 0 0 0 5 20z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 20H19"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    arrowUpRight: S('<path d="M7 17 17 7M8 7h9v9"/>'),
    flask: S('<path d="M9 3h6M10 3v6L4.7 17.2A2 2 0 0 0 6.4 20.3h11.2a2 2 0 0 0 1.7-3.1L14 9V3"/><path d="M7.4 14h9.2"/>'),
    eye: S('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    clipboard: S('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4M9 4h6M8.5 10.5h7M8.5 14h7M8.5 17.5h4.5"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>'),
    pin: S('<path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>'),
    instagram: S('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/>'),
    linkedin: S('<rect x="3" y="3" width="18" height="18" rx="2.2"/><path d="M8 10.5V17M8 7.4v.01M12 17v-3.6a2 2 0 0 1 4 0V17"/>'),
    box: S('<path d="M21 7.5 12 3 3 7.5l9 4.5 9-4.5Z"/><path d="M3 7.5v9L12 21V12M21 7.5v9L12 21"/>'),
    settings: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 .9-1.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8Z"/>'),
    menu: S('<path d="M3 6h18M3 12h18M3 18h18"/>'),
    search: S('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    moon: S('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'),
    sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    copy: S('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    edit: S('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    trash: S('<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>'),
    external: S('<path d="M15 3h6v6M21 3l-9 9M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>'),
    check: S('<path d="M20 6 9 17l-5-5"/>'),
    x: S('<path d="M18 6 6 18M6 6l12 12"/>'),
    alert: S('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>'),
    wrench: S('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>'),
    laptop: S('<rect x="4" y="5" width="16" height="10" rx="1.6"/><path d="M2 19h20l-1.5-2.5h-17z"/>'),
    desktop: S('<rect x="3" y="4" width="18" height="11" rx="1.6"/><path d="M9 19h6M12 15v4"/>'),
    shield: S('<path d="M12 3 5 6v5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6Z"/>'),
    link: S('<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>'),
    chevron: S('<path d="m9 18 6-6-6-6"/>'),
    activity: S('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
    list: S('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    mail: S('<rect x="2.5" y="4.5" width="19" height="15" rx="2.4"/><path d="m3 6 9 6 9-6"/>'),
    server: S('<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>'),
    cpu: S('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>'),
    flash: S('<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"/>'),
    keyboard: S('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>'),
    mouse: S('<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/>'),
    key: S('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.5 12.5 9-9M16 6l3 3M14 8l2.5 2.5"/>'),
    calendar: S('<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>'),
    phone: S('<path d="M6.6 3.5 9 3.9l1 4-2 1.4a13 13 0 0 0 6.7 6.7l1.4-2 4 1 .4 2.4a2 2 0 0 1-2 2.3A17 17 0 0 1 4.3 5.5a2 2 0 0 1 2.3-2Z"/>'),
    eye: S('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    eyeoff: S('<path d="M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.4 3.3M6.6 6.6A18 18 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4.3-1M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
    lock: S('<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 15v2.5"/>'),
    award: S('<circle cx="12" cy="9" r="6"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>'),
    share: S('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8 15.7 6.4M8.3 13.2 15.7 17.6"/>'),
    download: S('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>'),
    refresh: S('<path d="M21 12a9 9 0 1 1-2.6-6.3M21 4v5h-5"/>'),
    home: S('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
    upload: S('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>'),
    file: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    maximize: S('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3"/>'),
    minimize: S('<path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M21 16h-3a2 2 0 0 0-2 2v3M3 16h3a2 2 0 0 1 2 2v3"/>'),
  };

  function paint(el) {
    const name = el.getAttribute('data-icon');
    if (ICONS[name] && !el.dataset.iconDone) {
      el.innerHTML = ICONS[name];
      el.dataset.iconDone = '1';
    }
  }
  function applyIcons(root) {
    root = root || document;
    // include the root element itself when it carries [data-icon]
    // (querySelectorAll only matches descendants, never the root)
    if (root.nodeType === 1 && root.hasAttribute && root.hasAttribute('data-icon')) paint(root);
    root.querySelectorAll('[data-icon]').forEach(paint);
  }

  window.Icons = { svg: (n) => ICONS[n] || '', apply: applyIcons, list: ICONS };
})();
