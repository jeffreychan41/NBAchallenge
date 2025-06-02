// --- DOM Elements ---
const homeScreen = document.getElementById('homeScreen');
const authPanel = document.getElementById('authPanel');
const quizContainer = document.getElementById('quizContainer');
const resultContainer = document.getElementById('resultContainer');
const leaderboardContainer = document.getElementById('leaderboardContainer');
const trophyRoomPanel = document.getElementById('trophyRoomPanel');
const trophyCardsContainer = document.getElementById('trophyCardsContainer');
const overlay = document.getElementById('overlay'); // Overlay element

const startNormalQuizBtn = document.getElementById('startNormalQuizBtn');
const startExpertQuizBtn = document.getElementById('startExpertQuizBtn');
const loginRegisterBtn = document.getElementById('loginRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
const viewTrophyRoomBtn = document.getElementById('viewTrophyRoomBtn');

// Quiz elements
const questionElement = document.getElementById('question');
const playerImage = document.getElementById('playerImage');
const optionsContainer = document.getElementById('options');
const feedbackElement = document.getElementById('feedback');

// Result elements
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const showLeaderboardBtnFromResult = document.getElementById('showLeaderboardBtn');
const returnToHomeFromResultsBtn = document.getElementById('returnToHomeFromResultsBtn');

// Leaderboard elements
const leaderboardList = document.getElementById('leaderboardList');
const backToHomeFromLeaderboardBtn = document.getElementById('backToHomeFromLeaderboardBtn');

// Auth elements
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const registerUserBtn = document.getElementById('registerUserBtn');
const loginUserBtn = document.getElementById('loginUserBtn');
const authError = document.getElementById('authError');
const backToHomeFromAuthBtn = document.getElementById('backToHomeFromAuthBtn');

// User info elements
const userInfoDisplay = document.getElementById('userInfoDisplay');
const pointsDisplay = document.getElementById('pointsDisplay');
const userPointsSpan = document.getElementById('userPoints');

// Trophy Room elements
const backToHomeFromTrophyRoomBtn = document.getElementById('backToHomeFromTrophyRoomBtn');

// --- Firebase Initialization (These lines assume firebase-config.js is loaded BEFORE this script) ---
// Make sure firebase-config.js contains firebase.initializeApp(YOUR_FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global Variables ---
let allNormalQuestions = [];
let allExpertQuestions = [];
let allTrophies = [];
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let quizStarted = false;
let userLoggedIn = false;
let currentUserData = null;
let currentMode = 'normal';

// --- Background Image Constants ---
const mainBackground = './img/homescreen.webp';
const quizBackgrounds = [
  './img/slide1.jpg',
  './img/slide2.jpg',
  './img/slide3.webp',
  './img/slide4.jpg',
  './img/slide5.jpg'
];

// --- Utility Functions ---

function hideAllPanels() {
    homeScreen.classList.add('hidden');
    quizContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    leaderboardContainer.classList.add('hidden');
    authPanel.classList.add('hidden');
    trophyRoomPanel.classList.add('hidden');
    overlay.classList.add('hidden'); // Ensure overlay is hidden
    overlay.classList.remove('active'); // Deactivate overlay
}

function setBodyBackground(imagePath) {
    document.body.style.backgroundImage = `url('${imagePath}')`;
}

async function fetchUserData(userId) {
    try {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (doc.exists) {
            currentUserData = doc.data();
            if (typeof currentUserData.points === 'undefined' || isNaN(currentUserData.points)) {
                currentUserData.points = 0;
            }
            if (typeof currentUserData.highestScore === 'undefined' || isNaN(currentUserData.highestScore)) {
                currentUserData.highestScore = 0;
            }
            if (!currentUserData.unlockedTrophies || !(currentUserData.unlockedTrophies instanceof Array)) {
                currentUserData.unlockedTrophies = [];
            }
            return currentUserData;
        } else {
            await userRef.set({ points: 0, highestScore: 0, unlockedTrophies: [] });
            currentUserData = { points: 0, highestScore: 0, unlockedTrophies: [] };
            return currentUserData;
        }
    } catch (error) {
        console.error("Error fetching or creating user data:", error);
        currentUserData = { points: 0, highestScore: 0, unlockedTrophies: [] };
        return currentUserData;
    }
}

async function updateUserData(userId, data) {
    try {
        const userRef = db.collection('users').doc(userId);
        console.log(`Updating user ${userId} with data:`, data);
        await userRef.update(data);
        currentUserData = { ...currentUserData, ...data };
    } catch (error) {
        console.error("Error updating user data:", error);
    }
}

// --- Auth State Change Listener ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        userLoggedIn = true;
        console.log("Auth state changed: User is logged in.", user.email || "Anonymous User"); // Adjust log for anonymous

        await fetchUserData(user.uid);

        // Update UI based on whether the user is anonymous or registered
        if (user.isAnonymous) {
            userInfoDisplay.textContent = 'Welcome, Guest!';
            loginRegisterBtn.classList.remove('hidden'); // Guests can still choose to log in/register
            logoutBtn.classList.add('hidden'); // No direct logout for anonymous (unless they link)
            viewTrophyRoomBtn.classList.add('hidden'); // Anonymous users can't view trophy room by default
            startExpertQuizBtn.disabled = true; // Maybe disable expert for anonymous? (Your choice)
            // Optionally, show a "Sign Up to Save Progress" button
        } else {
            userInfoDisplay.textContent = `Welcome, ${user.email}`;
            loginRegisterBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            viewTrophyRoomBtn.classList.remove('hidden'); // Only registered users get trophy room
            startExpertQuizBtn.disabled = false; // Enable expert for registered users
        }

        userInfoDisplay.classList.remove('hidden');
        pointsDisplay.classList.remove('hidden');
        userPointsSpan.textContent = currentUserData ? currentUserData.points : 0;

        hideAllPanels();
        homeScreen.classList.remove('hidden');

    } else {
        // User is logged out, or no user exists.
        // Try to sign in anonymously if not already signed in.
        try {
            // Check if it's not a deliberate logout or a refresh after a session
            // To avoid infinite loops, only sign in anonymously if no user was just present
            // or if we are not actively in an auth flow (login/register panel)
            if (!quizStarted && !authPanel.classList.contains('hidden')) { // Avoid signing in anonymously if currently in auth panel or quiz
                 console.log("No user, attempting anonymous sign-in...");
                 await firebase.auth().signInAnonymously();
                 // The onAuthStateChanged listener will fire again with the anonymous user
                 return; // Exit to prevent further UI changes in this block until new state
            }
        } catch (error) {
            console.error("Error signing in anonymously:", error);
            // Handle error, e.g., show a message to the user
        }

        userLoggedIn = false;
        currentUserData = null;
        console.log("Auth state changed: No user (or deliberate logout).");

        hideAllPanels();
        homeScreen.classList.remove('hidden');

        userInfoDisplay.textContent = '';
        userInfoDisplay.classList.add('hidden');

        pointsDisplay.classList.add('hidden');
        userPointsSpan.textContent = 0;

        // Ensure these are visible for guests to sign up/in
        loginRegisterBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden'); // Hide logout for anonymous
        viewTrophyRoomBtn.classList.add('hidden'); // Hide trophy room for anonymous
        startExpertQuizBtn.disabled = false; // Re-enable for guest choice to try
    }
});

