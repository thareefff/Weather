// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDEj38aSEXvWivHOr_J-28mQziW3L56y6Q",
  authDomain: "alfa-vox-portfolio.firebaseapp.com",
  projectId: "alfa-vox-portfolio",
  storageBucket: "alfa-vox-portfolio.firebasestorage.app",
  messagingSenderId: "326170168205",
  appId: "1:326170168205:web:4c68b1b06ca6753808cbc4",
  measurementId: "G-37ZVK4BRY4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();



// Utility function to get current user ID
function getUserId() {
  const user = auth.currentUser;
  if (!user) {
    showToast('User not authenticated', 'error');
    throw new Error('User not authenticated');
  }
  return user.uid;
}
// Improved Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? 'fa-check-circle' :
               type === 'error' ? 'fa-exclamation-circle' :
               type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close"><i class="fas fa-times"></i></button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  toast.querySelector('.toast-close').addEventListener('click', () => hideToast(toast));

  if (duration > 0) setTimeout(() => hideToast(toast), duration);

  return toast;
}

function hideToast(toast) {
  toast.classList.remove('show');
  setTimeout(() => toast.remove(), 300);
}

// H
// Improved auth state handler
function initializeAuth() {
  auth.onAuthStateChanged(async (user) => {
    // First check if we're processing an email link
    if (auth.isSignInWithEmailLink(window.location.href)) {
      return; // Let handleLoginLink() deal with this
    }

    if (user) {
      const approved = await checkApproval();
      if (!approved) {
        await auth.signOut();
        localStorage.removeItem('loginTimestamp');
        showToast("Your account is not approved", "error");
        return;
      }

      // Show admin UI
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('adminContent').style.display = 'block';
      initializeAdminPanel();

      // Initialize or maintain session timeout
      let loginTimestamp = parseInt(localStorage.getItem('loginTimestamp'));
      if (!loginTimestamp) {
        loginTimestamp = Date.now();
        localStorage.setItem('loginTimestamp', loginTimestamp.toString());
      }

      const now = Date.now();
      const timePassed = now - loginTimestamp;
      const timeLeft = 7200000 - timePassed; // 2 hours in ms

      if (timeLeft <= 0) {
        await auth.signOut();
        localStorage.removeItem('loginTimestamp');
        showToast('Session expired', 'warning');
        return window.location.reload();
      }

      if (sessionTimeout) clearTimeout(sessionTimeout);
      sessionTimeout = setTimeout(() => {
        auth.signOut().then(() => {
          showToast('Session expired after 2 hours', 'warning');
          localStorage.removeItem('loginTimestamp');
          window.location.reload();
        });
      }, timeLeft);
    } else {
      document.getElementById('loginContainer').style.display = 'block';
      document.getElementById('adminContent').style.display = 'none';
    }
  });
}

// Improved email link handler
async function handleLoginLink() {
  if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn') || 
                window.sessionStorage.getItem('emailForSignIn') ||
                new URLSearchParams(window.location.search).get('email');

    if (!email) {
      showToast('Email is required to complete login', 'error');
      return;
    }

    showToast('Signing you in...', 'info');

    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      await auth.signInWithEmailLink(email, window.location.href);
      
      // Clean up email storage and URL
      window.localStorage.removeItem('emailForSignIn');
      window.sessionStorage.removeItem('emailForSignIn');
      window.history.replaceState({}, document.title, window.location.pathname);

      const approved = await checkApproval();
      if (!approved) {
        await auth.signOut();
        showToast("Access denied. Your account is not approved.", "error");
        return;
      }

      // Set login timestamp
      const now = Date.now();
      localStorage.setItem('loginTimestamp', now.toString());

      // Initialize auth state which will show admin UI
      initializeAuth();
    } catch (error) {
      console.error('Error signing in with email link', error);
      showToast('Error signing in: ' + error.message, 'error');
    }
  }
}

// Check if user is approved
async function checkApproval() {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const doc = await db.collection('portfolios').doc(user.uid).get();
    return doc.exists && doc.data().status === 'active';
  } catch (error) {
    console.error('Error checking approval status:', error);
    return false;
  }
}

// Setup email login form
function setupEmailLogin() {
  const emailLoginForm = document.getElementById('emailLoginForm');
  const sendLinkBtn = document.getElementById('sendLinkBtn');
  const sendLinkBtnText = document.getElementById('sendLinkBtnText');

  if (!emailLoginForm || !sendLinkBtn || !sendLinkBtnText) return;

  emailLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email')?.value.trim();
    if (!email) return showToast('Please enter a valid email address', 'error');

    sendLinkBtn.disabled = true;
    sendLinkBtnText.textContent = 'Sending...';

    const actionCodeSettings = {
      url: `${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(email)}`,
      handleCodeInApp: true
    };

    auth.sendSignInLinkToEmail(email, actionCodeSettings)
      .then(() => {
        window.localStorage.setItem('emailForSignIn', email);
        window.sessionStorage.setItem('emailForSignIn', email);

        document.getElementById('emailSentMessage').classList.remove('hidden');
        emailLoginForm.classList.add('hidden');
        showToast('Login link sent to your email!', 'success');
      })
      .catch((error) => {
        console.error('Error sending login link:', error);
        showToast('Error: ' + error.message, 'error');
      })
      .finally(() => {
        sendLinkBtn.disabled = false;
        sendLinkBtnText.textContent = 'Send Login Link';
      });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupEmailLogin();
  initializeAuth(); // Set up auth state observer first
  handleLoginLink(); // Then check for login links
});

// Initialize the admin panel
function initializeAdminPanel() {
  const mainContent = document.getElementById('adminContent');
  if (!mainContent) return;

  // Initialize all sections
  initProfileSection();
  initThemeSection();
  initResumeSection();
  initSkillsSection();
  initLanguagesSection();
  initExperienceSection();
  initProjectsSection();
  initResearchSection();
  initCertificatesSection();
  initOpenSourceSection();
  initAwardsSection();
  initTimelineSection();
  initGallerySection();
  initSocialSection();

  // Add logout button
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Logout';
  logoutBtn.className = 'btn btn-danger';
  logoutBtn.style.marginLeft = 'auto';
  logoutBtn.onclick = () => {
    auth.signOut().then(() => {
      showToast('Successfully logged out', 'success');
      // Clear the session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
      setTimeout(() => window.location.reload(), 1500);
    });
  };

  const dashboardHeader = document.querySelector('.dashboard-header');
  if (dashboardHeader) dashboardHeader.appendChild(logoutBtn);
}

// All other section initialization functions remain the same...
// (initProfileSection, initResumeSection, etc.)
// ==================== PROFILE SECTION ====================
function initProfileSection() {
  const profileForm = document.getElementById('profile-form');
  const photoInput = document.getElementById('photo-input');
  
  if (!profileForm || !photoInput) return;
  
  // Load profile data
  loadProfile();
  
  // Set up form submission
  profileForm.addEventListener('submit', saveProfile);
  
  // Set up photo upload
  photoInput.addEventListener('change', uploadProfilePhoto);
}

async function loadProfile() {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('profile').doc('data').get();
    
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('profile-name').value = data.name || '';
      document.getElementById('profile-title').value = data.title || '';
      document.getElementById('profile-location').value = data.location || '';
      document.getElementById('profile-bio').value = data.bio || '';
      document.getElementById('profile-github').value = data.social?.github || '';
      document.getElementById('profile-linkedin').value = data.social?.linkedin || '';
      document.getElementById('profile-email').value = data.social?.email || '';
      
      // Load profile photo if exists
      if (data.photoUrl) {
        document.getElementById('photo-preview').src = data.photoUrl;
      }
    }
  } catch (error) {
    showToast('Error loading profile: ' + error.message, 'error');
    console.error('Error loading profile:', error);
  }
}

async function saveProfile(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const profileData = {
      name: document.getElementById('profile-name').value,
      title: document.getElementById('profile-title').value,
      location: document.getElementById('profile-location').value,
      bio: document.getElementById('profile-bio').value,
      social: {
        github: document.getElementById('profile-github').value,
        linkedin: document.getElementById('profile-linkedin').value,
        email: document.getElementById('profile-email').value
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).collection('profile').doc('data').set(profileData, { merge: true });
    showToast('Profile saved successfully!', 'success');
  } catch (error) {
    showToast('Error saving profile: ' + error.message, 'error');
    console.error('Error saving profile:', error);
  }
}

