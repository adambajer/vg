let buffer = [];
let isProcessing = false;
let animationFrameRunning = false;
let carouselOffset = 0;
const gifScrollSpeed = 0.005; // Ještě pomalejší rychlost pro plynulý filmový pás
let lastAddedGif = null; // Poslední přidaný GIF
let targetOffset = 0; // Kde by se měl karusel teoreticky zastavit, aby byl poslední GIF vidět
let currentGifElement = null; // Odkaz na aktuálně zobrazený GIF (který je ve středu)

// Odkazy na DOM elementy
const annyangStatusDiv = document.getElementById('annyangStatus');
const wordDisplayDiv = document.getElementById('wordDisplay');
const carouselTrack = document.getElementById('carouselTrack');
const carouselContainer = document.getElementById('carousel');


document.addEventListener('DOMContentLoaded', () => {
    updateBufferDisplay();
    initAnnyang(); // Nová inicializační funkce
});

const initAnnyang = () => {
    if (annyang) {
        annyang.addCallback('start', () => {
            annyangStatusDiv.innerText = 'Talk to search for GIFs!';
            annyangStatusDiv.classList.add('listening');
        });
        annyang.addCallback('end', () => {
            annyangStatusDiv.innerText = 'Talk to search for GIFs!';
            annyangStatusDiv.classList.remove('listening');
        });
        annyang.addCallback('result', (phrases) => {
            const rawSearchQuery = phrases[0];
            const searchQuery = rawSearchQuery.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]$/, "").trim();
            console.log('Annyang result (cleaned):', searchQuery); // Necháváme pro kontrolu
            if (searchQuery) {
                addQueryToBuffer(searchQuery);
            } else {
                console.log('Cleaned search query is empty, not adding to buffer.');
            }
        });

        // Automaticky spustit Annyang na začátku
        annyang.start({ autoRestart: true, continuous: true });
        annyangStatusDiv.innerText = 'Talk to search for GIFs!'; // Počáteční stav
        annyangStatusDiv.classList.add('listening');

    } else {
        annyangStatusDiv.innerText = 'Voice recognition not supported.';
        console.error('Annyang not detected. Voice recognition will not work.');
    }
};

const addQueryToBuffer = (tag) => {
    buffer.push(tag);
    updateBufferDisplay();
    processBuffer();
    if (!animationFrameRunning) {
        animateCarousel();
    }
};

const processBuffer = async () => {
    if (isProcessing || buffer.length === 0) {
        return;
    }

    isProcessing = true;
    const tag = buffer.shift();
    displayWordEffect(tag); // Zobrazí slovo s efektem
    updateBufferDisplay();

    try {
        await fetchAndAddGif(tag);
    } catch (error) {
        console.error('Error during fetchAndAddGif:', error);
    } finally {
        isProcessing = false;
        processBuffer(); // Spustí další zpracování
    }
};

const displayWordEffect = (word) => {
    wordDisplayDiv.innerText = word;
    wordDisplayDiv.classList.remove('fading-out');
    wordDisplayDiv.classList.add('active');

    setTimeout(() => {
        wordDisplayDiv.classList.remove('active');
        wordDisplayDiv.classList.add('fading-out');
    }, 1500); // Slovo zůstane viditelné 1.5 sekundy

    setTimeout(() => {
        wordDisplayDiv.innerText = '';
        wordDisplayDiv.classList.remove('fading-out');
    }, 2500); // Celková doba trvání efektu slova
};