// --- Auth Functions ---

async function registerUser() {
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    if (!email || !password) {
        authError.textContent = "Please enter email and password.";
        return;
    }

    try {
        const currentUser = auth.currentUser;
        let userCredential;

        if (currentUser && currentUser.isAnonymous) {
            // User is currently anonymous, link the account
            const credential = firebase.auth.EmailAuthProvider.credential(email, password);
            userCredential = await currentUser.linkWithCredential(credential);
            authError.textContent = "Guest account successfully linked to new email!";
            console.log("Anonymous account linked:", userCredential.user.uid);

            // No need to create new Firestore doc, as it should already exist for the anonymous UID
            // If you had data tied to the old anonymous UID, it's now accessible via the new permanent UID
        } else {
            // No anonymous user, or user is already permanent, proceed with regular registration
            userCredential = await auth.createUserWithEmailAndPassword(email, password);
            authError.textContent = "Registration successful!";
            console.log("New user registered:", userCredential.user.uid);

            // Create new Firestore document for the new user
            await db.collection('users').doc(userCredential.user.uid).set({
                points: 0,
                highestScore: 0,
                unlockedTrophies: []
            });
        }

        authEmailInput.value = '';
        authPasswordInput.value = '';
        // returnToHomeFromAuth() will be handled by the onAuthStateChanged listener
    } catch (error) {
        console.error("Registration error:", error);
        authError.textContent = `Registration failed: ${error.message}`;
        // Handle specific errors like 'auth/email-already-in-use'
        if (error.code === 'auth/email-already-in-use' && auth.currentUser && auth.currentUser.isAnonymous) {
            // If the anonymous user tries to link to an email that's already in use
            // You might offer to sign them in with that email instead, and merge data.
            // This is more complex and requires careful data merging logic.
            // For now, just show the error.
        }
    }
}