async function uploadProfilePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const userId = getUserId();
    const storageRef = storage.ref(`users/${userId}/profile-photo`);
    const uploadTask = storageRef.put(file);

    showToast('Uploading profile photo...', 'info');

    uploadTask.on('state_changed', 
      null,
      (error) => {
        showToast('Upload failed: ' + error.message, 'error');
      },
      async () => {
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        
        // Update profile photo URL in Firestore
        await db.collection('users').doc(userId).collection('profile').doc('data').set({
          photoUrl: downloadURL,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Update the preview
        document.getElementById('photo-preview').src = downloadURL;
        showToast('Profile photo uploaded successfully!', 'success');
      }
    );
  } catch (error) {
    showToast('Error uploading profile photo: ' + error.message, 'error');
    console.error('Error uploading profile photo:', error);
  }
}


// ==================== theme SECTION ====================
function initThemeSection() {
  const themeForm = document.getElementById('theme-form');
  const themeSelect = document.getElementById('theme-select');

  if (!themeForm || !themeSelect) return;

  loadTheme();

  themeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const userId = getUserId();
      const selectedTheme = themeSelect.value;
     await db.collection('users').doc(userId).collection('profile').doc('data').set({ theme: selectedTheme }, { merge: true });

      showToast('Theme updated successfully!', 'success');
    } catch (error) {
      showToast('Error saving theme: ' + error.message, 'error');
    }
  });
}

async function loadTheme() {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('profile').doc('data').get();
    if (doc.exists && doc.data().theme) {
      document.getElementById('theme-select').value = doc.data().theme;
    }
  } catch (error) {
    showToast('Error loading theme: ' + error.message, 'error');
  }
}


// ==================== RESUME SECTION ====================
function initResumeSection() {
  const resumeInput = document.getElementById('resume-input');
  const uploadResumeBtn = document.getElementById('upload-resume');
  
  if (!resumeInput || !uploadResumeBtn) return;
  
  // Load current resume if exists
  loadResume();
  
  // Set up resume upload
  uploadResumeBtn.addEventListener('click', () => resumeInput.click());
  resumeInput.addEventListener('change', uploadResume);
}

async function loadResume() {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('resumes').doc('current').get();
    
    if (doc.exists) {
      const resume = doc.data();
      document.getElementById('resume-link').href = resume.fileUrl;
      document.getElementById('resume-link').textContent = resume.fileName;
      document.getElementById('resume-size').textContent = resume.fileSize;
    }
  } catch (error) {
    showToast('Error loading resume: ' + error.message, 'error');
    console.error('Error loading resume:', error);
  }
}

async function uploadResume(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const userId = getUserId();
    const storageRef = storage.ref(`users/${userId}/resumes/${file.name}`);
    const uploadTask = storageRef.put(file);

    showToast('Uploading resume...', 'info');

    uploadTask.on('state_changed',
      null,
      (error) => {
        showToast('Upload failed: ' + error.message, 'error');
      },
      async () => {
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        await db.collection('users').doc(userId).collection('resumes').doc('current').set({
          fileName: file.name,
          fileUrl: downloadURL,
          fileSize: fileSize,
          uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        document.getElementById('resume-link').href = downloadURL;
        document.getElementById('resume-link').textContent = file.name;
        document.getElementById('resume-size').textContent = fileSize;

        showToast('Resume uploaded successfully!', 'success');
      }
    );
  } catch (error) {
    showToast('Error uploading resume: ' + error.message, 'error');
    console.error('Error uploading resume:', error);
  }
}

// ==================== SKILLS SECTION ====================
function initSkillsSection() {
  const addSkillBtn = document.getElementById('add-skill');
  const skillForm = document.getElementById('skill-form');
  const cancelSkillBtn = document.getElementById('cancel-skill');
  const skillContainer = document.getElementById('skill-container');
  
  if (!addSkillBtn || !skillForm || !cancelSkillBtn || !skillContainer) return;
  
  // Load skills
  loadSkills();
  
  // Add new skill
  addSkillBtn.addEventListener('click', () => {
    skillForm.reset();
    skillForm.classList.remove('hidden');
    document.getElementById('skill-id').value = '';
  });
  
  // Cancel skill edit
  cancelSkillBtn.addEventListener('click', () => {
    skillForm.reset();
    skillForm.classList.add('hidden');
  });
  
  // Save skill
  skillForm.addEventListener('submit', saveSkill);
}

async function loadSkills() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('skills').orderBy('name').get();
    
    const skillContainer = document.getElementById('skill-container');
    skillContainer.innerHTML = '';
    
    if (snapshot.empty) {
      skillContainer.innerHTML = '<p>No skills added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const skill = doc.data();
      const skillElement = createSkillElement(doc.id, skill);
      skillContainer.appendChild(skillElement);
    });
  } catch (error) {
    showToast('Error loading skills: ' + error.message, 'error');
    console.error('Error loading skills:', error);
  }
}

function createSkillElement(id, skill) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${skill.name}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <div class="progress">
        <div class="progress-bar" role="progressbar" style="width: ${skill.proficiency}%" 
             aria-valuenow="${skill.proficiency}" aria-valuemin="0" aria-valuemax="100">
          ${skill.proficiency}%
        </div>
      </div>
      <p><strong>Category:</strong> ${skill.category}</p>
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editSkill(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteSkill(id));
  
  return element;
}

async function editSkill(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('skills').doc(id).get();
    
    if (doc.exists) {
      const skill = doc.data();
      document.getElementById('skill-id').value = id;
      document.getElementById('skill-name').value = skill.name;
      document.getElementById('skill-proficiency').value = skill.proficiency;
      document.getElementById('skill-category').value = skill.category;
      document.getElementById('skill-icon').value = skill.icon || '';
      
      document.getElementById('skill-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading skill: ' + error.message, 'error');
    console.error('Error loading skill:', error);
  }
}

async function saveSkill(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const skillId = document.getElementById('skill-id').value;
    const skillData = {
      name: document.getElementById('skill-name').value,
      proficiency: parseInt(document.getElementById('skill-proficiency').value),
      category: document.getElementById('skill-category').value,
      icon: document.getElementById('skill-icon').value || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (skillId) {
      // Update existing skill
      await db.collection('users').doc(userId).collection('skills').doc(skillId).set(skillData, { merge: true });
      showToast('Skill updated successfully!', 'success');
    } else {
      // Add new skill
      await db.collection('users').doc(userId).collection('skills').add(skillData);
      showToast('Skill added successfully!', 'success');
    }
    
    // Reset form and reload skills
    document.getElementById('skill-form').reset();
    document.getElementById('skill-form').classList.add('hidden');
    loadSkills();
  } catch (error) {
    showToast('Error saving skill: ' + error.message, 'error');
    console.error('Error saving skill:', error);
  }
}

async function deleteSkill(id) {
  if (!confirm('Are you sure you want to delete this skill?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('skills').doc(id).delete();
    showToast('Skill deleted successfully!', 'success');
    loadSkills();
  } catch (error) {
    showToast('Error deleting skill: ' + error.message, 'error');
    console.error('Error deleting skill:', error);
  }
}

// ==================== LANGUAGES SECTION ====================
function initLanguagesSection() {
  const addLanguageBtn = document.getElementById('add-language');
  const languageForm = document.getElementById('language-form');
  const cancelLanguageBtn = document.getElementById('cancel-language');
  const languageContainer = document.getElementById('language-container');
  
  if (!addLanguageBtn || !languageForm || !cancelLanguageBtn || !languageContainer) return;
  
  // Load languages
  loadLanguages();
  
  // Add new language
  addLanguageBtn.addEventListener('click', () => {
    languageForm.reset();
    languageForm.classList.remove('hidden');
    document.getElementById('language-id').value = '';
  });
  
  // Cancel language edit
  cancelLanguageBtn.addEventListener('click', () => {
    languageForm.reset();
    languageForm.classList.add('hidden');
  });
  
  // Save language
  languageForm.addEventListener('submit', saveLanguage);
}

async function loadLanguages() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('languages').orderBy('name').get();
    
    const languageContainer = document.getElementById('language-container');
    languageContainer.innerHTML = '';
    
    if (snapshot.empty) {
      languageContainer.innerHTML = '<p>No languages added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const language = doc.data();
      const languageElement = createLanguageElement(doc.id, language);
      languageContainer.appendChild(languageElement);
    });
  } catch (error) {
    showToast('Error loading languages: ' + error.message, 'error');
    console.error('Error loading languages:', error);
  }
}

