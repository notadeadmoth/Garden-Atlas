// Animate tag fade-in and carousel effect for atlas page
// Adds .visible class to each li in sequence for fade-in

document.addEventListener('DOMContentLoaded', function () {
  if (!document.body.id || document.body.id !== 'index-page') return;
  // Change selector to match new carousel location inside #map
  const tagList = document.querySelector('#map #plant-list');
  if (!tagList) return;
  const tags = Array.from(tagList.querySelectorAll('li'));
  tags.forEach(li => li.classList.remove('visible'));
  tags.forEach(li => {
  li.addEventListener('mousedown', e => e.stopPropagation());
  li.addEventListener('dragstart', e => e.stopPropagation());
});
  // Fade in each tag in sequence
  tags.forEach((li, i) => {
    setTimeout(() => li.classList.add('visible'), 200 + i * 120);
  });

  // --- Carousel overlay expand/collapse logic ---
  let expanded = false;
  let collapseTimeout = null;

  function expandCarousel() {
    if (collapseTimeout) clearTimeout(collapseTimeout);
    tagList.classList.add('carousel-expanded');
    tagList.classList.remove('carousel-collapsed');
    expanded = true;
  }
  function collapseCarousel() {
    tagList.classList.remove('carousel-expanded');
    tagList.classList.add('carousel-collapsed');
    expanded = false;
  }

  // Start collapsed
  collapseCarousel();

  // Expand when mouse is near left edge or over carousel
  function handleMouseMove(e) {
    if (e.clientX < 40) {
      expandCarousel();
    } else if (!expanded) {
      collapseCarousel();
    }
  }
  document.addEventListener('mousemove', handleMouseMove);
  tagList.addEventListener('mouseenter', expandCarousel);
  tagList.addEventListener('mouseleave', () => {
    collapseTimeout = setTimeout(collapseCarousel, 400);
  });

  // Make carousel scrollable with mouse wheel
  tagList.addEventListener('wheel', e => {
    tagList.scrollTop += e.deltaY;
    e.preventDefault();
  }, { passive: false });
});