async function loginUser() {
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    if (!email || !password) {
        authError.textContent = "Please enter email and password.";
        return;
    }

    try {
        const currentUser = auth.currentUser;
        let userCredential;

        if (currentUser && currentUser.isAnonymous) {
            // User is currently anonymous, reauthenticate/link with email/password
            // Note: linkWithCredential does not reauthenticate if the email is already in use
            // For logging in an anonymous user with existing credentials, you use linkWithCredential
            // after getting credentials from the user (email/password)
            const credential = firebase.auth.EmailAuthProvider.credential(email, password);
            userCredential = await currentUser.linkWithCredential(credential);
            authError.textContent = "Guest account successfully linked and logged in!";
            console.log("Anonymous account linked and logged in:", userCredential.user.uid);

            // Data associated with the anonymous UID is now accessible via the permanent UID
        } else {
            // Regular login
            userCredential = await auth.signInWithEmailAndPassword(email, password);
            authError.textContent = "Login successful!";
            console.log("User logged in:", userCredential.user.uid);
        }

        authEmailInput.value = '';
        authPasswordInput.value = '';
        // returnToHomeFromAuth() will be handled by the onAuthStateChanged listener
    } catch (error) {
        console.error("Login error:", error);
        authError.textContent = `Login failed: ${error.message}`;
    }
}

async function logoutUser() {
    try {
        if (auth.currentUser && auth.currentUser.isAnonymous) {
            // If an anonymous user "logs out", you might clear their local state
            // and then force a refresh or navigate to a public section.
            // Since onAuthStateChanged will re-sign them in anonymously,
            // this "logout" for anonymous users is often just a UI reset.
            console.log("Anonymous user session cleared (will re-sign in anonymously).");
        }
        await auth.signOut();
        console.log("User logged out.");
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// --- Navigation Functions ---

function showAuthPanel() {
    hideAllPanels();
    authPanel.classList.remove('hidden');
    setBodyBackground(mainBackground);
    authError.textContent = '';
}

function returnToHomeFromAuth() {
    hideAllPanels();
    homeScreen.classList.remove('hidden');
    setBodyBackground(mainBackground);
}

async function showLeaderboardPanel() {
    hideAllPanels();
    leaderboardContainer.classList.remove('hidden');
    setBodyBackground(mainBackground);
    await displayLeaderboard();
}

function returnToHomeFromResult() {
    hideAllPanels();
    homeScreen.classList.remove('hidden');
    setBodyBackground(mainBackground);
}

function returnToHomeFromLeaderboard() {
    hideAllPanels();
    homeScreen.classList.remove('hidden');
    setBodyBackground(mainBackground);
}

async function showTrophyRoomPanel() {
    if (!userLoggedIn || !currentUserData) {
        alert("Please log in to view the Trophy Room.");
        return;
    }
    hideAllPanels();
    trophyRoomPanel.classList.remove('hidden');
    setBodyBackground(mainBackground);
    displayTrophyCards();
}

function returnToHomeFromTrophyRoom() {
    hideAllPanels();
    homeScreen.classList.remove('hidden');
    setBodyBackground(mainBackground);
}

// --- Quiz Logic ---

async function fetchAllQuestionsData() {
    try {
        const normalResponse = await fetch('questions.json');
        if (!normalResponse.ok) {
            throw new Error(`HTTP error! status: ${normalResponse.status} for questions.json`);
        }
        allNormalQuestions = await normalResponse.json();
        console.log("Normal questions loaded:", allNormalQuestions.length);

        const expertResponse = await fetch('expert-questions.json');
        if (!expertResponse.ok) {
            console.warn(`Expert questions file not found or error loading: ${expertResponse.status}. Expert mode may not be available.`);
            allExpertQuestions = [];
        } else {
            allExpertQuestions = await expertResponse.json();
            console.log("Expert questions loaded:", allExpertQuestions.length);
        }

    } catch (error) {
        console.error("Could not fetch all questions data:", error);
        alert("Failed to load quiz questions. Please check console for details.");
    }
}

function getRandomQuestionsForQuiz(mode) {
    let questionsToUse = [];
    if (mode === 'expert') {
        questionsToUse = allExpertQuestions;
        if (questionsToUse.length < 10) {
            alert(`Not enough expert questions available (${questionsToUse.length} found). Please add at least 10 to expert-questions.json.`);
            return [];
        }
    } else { // 'normal' mode
        questionsToUse = allNormalQuestions;
        if (questionsToUse.length < 10) {
            alert(`Not enough normal questions available (${questionsToUse.length} found). Please add at least 10 to questions.json.`);
            return [];
        }
    }

    const shuffled = questionsToUse.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
}

function displayQuestion() {
    feedbackElement.textContent = '';
    optionsContainer.innerHTML = '';

    if (currentQuestionIndex >= currentQuizQuestions.length) {
        endGame();
        return;
    }

    const currentQuestion = currentQuizQuestions[currentQuestionIndex];
    questionElement.textContent = `Who is this NBA player? (${currentQuestionIndex + 1}/${currentQuizQuestions.length})`;
    
    playerImage.src = currentQuestion.image;
    playerImage.alt = currentQuestion.answer;

    const shuffledOptions = currentQuestion.options.sort(() => 0.5 - Math.random());

    shuffledOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('option-btn');
        button.onclick = () => checkAnswer(option);
        optionsContainer.appendChild(button);
    });

    const randomBg = quizBackgrounds[Math.floor(Math.random() * quizBackgrounds.length)];
    setBodyBackground(randomBg);
}

