// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDEj38aSEXvWivHOr_J-28mQziW3L56y6Q",
    authDomain: "alfa-vox-portfolio.firebaseapp.com",
    projectId: "alfa-vox-portfolio",
    storageBucket: "alfa-vox-portfolio.appspot.com",
    messagingSenderId: "326170168205",
    appId: "1:326170168205:web:4c68b1b06ca6753808cbc4",
    measurementId: "G-37ZVK4BRY4"
};

// Initialize Firebase services
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
const analytics = firebase.analytics();

// Set session persistence to LOCAL (1 week)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(error => {
        console.error('Error setting auth persistence:', error);
        showStatusMessage('Failed to initialize session settings. Please refresh the page.', 'error');
    });

// Cloudinary configuration
const cloudinaryConfig = {
    cloudName: 'dfok1ayds',
    uploadPreset: 'Payment_Proof_preset',
    sources: ['local', 'camera'],
    multiple: false,
    clientAllowedFormats: ['jpg', 'png', 'jpeg'],
    maxImageFileSize: 5000000 // 5MB
};

// DOM elements cache
const elements = {
    // Status messages
    statusMessage: document.getElementById('statusMessage'),
    statusMessageSubscribe: document.getElementById('statusMessageSubscribe'),
    
    // Trial elements
    startTrialBtn: document.getElementById('startTrialBtn'),
    trialModal: document.getElementById('trialModal'),
    closeModal: document.querySelector('.close-modal'),
    trialForm: document.getElementById('trialForm'),
    trialName: document.getElementById('trialName'),
    trialPhone: document.getElementById('trialPhone'),
    trialEmail: document.getElementById('trialEmail'),
    submitTrialBtn: document.getElementById('submitTrialBtn'),
    trialStatusCard: document.getElementById('trialStatusCard'),
    trialDaysLeft: document.getElementById('trialDaysLeft'),
    upgradeFromTrialBtn: document.getElementById('upgradeFromTrialBtn'),
    
    // Subscription elements
    planSubscribeBtns: document.querySelectorAll('.plan-subscribe'),
    qrContainer: document.getElementById('qrContainer'),
    paymentProofContainer: document.getElementById('paymentProofContainer'),
    subName: document.getElementById('subName'),
    subPhone: document.getElementById('subPhone'),
    subPlan: document.getElementById('subPlan'),
    themeSelect: document.getElementById('theme'),
    showQRBtn: document.getElementById('showQRBtn'),
    qrImage: document.getElementById('qrImage'),
    qrAmount: document.getElementById('qrAmount'),
    paymentProofInput: document.getElementById('paymentProof'),
    imagePreview: document.getElementById('imagePreview'),
    submitProofBtn: document.getElementById('submitProofBtn'),
    uploadPaymentProofBtn: document.getElementById('uploadPaymentProof'),
    paymentProofUrlInput: document.getElementById('paymentProofUrl'),
    
    // Dashboard elements
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    userStatus: document.getElementById('userStatus'),
    userPlan: document.getElementById('userPlan'),
    subscriptionDetails: document.getElementById('subscriptionDetails'),
    startDate: document.getElementById('startDate'),
    expiryDate: document.getElementById('expiryDate'),
    gracePeriod: document.getElementById('gracePeriod'),
    periodDays: document.getElementById('periodDays'),
    subscriptionTheme: document.getElementById('subscriptionTheme'),
    transactionId: document.getElementById('transactionId'),
    updatedAt: document.getElementById('updatedAt'),
    renewBtn: document.getElementById('renewBtn'),
    userAdminBtn: document.getElementById('userAdminBtn'),
    activeSubscriptionWarning: document.getElementById('activeSubscriptionWarning'),
    expiryDateWarning: document.getElementById('expiryDateWarning'),
    
    // Navigation
    pages: document.querySelectorAll('.page'),
    navItems: document.querySelectorAll('.nav-item')
};

// Application state with session tracking
const state = {
    currentUser: null,
    currentSubscription: null,
    currentTrial: null,
    trialExpiryAlertShown: false,
    cloudinaryWidget: null,
    qrCodes: {},
    sessionTimeout: null,
    lastActivity: null,
    inactivityTimeout: 7 * 24 * 60 * 60 * 1000 // 1 week in ms
};

/**
 * Initialize the application
 */
