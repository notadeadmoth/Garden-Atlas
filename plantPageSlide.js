// plantPageSlide.js
// Utility to handle sliding plant pages in/out from the right on selection

// Injects CSS for sliding animation and visibility
(function injectPlantPageSlideCSS() {
    if (document.getElementById('plant-page-slide-style')) return;
    const style = document.createElement('style');
    style.id = 'plant-page-slide-style';
    style.innerHTML = `
      .plant-entry-page {
        display: none;
        position: fixed;
        top: 50%;
        right: -100vw;
        transform: translateY(-50%);
        transition: right 0.5s cubic-bezier(.4,2,.6,1), opacity 0.5s;
        z-index: 1000;
        opacity: 0;
        max-width: 90vw;
        min-width: 250px;
      }
      .plant-entry-page.visible {
        display: block;
        right: 0;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
})();

// Call this function to enable plant page sliding behavior
function enablePlantPageSlide(plantListSelector = '#plant-list', plantPageSelector = '.plant-entry-page') {
    const plantList = document.querySelector(plantListSelector);
    if (!plantList) return;
    // Hide all plant pages on load
    document.querySelectorAll(plantPageSelector).forEach(el => {
        el.classList.remove('visible');
    });
    // Show the correct plant page on carousel click
    plantList.addEventListener('click', function(e) {
        const li = e.target.closest('li');
        if (!li) return;
        const items = Array.from(plantList.querySelectorAll('li'));
        const idx = items.indexOf(li);
        if (idx !== -1) {
            // Hide all
            document.querySelectorAll(plantPageSelector).forEach(el => {
                el.classList.remove('visible');
            });
            // Show selected
            const pages = document.querySelectorAll(plantPageSelector);
            if (pages[idx]) {
                pages[idx].classList.add('visible');
            }
        }
    });
}

// Optionally, auto-enable on DOMContentLoaded
// document.addEventListener('DOMContentLoaded', () => enablePlantPageSlide());