function createLanguageElement(id, language) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${language.name}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Proficiency:</strong> ${language.proficiency}</p>
      <div class="progress-group">
        <label>Reading</label>
        <div class="progress">
          <div class="progress-bar" role="progressbar" style="width: ${language.reading}%" 
               aria-valuenow="${language.reading}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
      <div class="progress-group">
        <label>Writing</label>
        <div class="progress">
          <div class="progress-bar" role="progressbar" style="width: ${language.writing}%" 
               aria-valuenow="${language.writing}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
      <div class="progress-group">
        <label>Speaking</label>
        <div class="progress">
          <div class="progress-bar" role="progressbar" style="width: ${language.speaking}%" 
               aria-valuenow="${language.speaking}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
      <div class="progress-group">
        <label>Listening</label>
        <div class="progress">
          <div class="progress-bar" role="progressbar" style="width: ${language.listening}%" 
               aria-valuenow="${language.listening}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
      ${language.certifications ? `<p><strong>Certifications:</strong> ${language.certifications}</p>` : ''}
      ${language.years ? `<p><strong>Years:</strong> ${language.years}</p>` : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editLanguage(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteLanguage(id));
  
  return element;
}

async function editLanguage(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('languages').doc(id).get();
    
    if (doc.exists) {
      const language = doc.data();
      document.getElementById('language-id').value = id;
      document.getElementById('language-name').value = language.name;
      document.getElementById('language-proficiency').value = language.proficiency;
      document.getElementById('language-reading').value = language.reading;
      document.getElementById('language-writing').value = language.writing;
      document.getElementById('language-speaking').value = language.speaking;
      document.getElementById('language-listening').value = language.listening;
      document.getElementById('language-certifications').value = language.certifications || '';
      document.getElementById('language-years').value = language.years || '';
      document.getElementById('language-flag').value = language.flag || '';
      
      document.getElementById('language-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading language: ' + error.message, 'error');
    console.error('Error loading language:', error);
  }
}

async function saveLanguage(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const languageId = document.getElementById('language-id').value;
    const languageData = {
      name: document.getElementById('language-name').value,
      proficiency: document.getElementById('language-proficiency').value,
      reading: parseInt(document.getElementById('language-reading').value),
      writing: parseInt(document.getElementById('language-writing').value),
      speaking: parseInt(document.getElementById('language-speaking').value),
      listening: parseInt(document.getElementById('language-listening').value),
      certifications: document.getElementById('language-certifications').value || null,
      years: document.getElementById('language-years').value ? parseInt(document.getElementById('language-years').value) : null,
      flag: document.getElementById('language-flag').value || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (languageId) {
      // Update existing language
      await db.collection('users').doc(userId).collection('languages').doc(languageId).set(languageData, { merge: true });
      showToast('Language updated successfully!', 'success');
    } else {
      // Add new language
      await db.collection('users').doc(userId).collection('languages').add(languageData);
      showToast('Language added successfully!', 'success');
    }
    
    // Reset form and reload languages
    document.getElementById('language-form').reset();
    document.getElementById('language-form').classList.add('hidden');
    loadLanguages();
  } catch (error) {
    showToast('Error saving language: ' + error.message, 'error');
    console.error('Error saving language:', error);
  }
}

async function deleteLanguage(id) {
  if (!confirm('Are you sure you want to delete this language?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('languages').doc(id).delete();
    showToast('Language deleted successfully!', 'success');
    loadLanguages();
  } catch (error) {
    showToast('Error deleting language: ' + error.message, 'error');
    console.error('Error deleting language:', error);
  }
}

// ==================== EXPERIENCE SECTION ====================
function initExperienceSection() {
  const addExperienceBtn = document.getElementById('add-experience');
  const experienceForm = document.getElementById('experience-form');
  const cancelExperienceBtn = document.getElementById('cancel-experience');
  const experienceContainer = document.getElementById('experience-container');
  
  if (!addExperienceBtn || !experienceForm || !cancelExperienceBtn || !experienceContainer) return;
  
  // Load experiences
  loadExperiences();
  
  // Add new experience
  addExperienceBtn.addEventListener('click', () => {
    experienceForm.reset();
    document.getElementById('experience-current').checked = false;
    experienceForm.classList.remove('hidden');
    document.getElementById('experience-id').value = '';
  });
  
  // Cancel experience edit
  cancelExperienceBtn.addEventListener('click', () => {
    experienceForm.reset();
    experienceForm.classList.add('hidden');
  });
  
  // Save experience
  experienceForm.addEventListener('submit', saveExperience);
}

async function loadExperiences() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('experiences')
      .orderBy('from', 'desc')
      .get();
    
    const experienceContainer = document.getElementById('experience-container');
    experienceContainer.innerHTML = '';
    
    if (snapshot.empty) {
      experienceContainer.innerHTML = '<p>No experiences added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const experience = doc.data();
      const experienceElement = createExperienceElement(doc.id, experience);
      experienceContainer.appendChild(experienceElement);
    });
  } catch (error) {
    showToast('Error loading experiences: ' + error.message, 'error');
    console.error('Error loading experiences:', error);
  }
}

function createExperienceElement(id, experience) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  // Format dates
  const fromDate = experience.from ? new Date(experience.from.seconds * 1000).toLocaleDateString() : '';
  const toDate = experience.current ? 'Present' : 
                 (experience.to ? new Date(experience.to.seconds * 1000).toLocaleDateString() : '');
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${experience.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Company:</strong> ${experience.company}</p>
      ${experience.location ? `<p><strong>Location:</strong> ${experience.location}</p>` : ''}
      <p><strong>Period:</strong> ${fromDate} - ${toDate}</p>
      ${experience.description ? `<p><strong>Description:</strong> ${experience.description}</p>` : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editExperience(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteExperience(id));
  
  return element;
}

async function editExperience(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('experiences').doc(id).get();
    
    if (doc.exists) {
      const experience = doc.data();
      document.getElementById('experience-id').value = id;
      document.getElementById('experience-title').value = experience.title;
      document.getElementById('experience-company').value = experience.company;
      document.getElementById('experience-location').value = experience.location || '';
      
      // Convert Firestore Timestamp to date input format
      const fromDate = experience.from ? new Date(experience.from.seconds * 1000).toISOString().split('T')[0] : '';
      const toDate = experience.to ? new Date(experience.to.seconds * 1000).toISOString().split('T')[0] : '';
      
      document.getElementById('experience-from').value = fromDate;
      document.getElementById('experience-to').value = toDate;
      document.getElementById('experience-current').checked = experience.current || false;
      document.getElementById('experience-description').value = experience.description || '';
      
      document.getElementById('experience-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading experience: ' + error.message, 'error');
    console.error('Error loading experience:', error);
  }
}

async function saveExperience(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const experienceId = document.getElementById('experience-id').value;
    const isCurrent = document.getElementById('experience-current').checked;
    
    const experienceData = {
      title: document.getElementById('experience-title').value,
      company: document.getElementById('experience-company').value,
      location: document.getElementById('experience-location').value || null,
      from: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('experience-from').value)),
      to: isCurrent ? null : firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('experience-to').value)),
      current: isCurrent,
      description: document.getElementById('experience-description').value || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (experienceId) {
      // Update existing experience
      await db.collection('users').doc(userId).collection('experiences').doc(experienceId).set(experienceData, { merge: true });
      showToast('Experience updated successfully!', 'success');
    } else {
      // Add new experience
      await db.collection('users').doc(userId).collection('experiences').add(experienceData);
      showToast('Experience added successfully!', 'success');
    }
    
    // Reset form and reload experiences
    document.getElementById('experience-form').reset();
    document.getElementById('experience-form').classList.add('hidden');
    loadExperiences();
  } catch (error) {
    showToast('Error saving experience: ' + error.message, 'error');
    console.error('Error saving experience:', error);
  }
}