function checkAnswer(selectedOption) {
    const currentQuestion = currentQuizQuestions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.answer;

    Array.from(optionsContainer.children).forEach(button => {
        button.disabled = true;
        if (button.textContent === currentQuestion.answer) {
            button.style.backgroundColor = '#008000';
        } else if (button.textContent === selectedOption) {
            button.style.backgroundColor = '#CC3300';
        } else {
            button.style.opacity = '0.7';
        }
    });

    if (isCorrect) {
        score++;
        feedbackElement.textContent = "Correct!";
        feedbackElement.style.color = '#00FF00';
    } else {
        feedbackElement.textContent = `Wrong! The correct answer was ${currentQuestion.answer}.`;
        feedbackElement.style.color = '#FFD700';
    }

    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion();
    }, 1500);
}

function startGame(mode) {
    if (mode === 'expert' && allExpertQuestions.length < 10) {
        alert(`Not enough expert questions available. You need at least 10 questions in expert-questions.json. Found: ${allExpertQuestions.length}`);
        return;
    }
    if (mode === 'normal' && allNormalQuestions.length < 10) {
        alert(`Not enough normal questions available. You need at least 10 questions in questions.json. Found: ${allNormalQuestions.length}`);
        return;
    }

    currentMode = mode;
    console.log(`Starting quiz in ${currentMode} mode.`);

    currentQuizQuestions = getRandomQuestionsForQuiz(currentMode);
    if (currentQuizQuestions.length === 0) {
        alert("An error occurred while preparing questions. Please ensure you have enough questions for this mode.");
        return;
    }

    quizStarted = true;
    currentQuestionIndex = 0;
    score = 0;

    hideAllPanels();
    quizContainer.classList.remove('hidden');
    displayQuestion();
}

