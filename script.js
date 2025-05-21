/*
Multi-garden support is now enabled. Each garden has its own background, markers, and map view. 
- Use the garden dropdown above the map to switch between gardens.
- Use the ＋ button to create a new garden, ✎ to rename, and 🗑️ to delete.
- All map markers and background images are now specific to the selected garden.
*/

document.addEventListener('DOMContentLoaded', () => {
    let map;
    let currentOverlay;
    let currentOverlayBounds = null;
    const uploadInput = document.getElementById('upload-input');

    // --- DRAG & DROP HANDLERS (define once, attach/detach as needed) --- //
    function handleMapDrop(event) {
        event.preventDefault();
        const plantData = JSON.parse(event.dataTransfer.getData('text/plain'));
        if (!plantData.commonName || plantData.commonName.trim().length === 0) {
            alert('This plant does not have a valid name. Please check the data.');
            return;
        }
        const latlng = map.mouseEventToLatLng(event);
        let markerOptions = { draggable: true };
        if (plantData.icon) {
            markerOptions.icon = createSVGDivIcon(plantData.icon, plantData.iconColor);
        }
        const marker = L.marker(latlng, markerOptions).addTo(map);
        marker.plantData = plantData;
        marker.bindPopup(createPopupContent(plantData)).openPopup();
        marker.on('contextmenu', function () {
            map.removeLayer(marker);
            saveMarkersToCurrentGarden();
            if (typeof showToast === 'function') showToast('Marker removed!');
        });
        marker.on('dragend', function () {
            saveMarkersToCurrentGarden();
        });
        marker.on('click', function () {
            const selectedPlantImage = document.getElementById('selected-plant-image');
            const selectedPlantDetails = document.getElementById('selected-plant-details');
            selectedPlantImage.src = marker.plantData.image || '';
            selectedPlantImage.style.display = marker.plantData.image ? 'block' : 'none';
            selectedPlantDetails.innerHTML = `
                <p><strong>Scientific Name:</strong> ${marker.plantData.scientificName || 'N/A'}</p>
                <p><strong>Light:</strong> ${marker.plantData.light || 'N/A'}</p>
                <p><strong>Soil:</strong> ${marker.plantData.soil || 'N/A'}</p>
                <p><strong>Notes:</strong> ${marker.plantData.notes || 'N/A'}</p>
                <p><strong>Growth Zone:</strong> ${marker.plantData.growthZone || 'N/A'}</p>
            `;
        });
        saveMarkersToCurrentGarden();
        if (typeof showToast === 'function') showToast('Marker placed!');
    }
    function handleMapDragOver(event) {
        event.preventDefault();
    }

    function createMap() {
        if (map) {
            map.off();
            map.remove();
        }
        map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 4
        }).setView([0, 0], 0);
        map.getContainer().style.background = 'rgba(10, 14, 12, 0.5)';
        map.getContainer().style.borderRadius = '25px';
        map.getContainer().style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        map.zoomControl.setPosition('topright');
        setTimeout(() => { map.invalidateSize(); }, 100);
        // Remove old event listeners before adding new ones
        map.getContainer().removeEventListener('drop', handleMapDrop);
        map.getContainer().removeEventListener('dragover', handleMapDragOver);
        map.getContainer().addEventListener('drop', handleMapDrop);
        map.getContainer().addEventListener('dragover', handleMapDragOver);
        // Remove all overlays and markers to prevent duplicates
        if (typeof clearMapOverlaysAndMarkers === 'function') {
            clearMapOverlaysAndMarkers();
        }
    }

    // Initial map creation
    createMap();

    console.log('Garden Botany Atlas script loaded');

    // --- IndexedDB Utility for Images ---
    const DB_NAME = 'GardenAtlasDB';
    const DB_VERSION = 1;
    const BG_STORE = 'backgrounds';
    const PHOTO_STORE = 'plantPhotos';

    function openImageDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(BG_STORE)) db.createObjectStore(BG_STORE);
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

    // --- MULTI-GARDEN DATA MODEL & UI --- //
    // Each garden has: { id, name, background, markers, mapView }
    function getGardens() {
        return JSON.parse(localStorage.getItem('gardens') || '[]');
    }
    function saveGardens(gardens) {
        localStorage.setItem('gardens', JSON.stringify(gardens));
    }
    function getCurrentGardenId() {
        return localStorage.getItem('currentGardenId');
    }
    function setCurrentGardenId(id) {
        localStorage.setItem('currentGardenId', id);
    }
    function getCurrentGarden() {
        const gardens = getGardens();
        const id = getCurrentGardenId();
        return gardens.find(g => g.id === id) || gardens[0];
    }
    function updateGarden(garden) {
        const gardens = getGardens();
        const idx = gardens.findIndex(g => g.id === garden.id);
        if (idx !== -1) { gardens[idx] = garden; saveGardens(gardens); }
    }
    function addGarden(garden) {
        const gardens = getGardens();
        gardens.push(garden);
        saveGardens(gardens);
    }
    function deleteGarden(id) {
        let gardens = getGardens();
        gardens = gardens.filter(g => g.id !== id);
        saveGardens(gardens);
        if (gardens.length) setCurrentGardenId(gardens[0].id);
        else localStorage.removeItem('currentGardenId');
    }

    // --- GARDEN MANAGER UI --- //
    const gardenSelect = document.getElementById('garden-select');
    const createGardenBtn = document.getElementById('create-garden-btn');
    const renameGardenBtn = document.getElementById('rename-garden-btn');
    const deleteGardenBtn = document.getElementById('delete-garden-btn');

    console.log('gardenSelect:', gardenSelect);
    console.log('createGardenBtn:', createGardenBtn);
    console.log('renameGardenBtn:', renameGardenBtn);
    console.log('deleteGardenBtn:', deleteGardenBtn);

    function renderGardenSelect() {
        const gardens = getGardens();
        gardenSelect.innerHTML = '';
        gardens.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            gardenSelect.appendChild(opt);
        });
        gardenSelect.value = getCurrentGardenId() || (gardens[0] && gardens[0].id);
    }

    function promptGardenName(defaultName = '') {
        let name = prompt('Enter garden name:', defaultName);
        if (name) name = name.trim();
        return name || null;
    }

    createGardenBtn.addEventListener('click', () => {
        const name = promptGardenName('New Garden');
        if (!name) return;
        const id = 'garden_' + Date.now();
        const garden = { id, name, background: null, markers: [], mapView: null };
        addGarden(garden);
        setCurrentGardenId(id);
        renderGardenSelect();
        loadGardenToMap();
        if (typeof showToast === 'function') showToast('Garden created!');
    });

    gardenSelect.addEventListener('change', () => {
        // Fully reset map state before loading new garden
        createMap();
        setCurrentGardenId(gardenSelect.value);
        setTimeout(() => loadGardenToMap(), 0);
        if (typeof showToast === 'function') showToast('Switched to garden: ' + gardenSelect.options[gardenSelect.selectedIndex].text);
    });

    renameGardenBtn.addEventListener('click', () => {
        const gardens = getGardens();
        const id = getCurrentGardenId();
        const garden = gardens.find(g => g.id === id);
        if (!garden) return;
        const name = promptGardenName(garden.name);
        if (!name) return;
        garden.name = name;
        updateGarden(garden);
        renderGardenSelect();
        if (typeof showToast === 'function') showToast('Garden renamed!');
    });

    deleteGardenBtn.addEventListener('click', () => {
        const id = getCurrentGardenId();
        if (!id) return;
        if (!confirm('Delete this garden? This cannot be undone.')) return;
        deleteGarden(id);
        renderGardenSelect();
        loadGardenToMap();
        if (typeof showToast === 'function') showToast('Garden deleted!');
    });

    // --- INITIALIZE GARDENS ON FIRST LOAD --- //
    (function ensureAtLeastOneGarden() {
        let gardens = getGardens();
        if (!gardens.length) {
            const id = 'garden_' + Date.now();
            gardens = [{ id, name: 'My Garden', background: null, markers: [], mapView: null }];
            saveGardens(gardens);
            setCurrentGardenId(id);
        } else if (!getCurrentGardenId()) {
            setCurrentGardenId(gardens[0].id);
        }
        renderGardenSelect();
    })();

    // --- GARDEN MAP/OVERLAY/MARKER LOADING --- //
    function clearMapOverlaysAndMarkers() {
        map.eachLayer(layer => {
            if (layer instanceof L.ImageOverlay || layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
    }

    function isLatLngInBounds(latlng, bounds) {
        return bounds.contains(L.latLng(latlng[0], latlng[1]));
    }

    async function loadGardenToMap() {
        clearMapOverlaysAndMarkers();
        const garden = getCurrentGarden();
        if (!garden) return;
        if (garden.background) {
            let imageUrl = null;
            if (garden.background.startsWith('Images/')) {
                imageUrl = garden.background;
            } else {
                // Assume it's a key for IndexedDB
                const imageBlob = await getImageFromDB(BG_STORE, garden.background);
                if (!imageBlob) {
                    alert('Background image not found in database.');
                    return;
                }
                imageUrl = URL.createObjectURL(imageBlob);
            }
            const image = new window.Image();
            image.onload = () => {
                const imageWidth = image.width;
                const imageHeight = image.height;
                const southWest = map.unproject([0, imageHeight], 0);
                const northEast = map.unproject([imageWidth, 0], 0);
                const bounds = new L.LatLngBounds(southWest, northEast);
                currentOverlay = L.imageOverlay(imageUrl, bounds).addTo(map);
                currentOverlayBounds = bounds;
                map.setMaxBounds(bounds);
                garden.mapDimensions = { width: imageWidth, height: imageHeight };
                garden.mapBounds = { southWest: [southWest.lat, southWest.lng], northEast: [northEast.lat, northEast.lng] };
                // Only calculate and set minZoom/maxZoom on the map, do not persist in garden object
                const minZoom = map.getBoundsZoom(bounds, false);
                map.setMinZoom(minZoom);
                map.setMaxZoom(4); // Use a fixed max zoom
                // Always fit bounds to image (no persistence)
                setTimeout(() => {
                    map.invalidateSize();
                    map.fitBounds(bounds, { animate: false });
                }, 50);
                // Do not updateGarden(garden) here, as we are not changing persistent data
                if (!garden.background.startsWith('Images/')) {
                    setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
                }
            };
            image.onerror = (e) => {
                console.error('Failed to load background image:', garden.background, e);
                let reason = '';
                if (!garden.background.match(/\.(jpe?g|png|webp)$/i) && !garden.background.startsWith('data:') && !garden.background.startsWith('Images/')) {
                    reason = '\nPossible reason: The file extension may not be supported.';
                } else if (garden.background.startsWith('Images/') && !image.src) {
                    reason = '\nPossible reason: The file does not exist at the specified path.';
                }
                alert('Failed to load background image: ' + garden.background + '\nThis may be due to a missing file, unsupported format, or browser security restrictions.' + reason);
            };
            image.src = imageUrl;
        } else {
            map.setView([0, 0], 0);
            map.setMaxBounds(null);
            map.invalidateSize();
        }
        // Load markers
        (garden.markers || []).forEach(markerData => {
            let markerOptions = { draggable: true };
            if (markerData.plantData && markerData.plantData.icon) {
                markerOptions.icon = createSVGDivIcon(markerData.plantData.icon, markerData.plantData.iconColor);
            }
            const marker = L.marker([markerData.lat, markerData.lng], markerOptions).addTo(map);
            marker.plantData = markerData.plantData;
            marker.bindPopup(createPopupContent(marker.plantData));
            marker.on('contextmenu', function () {
                map.removeLayer(marker);
                saveMarkersToCurrentGarden();
                if (typeof showToast === 'function') showToast('Marker removed!');
            });
            marker.on('dragend', function () {
                saveMarkersToCurrentGarden();
            });
            marker.on('click', function () {
                const selectedPlantImage = document.getElementById('selected-plant-image');
                const selectedPlantDetails = document.getElementById('selected-plant-details');
                selectedPlantImage.src = marker.plantData.image || '';
                selectedPlantImage.style.display = marker.plantData.image ? 'block' : 'none';
                selectedPlantDetails.innerHTML = `
                    <p><strong>Scientific Name:</strong> ${marker.plantData.scientificName || 'N/A'}</p>
                    <p><strong>Light:</strong> ${marker.plantData.light || 'N/A'}</p>
                    <p><strong>Soil:</strong> ${marker.plantData.soil || 'N/A'}</p>
                    <p><strong>Notes:</strong> ${marker.plantData.notes || 'N/A'}</p>
                    <p><strong>Growth Zone:</strong> ${marker.plantData.growthZone || 'N/A'}</p>
                `;
            });
            marker.on('add', saveMarkersToCurrentGarden);
        });
    }

    function saveMarkersToCurrentGarden() {
        const garden = getCurrentGarden();
        if (!garden) return;
        const markersData = [];
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                markersData.push({
                    lat: layer.getLatLng().lat,
                    lng: layer.getLatLng().lng,
                    plantData: layer.plantData
                });
            }
        });
        garden.markers = markersData;
        updateGarden(garden);
    }

    // --- OVERRIDE BACKGROUND UPLOAD TO BE GARDEN-SPECIFIC --- //
    uploadInput.addEventListener('change', async (event) => {
        if (gardenSelect && gardenSelect.value) {
            setCurrentGardenId(gardenSelect.value);
        }
        const file = event.target.files[0];
        if (file) {
            // Check file type and size
            if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
                alert('Only JPEG, PNG, or WebP images are supported.');
                uploadInput.value = '';
                return;
            }
            if (file.size > 8 * 1024 * 1024) { // 8MB limit
                alert('Image is too large (max 8MB).');
                uploadInput.value = '';
                return;
            }
            const garden = getCurrentGarden();
            if (!garden) {
                alert('No garden selected.');
                return;
            }
            const bgKey = `garden-bg-${garden.id}`;
            await saveImageToDB(BG_STORE, bgKey, file);
            garden.background = bgKey; // Save only the key
            updateGarden(garden);
            renderGardenSelect();
            createMap();
            setTimeout(() => loadGardenToMap(), 0);
            uploadInput.value = '';
            if (typeof showToast === 'function') showToast('Garden image updated!');
        }
    });

    // --- OVERRIDE MAP VIEW SAVE/RESTORE TO BE GARDEN-SPECIFIC --- //
    // Removed all map view/zoom persistence logic. The map will always fit bounds to the garden image and never save or restore view/zoom.
    // Removed saveMapViewToGarden, attachMoveendHandler, detachMoveendHandler, and moveend event handler.

    // --- OVERRIDE MARKER DROP TO BE GARDEN-SPECIFIC --- //
    map.getContainer().addEventListener('drop', handleMapDrop);
    map.getContainer().addEventListener('dragover', handleMapDragOver);

    // --- INITIAL LOAD --- //
    loadGardenToMap();

    const plantList = document.getElementById('plant-list');
    // --- Add this scroll blocking code below ---
