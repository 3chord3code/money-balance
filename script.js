// --- Elements ---
const balanceElement = document.getElementById('balance');
const countdownElement = document.getElementById('countdown');
const dailyAmountElement = document.getElementById('daily-amount');
const dateElement = document.getElementById('current-date');
const UIElements = {
    deposit: { display: document.getElementById('deposit-display'), button: document.getElementById('edit-deposit-button') },
    carryover: { display: document.getElementById('carryover-display'), button: document.getElementById('edit-carryover-button') },
    spent: { display: document.getElementById('spent-display'), button: document.getElementById('edit-spent-button') },
    rent: { display: document.getElementById('rent-display'), button: document.getElementById('edit-rent-button') },
    credit: { display: document.getElementById('credit-card-display'), button: document.getElementById('edit-credit-card-button') },
};

// --- Storage Keys ---
const STORAGE_PREFIX = 'moneyBalanceApp_';
const STORAGE_KEYS = {
    deposit: `${STORAGE_PREFIX}deposit_v2`,
    carryover: `${STORAGE_PREFIX}carryover_v2`,
    spent: `${STORAGE_PREFIX}spent_v2`,
    rent: `${STORAGE_PREFIX}rent_v2`,
    credit: `${STORAGE_PREFIX}credit_v2`,
};

const formatter = new Intl.NumberFormat('ja-JP');

// --- State ---
let state = {
    deposit: null,
    carryover: 0,
    spent: 0,
    rent: null,
    credit: 0,
};

// --- Functions ---
function calculateBalance() {
    const { deposit, carryover, spent, rent, credit } = state;
    const income = (carryover || 0) + (deposit || 0);
    const outcome = (spent || 0) + (rent || 0) + (credit || 0);
    return income - outcome;
}

function updateBalanceDisplay() {
    const currentBalance = calculateBalance();
    balanceElement.textContent = formatter.format(currentBalance) + ' 円';
}

function updateAllDisplays() {
    for (const key in UIElements) {
        const value = state[key];
        const displayEl = UIElements[key].display;
        if (value === null) {
            displayEl.textContent = '設定してください';
            displayEl.style.color = '#999';
        } else {
            displayEl.textContent = formatter.format(value) + ' 円';
            displayEl.style.color = 'inherit';
        }
    }
}

function saveData() {
    for (const key in state) {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(state[key]));
    }
}

function loadData() {
    for (const key in state) {
        const savedValue = localStorage.getItem(STORAGE_KEYS[key]);
        if (savedValue !== null) {
            state[key] = JSON.parse(savedValue);
        }
    }
}

function createEditHandler(stateKey, promptMessage) {
    return () => {
        const currentValue = state[stateKey] !== null ? state[stateKey] : '';
        const newValueString = prompt(promptMessage, currentValue);
        
        if (newValueString === null) return; // Cancelled

        if (stateKey !== 'rent' && newValueString.trim() === '') {
             alert('金額を入力してください。');
             return;
        }

        if (newValueString.trim() === '') { // Allow unsetting rent
            state[stateKey] = null;
        } else {
            const newValue = parseInt(newValueString.replace(/,/g, ''), 10);
            if (!isNaN(newValue) && newValue >= 0) {
                state[stateKey] = newValue;
            } else {
                alert('有効な数値を入力してください。');
                return;
            }
        }
        
        updateAllDisplays();
        updateBalanceDisplay();
        updateCountdown(); // Also update countdown as balance affects daily amount
        saveData();
    };
}

function updateCountdown() {
    const today = new Date();
    let next25 = new Date(today.getFullYear(), today.getMonth(), 25);
    if (today.getDate() >= 25) {
        next25.setMonth(next25.getMonth() + 1);
    }
    const diffTime = next25 - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    countdownElement.textContent = diffDays > 0 ? `次の入金日（25日）まであと ${diffDays} 日` : `今日は入金日です！`;
    
    if (diffDays > 0) {
        const currentBalance = calculateBalance();
        if (currentBalance >= 0) {
            const dailyAmount = Math.floor(currentBalance / diffDays);
            dailyAmountElement.textContent = `1日あたり ${formatter.format(dailyAmount)} 円`;
        } else {
            dailyAmountElement.textContent = '';
        }
    } else {
        dailyAmountElement.textContent = '';
    }
}

function updateDateDisplay() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const day = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];
    dateElement.textContent = `${month}月${date}日（${day}）`;
    dateElement.classList.add('date');
}

// --- iOS Install Prompt ---
function showIosInstallBanner() {
    const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Check if app is already running in standalone mode.
    const isStandalone = () => ('standalone' in window.navigator) && (window.navigator.standalone);

    // If it's an iOS device and not running in standalone mode, show the banner.
    if (isIos() && !isStandalone()) {
        const banner = document.getElementById('ios-install-banner');
        if (banner) {
            banner.style.display = 'block';
            const closeButton = document.getElementById('close-ios-banner');
            closeButton.addEventListener('click', () => {
                banner.style.display = 'none';
            });
        }
    }
}


// --- Event Listeners ---
UIElements.deposit.button.addEventListener('click', createEditHandler('deposit', '1ヵ月ごとの入金額を入力してください。'));
UIElements.carryover.button.addEventListener('click', createEditHandler('carryover', '前月からの繰り越し金額を入力してください。'));
UIElements.spent.button.addEventListener('click', createEditHandler('spent', '使った金額の合計を入力してください。'));
UIElements.rent.button.addEventListener('click', createEditHandler('rent', '家賃を入力してください。（空欄で未設定）'));
UIElements.credit.button.addEventListener('click', createEditHandler('credit', 'クレジットカード引き落とし金額を入力してください。'));

// --- Initialization ---
function initialize() {
    loadData();
    updateAllDisplays();
    updateBalanceDisplay();
    updateCountdown();
    updateDateDisplay();
    showIosInstallBanner(); // Show banner for iOS users
}

initialize();

// --- PWA Install Logic (for non-iOS) ---
let deferredPrompt;
const installButton = document.getElementById('install-button');

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can install the PWA
    installButton.hidden = false;
    console.log('`beforeinstallprompt` event was fired.');
});

installButton.addEventListener('click', async () => {
    // Hide the app provided install promotion
    installButton.hidden = true;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
});

window.addEventListener('appinstalled', (evt) => {
    // Log install to analytics
    console.log('INSTALL: Success');
});
