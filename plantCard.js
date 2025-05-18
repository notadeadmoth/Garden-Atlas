function showPlantCard(plant) {
  // Deprecated: use showPlantCardPopup instead
  showPlantCardPopup(plant);
}

(function injectPlantCardPopupCSS() {
    if (document.getElementById('plant-card-popup-style')) return;
    const style = document.createElement('style');
    style.id = 'plant-card-popup-style';
    style.innerHTML = `
      .plant-card {
        display: block;
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%) translateX(100vw);
        transition: transform 0.5s cubic-bezier(.4,2,.6,1), opacity 0.5s;
        z-index: 2000;
        opacity: 0;
        max-width: 50px;
        border: none;
        min-width: 250px;
        background: url('Images/journal_page.png') center/cover no-repeat,rgba(249, 247, 241, 0);
        border-radius: 1em;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0);
        padding: 10em 10em 10em 10em;
        bg-size: 100% 100%;
      }
      .plant-card.visible {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }
      .plant-card .plant-photo {
        width: 100%;
        max-width: 320px;
        border-radius: 0.5em;
        margin: 0.5em;
      }
      .plant-card .pin {
        position: absolute;
        /* Adjust this value to move the clip image higher or lower on the popup */
        top: -70px !important; /* was -60px; decrease to move higher, increase to move lower */
        right: 30px;
        width: 90px;
        justify-self: center;
        pointer-events: none;
      }
      @media (max-width: 600px) {
        .plant-card {
          min-width: 0;
          max-width: 99vw;
          padding: 0.7em 0.2em 0.7em 0.2em;
        }
        .plant-card .pin {
          width: 30px;
          right: 10px;
          top: -40px;
        }
      }
    `;
    document.head.appendChild(style);
})();

function showPlantCardPopup(plant) {
    let popup = document.getElementById('selected-plant-info');
    if (!popup) {
        popup = document.createElement('div');
        popup.className = 'plant-card plant-card-popup';
        popup.id = 'selected-plant-info';
        document.body.appendChild(popup);
    }
    // Always update content immediately, then fade in
    if (plant) {
        popup.innerHTML = `
            <img class="pin" src="Images/Copper_Antique_Brass_Wire_Bulldog_Clip-Clipped_2-G4Q10G10O6P10.png">
            <img id="selected-plant-image" class="plant-photo" src="${plant.image || 'https://www.provenwinners.com/sites/provenwinners.com/files/imagecache/low-resolution/ifa_upload/lavandula_sweet_romance_apj18_10.jpg'}" alt="Plant Image">
            <h2><em>${plant.name || 'Selected Plant'}</em></h2>
            <p class="note">${plant.note || ''}</p>
            <p class="meta" id="selected-plant-details">${plant.details || ''}</p>
            <span class="annotation" style="top: 85%; left: 10%;"></span>
        `;
    }
    // Remove any swap-out/in classes
    popup.classList.remove('swap-out', 'swap-in');
    // Trigger fade in
    popup.classList.remove('visible');
    void popup.offsetWidth;
    popup.classList.add('visible');
}

// Add CSS for swap-out and swap-in animations
(function injectPlantCardSwapCSS() {
    if (document.getElementById('plant-card-swap-style')) return;
    const style = document.createElement('style');
    style.id = 'plant-card-swap-style';
    style.innerHTML = `
      .plant-card.swap-out {
        opacity: 0;
        transform: translateY(-50%) translateX(0) scale(0.98);
        transition: opacity 0.35s, transform 0.35s;
      }
      .plant-card.swap-in {
        opacity: 1;
        transform: translateY(-50%) translateX(0) scale(1.02);
        transition: opacity 0.35s, transform 0.35s;
      }
    `;
    document.head.appendChild(style);
})();

// Hide plant card popup when clicking outside of it
function handleGlobalClickForPlantCardPopup(event) {
    const popup = document.getElementById('selected-plant-info');
    if (!popup) return;
    if (!popup.contains(event.target) && popup.classList.contains('visible')) {
        popup.classList.remove('visible');
    }
}
document.addEventListener('mousedown', handleGlobalClickForPlantCardPopup);

function hidePlantCardPopup() {
    const popup = document.getElementById('selected-plant-info');
    if (popup) popup.classList.remove('visible');
}