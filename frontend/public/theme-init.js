(function() {
  var t = localStorage.getItem('ipo_theme');
  if (t !== 'midnight' && t !== 'emerald' && t !== 'cyber') {
    t = 'midnight';
  }
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
})();
