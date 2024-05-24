let buffer = [];
let isProcessing = false;

const fetchGifs = async (tag) => {
    const apiKey = 'gxIFvvO71KLB9I3q3lyVmW9bc2V796qu';
    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${tag}&limit=25`);
        const result = await response.json();
        const gifs = result.data;
        buffer.push({ tag, gifs });
        processBuffer();
    } catch (error) {
        console.error('Error fetching GIFs:', error);
    }
};

const processBuffer = async () => {
    if (isProcessing || buffer.length === 0) return;

    isProcessing = true;
    const { tag, gifs } = buffer.shift();

    document.getElementById('queryTitle').innerText = `"${tag}"`;
    updateBufferDisplay(tag);

    const carousel = document.getElementById('carousel');
    carousel.innerHTML = '';
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressContainer.appendChild(progressBar);
    document.body.appendChild(progressContainer);

    for (let i = 0; i < gifs.length; i++) {
        const gifUrl = gifs[i].images.fixed_width.url;
        const img = document.createElement('img');
        img.src = gifUrl;
        img.alt = gif.title;
        carousel.appendChild(img);

        await slideImage(img, progressBar, i, gifs.length);
    }

    document.body.removeChild(progressContainer);
    isProcessing = false;
    processBuffer();
};

const slideImage = (img, progressBar, index, total) => {
    return new Promise((resolve) => {
        img.classList.add('active');
        updateProgressBar(progressBar, (index + 1) / total);

        setTimeout(() => {
            img.classList.remove('active');
            resolve();
        }, 3000);
    });
};

const updateProgressBar = (progressBar, percentage) => {
    progressBar.style.width = `${percentage * 100}%`;
};

const updateBufferDisplay = (activeTag) => {
    const bufferContainer = document.getElementById('buffer');
    bufferContainer.innerHTML = buffer.map(item => {
        const activeClass = item.tag === activeTag ? 'active' : '';
        return `<div class="buffer-item ${activeClass}">${item.tag}</div>`;
    }).join('');
};

document.getElementById('searchButton').addEventListener('click', () => {
    const searchQuery = document.getElementById('searchInput').value.trim();
    if (searchQuery) {
        fetchGifs(searchQuery);
    }
});

document.getElementById('searchInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const searchQuery = document.getElementById('searchInput').value.trim();
        if (searchQuery) {
            fetchGifs(searchQuery);
        }
    }
});

if (annyang) {
    const commands = {
        '*tag': (tag) => {
            fetchGifs(tag);
        }
    };
    annyang.addCommands(commands);
    annyang.start({ autoRestart: true, continuous: false });
} else {
    document.getElementById('carousel').innerHTML = "<p>Your browser does not support voice recognition.</p>";
}
