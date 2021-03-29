document.addEventListener('DOMContentLoaded', function () {
    var images = document.getElementsByTagName("img");
    for (var i = 0; i < images.length; i++) {
        images[i].classList.add('img-fluid');
      }
}, false);