async function deleteExperience(id) {
  if (!confirm('Are you sure you want to delete this experience?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('experiences').doc(id).delete();
    showToast('Experience deleted successfully!', 'success');
    loadExperiences();
  } catch (error) {
    showToast('Error deleting experience: ' + error.message, 'error');
    console.error('Error deleting experience:', error);
  }
}

// ==================== PROJECTS SECTION ====================
function initProjectsSection() {
  const addProjectBtn = document.getElementById('add-project');
  const projectForm = document.getElementById('project-form');
  const cancelProjectBtn = document.getElementById('cancel-project');
  const projectContainer = document.getElementById('projects-container');
  
  if (!addProjectBtn || !projectForm || !cancelProjectBtn || !projectContainer) return;
  
  // Load projects
  loadProjects();
  
  // Add new project
  addProjectBtn.addEventListener('click', () => {
    projectForm.reset();
    projectForm.classList.remove('hidden');
    document.getElementById('project-id').value = '';
  });
  
  // Cancel project edit
  cancelProjectBtn.addEventListener('click', () => {
    projectForm.reset();
    projectForm.classList.add('hidden');
  });
  
  // Save project
  projectForm.addEventListener('submit', saveProject);
}

async function loadProjects() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('projects').orderBy('title').get();
    
    const projectContainer = document.getElementById('projects-container');
    projectContainer.innerHTML = '';
    
    if (snapshot.empty) {
      projectContainer.innerHTML = '<p>No projects added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const project = doc.data();
      const projectElement = createProjectElement(doc.id, project);
      projectContainer.appendChild(projectElement);
    });
  } catch (error) {
    showToast('Error loading projects: ' + error.message, 'danger');
    console.error('Error loading projects:', error);
  }
}

function createProjectElement(id, project) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${project.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Description:</strong> ${project.description}</p>
      <p><strong>Tools:</strong> ${project.tools}</p>
      <p><strong>Link:</strong> <a href="${project.link}" target="_blank">View Project</a></p>
      ${project.featured ? '<span class="badge bg-primary">Featured</span>' : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editProject(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteProject(id));
  
  return element;
}

async function editProject(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('projects').doc(id).get();
    
    if (doc.exists) {
      const project = doc.data();
      document.getElementById('project-id').value = id;
      document.getElementById('project-title').value = project.title;
      document.getElementById('project-description').value = project.description;
      document.getElementById('project-tools').value = project.tools;
      document.getElementById('project-link').value = project.link;
      document.getElementById('project-featured').checked = project.featured || false;
      
      document.getElementById('project-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading project: ' + error.message, 'danger');
    console.error('Error loading project:', error);
  }
}

async function saveProject(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const projectId = document.getElementById('project-id').value;
    const projectData = {
      title: document.getElementById('project-title').value,
      description: document.getElementById('project-description').value,
      tools: document.getElementById('project-tools').value,
      link: document.getElementById('project-link').value,
      featured: document.getElementById('project-featured').checked || false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (projectId) {
      // Update existing project
      await db.collection('users').doc(userId).collection('projects').doc(projectId).set(projectData, { merge: true });
      showToast('Project updated successfully!');
    } else {
      // Add new project
      await db.collection('users').doc(userId).collection('projects').add(projectData);
      showToast('Project added successfully!');
    }
    
    // Reset form and reload projects
    document.getElementById('project-form').reset();
    document.getElementById('project-form').classList.add('hidden');
    loadProjects();
  } catch (error) {
    showToast('Error saving project: ' + error.message, 'danger');
    console.error('Error saving project:', error);
  }
}

async function deleteProject(id) {
  if (!confirm('Are you sure you want to delete this project?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('projects').doc(id).delete();
    showToast('Project deleted successfully!');
    loadProjects();
  } catch (error) {
    showToast('Error deleting project: ' + error.message, 'danger');
    console.error('Error deleting project:', error);
  }
}

// ==================== RESEARCH SECTION ====================
function initResearchSection() {
  const addResearchBtn = document.getElementById('add-research');
  const researchForm = document.getElementById('research-form');
  const cancelResearchBtn = document.getElementById('cancel-research');
  const researchContainer = document.getElementById('research-container');
  
  if (!addResearchBtn || !researchForm || !cancelResearchBtn || !researchContainer) return;
  
  // Load research
  loadResearch();
  
  // Add new research
  addResearchBtn.addEventListener('click', () => {
    researchForm.reset();
    researchForm.classList.remove('hidden');
    document.getElementById('research-id').value = '';
  });
  
  // Cancel research edit
  cancelResearchBtn.addEventListener('click', () => {
    researchForm.reset();
    researchForm.classList.add('hidden');
  });
  
  // Save research
  researchForm.addEventListener('submit', saveResearch);
}

async function loadResearch() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('research')
      .orderBy('year', 'desc')
      .get();
    
    const researchContainer = document.getElementById('research-container');
    researchContainer.innerHTML = '';
    
    if (snapshot.empty) {
      researchContainer.innerHTML = '<p>No research added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const research = doc.data();
      const researchElement = createResearchElement(doc.id, research);
      researchContainer.appendChild(researchElement);
    });
  } catch (error) {
    showToast('Error loading research: ' + error.message, 'danger');
    console.error('Error loading research:', error);
  }
}

function createResearchElement(id, research) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${research.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Authors:</strong> ${research.authors}</p>
      <p><strong>Year:</strong> ${research.year}</p>
      ${research.journal ? `<p><strong>Journal/Conference:</strong> ${research.journal}</p>` : ''}
      ${research.doi ? `<p><strong>DOI:</strong> ${research.doi}</p>` : ''}
      <p><strong>Abstract:</strong> ${research.abstract.substring(0, 150)}...</p>
      ${research.pdfLink ? `<p><strong>PDF:</strong> <a href="${research.pdfLink}" target="_blank">View PDF</a></p>` : ''}
      ${research.isPublished ? '<span class="badge bg-success">Published</span>' : '<span class="badge bg-secondary">Unpublished</span>'}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editResearch(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteResearch(id));
  
  return element;
}

async function editResearch(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('research').doc(id).get();
    
    if (doc.exists) {
      const research = doc.data();
      document.getElementById('research-id').value = id;
      document.getElementById('research-title').value = research.title;
      document.getElementById('research-abstract').value = research.abstract;
      document.getElementById('research-authors').value = research.authors;
      document.getElementById('research-year').value = research.year;
      document.getElementById('research-journal').value = research.journal || '';
      document.getElementById('research-doi').value = research.doi || '';
      document.getElementById('research-pdfLink').value = research.pdfLink || '';
      document.getElementById('research-isPublished').checked = research.isPublished || false;
      
      document.getElementById('research-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading research: ' + error.message, 'danger');
    console.error('Error loading research:', error);
  }
}

async function saveResearch(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const researchId = document.getElementById('research-id').value;
    const researchData = {
      title: document.getElementById('research-title').value,
      abstract: document.getElementById('research-abstract').value,
      authors: document.getElementById('research-authors').value,
      year: parseInt(document.getElementById('research-year').value),
      journal: document.getElementById('research-journal').value || null,
      doi: document.getElementById('research-doi').value || null,
      pdfLink: document.getElementById('research-pdfLink').value || null,
      isPublished: document.getElementById('research-isPublished').checked || false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (researchId) {
      // Update existing research
      await db.collection('users').doc(userId).collection('research').doc(researchId).set(researchData, { merge: true });
      showToast('Research updated successfully!');
    } else {
      // Add new research
      await db.collection('users').doc(userId).collection('research').add(researchData);
      showToast('Research added successfully!');
    }
    
    // Reset form and reload research
    document.getElementById('research-form').reset();
    document.getElementById('research-form').classList.add('hidden');
    loadResearch();
  } catch (error) {
    showToast('Error saving research: ' + error.message, 'danger');
    console.error('Error saving research:', error);
  }
}

async function deleteResearch(id) {
  if (!confirm('Are you sure you want to delete this research?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('research').doc(id).delete();
    showToast('Research deleted successfully!');
    loadResearch();
  } catch (error) {
    showToast('Error deleting research: ' + error.message, 'danger');
    console.error('Error deleting research:', error);
  }
}

// ==================== CERTIFICATES SECTION ====================
function initCertificatesSection() {
  const addCertificateBtn = document.getElementById('add-certificate');
  const certificateForm = document.getElementById('certificate-form');
  const cancelCertificateBtn = document.getElementById('cancel-certificate');
  const certificateContainer = document.getElementById('certificate-container');
  const certificateImageInput = document.getElementById('certificate-image');
  
  if (!addCertificateBtn || !certificateForm || !cancelCertificateBtn || !certificateContainer || !certificateImageInput) return;
  
  // Load certificates
  loadCertificates();
  
  // Add new certificate
  addCertificateBtn.addEventListener('click', () => {
    certificateForm.reset();
    document.getElementById('certificate-preview').src = '';
    certificateForm.classList.remove('hidden');
    document.getElementById('certificate-id').value = '';
  });
  
  // Cancel certificate edit
  cancelCertificateBtn.addEventListener('click', () => {
    certificateForm.reset();
    certificateForm.classList.add('hidden');
  });
  
  // Preview certificate image
  certificateImageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        document.getElementById('certificate-preview').src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Save certificate
  certificateForm.addEventListener('submit', saveCertificate);
}

async function loadCertificates() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('certificates')
      .orderBy('issueDate', 'desc')
      .get();
    
    const certificateContainer = document.getElementById('certificate-container');
    certificateContainer.innerHTML = '';
    
    if (snapshot.empty) {
      certificateContainer.innerHTML = '<p>No certificates added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const certificate = doc.data();
      const certificateElement = createCertificateElement(doc.id, certificate);
      certificateContainer.appendChild(certificateElement);
    });
  } catch (error) {
    showToast('Error loading certificates: ' + error.message, 'danger');
    console.error('Error loading certificates:', error);
  }
}

