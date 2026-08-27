
      window.addEventListener('load', function() {
        setTimeout(function() {
          var loader = document.getElementById('crazy-loader');
          if(loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'scale(1.05)';
            setTimeout(function() { loader.remove(); }, 800);
          }
        }, 800);
      });
    