document.addEventListener('DOMContentLoaded', () => {
    const addPlantForm = document.getElementById('add-plant-form');
    const searchBar = document.getElementById('search-bar');
    const plantList = document.getElementById('plant-list');
    const isWeedCheckbox = document.getElementById('is-weed');
    const categoryInput = document.getElementById('category');
    const isNativeCheckbox = document.getElementById('is-native');

    let plants = []; // Store plant data

    // Update the form submission logic to handle both URL and uploaded images
    const imageInput = document.getElementById('plant-image');
    const fileInput = document.getElementById('plant-image-file');

    // --- IndexedDB Utility for Images (reuse from script.js if available) ---
    const DB_NAME = 'GardenAtlasDB';
    const DB_VERSION = 1;
    const PHOTO_STORE = 'plantPhotos';

    function openImageDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function saveImageToDB(storeName, key, blob) {
        return openImageDB().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).put(blob, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        });
    }

    function getImageFromDB(storeName, key) {
        return openImageDB().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readonly');
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        });
    }

    addPlantForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        let image = imageInput.value.trim();
        if (!image && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            // Save to IndexedDB and use a key
            const photoKey = 'plant-photo-' + Date.now() + '-' + Math.random().toString(36).slice(2);
            await saveImageToDB(PHOTO_STORE, photoKey, file);
            image = photoKey;
        }
        savePlant(image);
        if (typeof showToast === 'function') showToast('Entry added!', true);
    });

    function savePlant(image) {
        const isWeed = isWeedCheckbox.checked;
        const isNative = isNativeCheckbox.checked;
        // Get selected icon
        const iconRadio = document.querySelector('input[name="plant-icon"]:checked');
        const icon = iconRadio ? iconRadio.value : '';
        const iconColor = document.getElementById('plant-color').value.trim();
        const newPlant = {
            commonName: document.getElementById('plant-name').value.trim(),
            scientificName: document.getElementById('scientific-name').value.trim(),
            image: image,
            light: document.getElementById('light-requirements').value.trim(),
            soil: document.getElementById('soil-requirements').value.trim(),
            growthZone: document.getElementById('growth-zone').value.trim(),
            category: isWeed ? 'Weeds' : document.getElementById('category').value.trim(),
            iconColor: document.getElementById('plant-color').value.trim(),
            notes: document.getElementById('plant-notes').value.trim(),
            isWeed: isWeed,
            isNative: isNative,
            icon: icon,
            iconColor: iconColor
        };

        plants.push(newPlant);
        localStorage.setItem('herbariumPlants', JSON.stringify(plants));
        renderPlantList();
        addPlantForm.reset();
        document.getElementById('plant-color').value = '#145214';
        if (typeof showToast === 'function') showToast('Entry saved!', true);
    }

    // Load plants from localStorage on page load
    const savedPlants = JSON.parse(localStorage.getItem('herbariumPlants')) || [];

    // Ensure compatibility with older saved data by converting `name` to `commonName`
    savedPlants.forEach(plant => {
        if (plant.name && !plant.commonName) {
            plant.commonName = plant.name;
            delete plant.name; // Remove the old `name` property
        }
    });

    // Save updated plants back to localStorage
    localStorage.setItem('herbariumPlants', JSON.stringify(savedPlants));

    plants = savedPlants;
    renderPlantList();

    // Search plants
    searchBar.addEventListener('input', () => {
        const filter = searchBar.value.trim();
        renderPlantList(filter);
        renderTOC(filter);
    });

    // Render plant list as individual flipbook pages
    function renderPlantList(filter = '') {
        const plantPages = document.getElementById('plant-pages');
        const tocPage = document.getElementById('herbarium-toc');
        if (!plantPages) return;
        plantPages.innerHTML = '';

        // Build category map and sorted list as in TOC
        const categoryMap = {};
        plants.forEach(plant => {
            const cat = plant.category || 'Uncategorized';
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(plant);
        });
        const sortedCategories = Object.keys(categoryMap).sort();
        const flatPlantList = [];
        sortedCategories.forEach(category => {
            categoryMap[category].forEach(plant => {
                flatPlantList.push(plant);
            });
        });

        // Filter after ordering
        const filteredPlants = flatPlantList.filter(plant => plant.commonName.toLowerCase().includes(filter.toLowerCase()));
        filteredPlants.forEach(async (plant, idx) => {
            let iconSVG = '';
            if (plant.icon) {
                iconSVG = `<svg width="32" height="32" style="vertical-align:middle;"><use href='#${plant.icon}' fill='${plant.iconColor || '#8b4513'}'></use></svg> `;
            }
            let imageHTML = '';
            if (plant.image && !plant.image.startsWith('http') && !plant.image.startsWith('data:')) {
                const blob = await getImageFromDB(PHOTO_STORE, plant.image);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    imageHTML = `<img src="${url}" alt="${plant.commonName}" style="width: 100px; height: auto;"><br>`;
                }
            } else if (plant.image) {
                imageHTML = `<img src="${plant.image}" alt="${plant.commonName}" style="width: 100px; height: auto;"><br>`;
            }
            // Create a new page for each plant
            const page = document.createElement('div');
            page.className = 'page plant-entry-page';
            page.innerHTML = `
                <div class="plant-info">
                    ${iconSVG}<strong>${plant.commonName}</strong>${plant.scientificName ? ` (<em>${plant.scientificName}</em>)` : ''}<br>
                    ${imageHTML}
                    <div>Light: ${plant.light}</div>
                    <div>Soil: ${plant.soil}</div>
                    <div>Growth Zone: ${plant.growthZone}</div>
                    <div>Category: ${plant.category}</div>
                    <div>Notes: ${plant.notes}</div>
                    <button class="edit-plant">Edit</button>
                    <button class="remove-plant">Remove</button>
                </div>
            `;
            // Color background for weed/native
            if (plant.isWeed) {
                page.style.backgroundColor = 'rgb(230, 189, 189)';
            } else if (plant.isNative) {
                page.style.backgroundColor = 'rgb(188, 204, 188)';
            }
            // Add event listeners for edit/remove
            page.querySelector('.remove-plant').addEventListener('click', () => {
                plants = plants.filter(p => p !== plant);
                localStorage.setItem('herbariumPlants', JSON.stringify(plants));
                renderPlantList(filter);
                renderTOC(filter);
                if (typeof showToast === 'function') showToast('Entry removed!', true);
            });
            page.querySelector('.edit-plant').addEventListener('click', () => {
                document.getElementById('plant-name').value = plant.commonName;
                document.getElementById('scientific-name').value = plant.scientificName;
                document.getElementById('plant-image').value = plant.image;
                document.getElementById('light-requirements').value = plant.light;
                document.getElementById('soil-requirements').value = plant.soil;
                document.getElementById('growth-zone').value = plant.growthZone;
                document.getElementById('category').value = plant.category;
                document.getElementById('plant-notes').value = plant.notes;
                isWeedCheckbox.checked = plant.isWeed;
                isNativeCheckbox.checked = plant.isNative;
                if (plant.icon) {
                    const iconRadio = document.querySelector(`input[name='plant-icon'][value='${plant.icon}']`);
                    if (iconRadio) iconRadio.checked = true;
                }
                const colorInput = document.getElementById('plant-color');
                if (colorInput && plant.iconColor) {
                    colorInput.value = plant.iconColor;
                }
                plants = plants.filter(p => p !== plant);
                localStorage.setItem('herbariumPlants', JSON.stringify(plants));
                renderPlantList(filter);
                renderTOC(filter);
                if (typeof showToast === 'function') showToast('Ready to edit. Make changes and submit!');
            });
            // Append each page directly to the .flipbook, not as children of #plant-pages
            // This ensures each .page is a direct child of .flipbook for turn.js
            plantPages.parentNode.insertBefore(page, plantPages);
        });
        // Optionally, clear #plant-pages so it doesn't take up a page
        plantPages.innerHTML = '';
        renderTOC(filter);

        
        const flipbook = document.getElementById('flipbook');
        
        // If the page count is even, insert a blank page before the back inside cover
        let flipbookEl = typeof flipbook !== 'undefined' ? flipbook : document.getElementById('flipbook');
        if (flipbookEl) {
            const pages = Array.from(flipbookEl.querySelectorAll('.page'));
            const pageCount = pages.length;
            const backInsideCover = document.getElementById('backcover-inner');
            if (pageCount % 2 === 0 && backInsideCover) {
                const blankPage = document.createElement('div');
                blankPage.className = 'page';
                flipbookEl.insertBefore(blankPage, backInsideCover);
            }
        }
    }

    // Render the Table of Contents with plant icons, colors, and categories
    function renderTOC(filter = '') {
        const tocPage = document.getElementById('herbarium-toc');
        if (!tocPage) return;
        const tocListId = 'herbarium-toc-list';
        let tocList = document.getElementById(tocListId);
        // Add TOC Title if not present
        let tocTitle = tocPage.querySelector('.toc-title');
        if (!tocTitle) {
            tocTitle = document.createElement('div');
            tocTitle.className = 'toc-title';
            tocTitle.textContent = 'Table of Contents';
            tocPage.insertBefore(tocTitle, tocPage.firstChild);
        }
        if (!tocList) {
            tocList = document.createElement('ul');
            tocList.id = tocListId;
            tocList.style.listStyle = 'none';
            tocList.style.padding = '0';
            tocList.style.margin = '0';
            tocList.style.maxHeight = '350px'; // Make scrollable if too long
            tocList.style.overflowY = 'auto';
            tocList.style.border = 'none'; // Remove any border
            tocPage.appendChild(tocList);
        }
        tocList.innerHTML = '';

        // --- Responsive TOC styles for small screens ---
        if (window.innerWidth <= 600) {
            tocPage.style.padding = '0.5em 0.2em';
            tocPage.style.fontSize = '60%';
            tocTitle.style.fontSize = '1em';
            tocTitle.style.textAlign = 'center';
            tocList.style.maxHeight = '200px';
        } else {
            tocPage.style.padding = '';
            tocPage.style.fontSize = '';
            tocTitle.style.fontSize = '';
            tocTitle.style.textAlign = '';
            tocList.style.maxHeight = '350px';
        }

        // Collect all unique categories from filtered plants
        const categoryMap = {};
        plants.forEach(plant => {
            if ((plant.commonName || '').toLowerCase().includes((filter || '').toLowerCase())) {
                const cat = plant.category || 'Uncategorized';
                if (!categoryMap[cat]) categoryMap[cat] = [];
                categoryMap[cat].push(plant);
            }
        });
        const sortedCategories = Object.keys(categoryMap).sort();

        // Build a flat list of plants in the same order as their pages
        const flatPlantList = [];
        sortedCategories.forEach(category => {
            categoryMap[category].forEach(plant => {
                flatPlantList.push(plant);
            });
        });

        let pageIndex = 0;
        // Number of pages before the first plant page (cover, inside cover, TOC, etc.)
        // Adjust this value if you add/remove static pages before the plant pages
        const PLANT_PAGE_OFFSET = 3; // cover, inside cover, TOC
        sortedCategories.forEach(category => {
            // Category header
            const catHeader = document.createElement('li');
            catHeader.textContent = category;
            catHeader.style.fontWeight = 'bold';
            catHeader.style.margin = '1em 0 0.2em 0';
            catHeader.style.fontSize = '1.1em';
            catHeader.style.background = 'none'; // Remove button-like appearance
            catHeader.style.border = 'none'; // Remove border
            catHeader.style.boxShadow = 'none'; // Remove any box-shadow
            catHeader.style.cursor = 'default';
            tocList.appendChild(catHeader);

            // List plants in this category
            categoryMap[category].forEach(plant => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.marginBottom = '0.5em';
                li.style.border = 'none'; // Remove border
                li.style.boxShadow = 'none'; // Remove any box-shadow
                let iconSVG = '';
                if (plant.icon) {
                    iconSVG = `<svg width="28" height="28" style="vertical-align:middle;"><use href='#${plant.icon}' fill='${plant.iconColor || '#8b4513'}'></use></svg>`;
                }
                li.innerHTML = `${iconSVG}<span style="margin-left:0.5em;">${plant.commonName}</span>`;
                // Add click handler to go to the corresponding page
                li.style.cursor = 'pointer';
                const thisPage = pageIndex + PLANT_PAGE_OFFSET + 1; // turn.js is 1-based
                li.addEventListener('click', function() {
                    if (window.$ && $('#flipbook').turn) {
                        $('#flipbook').turn('page', thisPage);
                    }
                });
                tocList.appendChild(li);
                pageIndex++;
            });
        });
    }

    isWeedCheckbox.addEventListener('change', () => {
        if (isWeedCheckbox.checked) {
            isNativeCheckbox.checked = false;
            isNativeCheckbox.disabled = true;
        } else {
            isNativeCheckbox.disabled = false;
        }
    });

    isNativeCheckbox.addEventListener('change', () => {
        if (isNativeCheckbox.checked) {
            isWeedCheckbox.checked = false;
            isWeedCheckbox.disabled = true;
        } else {
            isWeedCheckbox.disabled = false;
        }
    });
});