function createCertificateElement(id, certificate) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  // Format date
  const issueDate = certificate.issueDate ? new Date(certificate.issueDate.seconds * 1000).toLocaleDateString() : '';
  const expirationDate = certificate.expirationDate ? new Date(certificate.expirationDate.seconds * 1000).toLocaleDateString() : 'N/A';
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${certificate.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Issued by:</strong> ${certificate.issuingOrganization}</p>
      <p><strong>Issue Date:</strong> ${issueDate}</p>
      <p><strong>Expiration Date:</strong> ${expirationDate}</p>
      ${certificate.credentialId ? `<p><strong>Credential ID:</strong> ${certificate.credentialId}</p>` : ''}
      ${certificate.credentialUrl ? `<p><strong>Credential URL:</strong> <a href="${certificate.credentialUrl}" target="_blank">View</a></p>` : ''}
      ${certificate.skills ? `<p><strong>Skills:</strong> ${certificate.skills}</p>` : ''}
      ${certificate.imageUrl ? `<img src="${certificate.imageUrl}" alt="${certificate.title}" class="certificate-thumbnail">` : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editCertificate(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteCertificate(id));
  
  return element;
}

async function editCertificate(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('certificates').doc(id).get();
    
    if (doc.exists) {
      const certificate = doc.data();
      document.getElementById('certificate-id').value = id;
      document.getElementById('certificate-title').value = certificate.title;
      document.getElementById('certificate-issuingOrganization').value = certificate.issuingOrganization;
      
      // Convert Firestore Timestamp to date input format
      const issueDate = certificate.issueDate ? new Date(certificate.issueDate.seconds * 1000).toISOString().split('T')[0] : '';
      const expirationDate = certificate.expirationDate ? new Date(certificate.expirationDate.seconds * 1000).toISOString().split('T')[0] : '';
      
      document.getElementById('certificate-issueDate').value = issueDate;
      document.getElementById('certificate-expirationDate').value = expirationDate;
      document.getElementById('certificate-credentialId').value = certificate.credentialId || '';
      document.getElementById('certificate-credentialUrl').value = certificate.credentialUrl || '';
      document.getElementById('certificate-skills').value = certificate.skills || '';
      
      // Set image preview if exists
      if (certificate.imageUrl) {
        document.getElementById('certificate-preview').src = certificate.imageUrl;
      }
      
      document.getElementById('certificate-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading certificate: ' + error.message, 'danger');
    console.error('Error loading certificate:', error);
  }
}

async function saveCertificate(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const certificateId = document.getElementById('certificate-id').value;
    const certificateImageInput = document.getElementById('certificate-image');
    const certificateFile = certificateImageInput.files[0];
    
    let certificateData = {
      title: document.getElementById('certificate-title').value,
      issuingOrganization: document.getElementById('certificate-issuingOrganization').value,
      issueDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('certificate-issueDate').value)),
      expirationDate: document.getElementById('certificate-expirationDate').value ? 
        firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('certificate-expirationDate').value)) : null,
      credentialId: document.getElementById('certificate-credentialId').value || null,
      credentialUrl: document.getElementById('certificate-credentialUrl').value || null,
      skills: document.getElementById('certificate-skills').value || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (certificateFile) {
      // Upload new image
      const storageRef = storage.ref(`users/${userId}/certificates/${certificateFile.name}`);
      const uploadTask = storageRef.put(certificateFile);
      
      showToast('Uploading certificate image...', 'info');
      
      const snapshot = await uploadTask;
      const downloadURL = await snapshot.ref.getDownloadURL();
      certificateData.imageUrl = downloadURL;
    } else if (certificateId) {
      // Keep existing image if no new file is selected during edit
      const doc = await db.collection('users').doc(userId).collection('certificates').doc(certificateId).get();
      if (doc.exists && doc.data().imageUrl) {
        certificateData.imageUrl = doc.data().imageUrl;
      }
    }
    
    if (certificateId) {
      // Update existing certificate
      await db.collection('users').doc(userId).collection('certificates').doc(certificateId).set(certificateData, { merge: true });
      showToast('Certificate updated successfully!');
    } else {
      // Add new certificate
      await db.collection('users').doc(userId).collection('certificates').add(certificateData);
      showToast('Certificate added successfully!');
    }
    
    // Reset form and reload certificates
    document.getElementById('certificate-form').reset();
    document.getElementById('certificate-preview').src = '';
    document.getElementById('certificate-form').classList.add('hidden');
    loadCertificates();
  } catch (error) {
    showToast('Error saving certificate: ' + error.message, 'danger');
    console.error('Error saving certificate:', error);
  }
}

async function deleteCertificate(id) {
  if (!confirm('Are you sure you want to delete this certificate?')) return;
  
  try {
    const userId = getUserId();
    
    // First get the document to check for an image
    const doc = await db.collection('users').doc(userId).collection('certificates').doc(id).get();
    
    if (doc.exists && doc.data().imageUrl) {
      // Delete the image from storage
      const imageRef = storage.refFromURL(doc.data().imageUrl);
      await imageRef.delete();
    }
    
    // Then delete the document
    await db.collection('users').doc(userId).collection('certificates').doc(id).delete();
    showToast('Certificate deleted successfully!');
    loadCertificates();
  } catch (error) {
    showToast('Error deleting certificate: ' + error.message, 'danger');
    console.error('Error deleting certificate:', error);
  }
}

// ==================== OPEN SOURCE SECTION ====================
function initOpenSourceSection() {
  const addContributionBtn = document.getElementById('add-contribution');
  const contributionForm = document.getElementById('contribution-form');
  const cancelContributionBtn = document.getElementById('cancel-contribution');
  const contributionContainer = document.getElementById('contribution-container');
  
  if (!addContributionBtn || !contributionForm || !cancelContributionBtn || !contributionContainer) return;
  
  // Load contributions
  loadContributions();
  
  // Add new contribution
  addContributionBtn.addEventListener('click', () => {
    contributionForm.reset();
    contributionForm.classList.remove('hidden');
    document.getElementById('contribution-id').value = '';
  });
  
  // Cancel contribution edit
  cancelContributionBtn.addEventListener('click', () => {
    contributionForm.reset();
    contributionForm.classList.add('hidden');
  });
  
  // Save contribution
  contributionForm.addEventListener('submit', saveContribution);
}

async function loadContributions() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('openSource')
      .orderBy('date', 'desc')
      .get();
    
    const contributionContainer = document.getElementById('contribution-container');
    contributionContainer.innerHTML = '';
    
    if (snapshot.empty) {
      contributionContainer.innerHTML = '<p>No open source contributions added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const contribution = doc.data();
      const contributionElement = createContributionElement(doc.id, contribution);
      contributionContainer.appendChild(contributionElement);
    });
  } catch (error) {
    showToast('Error loading contributions: ' + error.message, 'danger');
    console.error('Error loading contributions:', error);
  }
}