function init() {
    try {
        // Ensure modal is hidden on init
        elements.trialModal.classList.add('hidden');

        loadQRCodes();
        setupEventListeners();
        initCloudinaryWidget();

        // Set up auth state observer with session tracking
        auth.onAuthStateChanged(user => {
            try {
                handleAuthStateChange(user);

                const authSection = document.getElementById('authSection');

                if (user) {
                    // User is signed in
                    console.log('User authenticated:', user.email);
                    startSessionTimer();
                    trackUserActivity();

                    // Update UI for logged-in state
                    if (authSection) {
                        authSection.innerHTML = `
                            <button class="btn btn-danger" id="logoutBtn">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        `;

                        // Logout handler
                        document.getElementById('logoutBtn').addEventListener('click', () => {
                            auth.signOut().then(() => {
                                window.location.reload();
                            }).catch(error => {
                                console.error('Logout error:', error);
                                showStatusMessage('Logout failed. Please try again.', 'error');
                            });
                        });
                    }

                    checkUserSubscription(user.uid).then(() => {
                        if (state.currentSubscription || state.currentTrial) {
                            showPage('dashboard');
                        } else {
                            showPage('home');
                        }
                    });

                } else {
                    // User is signed out
                    console.log('User signed out');

                    if (authSection) {
                        authSection.innerHTML = `
                            <a href="login.html" class="btn btn-primary">
                                <i class="fas fa-sign-in-alt"></i> Login
                            </a>
                        `;
                    }

                    clearSession();
                    showPage('home');
                }

            } catch (error) {
                console.error('Auth state change error:', error);
                showStatusMessage('Authentication error. Please refresh the page.', 'error');

                const authSection = document.getElementById('authSection');
                if (authSection) {
                    authSection.innerHTML = `
                        <a href="login.html" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </a>
                    `;
                }
                showPage('home');
            }
        });

        console.log('Application initialized');
    } catch (error) {
        console.error('Initialization error:', error);
        showStatusMessage('Failed to initialize application. Please refresh the page.', 'error');
    }
}


/**
 * Initialize Cloudinary upload widget with error handling
 */
function initCloudinaryWidget() {
    try {
        state.cloudinaryWidget = cloudinary.createUploadWidget(
            cloudinaryConfig,
            (error, result) => {
                if (!error && result && result.event === "success") {
                    const paymentProofUrl = result.info.secure_url;
                    elements.imagePreview.innerHTML = `<img src="${paymentProofUrl}" alt="Payment Proof Preview" class="proof-preview">`;
                    elements.paymentProofUrlInput.value = paymentProofUrl;
                    showStatusMessage('Payment proof uploaded successfully!', 'success', elements.statusMessageSubscribe);
                } else if (error) {
                    console.error('Cloudinary upload error:', error);
                    showStatusMessage('Upload failed. Please ensure the file is under 5MB and in JPG/PNG format.', 'error', elements.statusMessageSubscribe);
                }
            }
        );
    } catch (error) {
        console.error('Cloudinary widget initialization error:', error);
        showStatusMessage('Payment system temporarily unavailable. Please try again later.', 'error', elements.statusMessageSubscribe);
    }
}

/**
 * Load QR codes for payment options
 */
function loadQRCodes() {
    state.qrCodes = {
        '30': 'https://firebasestorage.googleapis.com/v0/b/alfa-vox-portfolio.firebasestorage.app/o/qr%2FPayment-QR-30.png?alt=media&token=5beb3629-6244-4c01-ab8a-a0061de5d35b',
        '60': 'https://firebasestorage.googleapis.com/v0/b/alfa-vox-portfolio.firebasestorage.app/o/qr%2FPayment-QR-60.png?alt=media&token=fc6f2f31-a20a-4840-a607-9509d27b0b3f',
        '90': 'https://firebasestorage.googleapis.com/v0/b/alfa-vox-portfolio.firebasestorage.app/o/qr%2FPayment-QR-90.png?alt=media&token=7acf624f-962b-4aa6-9039-6aee663e5833'
    };
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Cloudinary upload button
    elements.uploadPaymentProofBtn.addEventListener('click', () => {
        if (!state.cloudinaryWidget) {
            showStatusMessage('Payment system is initializing. Please wait...', 'warning', elements.statusMessageSubscribe);
            return;
        }
        state.cloudinaryWidget.open();
    });
    
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            showPage(page);
        });
    });
    
    // Plan subscribe buttons
    elements.planSubscribeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!state.currentUser) {
                showStatusMessage('Please login first to subscribe', 'error');
                window.location.href = 'login.html';
                return;
            }
            const planDays = btn.dataset.plan;
            showPage('subscribe');
            elements.subPlan.value = planDays;
        });
    });
    
    // Start trial button
    elements.startTrialBtn.addEventListener('click', handleStartTrial);
    
    // Modal close button
    elements.closeModal.addEventListener('click', () => {
        elements.trialModal.classList.add('hidden');
    });
    
    // Trial form submission
    elements.trialForm.addEventListener('submit', handleTrialSubmit);
    
    // Show QR button
    elements.showQRBtn.addEventListener('click', handleShowQR);
    
    // Submit proof button
    elements.submitProofBtn.addEventListener('click', handleSubmitProof);
    
    // Renew button
    elements.renewBtn.addEventListener('click', () => {
        showPage('subscribe');
    });
    
    // Upgrade from trial button
    elements.upgradeFromTrialBtn.addEventListener('click', () => {
        showPage('subscribe');
    });
    
    // User Admin button
    elements.userAdminBtn.addEventListener('click', () => {
        if (state.currentUser) {
            window.location.href = 'useradmin.html';
        }
    });
}

