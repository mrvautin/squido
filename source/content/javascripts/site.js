document.addEventListener('DOMContentLoaded', function () {
  var images = document.getElementsByTagName("img");
  for (var i = 0; i < images.length; i++) {
    images[i].classList.add('img-fluid');
  }

  // Scroll to top
  const scrollToTopButton = document.getElementById('js-top');
  const scrollFunc = () => {
    let y = window.scrollY;
    if (y > 0) {
      scrollToTopButton.className = "top-link show";
    } else {
      scrollToTopButton.className = "top-link hide";
    }
  };

  window.addEventListener("scroll", scrollFunc);

  const scrollToTop = () => {    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // When the button is clicked, run our ScrolltoTop function above!
  scrollToTopButton.onclick = function(e) {
    e.preventDefault();
    scrollToTop();
  }
}, false);