function createContributionElement(id, contribution) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  // Format date
  const date = contribution.date ? new Date(contribution.date.seconds * 1000).toLocaleDateString() : '';
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${contribution.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Repository:</strong> <a href="${contribution.repo}" target="_blank">View</a></p>
      <p><strong>Type:</strong> ${contribution.type}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Status:</strong> ${contribution.status}</p>
      <p><strong>Description:</strong> ${contribution.description.substring(0, 100)}...</p>
      ${contribution.pullRequest ? `<p><strong>Pull Request:</strong> <a href="${contribution.pullRequest}" target="_blank">View</a></p>` : ''}
      ${contribution.featured ? '<span class="badge bg-primary">Featured</span>' : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editContribution(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteContribution(id));
  
  return element;
}

async function editContribution(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('openSource').doc(id).get();
    
    if (doc.exists) {
      const contribution = doc.data();
      document.getElementById('contribution-id').value = id;
      document.getElementById('contribution-title').value = contribution.title;
      document.getElementById('contribution-repo').value = contribution.repo;
      document.getElementById('contribution-description').value = contribution.description;
      document.getElementById('contribution-type').value = contribution.type;
      document.getElementById('contribution-pullRequest').value = contribution.pullRequest || '';
      
      // Convert Firestore Timestamp to date input format
      const date = contribution.date ? new Date(contribution.date.seconds * 1000).toISOString().split('T')[0] : '';
      
      document.getElementById('contribution-date').value = date;
      document.getElementById('contribution-status').value = contribution.status;
      document.getElementById('contribution-featured').checked = contribution.featured || false;
      
      document.getElementById('contribution-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading contribution: ' + error.message, 'danger');
    console.error('Error loading contribution:', error);
  }
}

async function saveContribution(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const contributionId = document.getElementById('contribution-id').value;
    const contributionData = {
      title: document.getElementById('contribution-title').value,
      repo: document.getElementById('contribution-repo').value,
      description: document.getElementById('contribution-description').value,
      type: document.getElementById('contribution-type').value,
      pullRequest: document.getElementById('contribution-pullRequest').value || null,
      date: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('contribution-date').value)),
      status: document.getElementById('contribution-status').value,
      featured: document.getElementById('contribution-featured').checked || false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (contributionId) {
      // Update existing contribution
      await db.collection('users').doc(userId).collection('openSource').doc(contributionId).set(contributionData, { merge: true });
      showToast('Contribution updated successfully!');
    } else {
      // Add new contribution
      await db.collection('users').doc(userId).collection('openSource').add(contributionData);
      showToast('Contribution added successfully!');
    }
    
    // Reset form and reload contributions
    document.getElementById('contribution-form').reset();
    document.getElementById('contribution-form').classList.add('hidden');
    loadContributions();
  } catch (error) {
    showToast('Error saving contribution: ' + error.message, 'danger');
    console.error('Error saving contribution:', error);
  }
}

async function deleteContribution(id) {
  if (!confirm('Are you sure you want to delete this contribution?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('openSource').doc(id).delete();
    showToast('Contribution deleted successfully!');
    loadContributions();
  } catch (error) {
    showToast('Error deleting contribution: ' + error.message, 'danger');
    console.error('Error deleting contribution:', error);
  }
}

// ==================== AWARDS SECTION ====================
function initAwardsSection() {
  const addAwardBtn = document.getElementById('add-award');
  const awardForm = document.getElementById('award-form');
  const cancelAwardBtn = document.getElementById('cancel-award');
  const awardContainer = document.getElementById('award-container');
  const awardImageInput = document.getElementById('award-image');
  
  if (!addAwardBtn || !awardForm || !cancelAwardBtn || !awardContainer || !awardImageInput) return;
  
  // Load awards
  loadAwards();
  
  // Add new award
  addAwardBtn.addEventListener('click', () => {
    awardForm.reset();
    document.getElementById('award-preview').src = '';
    awardForm.classList.remove('hidden');
    document.getElementById('award-id').value = '';
  });
  
  // Cancel award edit
  cancelAwardBtn.addEventListener('click', () => {
    awardForm.reset();
    awardForm.classList.add('hidden');
  });
  
  // Preview award image
  awardImageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        document.getElementById('award-preview').src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Save award
  awardForm.addEventListener('submit', saveAward);
}

async function loadAwards() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('awards')
      .orderBy('issueDate', 'desc')
      .get();
    
    const awardContainer = document.getElementById('award-container');
    awardContainer.innerHTML = '';
    
    if (snapshot.empty) {
      awardContainer.innerHTML = '<p>No awards added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const award = doc.data();
      const awardElement = createAwardElement(doc.id, award);
      awardContainer.appendChild(awardElement);
    });
  } catch (error) {
    showToast('Error loading awards: ' + error.message, 'danger');
    console.error('Error loading awards:', error);
  }
}

function createAwardElement(id, award) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  // Format date
  const issueDate = award.issueDate ? new Date(award.issueDate.seconds * 1000).toLocaleDateString() : '';
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${award.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Issued by:</strong> ${award.issuingOrganization}</p>
      <p><strong>Date:</strong> ${issueDate}</p>
      <p><strong>Category:</strong> ${award.category}</p>
      ${award.description ? `<p><strong>Description:</strong> ${award.description}</p>` : ''}
      ${award.imageUrl ? `<img src="${award.imageUrl}" alt="${award.title}" class="award-thumbnail">` : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editAward(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteAward(id));
  
  return element;
}

async function editAward(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('awards').doc(id).get();
    
    if (doc.exists) {
      const award = doc.data();
      document.getElementById('award-id').value = id;
      document.getElementById('award-title').value = award.title;
      document.getElementById('award-issuingOrganization').value = award.issuingOrganization;
      
      // Convert Firestore Timestamp to date input format
      const issueDate = award.issueDate ? new Date(award.issueDate.seconds * 1000).toISOString().split('T')[0] : '';
      
      document.getElementById('award-issueDate').value = issueDate;
      document.getElementById('award-description').value = award.description || '';
      document.getElementById('award-category').value = award.category;
      
      // Set image preview if exists
      if (award.imageUrl) {
        document.getElementById('award-preview').src = award.imageUrl;
      }
      
      document.getElementById('award-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading award: ' + error.message, 'danger');
    console.error('Error loading award:', error);
  }
}

async function saveAward(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const awardId = document.getElementById('award-id').value;
    const awardImageInput = document.getElementById('award-image');
    const awardFile = awardImageInput.files[0];
    
    let awardData = {
      title: document.getElementById('award-title').value,
      issuingOrganization: document.getElementById('award-issuingOrganization').value,
      issueDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('award-issueDate').value)),
      description: document.getElementById('award-description').value || null,
      category: document.getElementById('award-category').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (awardFile) {
      // Upload new image
      const storageRef = storage.ref(`users/${userId}/awards/${awardFile.name}`);
      const uploadTask = storageRef.put(awardFile);
      
      showToast('Uploading award image...', 'info');
      
      const snapshot = await uploadTask;
      const downloadURL = await snapshot.ref.getDownloadURL();
      awardData.imageUrl = downloadURL;
    } else if (awardId) {
      // Keep existing image if no new file is selected during edit
      const doc = await db.collection('users').doc(userId).collection('awards').doc(awardId).get();
      if (doc.exists && doc.data().imageUrl) {
        awardData.imageUrl = doc.data().imageUrl;
      }
    }
    
    if (awardId) {
      // Update existing award
      await db.collection('users').doc(userId).collection('awards').doc(awardId).set(awardData, { merge: true });
      showToast('Award updated successfully!');
    } else {
      // Add new award
      await db.collection('users').doc(userId).collection('awards').add(awardData);
      showToast('Award added successfully!');
    }
    
    // Reset form and reload awards
    document.getElementById('award-form').reset();
    document.getElementById('award-preview').src = '';
    document.getElementById('award-form').classList.add('hidden');
    loadAwards();
  } catch (error) {
    showToast('Error saving award: ' + error.message, 'danger');
    console.error('Error saving award:', error);
  }
}

async function deleteAward(id) {
  if (!confirm('Are you sure you want to delete this award?')) return;
  
  try {
    const userId = getUserId();
    
    // First get the document to check for an image
    const doc = await db.collection('users').doc(userId).collection('awards').doc(id).get();
    
    if (doc.exists && doc.data().imageUrl) {
      // Delete the image from storage
      const imageRef = storage.refFromURL(doc.data().imageUrl);
      await imageRef.delete();
    }
    
    // Then delete the document
    await db.collection('users').doc(userId).collection('awards').doc(id).delete();
    showToast('Award deleted successfully!');
    loadAwards();
  } catch (error) {
    showToast('Error deleting award: ' + error.message, 'danger');
    console.error('Error deleting award:', error);
  }
}

