// ortak.js: genel sabit öğeleri sayfaya uyarla; danışman menüsünü sticky bırak.
(function () {
  const page = location.pathname.split('/').pop() || '';
  window.addEventListener('load', function () {
    document.querySelectorAll('body *').forEach(function (el) {
      if (el.matches('.panel-sidebar')) return;
      if (page.startsWith('guru-') && el.matches('.advisor-sidebar')) return;
      if (el.matches('.site-header')) return;
      var cs = getComputedStyle(el);
      if (cs.position !== 'sticky' && cs.position !== 'fixed') return;
      if (cs.top === 'auto') return; // alttaki yapışık sipariş çubuklarına dokunma
      var r = el.getBoundingClientRect();
      var isSidebar = r.left < 80 && r.width > 160 && r.width < 360 && r.height > 250;
      var isTopbar  = r.top < 20 && r.width > innerWidth * 0.6 && r.height < 120;
      if (!isSidebar && !isTopbar) return;
      if (cs.position === 'sticky') { el.style.position = 'relative'; el.style.top = 'auto'; }
      else { el.style.position = 'absolute'; }
    });
  });

})();