/**
 * Start session timer for 1 week of inactivity
 */
function startSessionTimer() {
    // Clear any existing timeout
    if (state.sessionTimeout) {
        clearTimeout(state.sessionTimeout);
    }
    
    // Set new timeout
    state.sessionTimeout = setTimeout(() => {
        showStatusMessage('Your session has expired due to inactivity. Please login again.', 'warning');
        auth.signOut().catch(error => {
            console.error('Auto-logout error:', error);
        });
    }, state.inactivityTimeout);
    
    state.lastActivity = Date.now();
}

/**
 * Track user activity to reset session timer
 */
function trackUserActivity() {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
    
    activityEvents.forEach(event => {
        document.addEventListener(event, () => {
            state.lastActivity = Date.now();
        });
    });
}

/**
 * Handle authentication state changes
 */
function handleAuthStateChange(user) {
    if (user) {
        // User is signed in
        state.currentUser = user;
        
        try {
            updateUserUI(user);
            checkUserSubscription(user.uid).then(() => {
                if (state.currentSubscription || state.currentTrial) {
                    showPage('dashboard');
                } else {
                    showPage('home');
                }
            });
            
            analytics.logEvent('login');
        } catch (error) {
            console.error('Post-login error:', error);
            showStatusMessage('Error loading your account data. Please try again.', 'error');
            auth.signOut();
        }
    } else {
        // User is signed out
        clearSession();
    }
}

/**
 * Clear all session data
 */
function clearSession() {
    if (state.sessionTimeout) {
        clearTimeout(state.sessionTimeout);
    }
    
    state.currentUser = null;
    state.currentSubscription = null;
    state.currentTrial = null;
    state.lastActivity = null;
    state.sessionTimeout = null;
    
    resetUserUI();
    showPage('home');
    
    analytics.logEvent('logout');
}

/**
 * Handle start trial button click
 */
function handleStartTrial() {
    if (!auth.currentUser) {
        // Redirect to login page
        window.location.href = 'login.html';
    } else {
        checkTrialEligibility();
    }
}

/**
 * Check if user is eligible for trial
 */