// ==================== TIMELINE SECTION ====================
function initTimelineSection() {
  const addTimelineBtn = document.getElementById('add-timeline');
  const timelineForm = document.getElementById('timeline-form');
  const cancelTimelineBtn = document.getElementById('cancel-timeline');
  const timelineContainer = document.getElementById('timeline-container');
  
  if (!addTimelineBtn || !timelineForm || !cancelTimelineBtn || !timelineContainer) return;
  
  // Load timeline entries
  loadTimeline();
  
  // Add new timeline entry
  addTimelineBtn.addEventListener('click', () => {
    timelineForm.reset();
    timelineForm.classList.remove('hidden');
    document.getElementById('timeline-id').value = '';
  });
  
  // Cancel timeline edit
  cancelTimelineBtn.addEventListener('click', () => {
    timelineForm.reset();
    timelineForm.classList.add('hidden');
  });
  
  // Save timeline entry
  timelineForm.addEventListener('submit', saveTimeline);
}

async function loadTimeline() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('timeline')
      .orderBy('date', 'desc')
      .get();
    
    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.innerHTML = '';
    
    if (snapshot.empty) {
      timelineContainer.innerHTML = '<p>No timeline entries added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const timeline = doc.data();
      const timelineElement = createTimelineElement(doc.id, timeline);
      timelineContainer.appendChild(timelineElement);
    });
  } catch (error) {
    showToast('Error loading timeline: ' + error.message, 'danger');
    console.error('Error loading timeline:', error);
  }
}

function createTimelineElement(id, timeline) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  // Format date
  const date = timeline.date ? new Date(timeline.date.seconds * 1000).toLocaleDateString() : '';
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${timeline.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Category:</strong> ${timeline.category}</p>
      <p><strong>Description:</strong> ${timeline.description}</p>
      ${timeline.featured ? '<span class="badge bg-primary">Featured</span>' : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editTimeline(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteTimeline(id));
  
  return element;
}

async function editTimeline(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('timeline').doc(id).get();
    
    if (doc.exists) {
      const timeline = doc.data();
      document.getElementById('timeline-id').value = id;
      document.getElementById('timeline-title').value = timeline.title;
      
      // Convert Firestore Timestamp to date input format
      const date = timeline.date ? new Date(timeline.date.seconds * 1000).toISOString().split('T')[0] : '';
      
      document.getElementById('timeline-date').value = date;
      document.getElementById('timeline-description').value = timeline.description;
      document.getElementById('timeline-category').value = timeline.category;
      document.getElementById('timeline-icon').value = timeline.icon || '';
      document.getElementById('timeline-featured').checked = timeline.featured || false;
      
      document.getElementById('timeline-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading timeline entry: ' + error.message, 'danger');
    console.error('Error loading timeline entry:', error);
  }
}

async function saveTimeline(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const timelineId = document.getElementById('timeline-id').value;
    const timelineData = {
      title: document.getElementById('timeline-title').value,
      date: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('timeline-date').value)),
      description: document.getElementById('timeline-description').value,
      category: document.getElementById('timeline-category').value,
      icon: document.getElementById('timeline-icon').value || null,
      featured: document.getElementById('timeline-featured').checked || false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (timelineId) {
      // Update existing timeline entry
      await db.collection('users').doc(userId).collection('timeline').doc(timelineId).set(timelineData, { merge: true });
      showToast('Timeline entry updated successfully!');
    } else {
      // Add new timeline entry
      await db.collection('users').doc(userId).collection('timeline').add(timelineData);
      showToast('Timeline entry added successfully!');
    }
    
    // Reset form and reload timeline
    document.getElementById('timeline-form').reset();
    document.getElementById('timeline-form').classList.add('hidden');
    loadTimeline();
  } catch (error) {
    showToast('Error saving timeline entry: ' + error.message, 'danger');
    console.error('Error saving timeline entry:', error);
  }
}

async function deleteTimeline(id) {
  if (!confirm('Are you sure you want to delete this timeline entry?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('timeline').doc(id).delete();
    showToast('Timeline entry deleted successfully!');
    loadTimeline();
  } catch (error) {
    showToast('Error deleting timeline entry: ' + error.message, 'danger');
    console.error('Error deleting timeline entry:', error);
  }
}

// ==================== GALLERY SECTION ====================
function initGallerySection() {
  const addGalleryItemBtn = document.getElementById('add-gallery-item');
  const galleryForm = document.getElementById('gallery-form');
  const cancelGalleryBtn = document.getElementById('cancel-gallery');
  const galleryContainer = document.getElementById('gallery-container');
  const galleryImageInput = document.getElementById('gallery-image');
  
  if (!addGalleryItemBtn || !galleryForm || !cancelGalleryBtn || !galleryContainer || !galleryImageInput) return;
  
  // Load gallery items
  loadGallery();
  
  // Add new gallery item
  addGalleryItemBtn.addEventListener('click', () => {
    galleryForm.reset();
    document.getElementById('gallery-preview').src = '';
    galleryForm.classList.remove('hidden');
    document.getElementById('gallery-id').value = '';
  });
  
  // Cancel gallery edit
  cancelGalleryBtn.addEventListener('click', () => {
    galleryForm.reset();
    galleryForm.classList.add('hidden');
  });
  
  // Preview gallery image
  galleryImageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        document.getElementById('gallery-preview').src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Save gallery item
  galleryForm.addEventListener('submit', saveGalleryItem);
}

async function loadGallery() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('gallery')
      .orderBy('date', 'desc')
      .get();
    
    const galleryContainer = document.getElementById('gallery-container');
    galleryContainer.innerHTML = '';
    
    if (snapshot.empty) {
      galleryContainer.innerHTML = '<p>No gallery items added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const galleryItem = doc.data();
      const galleryElement = createGalleryElement(doc.id, galleryItem);
      galleryContainer.appendChild(galleryElement);
    });
  } catch (error) {
    showToast('Error loading gallery: ' + error.message, 'danger');
    console.error('Error loading gallery:', error);
  }
}

function createGalleryElement(id, galleryItem) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  // Format date
  const date = galleryItem.date ? new Date(galleryItem.date.seconds * 1000).toLocaleDateString() : '';
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${galleryItem.title}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <img src="${galleryItem.imageUrl}" alt="${galleryItem.title}" class="gallery-thumbnail">
      <p><strong>Category:</strong> ${galleryItem.category}</p>
      <p><strong>Date:</strong> ${date}</p>
      ${galleryItem.client ? `<p><strong>Client:</strong> ${galleryItem.client}</p>` : ''}
      ${galleryItem.tools ? `<p><strong>Tools:</strong> ${galleryItem.tools}</p>` : ''}
      ${galleryItem.link ? `<p><strong>Link:</strong> <a href="${galleryItem.link}" target="_blank">View</a></p>` : ''}
      ${galleryItem.featured ? '<span class="badge bg-primary">Featured</span>' : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editGalleryItem(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteGalleryItem(id));
  
  return element;
}

async function editGalleryItem(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('gallery').doc(id).get();
    
    if (doc.exists) {
      const galleryItem = doc.data();
      document.getElementById('gallery-id').value = id;
      document.getElementById('gallery-title').value = galleryItem.title;
      document.getElementById('gallery-description').value = galleryItem.description || '';
      document.getElementById('gallery-category').value = galleryItem.category;
      
      // Convert Firestore Timestamp to date input format
      const date = galleryItem.date ? new Date(galleryItem.date.seconds * 1000).toISOString().split('T')[0] : '';
      
      document.getElementById('gallery-date').value = date;
      document.getElementById('gallery-client').value = galleryItem.client || '';
      document.getElementById('gallery-tools').value = galleryItem.tools || '';
      document.getElementById('gallery-link').value = galleryItem.link || '';
      document.getElementById('gallery-featured').checked = galleryItem.featured || false;
      
      // Set image preview if exists
      if (galleryItem.imageUrl) {
        document.getElementById('gallery-preview').src = galleryItem.imageUrl;
      }
      
      document.getElementById('gallery-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading gallery item: ' + error.message, 'danger');
    console.error('Error loading gallery item:', error);
  }
}