async function endGame() {
    quizStarted = false;
    hideAllPanels();
    resultContainer.classList.remove('hidden');
    setBodyBackground(mainBackground);

    finalScoreElement.textContent = `You scored ${score} out of ${currentQuizQuestions.length}!`;

    if (userLoggedIn && auth.currentUser) {
        const userId = auth.currentUser.uid;
        let pointsEarned = score;
        if (currentMode === 'expert') {
            pointsEarned += Math.floor(score * 0.5);
            finalScoreElement.textContent += ` (+${Math.floor(score * 0.5)} bonus points for Expert Mode!)`;
        }

        let currentPoints = currentUserData && typeof currentUserData.points === 'number' ? currentUserData.points : 0;
        let newPoints = currentPoints + pointsEarned;
        let newHighestScore = currentUserData && typeof currentUserData.highestScore === 'number' ? Math.max(currentUserData.highestScore, score) : score;

        await updateUserData(userId, { points: newPoints, highestScore: newHighestScore });
        console.log(`Updated points to: ${newPoints}, Highest Score: ${newHighestScore}`);

        if (userPointsSpan) userPointsSpan.textContent = newPoints;
    }

    if (score > 0 && auth.currentUser) {
        await saveScoreToLeaderboard(auth.currentUser.email, score);
    }
}

// --- Leaderboard Logic ---
async function saveScoreToLeaderboard(username, score) {
    try {
        await db.collection('leaderboard').add({
            name: username,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Score saved to leaderboard!");
    } catch (error) {
        console.error("Error saving score:", error);
    }
}

async function displayLeaderboard() {
    leaderboardList.innerHTML = '';
    try {
        const snapshot = await db.collection('leaderboard')
                                 .orderBy('score', 'desc')
                                 .limit(10)
                                 .get();
        if (snapshot.empty) {
            const li = document.createElement('li');
            li.textContent = 'No scores yet. Be the first!';
            leaderboardList.appendChild(li);
            return;
        }

        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const usernameToDisplay = data.name || "Anonymous Player";

            const li = document.createElement('li');
            li.innerHTML = `
                <span>${rank}. ${usernameToDisplay}</span>
                <span>${data.score} points</span>
            `;
            if (rank === 1) li.classList.add('rank-1');
            if (rank === 2) li.classList.add('rank-2');
            if (rank === 3) li.classList.add('rank-3');
            leaderboardList.appendChild(li);
            rank++;
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        const li = document.createElement('li');
        li.textContent = 'Failed to load leaderboard.';
        leaderboardList.appendChild(li);
    }
}

// --- Trophy Room Logic ---

async function fetchAllTrophies() {
    try {
        const snapshot = await db.collection('trophies').get();
        allTrophies = snapshot.docs.map(doc => doc.data());
        console.log("Trophies loaded:", allTrophies.length);
    } catch (error) {
        console.error("Error fetching trophies:", error);
        alert("Failed to load trophy data.");
    }
}

async function displayTrophyCards() {
    trophyCardsContainer.innerHTML = ''; // Clear previous cards

    if (allTrophies.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No trophies available yet. Check back later!';
        trophyCardsContainer.appendChild(message);
        return;
    }

    const unlockedTrophyIds = (currentUserData && currentUserData.unlockedTrophies instanceof Array)
                               ? currentUserData.unlockedTrophies : [];

    allTrophies.forEach(trophy => {
        const isUnlocked = unlockedTrophyIds.includes(trophy.id);

        const card = document.createElement('div');
        card.classList.add('trophy-card');
        card.dataset.trophyId = trophy.id; // Store trophy ID on the card element for easy access

        if (isUnlocked) {
            card.classList.add('unlocked');
        } else {
            card.classList.add('locked');
        }

        // Inner structure for flipping
        card.innerHTML = `
            <div class="trophy-card-inner">
                <div class="trophy-card-front">
                    <h3>${trophy.name}</h3>
                    <img src="${trophy.image}" alt="${trophy.name}" class="trophy-img">
                    ${isUnlocked ? '' : `<p class="unlock-cost">Cost: ${trophy.cost} Points</p>`}
                    ${isUnlocked ? '' : `
                        <div class="unlock-btn-container">
                            <button class="unlock-btn" data-trophy-id="${trophy.id}" data-trophy-cost="${trophy.cost}">Unlock</button>
                        </div>
                    `}
                </div>
                <div class="trophy-card-back">
                    <p class="trophy-description">${isUnlocked ? trophy.description : 'Unlock to reveal details!'}</p>
                </div>
            </div>
        `;

        // Add event listener for unlocking
        if (!isUnlocked) {
            const unlockButton = card.querySelector('.unlock-btn');
            unlockButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click from propagating
                unlockTrophy(trophy.id, trophy.cost, card); // Pass the card element
            });
        }

        // Add event listener for magnifying/flipping already unlocked cards
        if (isUnlocked) {
            card.addEventListener('click', (e) => {
                // Ensure click is not on a button (like the close button)
                if (!e.target.classList.contains('magnified-close-btn') && e.target.tagName !== 'BUTTON') {
                   magnifyAndFlipCard(card, trophy);
                }
            });
        }

        trophyCardsContainer.appendChild(card);
    });
}

