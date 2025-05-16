// Randomize garden tag backgrounds on page load
// Assumes garden tags are <li> elements in #plant-list
// and tag images are Images/tag1.png ... Images/tag4.png

document.addEventListener('DOMContentLoaded', function () {
  const tagImages = [
    'Images/tag1.png',
    'Images/tag2.png',
    'Images/tag3.png',
    'Images/tag4.png'
  ];
  // Select all plant list items (garden tags)
  const plantList = document.getElementById('plant-list');
  if (!plantList) return;
  // If categories are used, get all li inside ul.category-list
  let tagItems = plantList.querySelectorAll('li');
  tagItems.forEach(li => {
    // Pick a random tag image
    const img = tagImages[Math.floor(Math.random() * tagImages.length)];
    li.style.backgroundImage = `url('${img}')`;
    li.style.backgroundRepeat = 'no-repeat';
    li.style.backgroundSize = '100% 100%'; // adjust as needed
    li.style.backgroundPosition = 'left center';
    li.style.paddingLeft = '4em'; // adjust for tag image width
  });
});