async function checkTrialEligibility() {
    if (!state.currentUser) return;

    try {
        elements.startTrialBtn.innerHTML = '<div class="loading"></div> Checking...';
        
        const [subDoc, portfolioDoc] = await Promise.all([
            db.collection('subscriptions').doc(state.currentUser.uid).get(),
            db.collection('portfolios').doc(state.currentUser.uid).get()
        ]);

        if (subDoc.exists || portfolioDoc.exists) {
            showStatusMessage('You already have an active subscription or trial', 'error');
            showPage('dashboard');
        } else {
            elements.trialEmail.value = state.currentUser.email;
            elements.trialModal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error checking trial eligibility:', error);
        showStatusMessage('Unable to check trial eligibility. Please try again later.', 'error');
    } finally {
        elements.startTrialBtn.textContent = 'Start Free Trial';
    }
}
/**
 * Handle trial form submission
 */
async function handleTrialSubmit(e) {
    e.preventDefault();
    
    const name = elements.trialName.value.trim();
    const phone = elements.trialPhone.value.trim();
    
    if (!name || !phone) {
        showStatusMessage('Please fill all fields', 'error');
        return;
    }
    
    elements.submitTrialBtn.disabled = true;
    elements.submitTrialBtn.innerHTML = '<div class="loading"></div> Starting Trial...';
    
    try {
        const now = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(now.getDate() + 7); // 7-day trial
        
        const subscriptionData = {
            userId: state.currentUser.uid,
            name,
            email: state.currentUser.email,
            phone,
            plan: 'trial',
            status: 'active',
            startDate: now.toISOString(),
            expiryDate: expiryDate.toISOString(),
            gracePeriodEndsAt: expiryDate.toISOString(),
            updatedAt: now.toISOString(),
            isTrial: true
        };
        
        const portfolioData = {
            userId: state.currentUser.uid,
            plan: 'trial',
            status: 'active',
            startDate: now.toISOString(),
            expiryDate: expiryDate.toISOString(),
            updatedAt: now.toISOString()
        };
        
        const batch = db.batch();
        const subRef = db.collection('subscriptions').doc(state.currentUser.uid);
        const portfolioRef = db.collection('portfolios').doc(state.currentUser.uid);
        
        batch.set(subRef, subscriptionData);
        batch.set(portfolioRef, portfolioData);
        
        await batch.commit();
        
        state.currentSubscription = subscriptionData;
        state.currentTrial = subscriptionData;
        updateSubscriptionUI(subscriptionData);
        updateTrialUI(subscriptionData);
        
        elements.trialModal.classList.add('hidden');
        showStatusMessage('Your 7-day free trial has started!', 'success');
        showPage('dashboard');
        
        analytics.logEvent('trial_started');
    } catch (error) {
        console.error('Error starting trial:', error);
        showStatusMessage(`Failed to start trial: ${error.message}`, 'error');
    } finally {
        elements.submitTrialBtn.disabled = false;
        elements.submitTrialBtn.textContent = 'Start Free Trial';
    }
}

/**
 * Handle show QR button click
 */
function handleShowQR() {
    const name = elements.subName.value.trim();
    const phone = elements.subPhone.value.trim();
    const plan = elements.subPlan.value;
    const theme = elements.themeSelect.value;
    
    if (!name || !phone || !plan || !theme) {
        showStatusMessage('Please fill all fields', 'error', elements.statusMessageSubscribe);
        return;
    }
    
    if (state.currentSubscription) {
        const now = new Date();
        const expiry = new Date(state.currentSubscription.expiryDate);
        
        if (now < expiry && state.currentSubscription.status === 'active') {
            elements.expiryDateWarning.textContent = formatDate(state.currentSubscription.expiryDate);
            elements.activeSubscriptionWarning.classList.remove('hidden');
            // return;
        }
    }
    
    elements.qrAmount.textContent = `₹${plan}`;
    elements.qrImage.src = state.qrCodes[plan];
    
    elements.qrContainer.classList.add('hidden');
    elements.paymentProofContainer.classList.remove('hidden');
    
    analytics.logEvent('view_qr', { plan });
}

/**
 * Handle submit proof button click
 */
async function handleSubmitProof() {
    const name = elements.subName.value.trim();
    const phone = elements.subPhone.value.trim();
    const plan = elements.subPlan.value;
    const theme = elements.themeSelect.value;
    const paymentProofUrl = elements.paymentProofUrlInput.value;
    
    if (!name || !phone || !plan || !theme || !paymentProofUrl) {
        showStatusMessage('Please fill all fields and upload payment proof', 'error', elements.statusMessageSubscribe);
        return;
    }
    
    elements.submitProofBtn.disabled = true;
    elements.submitProofBtn.innerHTML = '<div class="loading"></div> Processing...';
    
    try {
        const now = new Date();

// Start from current expiry if still active, else from now
let startDate = now;
if (
    state.currentSubscription &&
    new Date(state.currentSubscription.expiryDate) > now &&
    state.currentSubscription.status === 'active'
) {
    startDate = new Date(state.currentSubscription.expiryDate);
}

const expiryDate = new Date(startDate);
expiryDate.setDate(startDate.getDate() + parseInt(plan));

const gracePeriodEndsAt = new Date(expiryDate);
gracePeriodEndsAt.setDate(expiryDate.getDate() + 3);

        
        const subscriptionData = {
            userId: state.currentUser.uid,
            name,
            email: state.currentUser.email,
            phone,
            plan,
            theme,
            paymentProof: paymentProofUrl,
            status: 'pending',
            startDate: now.toISOString(),
            expiryDate: expiryDate.toISOString(),
            gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
            transactionId: 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            updatedAt: now.toISOString(),
            requestedAt: now.toISOString(),
            isTrial: false
        };
        
        await db.collection('subscriptions').doc(state.currentUser.uid).set(subscriptionData);
        
        if (state.currentTrial) {
            await db.collection('portfolios').doc(state.currentUser.uid).update({
                plan,
                status: 'pending',
                expiryDate: expiryDate.toISOString(),
                updatedAt: now.toISOString()
            });
        }
        
        state.currentSubscription = subscriptionData;
        updateSubscriptionUI(subscriptionData);
        
        showStatusMessage('Payment proof submitted successfully! Your subscription will be activated after verification.', 'success', elements.statusMessageSubscribe);
        
        setTimeout(() => {
            showPage('dashboard');
        }, 3000);
        
        analytics.logEvent('subscription_requested', { plan });
    } catch (error) {
        console.error('Error submitting payment proof:', error);
        showStatusMessage(`Submission failed: ${error.message}`, 'error', elements.statusMessageSubscribe);
    } finally {
        elements.submitProofBtn.disabled = false;
        elements.submitProofBtn.textContent = 'Submit Proof';
    }
}

/**
 * Show specific page
 */
function showPage(pageId) {
    elements.pages.forEach(page => {
        page.classList.remove('active');
    });
    
    document.getElementById(`${pageId}Page`).classList.add('active');
    
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
    
    if (pageId === 'home') {
        elements.trialModal.classList.add('hidden');
    }
    
    if (pageId === 'subscribe') {
        resetSubscribeForm();
    }
    
    analytics.logEvent('page_view', { page_id: pageId });
}

/**
 * Update user UI with user data
 */
function updateUserUI(user) {
    elements.userName.textContent = user.displayName || 'Not provided';
    elements.userEmail.textContent = user.email;
    elements.subName.value = user.displayName || '';
   // Show public portfolio link
const linkContainer = document.getElementById('publicLinkContainer');
const linkElement = document.getElementById('publicLink');

if (linkContainer && linkElement) {
    const uid = user.uid;
    const url = `https://alfagroups.tech/port.html?uid=${uid}`;
    linkElement.href = url;
    linkElement.textContent = url;
    linkContainer.classList.remove('hidden');

    // Copy to clipboard functionality
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 1500);
            }).catch(err => {
                console.error('Clipboard copy failed:', err);
                copyBtn.textContent = 'Failed';
            });
        };
    }
}

}