// Function to magnify and flip a card
function magnifyAndFlipCard(cardElement, trophyData) {
    // If this card is already magnified, it means we want to toggle its flip state
    if (cardElement.classList.contains('magnified')) {
        const innerCard = cardElement.querySelector('.trophy-card-inner');
        innerCard.classList.toggle('flipped'); // Toggle the flipped class
        return; // Exit as we've just flipped
    }

    // --- Logic for Initial Magnification (Only if not already magnified) ---

    // Ensure only one card is magnified at a time
    const existingMagnifiedCard = document.querySelector('.trophy-card.magnified');
    if (existingMagnifiedCard) {
        closeMagnifiedCard(); // Close any previously magnified card
    }

    // Hide all other trophy cards from view (optional, but good for focus)
    const allTrophyCards = document.querySelectorAll('.trophy-card');
    allTrophyCards.forEach(tc => {
        if (tc !== cardElement) {
            tc.style.opacity = '0'; // Fade out other cards
            tc.style.pointerEvents = 'none'; // Disable clicks on other cards
        }
    });

    // Add close button if not already present
    let closeBtn = cardElement.querySelector('.magnified-close-btn');
    if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.classList.add('magnified-close-btn');
        closeBtn.textContent = 'X';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from propagating to the card itself
            closeMagnifiedCard();
        });
        cardElement.appendChild(closeBtn);
    }

    // Add classes for magnification and overlay
    cardElement.classList.add('magnified');
    overlay.classList.remove('hidden'); // Show overlay
    overlay.classList.add('active');

    // Make overlay clickable to close the magnified card (ensure only one listener at a time)
    // Remove previous listener first to avoid stacking
    overlay.removeEventListener('click', closeMagnifiedCard);
    overlay.addEventListener('click', closeMagnifiedCard);

    // Initial flip to the back after magnification (optional, based on preference)
    // If you want it to always show the front first, remove this setTimeout and the innerCard.classList.add('flipped')
    const innerCard = cardElement.querySelector('.trophy-card-inner');
    setTimeout(() => {
        innerCard.classList.add('flipped');
    }, 500); // Delay for magnification transition
}


// Function to close the magnified card
function closeMagnifiedCard() {
    const magnifiedCard = document.querySelector('.trophy-card.magnified');
    if (magnifiedCard) {
        // Remove close button
        const closeBtn = magnifiedCard.querySelector('.magnified-close-btn');
        if (closeBtn) {
            closeBtn.remove();
        }

        const innerCard = magnifiedCard.querySelector('.trophy-card-inner');
        if (innerCard) {
            innerCard.classList.remove('flipped'); // Ensure it flips back to front before un-magnifying
        }

        // Delay removing magnified class slightly for flip animation to finish
        setTimeout(() => {
            magnifiedCard.classList.remove('magnified');
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
            
            // Remove event listener from overlay
            overlay.removeEventListener('click', closeMagnifiedCard);

            // Restore opacity and pointer-events for all other trophy cards
            const allTrophyCards = document.querySelectorAll('.trophy-card');
            allTrophyCards.forEach(tc => {
                tc.style.opacity = '1';
                tc.style.pointerEvents = 'auto'; // Re-enable clicks
            });

        }, 300); // This delay should be less than or equal to the flip transition
    }
}


