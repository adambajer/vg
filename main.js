let buffer = [];
let isProcessing = false;

const addQueryToBuffer = (tag) => {
    buffer.push(tag);
    updateBufferDisplay();
    processBuffer();
};

const processBuffer = async () => {
    if (isProcessing || buffer.length === 0) return;

    isProcessing = true;
    const tag = buffer.shift();

    document.getElementById('queryTitle').innerText = `"${tag}"`;
    updateBufferDisplay(tag);

    try {
        await fetchAndDisplayGifs(tag);
    } catch (error) {
        console.error('Error fetching GIFs:', error);
    }

    isProcessing = false;
    processBuffer();
};

const fetchAndDisplayGifs = async (tag) => {
    const apiKey = 'gxIFvvO71KLB9I3q3lyVmW9bc2V796qu';
    const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${tag}&limit=3`);
    const result = await response.json();
    const gifs = result.data;

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
        img.alt = gifs[i].title;
        carousel.appendChild(img);

        await slideImage(img, progressBar, i, gifs.length);
    }

    document.body.removeChild(progressContainer);
};

const slideImage = (img, progressBar, index, total) => {
    return new Promise((resolve) => {
        const carousel = document.getElementById('carousel');
        const prevImg = carousel.querySelector('.active');
        if (prevImg) {
            prevImg.classList.remove('active');
            prevImg.classList.add('exit');
        }

        img.classList.add('active');

        updateProgressBar(progressBar, (index + 1) / total);

        setTimeout(() => {
            if (prevImg) {
                prevImg.classList.remove('exit');
                prevImg.remove();
            }
            resolve();
        }, 3000);
    });
};

const updateProgressBar = (progressBar, percentage) => {
    progressBar.style.width = `${percentage * 100}%`;
};

const updateBufferDisplay = (activeTag = '') => {
    const bufferContainer = document.getElementById('buffer');
    bufferContainer.innerHTML = buffer.map((item, index) => {
        const activeClass = index === 0 ? 'active' : '';
        return `<div class="buffer-item ${activeClass}">${item}</div>`;
    }).join('');
};

document.getElementById('searchButton').addEventListener('click', () => {
    const searchQuery = document.getElementById('searchInput').value.trim();
    if (searchQuery) {
        addQueryToBuffer(searchQuery);
    }
});

document.getElementById('searchInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const searchQuery = document.getElementById('searchInput').value.trim();
        if (searchQuery) {
            addQueryToBuffer(searchQuery);
        }
    }
});

if (annyang) {
    const commands = {
        '*tag': (tag) => {
            addQueryToBuffer(tag);
        }
    };
    annyang.addCommands(commands);
    annyang.start({ autoRestart: true, continuous: false });
} else {
    document.getElementById('carousel').innerHTML = "<p>Your browser does not support voice recognition.</p>";
}