const fetchAndAddGif = async (tag) => {
    const apiKey = 'gxIFvvO71KLB9I3q3lyVmW9bc2V796qu';
    const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(tag)}&limit=1`);
    const result = await response.json();
    const gifs = result.data;

    if (gifs.length === 0) {
        console.warn(`No GIFs found for tag: "${tag}"`);
        return;
    }

    const newGifElement = await addGifToTrack(gifs[0].images.original.url);
    if (newGifElement) {
        lastAddedGif = newGifElement; // Uložíme odkaz na nově přidaný GIF

        // Po přidání nového GIFu aktualizujeme targetOffset
        // targetOffset se vypočítá tak, aby karusel zobrazoval POSLEDNÍ GIF na konci pásu
        // (tj. pravý okraj posledního GIFu zarovnaný s pravým okrajem karuselu)
        const lastGifRect = lastAddedGif.getBoundingClientRect();
        const trackRect = carouselTrack.getBoundingClientRect();
        const carouselWidth = carouselContainer.offsetWidth;

        // Vypočítáme cílovou pozici pro "příjezd zprava" (aby byl poslední GIF vidět na konci)
        targetOffset = (carouselWidth - lastGifRect.width) - (lastGifRect.left - trackRect.left);

        // V případě, že je to první GIF, nastavíme počáteční offset pro "příjezd zprava"
        if (carouselTrack.children.length === 1) { // Pokud je v tracku jen jeden GIF
            carouselOffset = carouselWidth; // Začni úplně vpravo
            carouselTrack.style.transform = `translateX(${carouselOffset}px)`;
        }
        
        // Zajištění, že se targetOffset nepřehoupne do kladných hodnot (aby se pás neposunul moc doprava)
        if (targetOffset > 0) {
             targetOffset = 0;
        }

        // Plynule posuneme karusel k novému targetOffset
        if (!animationFrameRunning) {
             animateCarousel();
        }
    }
};

const addGifToTrack = (src) => {
    return new Promise((resolve) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = "GIF";
        img.style.opacity = "0";

        img.onload = () => {
            carouselTrack.appendChild(img);
            // Odstranění GIFů, které už nejsou vidět
            cleanUpOffscreenGifs();
            requestAnimationFrame(() => {
                img.style.opacity = "1";
                resolve(img);
            });
        };

        img.onerror = () => {
            console.warn("Failed to load image:", src);
            resolve(null);
        };
    });
};
// ... (ostatní kód beze změny)
// ... (ostatní kód beze změny až do cleanUpOffscreenGifs)

const cleanUpOffscreenGifs = () => {
    const carouselRect = carouselContainer.getBoundingClientRect(); // Viditelná oblast karuselu
    const children = carouselTrack.children;

    // Pokud je v tracku 0 nebo 1 GIF, není co odstraňovat.
    // Chceme vždy udržet alespoň jeden GIF, pokud existuje.
    if (children.length <= 1) {
        return;
    }

    // Zkontrolujeme pouze první GIF v tracku.
    // To je ten, který je nejpravděpodobněji mimo obrazovku zleva.
    const firstGif = children[0];
    const firstGifRect = firstGif.getBoundingClientRect();

    // Pokud je pravý okraj prvního GIFu vlevo od levého okraje viditelné oblasti karuselu,
    // mínus malá mezera (např. 50px), tak ho odstraníme.
    // To znamená, že GIF je už 50px za levým okrajem obrazovky.
    const removalThreshold = carouselRect.left - 50;

    if (firstGifRect.right < removalThreshold) {
        carouselTrack.removeChild(firstGif);
        // console.log('Removed one GIF from the track.'); // Volitelný log pro debug
    }
    // Jiné GIFy neřešíme, protože chceme odstraňovat jen po jednom,
    // jakmile ten předchozí úplně zmizí.
};

// ... (zbytek kódu beze změny)

// ... (ostatní kód beze změny)

const animateCarousel = () => {
    const step = () => {
        if (!animationFrameRunning) {
            return;
        }

        // Vždy posouvej karusel. Pokud je buffer prázdný a nic se nezpracovává, posouvej jen,
        // pokud je nějaká vzdálenost k targetOffset (pro dokončení animace posledního GIFu).
        // Jinak posouvej, pokud jsou v bufferu další dotazy nebo se něco zpracovává.
        const distanceToTarget = carouselOffset - targetOffset;
        let shouldAnimate = false;

        if (buffer.length > 0 || isProcessing) {
            // Pokud je v bufferu nebo se něco zpracovává, vždy animuj
            shouldAnimate = true;
        } else if (Math.abs(distanceToTarget) > 0.5) {
            // Pokud není co zpracovávat, animuj, dokud se nedosáhne cíle
            shouldAnimate = true;
        }

        if (shouldAnimate) {
            carouselOffset -= distanceToTarget * gifScrollSpeed;
            carouselTrack.style.transform = `translateX(${carouselOffset}px)`;
        } else {
            // Animace by se měla zastavit, pokud už není kam jít
            carouselOffset = targetOffset; // Zajisti přesné zarovnání
            carouselTrack.style.transform = `translateX(${carouselOffset}px)`;
            animationFrameRunning = false;
            return; // Ukonči tuto animační smyčku
        }

        requestAnimationFrame(step);
    };

    if (!animationFrameRunning) {
        animationFrameRunning = true;
        requestAnimationFrame(step);
    }
};

const updateBufferDisplay = () => {
    const bufferContainer = document.getElementById('buffer');
    if (!bufferContainer) {
        console.error('Element with ID "buffer" not found!');
        return;
    }
    bufferContainer.innerHTML = buffer.map((item, index) => {
        const activeClass = index === 0 ? 'active' : '';
        return `<div class="buffer-item ${activeClass}">${item}</div>`;
    }).join('');
};

// showLoading je odstraněna, protože je nahrazena displayWordEffect
// Pokud by na ni kód jinde odkazoval, nech ji prázdnou:
// const showLoading = (show) => {};