// Unlock Trophy Logic
async function unlockTrophy(trophyId, cost, cardElement) { // Passed cardElement
    if (!userLoggedIn || !auth.currentUser || !currentUserData) {
        alert("You must log in to unlock trophies.");
        return;
    }

    if (!currentUserData.unlockedTrophies || !(currentUserData.unlockedTrophies instanceof Array)) {
        currentUserData.unlockedTrophies = [];
    }

    if (currentUserData.unlockedTrophies.includes(trophyId)) {
        alert("You have already unlocked this trophy!");
        return;
    }

    const currentPoints = typeof currentUserData.points === 'number' ? currentUserData.points : 0;
    if (currentPoints < cost) {
        alert(`You need ${cost} points to unlock this trophy, but you only have ${currentPoints} points.`);
        return;
    }

    if (!confirm(`Are you sure you want to spend ${cost} points to unlock this trophy?`)) {
        return;
    }

    try {
        const userId = auth.currentUser.uid;
        const newPoints = currentPoints - cost;
        const newUnlockedTrophies = [...currentUserData.unlockedTrophies, trophyId];

        console.log("Attempting to update user data with:");
        console.log("  points:", newPoints);
        console.log("  unlockedTrophies:", newUnlockedTrophies);


        await updateUserData(userId, {
            points: newPoints,
            unlockedTrophies: newUnlockedTrophies
        });

        userPointsSpan.textContent = newPoints;
        
        // Update the specific card's appearance and behavior
        if (cardElement) {
            cardElement.classList.remove('locked');
            cardElement.classList.add('unlocked');
            // Remove the unlock button
            const unlockBtnContainer = cardElement.querySelector('.unlock-btn-container');
            if (unlockBtnContainer) {
                unlockBtnContainer.remove();
            }
            // Update back description
            const backDescription = cardElement.querySelector('.trophy-card-back .trophy-description');
            if (backDescription) {
                const updatedTrophy = allTrophies.find(t => t.id === trophyId);
                backDescription.textContent = updatedTrophy ? updatedTrophy.description : 'Congratulations, unlocked!';
            }
            // Re-attach click listener for magnification to the now unlocked card
            // Important: ensure it's not adding multiple listeners if re-rendering
            cardElement.removeEventListener('click', (e) => { // Remove old, potentially non-working listener
                if (!e.target.classList.contains('magnified-close-btn') && e.target.tagName !== 'BUTTON') {
                    magnifyAndFlipCard(cardElement, updatedTrophy);
                }
            });
            cardElement.addEventListener('click', (e) => { // Add new listener
                if (!e.target.classList.contains('magnified-close-btn') && e.target.tagName !== 'BUTTON') {
                    magnifyAndFlipCard(cardElement, updatedTrophy);
                }
            });

            // Immediately magnify and flip the newly unlocked card
            const newlyUnlockedTrophyData = allTrophies.find(t => t.id === trophyId);
            if (newlyUnlockedTrophyData) {
                 magnifyAndFlipCard(cardElement, newlyUnlockedTrophyData);
            }
        }
        
        alert(`Trophy unlocked successfully! You now have ${newPoints} points.`);

    } catch (error) {
        console.error("Error unlocking trophy:", error);
        alert("Failed to unlock trophy. Please try again.");
    }
}


// --- Event Listeners ---

// Home Screen Buttons
startNormalQuizBtn.addEventListener('click', () => startGame('normal'));
startExpertQuizBtn.addEventListener('click', () => startGame('expert'));
loginRegisterBtn.addEventListener('click', showAuthPanel);
logoutBtn.addEventListener('click', logoutUser);
viewLeaderboardBtn.addEventListener('click', showLeaderboardPanel);
viewTrophyRoomBtn.addEventListener('click', showTrophyRoomPanel);

// Auth Panel Buttons
registerUserBtn.addEventListener('click', registerUser);
loginUserBtn.addEventListener('click', loginUser);
backToHomeFromAuthBtn.addEventListener('click', returnToHomeFromAuth);

// Result Screen Buttons
restartBtn.addEventListener('click', () => startGame(currentMode));
showLeaderboardBtnFromResult.addEventListener('click', showLeaderboardPanel);
returnToHomeFromResultsBtn.addEventListener('click', returnToHomeFromResult);

// Leaderboard Button
backToHomeFromLeaderboardBtn.addEventListener('click', returnToHomeFromLeaderboard);

// Trophy Room Button
backToHomeFromTrophyRoomBtn.addEventListener('click', returnToHomeFromTrophyRoom);


// --- Initial Setup ---
setBodyBackground(mainBackground);
fetchAllQuestionsData();
fetchAllTrophies();