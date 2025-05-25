let buffer = [];
let isProcessing = false;
let animationFrameRunning = false;
let carouselOffset = 0;
const gifScrollSpeed = 0.003; // Rychlost posunu karuselu

let targetOffset = 0; // Cílová pozice pro animaci karuselu

// Odkazy na DOM elementy
const annyangStatusDiv = document.getElementById('annyangStatus');
const wordDisplayDiv = document.getElementById('wordDisplay');
const carouselTrack = document.getElementById('carouselTrack');
const carouselContainer = document.getElementById('carousel');

// Globální proměnné pro výpočet šířky GIFu v pixelech
let gifWidthPx; // Šířka GIFu v pixelech
let gifMarginPx; // Mezera mezi GIFy v pixelech
const GIF_WIDTH_PERCENT = 50; // Šířka GIFu jako procento šířky viewportu
const GIF_MARGIN_PERCENT = 1; // Margin na každé straně GIFu jako procento šířky viewportu

document.addEventListener('DOMContentLoaded', () => {
    calculateGifDimensions();
    window.addEventListener('resize', calculateGifDimensions);

    updateBufferDisplay();
    initAnnyang();
    if (!animationFrameRunning) {
        animateCarousel();
    }
});

const calculateGifDimensions = () => {
    gifWidthPx = (window.innerWidth * GIF_WIDTH_PERCENT) / 100;
    gifMarginPx = (window.innerWidth * GIF_MARGIN_PERCENT) / 100;
};


const initAnnyang = () => {
    if (annyang) {
        annyang.addCallback('start', () => {
            annyangStatusDiv.innerText = 'Listening...';
            annyangStatusDiv.classList.add('listening');
        });
        annyang.addCallback('end', () => {
            annyangStatusDiv.innerText = 'Voice recognition stopped.';
            annyangStatusDiv.classList.remove('listening');
        });
        annyang.addCallback('result', (phrases) => {
            const rawSearchQuery = phrases[0];
            const searchQuery = rawSearchQuery.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]$/, "").trim();
            console.log('Annyang result (cleaned):', searchQuery);
            if (searchQuery) {
                addQueryToBuffer(searchQuery);
            } else {
                console.log('Cleaned search query is empty, not adding to buffer.');
            }
        });

        annyang.start({ autoRestart: true, continuous: false });
        annyangStatusDiv.innerText = 'Listening...';
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
    displayWordEffect(tag);
    updateBufferDisplay();

    try {
        await fetchAndAddGif(tag);
    } catch (error) {
        console.error('Error during fetchAndAddGif:', error);
    } finally {
        isProcessing = false;
        processBuffer();
    }
};

