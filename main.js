let buffer = [];

const fetchGifs = async (tag) => {
    const apiKey = 'gxIFvvO71KLB9I3q3lyVmW9bc2V796qu';
    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${tag}&limit=25`);
        const result = await response.json();
        const gifs = result.data;
        document.getElementById('queryTitle').innerText = `"${tag}"`;
        displayGifs(gifs);
    } catch (error) {
        console.error('Error fetching GIFs:', error);
    }
};

const displayGifs = (gifs) => {
    const carousel = document.getElementById('carousel');
    carousel.innerHTML = '';
    if (gifs.length > 0) {
        gifs.forEach((gif, index) => {
            const gifUrl = gif.images.fixed_width.url;
            const img = document.createElement('img');
            img.src = gifUrl;
            img.alt = gif.title;
            if (index === 0) img.classList.add('active');
            carousel.appendChild(img);
        });
        startCarousel();
    } else {
        carousel.innerHTML = `<p>No results found.</p>`;
    }
};

const startCarousel = () => {
    const images = document.querySelectorAll('.carousel img');
    let currentIndex = 0;
    setInterval(() => {
        images[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % images.length;
        images[currentIndex].classList.add('active');
    }, 3000);
};

const updateBuffer = (word) => {
    buffer.push(word);
    const bufferContainer = document.getElementById('buffer');
    bufferContainer.innerHTML = buffer.map(item => `<div class="buffer-item">${item}</div>`).join('');
};

document.getElementById('searchButton').addEventListener('click', () => {
    const searchQuery = document.getElementById('searchInput').value.trim();
    if (searchQuery) {
        fetchGifs(searchQuery);
        updateBuffer(searchQuery);
    }
});

document.getElementById('searchInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const searchQuery = document.getElementById('searchInput').value.trim();
        if (searchQuery) {
            fetchGifs(searchQuery);
            updateBuffer(searchQuery);
        }
    }
});

if (annyang) {
    const commands = {
        '*tag': (tag) => {
            fetchGifs(tag);
            updateBuffer(tag);
        }
    };
    annyang.addCommands(commands);
    annyang.start({ autoRestart: true, continuous: false });
} else {
    document.getElementById('carousel').innerHTML = "<p>Your browser does not support voice recognition.</p>";
}
