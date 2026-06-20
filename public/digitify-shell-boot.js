(function () {
  document.documentElement.classList.add('digitify-shell-booting');

  if (!document.getElementById('digitifyCriticalCss')) {
    var style = document.createElement('style');
    style.id = 'digitifyCriticalCss';
    style.textContent = [
      'html{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}',
      'body.theme-light.digitify-shop-body{background:#fff9f2;color:#0a0a0a}',
      'body.theme-light.digitify-shop-body{padding-top:65px}',
      'body.theme-light.storefront-page .storefront-hero .hero-headline,',
      'body.theme-light.storefront-page .storefront-hero h1.hero-headline{color:#0a0a0a;text-shadow:none}',
      'body.theme-light.storefront-page .storefront-hero .hero-lead{color:#3d4450;text-shadow:none}',
      'body.theme-light.storefront-page .storefront-hero .storefront-kicker,',
      'body.theme-light.storefront-page .storefront-hero .hero-eyebrow{color:#c8781f;text-shadow:none}',
      'body.theme-light.storefront-page .storefront-hero-facts .hero-fact{color:#3d4450;text-shadow:none}',
      'html.digitify-shell-booting .digitify-site-header{opacity:0}',
      'html.digitify-shell-ready .digitify-site-header{opacity:1;transition:opacity .12s ease}'
    ].join('');
    document.head.appendChild(style);
  }

  if (!document.getElementById('digitifyHeaderDeckCss')) {
    var link = document.createElement('link');
    link.id = 'digitifyHeaderDeckCss';
    link.rel = 'stylesheet';
    link.href = '/digitify-header-deck.css';
    document.head.appendChild(link);
  }
})();