/**
 * Reset user UI when logged out
 */
function resetUserUI() {
    elements.userName.textContent = '';
    elements.userEmail.textContent = '';
    elements.userStatus.textContent = 'Not subscribed';
    elements.userStatus.className = 'status-badge';
    elements.userPlan.textContent = '-';
    elements.subscriptionDetails.classList.add('hidden');
    elements.renewBtn.classList.add('hidden');
    elements.userAdminBtn.classList.add('hidden');
    elements.trialStatusCard.classList.add('hidden');
    elements.trialModal.classList.add('hidden');
}

/**
 * Reset subscribe form
 */
function resetSubscribeForm() {
    elements.qrContainer.classList.remove('hidden');
    elements.paymentProofContainer.classList.add('hidden');
    if (state.currentUser) {
        elements.subName.value = state.currentUser.displayName || '';
    }
    elements.subPhone.value = '';
    elements.imagePreview.innerHTML = '';
    elements.statusMessageSubscribe.classList.add('hidden');
    elements.activeSubscriptionWarning.classList.add('hidden');
}

/**
 * Check user subscription status
 */
async function checkUserSubscription(userId) {
    try {
        const doc = await db.collection ('subscriptions').doc(userId).get();
        if (doc.exists) {
            const data = doc.data();

            const now = new Date();
            const graceEnds = new Date(data.gracePeriodEndsAt);

            // Auto-mark as expired if grace period has ended
            if (now > graceEnds && data.status !== 'expired') {
                await db.collection('subscriptions').doc(userId).update({
                    status: 'expired',
                    updatedAt: now.toISOString()
                });
                data.status = 'expired'; // Update local reference
            }

            state.currentSubscription = data;

            if (data.isTrial) {
                state.currentTrial = data;
                updateTrialUI(data);
            } else {
                updateSubscriptionUI(data);
            }
        } else {
            state.currentSubscription = null;
            resetSubscriptionUI();
        }
    } catch (error) {
        console.error('Error checking subscription:', error);
        showStatusMessage('Error loading subscription data. Please try again.', 'error');
    }
}

