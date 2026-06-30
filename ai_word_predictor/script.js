const sentences = [
    { text: "The furry cat sat on the", blanks: 1, options: [{w: "mat", p: 50}, {w: "couch", p: 20}, {w: "tree", p: 15}, {w: "house", p: 10}, {w: "pizza", p: 5}] },
    { text: "I am very hungry, I want to eat a", blanks: 1, options: [{w: "burger", p: 40}, {w: "apple", p: 25}, {w: "pizza", p: 15}, {w: "cookie", p: 10}, {w: "cake", p: 8}, {w: "shoe", p: 2}] },
    { text: "The bright sun in the sky is", blanks: 1, options: [{w: "yellow", p: 45}, {w: "hot", p: 25}, {w: "big", p: 15}, {w: "red", p: 10}, {w: "sleeping", p: 5}] },
    { text: "My pet dog loves to play with his", blanks: 1, options: [{w: "ball", p: 45}, {w: "bone", p: 30}, {w: "friend", p: 10}, {w: "shoe", p: 10}, {w: "car", p: 5}] },
    { text: "When it rains, I need my", blanks: 1, options: [{w: "umbrella", p: 55}, {w: "boots", p: 25}, {w: "house", p: 10}, {w: "sunglasses", p: 5}, {w: "water", p: 5}] }
];

const vocabulary = [
    "mat", "couch", "pizza", "apple", "burger", "shoe", "yellow", "hot", "sleeping",
    "ball", "bone", "car", "umbrella", "boots", "sunglasses", "cat", "dog", "run",
    "jump", "fast", "slow", "red", "blue", "green", "happy", "sad", "big", "small",
    "house", "tree", "bird", "fish", "water", "milk", "cookie", "cake", "star",
    "moon", "night", "day", "friend", "game", "book", "school", "teacher", "robot",
    "alien", "space", "rocket", "planet"
];

let currentSentenceIndex = 0;
let isPredicting = false;

const selectEl = document.getElementById('sentence-select');
const displayEl = document.getElementById('sentence-display');
const gridEl = document.getElementById('word-grid');
const sliderEl = document.getElementById('temperature-slider');
const fillBtn = document.getElementById('fill-btn');
const nextBtn = document.getElementById('next-btn');
const historyListEl = document.getElementById('history-list');

function init() {
    sentences.forEach((s, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.text = s.text + " ___";
        selectEl.appendChild(opt);
    });

    vocabulary.forEach(word => {
        const box = document.createElement('div');
        box.className = 'word-box';
        box.id = 'word-' + word;
        box.innerHTML = `<span>${word}</span><span class="prob" id="prob-${word}"></span>`;
        gridEl.appendChild(box);
    });

    selectEl.addEventListener('change', (e) => {
        currentSentenceIndex = e.target.value;
        renderSentence();
    });

    fillBtn.addEventListener('click', predictWord);
    nextBtn.addEventListener('click', () => {
        currentSentenceIndex = (currentSentenceIndex + 1) % sentences.length;
        selectEl.value = currentSentenceIndex;
        renderSentence();
    });

    renderSentence();
}

function renderSentence() {
    const s = sentences[currentSentenceIndex];
    displayEl.innerHTML = s.text + ' <span class="blank" id="current-blank">___</span>';
    resetGrid();
    isPredicting = false;
}

function resetGrid() {
    document.querySelectorAll('.word-box').forEach(box => {
        box.classList.remove('scanning', 'chosen', 'alternative');
        box.querySelector('.prob').innerText = '';
    });
}

function logHistory(sentenceText, guessedWord) {
    const listItem = document.createElement('li');
    listItem.innerHTML = `✏️ ${sentenceText} <span style="color: #4caf50; font-weight: bold;">${guessedWord}</span>.`;
    historyListEl.prepend(listItem);
}

function predictWord() {
    if (isPredicting) return;
    
    const blank = document.getElementById('current-blank');
    if (!blank) return;

    // Automatically clear the word to try again visually
    blank.innerText = '___';
    
    isPredicting = true;
    resetGrid();

    const sentenceData = sentences[currentSentenceIndex];
    const sliderValue = parseInt(sliderEl.value);

    // Show probabilities on the target words
    sentenceData.options.forEach(opt => {
        const probSpan = document.getElementById('prob-' + opt.w);
        if(probSpan) probSpan.innerText = opt.p + '%';
    });

    // Decide which word to pick based on slider
    let chosenWord = sentenceData.options[0].w; 
    
    if (sliderValue > 4 && sliderValue <= 7) {
        // Medium mode: Pick the 2nd or 3rd option
        chosenWord = Math.random() > 0.5 ? sentenceData.options[1].w : sentenceData.options[2].w;
    } else if (sliderValue > 7) {
        // Silly mode: Pick from the bottom 2 lowest probabilities at the end of the array
        let len = sentenceData.options.length;
        chosenWord = Math.random() > 0.5 ? sentenceData.options[len - 1].w : sentenceData.options[len - 2].w;
    }

    let scanCount = 0;
    const scanInterval = setInterval(() => {
        document.querySelectorAll('.word-box').forEach(b => b.classList.remove('scanning'));
        
        const randomWord = vocabulary[Math.floor(Math.random() * vocabulary.length)];
        const box = document.getElementById('word-' + randomWord);
        if(box) box.classList.add('scanning');

        scanCount++;
        if (scanCount > 15) {
            clearInterval(scanInterval);
            document.querySelectorAll('.word-box').forEach(b => b.classList.remove('scanning'));
            
            // Highlight chosen word
            const chosenBox = document.getElementById('word-' + chosenWord);
            if(chosenBox) chosenBox.classList.add('chosen');
            
            // Highlight all other valid alternatives temporarily
            sentenceData.options.forEach(opt => {
                if (opt.w !== chosenWord) {
                    const altBox = document.getElementById('word-' + opt.w);
                    if(altBox) altBox.classList.add('alternative');
                    
                    setTimeout(() => {
                        if(altBox) altBox.classList.remove('alternative');
                    }, 3000);
                }
            });

            blank.innerText = chosenWord;
            logHistory(sentenceData.text, chosenWord);
            isPredicting = false;
        }
    }, 100);
}

init();