async function saveGalleryItem(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const galleryId = document.getElementById('gallery-id').value;
    const galleryImageInput = document.getElementById('gallery-image');
    const galleryFile = galleryImageInput.files[0];
    
    if (!galleryFile && !galleryId) {
      showToast('Please select an image for the gallery item', 'danger');
      return;
    }
    
    let galleryData = {
      title: document.getElementById('gallery-title').value,
      description: document.getElementById('gallery-description').value || null,
      category: document.getElementById('gallery-category').value,
      date: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('gallery-date').value)),
      client: document.getElementById('gallery-client').value || null,
      tools: document.getElementById('gallery-tools').value || null,
      link: document.getElementById('gallery-link').value || null,
      featured: document.getElementById('gallery-featured').checked || false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (galleryFile) {
      // Upload new image
      const storageRef = storage.ref(`users/${userId}/gallery/${galleryFile.name}`);
      const uploadTask = storageRef.put(galleryFile);
      
      showToast('Uploading gallery image...', 'info');
      
      const snapshot = await uploadTask;
      const downloadURL = await snapshot.ref.getDownloadURL();
      galleryData.imageUrl = downloadURL;
    } else if (galleryId) {
      // Keep existing image if no new file is selected during edit
      const doc = await db.collection('users').doc(userId).collection('gallery').doc(galleryId).get();
      if (doc.exists && doc.data().imageUrl) {
        galleryData.imageUrl = doc.data().imageUrl;
      }
    }
    
    if (galleryId) {
      // Update existing gallery item
      await db.collection('users').doc(userId).collection('gallery').doc(galleryId).set(galleryData, { merge: true });
      showToast('Gallery item updated successfully!');
    } else {
      // Add new gallery item
      await db.collection('users').doc(userId).collection('gallery').add(galleryData);
      showToast('Gallery item added successfully!');
    }
    
    // Reset form and reload gallery
    document.getElementById('gallery-form').reset();
    document.getElementById('gallery-preview').src = '';
    document.getElementById('gallery-form').classList.add('hidden');
    loadGallery();
  } catch (error) {
    showToast('Error saving gallery item: ' + error.message, 'danger');
    console.error('Error saving gallery item:', error);
  }
}

async function deleteGalleryItem(id) {
  if (!confirm('Are you sure you want to delete this gallery item?')) return;
  
  try {
    const userId = getUserId();
    
    // First get the document to check for an image
    const doc = await db.collection('users').doc(userId).collection('gallery').doc(id).get();
    
    if (doc.exists && doc.data().imageUrl) {
      // Delete the image from storage
      const imageRef = storage.refFromURL(doc.data().imageUrl);
      await imageRef.delete();
    }
    
    // Then delete the document
    await db.collection('users').doc(userId).collection('gallery').doc(id).delete();
    showToast('Gallery item deleted successfully!');
    loadGallery();
  } catch (error) {
    showToast('Error deleting gallery item: ' + error.message, 'danger');
    console.error('Error deleting gallery item:', error);
  }
}

// ==================== SOCIAL PROFILES SECTION ====================
function initSocialSection() {
  const addSocialBtn = document.getElementById('add-social');
  const socialForm = document.getElementById('social-form');
  const cancelSocialBtn = document.getElementById('cancel-social');
  const socialContainer = document.getElementById('social-container');
  
  if (!addSocialBtn || !socialForm || !cancelSocialBtn || !socialContainer) return;
  
  // Load social profiles
  loadSocialProfiles();
  
  // Add new social profile
  addSocialBtn.addEventListener('click', () => {
    socialForm.reset();
    socialForm.classList.remove('hidden');
    document.getElementById('social-id').value = '';
  });
  
  // Cancel social profile edit
  cancelSocialBtn.addEventListener('click', () => {
    socialForm.reset();
    socialForm.classList.add('hidden');
  });
  
  // Handle platform change
  document.getElementById('social-platform').addEventListener('change', function() {
    const customNameField = document.getElementById('social-customName');
    if (this.value === 'custom') {
      customNameField.required = true;
      customNameField.parentElement.style.display = 'block';
    } else {
      customNameField.required = false;
      customNameField.parentElement.style.display = 'none';
    }
  });
  
  // Save social profile
  socialForm.addEventListener('submit', saveSocialProfile);
}

async function loadSocialProfiles() {
  try {
    const userId = getUserId();
    const snapshot = await db.collection('users').doc(userId).collection('socialProfiles')
      .orderBy('platform')
      .get();
    
    const socialContainer = document.getElementById('social-container');
    socialContainer.innerHTML = '';
    
    if (snapshot.empty) {
      socialContainer.innerHTML = '<p>No social profiles added yet.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const socialProfile = doc.data();
      const socialElement = createSocialElement(doc.id, socialProfile);
      socialContainer.appendChild(socialElement);
    });
  } catch (error) {
    showToast('Error loading social profiles: ' + error.message, 'danger');
    console.error('Error loading social profiles:', error);
  }
}

function createSocialElement(id, socialProfile) {
  const element = document.createElement('div');
  element.className = 'item-card';
  element.dataset.id = id;
  
  const platformName = socialProfile.platform === 'custom' ? socialProfile.customName : socialProfile.platform;
  
  element.innerHTML = `
    <div class="item-header">
      <h3>${platformName}</h3>
      <div class="item-actions">
        <button class="btn-edit" data-id="${id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="item-body">
      <p><strong>Username:</strong> ${socialProfile.username || 'N/A'}</p>
      <p><strong>URL:</strong> <a href="${socialProfile.url}" target="_blank">View Profile</a></p>
      ${socialProfile.description ? `<p><strong>Description:</strong> ${socialProfile.description}</p>` : ''}
      ${socialProfile.featured ? '<span class="badge bg-primary">Featured</span>' : ''}
    </div>
  `;
  
  // Add event listeners to buttons
  element.querySelector('.btn-edit').addEventListener('click', () => editSocialProfile(id));
  element.querySelector('.btn-delete').addEventListener('click', () => deleteSocialProfile(id));
  
  return element;
}

async function editSocialProfile(id) {
  try {
    const userId = getUserId();
    const doc = await db.collection('users').doc(userId).collection('socialProfiles').doc(id).get();
    
    if (doc.exists) {
      const socialProfile = doc.data();
      document.getElementById('social-id').value = id;
      document.getElementById('social-platform').value = socialProfile.platform;
      
      // Show/hide custom name field based on platform
      const customNameField = document.getElementById('social-customName');
      if (socialProfile.platform === 'custom') {
        customNameField.required = true;
        customNameField.parentElement.style.display = 'block';
        customNameField.value = socialProfile.customName;
      } else {
        customNameField.required = false;
        customNameField.parentElement.style.display = 'none';
        customNameField.value = '';
      }
      
      document.getElementById('social-url').value = socialProfile.url;
      document.getElementById('social-username').value = socialProfile.username || '';
      document.getElementById('social-icon').value = socialProfile.icon || '';
      document.getElementById('social-description').value = socialProfile.description || '';
      document.getElementById('social-featured').checked = socialProfile.featured || false;
      
      document.getElementById('social-form').classList.remove('hidden');
    }
  } catch (error) {
    showToast('Error loading social profile: ' + error.message, 'danger');
    console.error('Error loading social profile:', error);
  }
}

async function saveSocialProfile(e) {
  e.preventDefault();
  
  try {
    const userId = getUserId();
    const socialId = document.getElementById('social-id').value;
    const platform = document.getElementById('social-platform').value;
    
    const socialData = {
      platform: platform,
      url: document.getElementById('social-url').value,
      username: document.getElementById('social-username').value || null,
      icon: document.getElementById('social-icon').value || null,
      description: document.getElementById('social-description').value || null,
      featured: document.getElementById('social-featured').checked || false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Add custom name if platform is custom
    if (platform === 'custom') {
      socialData.customName = document.getElementById('social-customName').value;
    }
    
    if (socialId) {
      // Update existing social profile
      await db.collection('users').doc(userId).collection('socialProfiles').doc(socialId).set(socialData, { merge: true });
      showToast('Social profile updated successfully!');
    } else {
      // Add new social profile
      await db.collection('users').doc(userId).collection('socialProfiles').add(socialData);
      showToast('Social profile added successfully!');
    }
    
    // Reset form and reload social profiles
    document.getElementById('social-form').reset();
    document.getElementById('social-form').classList.add('hidden');
    loadSocialProfiles();
  } catch (error) {
    showToast('Error saving social profile: ' + error.message, 'danger');
    console.error('Error saving social profile:', error);
  }
}

async function deleteSocialProfile(id) {
  if (!confirm('Are you sure you want to delete this social profile?')) return;
  
  try {
    const userId = getUserId();
    await db.collection('users').doc(userId).collection('socialProfiles').doc(id).delete();
    showToast('Social profile deleted successfully!');
    loadSocialProfiles();
  } catch (error) {
    showToast('Error deleting social profile: ' + error.message, 'danger');
    console.error('Error deleting social profile:', error);
  }
}