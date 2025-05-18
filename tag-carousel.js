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
    const map = document.getElementById('map');
    if (!map) return;
    const mapRect = map.getBoundingClientRect();
    // Check if mouse is within 40px of the map's left edge
    if (e.clientX >= mapRect.left && e.clientX < mapRect.left + 40 && e.clientY >= mapRect.top && e.clientY <= mapRect.bottom) {
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

  // --- Mobile touch scroll improvement ---
  let touchStartY = 0;
  let touchStartScroll = 0;
  tagList.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartScroll = tagList.scrollTop;
    }
  }, { passive: true });
  tagList.addEventListener('touchmove', function(e) {
    if (e.touches.length === 1) {
      const deltaY = touchStartY - e.touches[0].clientY;
      tagList.scrollTop = touchStartScroll + deltaY;
    }
  }, { passive: false });
});