const displayWordEffect = (word) => {
    wordDisplayDiv.innerText = word;
    wordDisplayDiv.classList.remove('fading-out');
    wordDisplayDiv.classList.add('active');

    setTimeout(() => {
        wordDisplayDiv.classList.remove('active');
        wordDisplayDiv.classList.add('fading-out');
    }, 1500);

    setTimeout(() => {
        wordDisplayDiv.innerText = '';
        wordDisplayDiv.classList.remove('fading-out');
    }, 2500);
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

    const gifUrl = gifs[0].images.original.url;

    const newGifElement = addGifToTrack(gifUrl);

    // Důležité: Nyní zpoždíme výpočet targetOffset a spuštění animace fade-in
    // až na další requestAnimationFrame. To dá prohlížeči čas na přepočítání DOMu
    // po přidání nového elementu a případném odstranění starého.
    requestAnimationFrame(() => {
        // Animujeme fade-in nově přidaného GIFu
        newGifElement.style.opacity = "1";

        // *** KLÍČOVÁ ZMĚNA ZDE: Společná logika pro výpočet targetOffset ***
        const singleGifTotalWidth = gifWidthPx + (2 * gifMarginPx);
        const carouselWidth = carouselContainer.offsetWidth;
        const numberOfGifs = carouselTrack.children.length;

        const currentTrackTotalWidth = numberOfGifs * singleGifTotalWidth;

        // Pokud je track delší než viditelná oblast, zarovnáme pravý okraj tracku s pravým okrajem karuselu.
        // Jinak track vycentrujeme.
        if (currentTrackTotalWidth > carouselWidth) {
            targetOffset = carouselWidth - currentTrackTotalWidth;
        } else {
            targetOffset = (carouselWidth - currentTrackTotalWidth) / 2;
        }

        // *** ZMĚNA ZDE: Počáteční carouselOffset pro všechny nové GIFy ***
        // Pokud je to první GIF v tracku, nebo kdykoli se přidává nový GIF,
        // nastavíme carouselOffset tak, aby nový GIF přijel zprava.
        // Cílíme na to, aby se track posunul o jednu plnou šířku GIFu doprava od aktuálního cíle,
        // což vytvoří efekt "příjezdu zprava".
        // Alternativně, pokud chceme, aby nový GIF vždy přijel zprava přesně,
        // můžeme nastavit carouselOffset na hodnotu, která ho umístí na pravý okraj obrazovky.
        // currentTrackTotalWidth - singleGifTotalWidth by byla šířka předposledního stavu
        // A k tomu přidáme carouselWidth, abychom ho posunuli za okraj.
        // Pro plynulý filmový pás je nejlepší začít od 'targetOffset', ale s malým "impulsem" navíc
        // který zajistí, že se posune doprava.
        // Nyní budeme řídit příjezd zprava dynamicky.

        // Pokud je v tracku více než 1 GIF, nebo je to první GIF po kompletním vyčištění,
        // nastavíme carouselOffset tak, aby se nový GIF objevil za pravým okrajem.
        // Tím se vytvoří dojem, že přijíždí zprava.
        if (numberOfGifs > 0) { // Vždy, když přidáme GIF
            // Spočítejte pozici, kde by měl být pravý okraj karuselu,
            // pokud by poslední GIF začínal právě teď zprava
            // Nová pozice (před animací) = aktuální targetOffset - šířka nového GIFu (aby se zobrazil zprava)
            // Nejjednodušší způsob je: pokud je carouselOffset stejný jako targetOffset (animace se dokončila),
            // a přidáváme nový GIF, tak ho "posuneme" za pravý okraj obrazovky.
            if (Math.abs(carouselOffset - targetOffset) < 1) { // Pokud je karusel v klidu na targetOffset
                carouselOffset = targetOffset + singleGifTotalWidth; // Posuň ho o jeden GIF doprava
            }
            // carouselTrack.style.transform = `translateX(${carouselOffset}px)`; // Tohle bude řídit animateCarousel
        }


        // Znovu se ujistíme, že animace běží, pokud je potřeba.
        if (!animationFrameRunning) {
            animateCarousel();
        }
    });

    cleanUpOffscreenGifs();
};


const addGifToTrack = (src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = "GIF";
    img.style.opacity = "0";

    carouselTrack.appendChild(img);
    return img;
};

const cleanUpOffscreenGifs = () => {
    const carouselRect = carouselContainer.getBoundingClientRect();
    const children = carouselTrack.children;

    if (children.length <= 1) {
        return;
    }

    const firstGif = children[0];
    const firstGifRect = firstGif.getBoundingClientRect();

    const removalThreshold = carouselRect.left - (gifWidthPx + (2 * gifMarginPx));

    if (firstGifRect.right < removalThreshold) {
        carouselTrack.removeChild(firstGif);
        carouselTrack.offsetWidth; // Force reflow
    }
};


const animateCarousel = () => {
    const step = () => {
        if (!animationFrameRunning) {
            return;
        }

        const distanceToTarget = carouselOffset - targetOffset;
        let shouldAnimate = false;

        // Pokud je v bufferu něco ke zpracování, nebo se něco zpracovává
        // NEBO pokud je znatelná vzdálenost k cíli (pro dokončení aktuálního posunu).
        // Snížili jsme toleranci na 0.5px pro plynulejší zastavení.
        if (buffer.length > 0 || isProcessing || Math.abs(distanceToTarget) > 0.5) {
            shouldAnimate = true;
        }

        if (shouldAnimate) {
            carouselOffset -= distanceToTarget * gifScrollSpeed;
            carouselTrack.style.transform = `translateX(${carouselOffset}px)`;
            requestAnimationFrame(step);
        } else {
            // Pokud není co animovat, zastavíme animaci
            carouselOffset = targetOffset; // Zajistíme přesné zarovnání na cíli
            carouselTrack.style.transform = `translateX(${carouselOffset}px)`;
            animationFrameRunning = false;
        }
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