/**
 * Update UI with subscription data
 */
function updateSubscriptionUI(data) {
    elements.userPlan.textContent = `${data.plan} Days` || '-';
    
    elements.userStatus.textContent = data.status || 'pending';
    elements.userStatus.className = 'status-badge ' + 
        (data.status === 'active' ? 'status-active' : 
         data.status === 'expired' ? 'status-expired' : 'status-pending');
    
    elements.subscriptionDetails.classList.remove('hidden');
    elements.startDate.textContent = formatDate(data.startDate);
    elements.expiryDate.textContent = formatDate(data.expiryDate);
    elements.gracePeriod.textContent = formatDate(data.gracePeriodEndsAt);
    elements.periodDays.textContent = data.plan || '-';
    elements.subscriptionTheme.textContent = data.theme || '-';
    elements.transactionId.textContent = data.transactionId || '-';
    elements.updatedAt.textContent = formatDate(data.updatedAt);
    
    elements.renewBtn.classList.add('hidden');
    elements.userAdminBtn.classList.add('hidden');
    
    const now = new Date();
    const expiry = new Date(data.expiryDate);
    if (data.status === 'active' && now < expiry) {
        elements.userAdminBtn.classList.remove('hidden');
    } else if (data.status === 'expired' || (data.status === 'active' && now > expiry)) {
        elements.renewBtn.classList.remove('hidden');
        elements.expiryDateWarning.textContent = formatDate(data.expiryDate);
    }
    
    elements.trialStatusCard.classList.add('hidden');
}

/**
 * Update UI with trial data
 */
function updateTrialUI(data) {
    elements.trialStatusCard.classList.remove('hidden');
    
    const now = new Date();
    const expiry = new Date(data.expiryDate);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    elements.trialDaysLeft.textContent = daysLeft;
    
    if (daysLeft <= 2 && !state.trialExpiryAlertShown) {
        showStatusMessage(`Your trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Upgrade now to continue access.`, 'warning');
        state.trialExpiryAlertShown = true;
    }
    
    elements.userPlan.textContent = '7-Day Trial';
    elements.userStatus.textContent = 'active';
    elements.userStatus.className = 'status-badge status-active';
    
    elements.subscriptionDetails.classList.remove('hidden');
    elements.startDate.textContent = formatDate(data.startDate);
    elements.expiryDate.textContent = formatDate(data.expiryDate);
    elements.gracePeriod.textContent = formatDate(data.gracePeriodEndsAt);
    elements.periodDays.textContent = '7';
    elements.subscriptionTheme.textContent = data.theme || '-';
    elements.transactionId.textContent = 'TRIAL-' + state.currentUser.uid.substring(0, 8).toUpperCase();
    elements.updatedAt.textContent = formatDate(data.updatedAt);
    
    elements.renewBtn.classList.add('hidden');
    elements.userAdminBtn.classList.remove('hidden');
}

/**
 * Reset subscription UI when no subscription
 */
function resetSubscriptionUI() {
    elements.userStatus.textContent = 'Not subscribed';
    elements.userStatus.className = 'status-badge';
    elements.userPlan.textContent = '-';
    elements.subscriptionDetails.classList.add('hidden');
    elements.renewBtn.classList.add('hidden');
    elements.userAdminBtn.classList.add('hidden');
    elements.trialStatusCard.classList.add('hidden');
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Show status message
 */
function showStatusMessage(message, type, element = elements.statusMessage) {
    if (!element) return;
    
    element.innerHTML = `
        <div class="message-content">
            <span class="message-icon">${getIconForType(type)}</span>
            <span class="message-text">${message}</span>
        </div>
    `;
    element.className = `status-message ${type} visible`;
    
    const timeout = type === 'error' ? 8000 : 5000;
    const hideTimer = setTimeout(() => {
        element.classList.remove('visible');
    }, timeout);
    
    element.addEventListener('click', () => {
        clearTimeout(hideTimer);
        element.classList.remove('visible');
    });
}

/**
 * Get icon for message type
 */
function getIconForType(type) {
    const icons = {
        success: '✓',
        error: '⚠',
        warning: '⚠',
        info: 'i'
    };
    return icons[type] || '';
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);