let isCarouselExpanded = false;

function stopMapScrollEvents(e) {
    e.stopPropagation();
    if (e.type === 'wheel' || e.type === 'touchmove') {
        e.preventDefault();
    }
}

function enableCarouselScrollBlock() {
    plantList.addEventListener('wheel', stopMapScrollEvents, { passive: false });
    plantList.addEventListener('touchmove', stopMapScrollEvents, { passive: false });
}

function disableCarouselScrollBlock() {
    plantList.removeEventListener('wheel', stopMapScrollEvents, { passive: false });
    plantList.removeEventListener('touchmove', stopMapScrollEvents, { passive: false });
}

const observer = new MutationObserver(() => {
    isCarouselExpanded = plantList.classList.contains('carousel-expanded');
    if (isCarouselExpanded) {
        enableCarouselScrollBlock();
    } else {
        disableCarouselScrollBlock();
    }
});
observer.observe(plantList, { attributes: true, attributeFilter: ['class'] });
// --- End scroll blocking code ---

    // Removed example plant data
    const plants = [];

    // Ensure all plants have a valid commonName when loaded or created
    plants.forEach(plant => {
        if (!plant.commonName || plant.commonName.trim() === '') {
            plant.commonName = 'Unnamed Plant';
        }
    });

    const categories = {};

    plants.forEach(plant => {
        if (!categories[plant.category]) {
            categories[plant.category] = [];
        }
        categories[plant.category].push(plant);
    });

    // Load plants from localStorage
    const savedPlants = JSON.parse(localStorage.getItem('herbariumPlants')) || [];
    savedPlants.forEach(plant => {
        if (!plant.commonName || plant.commonName.trim() === '') {
            plant.commonName = 'Unnamed Plant';
        }
    });
    savedPlants.forEach(plant => {
        if (!categories[plant.category]) {
            categories[plant.category] = [];
        }
        categories[plant.category].push(plant);
    });

    // Ensure the `commonName` is correctly displayed in the plant list
    function renderPlantList(categories, plantList) {
        plantList.innerHTML = '';

        Object.keys(categories).forEach(category => {
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = category;
            plantList.appendChild(categoryHeader);

            const categoryList = document.createElement('ul');
            categoryList.classList.add('category-list');

            // Ensure empty categories are droppable
            categoryList.addEventListener('dragover', (event) => {
                event.preventDefault();
            });

            categoryList.addEventListener('drop', (event) => {
                event.preventDefault();
                const plantData = JSON.parse(event.dataTransfer.getData('text/plain'));
                const sourceCategory = event.dataTransfer.getData('source-category');

                if (sourceCategory !== category) {
                    categories[sourceCategory] = categories[sourceCategory].filter(p => p.commonName !== plantData.commonName);
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(plantData);
                } else {
                    const index = categories[category].findIndex(p => p.commonName === plantData.commonName);
                    categories[category].splice(index, 1);
                    categories[category].push(plantData);
                }

                renderPlantList(categories, plantList);
            });

            if (categories[category].length === 0) {
                const placeholder = document.createElement('li');
                placeholder.textContent = 'Drop plants here';
                placeholder.classList.add('placeholder');
                categoryList.appendChild(placeholder);
            }

            categories[category].forEach(plant => {
                const listItem = document.createElement('li');
                // Add SVG icon as bullet point if icon exists
                let iconSVG = '';
                if (plant.icon) {
                    iconSVG = `<svg width="36" height="36" style="vertical-align:middle;"><use href='#${plant.icon}' fill='${plant.iconColor || '#228B22'}'></use></svg> `;
                }
                listItem.innerHTML = `${iconSVG}${plant.commonName || 'Unnamed Plant'}`;
                listItem.draggable = true;

                //if (plant.isInvasive) {
                //    listItem.style.backgroundColor = 'rgb(230, 189, 189)';
                //} else if (plant.isNative) {
                //    listItem.style.backgroundColor = 'rgb(188, 204, 188)';
                //}

                listItem.addEventListener('dragstart', (event) => {
                    event.dataTransfer.setData('text/plain', JSON.stringify(plant));
                    event.dataTransfer.setData('source-category', category);
                });

                listItem.addEventListener('click', () => {
                    const selectedPlantImage = document.getElementById('selected-plant-image');
                    const selectedPlantDetails = document.getElementById('selected-plant-details');
                    showPlantCard();

                    selectedPlantImage.src = plant.image || '';
                    selectedPlantImage.style.display = plant.image ? 'block' : 'none';

                    selectedPlantDetails.innerHTML = `
                        <p><strong>Scientific Name:</strong> ${plant.scientificName || 'N/A'}</p>
                        <p><strong>Light:</strong> ${plant.light || 'N/A'}</p>
                        <p><strong>Soil:</strong> ${plant.soil || 'N/A'}</p>
                        <p><strong>Notes:</strong> ${plant.notes || 'N/A'}</p>
                        <p><strong>Growth Zone:</strong> ${plant.growthZone || 'N/A'}</p>
                    `;
                });

                categoryList.appendChild(listItem);
            });

            plantList.appendChild(categoryList);
        });
    }

    renderPlantList(categories, plantList);

    map.getContainer().addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    // Update marker popup content to use a cleaner HTML format
    function createPopupContent(plantData) {
        return `
            <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
                <strong style="font-size: 16px;">${plantData.commonName || 'Unnamed Plant'}</strong><br>
                <em>${plantData.scientificName || 'N/A'}</em><br>
                <img src="${plantData.image || ''}" alt="${plantData.commonName}" style="width: 100%; height: auto; margin: 5px 0; display: ${plantData.image ? 'block' : 'none'};">
                <!--<p><strong>Light:</strong> ${plantData.light || 'N/A'}</p>
                <p><strong>Soil:</strong> ${plantData.soil || 'N/A'}</p> -->
                <p><strong>Notes:</strong> ${plantData.notes || 'N/A'}</p>
                <!--<p><strong>Growth Zone:</strong> ${plantData.growthZone || 'N/A'}</p>
            </div>-->
        `;
    }

    // Ensure proper serialization and deserialization of marker data
    function saveMarkersToLocalStorage() {
        const markersData = [];
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                const markerData = {
                    lat: layer.getLatLng().lat,
                    lng: layer.getLatLng().lng,
                    plantData: layer.plantData // Save plant data directly
                };
                markersData.push(markerData);
            }
        });
        localStorage.setItem('mapMarkers', JSON.stringify(markersData));
    }

    function loadMarkersFromLocalStorage() {
        const markersData = JSON.parse(localStorage.getItem('mapMarkers')) || [];
        markersData.forEach(markerData => {
            // Use SVG icon if available
            let markerOptions = { draggable: true };
            if (markerData.plantData && markerData.plantData.icon) {
                markerOptions.icon = createSVGDivIcon(markerData.plantData.icon, markerData.plantData.iconColor);
            }
            const marker = L.marker([markerData.lat, markerData.lng], markerOptions).addTo(map);
            marker.plantData = markerData.plantData; // Restore plant data

            marker.bindPopup(createPopupContent(marker.plantData));

            // Add a context menu for removing the marker
            marker.on('contextmenu', function () {
                map.removeLayer(marker);
                saveMarkersToLocalStorage();
            });

            // Update popup with new position when marker is dragged
            marker.on('dragend', function () {
                saveMarkersToLocalStorage();
            });

            // Update selected plant information when marker is clicked
            marker.on('click', function () {
                const selectedPlantImage = document.getElementById('selected-plant-image');
                const selectedPlantDetails = document.getElementById('selected-plant-details');

                selectedPlantImage.src = marker.plantData.image || '';
                selectedPlantImage.style.display = marker.plantData.image ? 'block' : 'none';

                selectedPlantDetails.innerHTML = `
                    <p><strong>Scientific Name:</strong> ${marker.plantData.scientificName || 'N/A'}</p>
                    <p><strong>Light:</strong> ${marker.plantData.light || 'N/A'}</p>
                    <p><strong>Soil:</strong> ${marker.plantData.soil || 'N/A'}</p>
                    <p><strong>Notes:</strong> ${marker.plantData.notes || 'N/A'}</p>
                    <p><strong>Growth Zone:</strong> ${marker.plantData.growthZone || 'N/A'}</p>
                `;
            });

            // Save markers whenever they are added or updated
            marker.on('add', saveMarkersToLocalStorage);
        });
    }

    // Call loadMarkersFromLocalStorage on page load
    loadMarkersFromLocalStorage();

    const addPlantButton = document.getElementById('add-plant-button');
    const newPlantForm = document.getElementById('new-plant-form');

    // Add a new plant
    newPlantForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(newPlantForm);
        const newPlant = {
            commonName: formData.get('commonName').trim(),
            scientificName: formData.get('scientificName').trim(),
            image: formData.get('image').trim(),
            light: formData.get('light').trim(),
            soil: formData.get('soil').trim(),
            notes: formData.get('notes').trim(),
            growthZone: formData.get('growthZone').trim(),
            category: formData.get('category').trim()
        };

        if (newPlant.commonName && newPlant.category) {
            if (!categories[newPlant.category]) {
                categories[newPlant.category] = [];
            }
            categories[newPlant.category].push(newPlant);
            renderPlantList(categories, plantList);
            newPlantForm.reset();
        } else {
            alert('Please provide a valid name and category for the plant.');
        }
    });

    const categorySelect = document.getElementById('category');
    const customCategoryInput = document.getElementById('custom-category');

    // Predefined example categories
    const exampleCategories = ['Flowers', 'Herbs', 'Trees', 'Succulents', 'Shrubs'];

    // Merge example categories with existing ones in localStorage
    const storedCategories = JSON.parse(localStorage.getItem('categories')) || [];
    const uniqueCategories = Array.from(new Set([...exampleCategories, ...storedCategories]));

    // Populate the dropdown with categories
    function populateCategoryDropdown() {
        categorySelect.innerHTML = '';
        uniqueCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    populateCategoryDropdown();

    // Add custom category
    document.getElementById('add-category-button').addEventListener('click', () => {
        const customCategory = customCategoryInput.value.trim();
        if (customCategory && !uniqueCategories.includes(customCategory)) {
            uniqueCategories.push(customCategory);
            populateCategoryDropdown();
            customCategoryInput.value = '';

            // Save updated categories to localStorage
            localStorage.setItem('categories', JSON.stringify(uniqueCategories));
        } else {
            alert('Category already exists or is invalid.');
        }
    });

    // Save categories to localStorage on page unload
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('categories', JSON.stringify(uniqueCategories));
    });

    // Utility: create a Leaflet divIcon with an inline SVG referencing the sprite
    function createSVGDivIcon(iconId, iconColor) {
        if (!iconId) return null;
        // Use just #icon_xxx for <use href>, not 'herbarium.html#icon_xxx'
        // Make icon bigger and add shadow
        return L.divIcon({
            className: 'plant-svg-icon',
            html: `<div class="plant-icon-shadow" style="position:relative;display:inline-block;width:96px;height:96px;">
                <svg width="84" height="84" style="color:${iconColor || '#228B22'};display:block;position:relative;z-index:2;filter: drop-shadow(0 2px 4px rgba(0,0,0,0.18));">
                    <defs>
                        <filter id="blur-outline" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
                            <feComponentTransfer result="darkBlur">
                                <feFuncA type="linear" slope="2"/>
                            </feComponentTransfer>
                        </filter>
                    </defs>
                    <use href='#${iconId}' fill='none' stroke='black' stroke-width='8' filter='url(#blur-outline)'></use>
                    <use href='#${iconId}' fill='currentColor' stroke='black' stroke-width='2'></use>
                </svg>
                <div style="position:absolute;left:32px;bottom:28px;width:40px;height:20px;border-radius:50%;background:rgba(0,0,0,0.22);filter:blur(8px);z-index:1;"></div>
            </div>`,
            iconSize: [84, 84],
            iconAnchor: [42, 42],
            popupAnchor: [0, -42]
        });
    }
});
