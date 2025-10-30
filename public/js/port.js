// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDEj38aSEXvWivHOr_J-28mQziW3L56y6Q",
  authDomain: "alfa-vox-portfolio.firebaseapp.com",
  projectId: "alfa-vox-portfolio",
  storageBucket: "alfa-vox-portfolio.appspot.com",
  messagingSenderId: "326170168205",
  appId: "1:326170168205:web:4c68b1b06ca6753808cbc4",
  measurementId: "G-37ZVK4BRY4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

function applyThemeFile(themeName) {
  const linkId = "themeStylesheet";
  const existingLink = document.getElementById(linkId);

  // Create new link first to prevent FOUC
  const newLink = document.createElement("link");
  newLink.id = linkId;
  newLink.rel = "stylesheet";
  newLink.href = `themes/${themeName}.css`;
  
  // Insert new link before existing one
  if (existingLink) {
    existingLink.parentNode.insertBefore(newLink, existingLink);
    // Remove old link after new one loads
    newLink.onload = function() {
      existingLink.parentNode.removeChild(existingLink);
    };
  } else {
    document.head.appendChild(newLink);
  }
  
  // Force layout recalculation
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    document.body.style.overflow = '';
  }, 100);
}

// Set current year in footer
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

mobileMenuBtn.addEventListener('click', () => {
  navMenu.classList.toggle('show');
});

// Smooth scrolling for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    navMenu.classList.remove('show');
    
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    window.scrollTo({
      top: targetElement.offsetTop - 80,
      behavior: 'smooth'
    });
  });
});

// Back to top button
const backToTopBtn = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTopBtn.classList.add('active');
  } else {
    backToTopBtn.classList.remove('active');
  }
});

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

function loadUserTheme() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");

  if (!userId) return;

  db.collection("users").doc(userId).collection("profile").doc("data").get()
  .then(doc => {
    if (doc.exists) {
      const userData = doc.data();
      const theme = userData.theme || "default";
      applyThemeFile(theme);
    }
  })
  .catch(err => {
    console.error("Error loading theme:", err);
  });
}

function toggleSectionVisibility(sectionId, isEmpty) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = isEmpty ? 'none' : 'block';
  }
}

// Load profile data
// Modified loadProfile function
function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");

  if (!userId) {
    alert("No UID provided in URL. Use: portfolio.html?uid=abc123");
    throw new Error("Missing UID in URL");
  }
  
  // Set loading states with proper dimensions
  document.getElementById('profileName').textContent = "Loading...";
  document.getElementById('profileTitle').textContent = "Loading...";
  document.getElementById('profileBio').textContent = "Loading...";
  document.getElementById('profileLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> Loading...`;
  
  db.collection('users').doc(userId).collection('profile').doc('data').get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        
        // Smooth transition for profile data
        setTimeout(() => {
          const elements = [
            { id: 'profileName', text: data.name || 'Your Name' },
            { id: 'profileTitle', text: data.title || 'Your Professional Title' },
            { id: 'profileBio', text: data.bio || 'A brief bio about yourself' },
            { 
              id: 'profileLocation', 
              html: `<i class="fas fa-map-marker-alt"></i> ${data.location || 'Your Location'}` 
            }
          ];
          
          elements.forEach((el, index) => {
            const element = document.getElementById(el.id);
            if (el.text) {
              element.textContent = el.text;
            } else if (el.html) {
              element.innerHTML = el.html;
            }
            element.style.opacity = 0;
            setTimeout(() => {
              element.style.transition = 'opacity 0.3s ease';
              element.style.opacity = 1;
            }, 100 * index);
          });
          
          // Update profile image
          if (data.photoUrl) {
            const profileImg = document.getElementById('profileImage');
            profileImg.style.opacity = 0;
            setTimeout(() => {
              profileImg.src = data.photoUrl;
              profileImg.style.transition = 'opacity 0.3s ease';
              profileImg.style.opacity = 1;
            }, 500);
          }
        }, 100);
        
        // Update social links
        const socialLinksContainer = document.getElementById('profileSocialLinks');
        const footerSocialLinksContainer = document.getElementById('footerSocialLinks');
        socialLinksContainer.innerHTML = '';
        footerSocialLinksContainer.innerHTML = '';
        
        if (data.social) {
          const socialLinks = [];
          
          if (data.social.github) {
            socialLinks.push({
              url: data.social.github,
              icon: 'fab fa-github',
              title: 'GitHub'
            });
          }
          
          if (data.social.linkedin) {
            socialLinks.push({
              url: data.social.linkedin,
              icon: 'fab fa-linkedin-in',
              title: 'LinkedIn'
            });
          }
          
          if (data.social.email) {
            socialLinks.push({
              url: `mailto:${data.social.email}`,
              icon: 'fas fa-envelope',
              title: 'Email'
            });
          }
          
          // Add social links with animation
          socialLinks.forEach((link, index) => {
            const linkHTML = `
              <a href="${link.url}" target="_blank" title="${link.title}" 
                 style="opacity: 0; transform: translateY(10px); transition: all 0.3s ease ${index * 0.1}s">
                <i class="${link.icon}"></i>
              </a>
            `;
            socialLinksContainer.innerHTML += linkHTML;
            footerSocialLinksContainer.innerHTML += linkHTML;
            
            // Trigger animation
            setTimeout(() => {
              const links = document.querySelectorAll(`a[href="${link.url}"]`);
              links.forEach(l => {
                l.style.opacity = 1;
                l.style.transform = 'translateY(0)';
              });
            }, 300 + (index * 100));
          });
        }
        
        // Update logo with name
        document.getElementById('logo').textContent = data.name || 'Portfolio';
      }
    })
    .catch(error => {
      console.error('Error loading profile:', error);
    });
}
// Load resume data
function loadResume() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  db.collection('users').doc(userId).collection('resumes').doc('current').get()
    .then(doc => {
      if (doc.exists) {
        const resume = doc.data();
        const resumeBtn = document.getElementById('resumeDownloadBtn');
        
        if (resume.fileUrl) {
          resumeBtn.href = resume.fileUrl;
          resumeBtn.innerHTML = `<i class="fas fa-download"></i> Download Resume (${resume.fileSize})`;
        }
      } else {
        toggleSectionVisibility('resume', true);
      }
    })
    .catch(error => {
      console.error('Error loading resume:', error);
      toggleSectionVisibility('resume', true);
    });
}

// Load skills data
function loadSkills() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  const skillsContainer = document.getElementById('skillsContainer');
  
  db.collection('users').doc(userId).collection('skills').orderBy('name').get()
    .then(snapshot => {
      skillsContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('skills', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const skill = doc.data();
        const categoryClass = skill.category ? skill.category.toLowerCase() : 'other';
        
        skillsContainer.innerHTML += `
          <div class="skill-card">
            <span class="skill-category">${skill.category || 'Other'}</span>
            <h3>${skill.name}</h3>
            <div class="progress-container">
              <div class="progress-label">
                <span>Proficiency</span>
                <span>${skill.proficiency}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${skill.proficiency}%"></div>
              </div>
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading skills:', error);
      toggleSectionVisibility('skills', true);
    });
}

// Load languages data
function loadLanguages() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  const languagesContainer = document.getElementById('languagesContainer');
  
  db.collection('users').doc(userId).collection('languages').orderBy('name').get()
    .then(snapshot => {
      languagesContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('languages', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const language = doc.data();
        
        languagesContainer.innerHTML += `
          <div class="skill-card">
            <h3>${language.name} <span class="skill-category">${language.proficiency}</span></h3>
            ${language.certifications ? `<p><strong>Certifications:</strong> ${language.certifications}</p>` : ''}
            ${language.years ? `<p><strong>Years of Experience:</strong> ${language.years}</p>` : ''}
            
            <div class="progress-container">
              <div class="progress-label">
                <span>Reading</span>
                <span>${language.reading}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${language.reading}%"></div>
              </div>
            </div>
            
            <div class="progress-container">
              <div class="progress-label">
                <span>Writing</span>
                <span>${language.writing}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${language.writing}%"></div>
              </div>
            </div>
            
            <div class="progress-container">
              <div class="progress-label">
                <span>Speaking</span>
                <span>${language.speaking}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${language.speaking}%"></div>
              </div>
            </div>
            
            <div class="progress-container">
              <div class="progress-label">
                <span>Listening</span>
                <span>${language.listening}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${language.listening}%"></div>
              </div>
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading languages:', error);
      toggleSectionVisibility('languages', true);
    });
}

// Load experience data
function loadExperience() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  const experienceTimeline = document.getElementById('experienceTimeline');
  
  db.collection('users').doc(userId).collection('experiences').orderBy('from', 'desc').get()
    .then(snapshot => {
      experienceTimeline.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('experience', true);
        return;
      }
      
      let isLeft = true;
      snapshot.forEach(doc => {
        const experience = doc.data();
        const fromDate = experience.from ? new Date(experience.from.seconds * 1000).toLocaleDateString() : '';
        const toDate = experience.current ? 'Present' : 
                      (experience.to ? new Date(experience.to.seconds * 1000).toLocaleDateString() : '');
        
        experienceTimeline.innerHTML += `
          <div class="timeline-item ${isLeft ? 'left' : 'right'}">
            <div class="timeline-content">
              <h3>${experience.title}</h3>
              <h4>${experience.company}</h4>
              <p class="timeline-date">
                <i class="far fa-calendar-alt"></i> ${fromDate} - ${toDate}
                ${experience.location ? ` | <i class="fas fa-map-marker-alt"></i> ${experience.location}` : ''}
              </p>
              ${experience.description ? `<p>${experience.description}</p>` : ''}
            </div>
          </div>
        `;
        
        isLeft = !isLeft;
      });
    })
    .catch(error => {
      console.error('Error loading experience:', error);
      toggleSectionVisibility('experience', true);
    });
}

// Load projects data
function loadProjects() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  const projectsContainer = document.getElementById('projectsContainer');
  
  db.collection('users').doc(userId).collection('projects').orderBy('title').get()
    .then(snapshot => {
      projectsContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('projects', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const project = doc.data();
        const tools = project.tools ? project.tools.split(',').map(tool => tool.trim()) : [];
        
        projectsContainer.innerHTML += `
          <div class="project-card">
            <div class="project-image">
              <i class="fas fa-code" style="font-size: 60px; color: var(--accent);"></i>
            </div>
            <div class="project-details">
              <h3>${project.title} ${project.featured ? '<span class="featured-badge">Featured</span>' : ''}</h3>
              <p>${project.description}</p>
              ${tools.length > 0 ? `
                <div class="project-tools">
                  ${tools.map(tool => `<span class="project-tool">${tool}</span>`).join('')}
                </div>
              ` : ''}
              <div class="project-links">
                <a href="${project.link}" class="project-link" target="_blank">
                  <i class="fas fa-external-link-alt"></i> View Project
                </a>
              </div>
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading projects:', error);
      toggleSectionVisibility('projects', true);
    });
}

// Load research data
function loadResearch() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  const researchContainer = document.getElementById('researchContainer');
  
  db.collection('users').doc(userId).collection('research').orderBy('year', 'desc').get()
    .then(snapshot => {
      researchContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('research', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const research = doc.data();
        const authors = research.authors ? research.authors.split(',').map(author => author.trim()) : [];
        
        researchContainer.innerHTML += `
          <div class="research-card">
            <h3>${research.title} ${research.isPublished ? 
              '<span class="published-badge">Published</span>' : 
              '<span class="unpublished-badge">Unpublished</span>'}</h3>
            <div class="research-meta">
              ${authors.length > 0 ? `<span><i class="fas fa-user-edit"></i> ${authors.join(', ')}</span>` : ''}
              <span><i class="far fa-calendar-alt"></i> ${research.year}</span>
              ${research.journal ? `<span><i class="fas fa-book-open"></i> ${research.journal}</span>` : ''}
              ${research.doi ? `<span><i class="fas fa-fingerprint"></i> ${research.doi}</span>` : ''}
            </div>
            <p>${research.abstract.substring(0, 200)}...</p>
            <div class="research-links">
              ${research.pdfLink ? `
                <a href="${research.pdfLink}" class="research-link" target="_blank">
                  <i class="fas fa-file-pdf"></i> View PDF
                </a>
              ` : ''}
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading research:', error);
      toggleSectionVisibility('research', true);
    });
}

// Load certificates data
function loadCertificates() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  const certificatesContainer = document.getElementById('certificatesContainer');
  
  db.collection('users').doc(userId).collection('certificates').orderBy('issueDate', 'desc').get()
    .then(snapshot => {
      certificatesContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('certificates', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const certificate = doc.data();
        const issueDate = certificate.issueDate ? new Date(certificate.issueDate.seconds * 1000).toLocaleDateString() : '';
        const expirationDate = certificate.expirationDate ? new Date(certificate.expirationDate.seconds * 1000).toLocaleDateString() : 'N/A';
        const skills = certificate.skills ? certificate.skills.split(',').map(skill => skill.trim()) : [];
        
        certificatesContainer.innerHTML += `
          <div class="certificate-card">
            <div class="certificate-image">
              ${certificate.imageUrl ? 
                `<img src="${certificate.imageUrl}" alt="${certificate.title}">` : 
                `<i class="fas fa-certificate" style="font-size: 60px; color: var(--accent);"></i>`}
            </div>
            <div class="certificate-details">
              <h3>${certificate.title}</h3>
              <div class="certificate-meta">
                <span><i class="fas fa-building"></i> ${certificate.issuingOrganization}</span>
                <span><i class="far fa-calendar-alt"></i> ${issueDate}</span>
                <span><i class="fas fa-hourglass-end"></i> ${expirationDate}</span>
                ${certificate.credentialId ? `<span><i class="fas fa-id-card"></i> ${certificate.credentialId}</span>` : ''}
              </div>
              ${skills.length > 0 ? `
                <div class="certificate-skills">
                  ${skills.map(skill => `<span class="certificate-skill">${skill}</span>`).join('')}
                </div>
              ` : ''}
              ${certificate.credentialUrl ? `
                <a href="${certificate.credentialUrl}" class="certificate-link" target="_blank">
                  <i class="fas fa-external-link-alt"></i> View Credential
                </a>
              ` : ''}
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading certificates:', error);
      toggleSectionVisibility('certificates', true);
    });
}

// Load open source contributions
function loadOpenSource() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  const opensourceContainer = document.getElementById('opensourceContainer');
  
  db.collection('users').doc(userId).collection('openSource').orderBy('date', 'desc').get()
    .then(snapshot => {
      opensourceContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('opensource', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const contribution = doc.data();
        const date = contribution.date ? new Date(contribution.date.seconds * 1000).toLocaleDateString() : '';
        
        let statusBadge = '';
        if (contribution.status === 'merged') {
          statusBadge = '<span class="status-badge status-merged">Merged</span>';
        } else if (contribution.status === 'open') {
          statusBadge = '<span class="status-badge status-open">Open</span>';
        } else if (contribution.status === 'closed') {
          statusBadge = '<span class="status-badge status-closed">Closed</span>';
        } else if (contribution.status === 'draft') {
          statusBadge = '<span class="status-badge status-draft">Draft</span>';
        }
        
        opensourceContainer.innerHTML += `
          <div class="opensource-card">
            <h3>${contribution.title} ${contribution.featured ? '<span class="featured-badge">Featured</span>' : ''}</h3>
            <div class="opensource-meta">
              <span><i class="far fa-calendar-alt"></i> ${date}</span>
              <span><i class="fas fa-tag"></i> ${contribution.type}</span>
              <span>Status: ${statusBadge}</span>
            </div>
            <p>${contribution.description.substring(0, 200)}...</p>
            <div class="opensource-links">
              <a href="${contribution.repo}" class="opensource-link" target="_blank">
                <i class="fab fa-github"></i> Repository
              </a>
              ${contribution.pullRequest ? `
                <a href="${contribution.pullRequest}" class="opensource-link" target="_blank">
                  <i class="fas fa-code-branch"></i> Pull Request
                </a>
              ` : ''}
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading open source contributions:', error);
      toggleSectionVisibility('opensource', true);
    });
}

// Load awards data
function loadAwards() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  const awardsContainer = document.getElementById('awardsContainer');
  
  db.collection('users').doc(userId).collection('awards').orderBy('issueDate', 'desc').get()
    .then(snapshot => {
      awardsContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('awards', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const award = doc.data();
        const issueDate = award.issueDate ? new Date(award.issueDate.seconds * 1000).toLocaleDateString() : '';
        
        awardsContainer.innerHTML += `
          <div class="award-card">
            <div class="award-image">
              ${award.imageUrl ? 
                `<img src="${award.imageUrl}" alt="${award.title}">` : 
                `<i class="fas fa-award" style="font-size: 60px; color: var(--accent);"></i>`}
            </div>
            <div class="award-details">
              <h3>${award.title}</h3>
              <div class="award-meta">
                <span><i class="fas fa-building"></i> ${award.issuingOrganization}</span>
                <span><i class="far fa-calendar-alt"></i> ${issueDate}</span>
              </div>
              <span class="award-category">${award.category}</span>
              ${award.description ? `<p>${award.description}</p>` : ''}
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading awards:', error);
      toggleSectionVisibility('awards', true);
    });
}

// Load timeline data
function loadTimeline() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  const timelineContainer = document.getElementById('timelineContainer');
  
  db.collection('users').doc(userId).collection('timeline').orderBy('date', 'desc').get()
    .then(snapshot => {
      timelineContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('timeline', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const timeline = doc.data();
        const date = timeline.date ? new Date(timeline.date.seconds * 1000).toLocaleDateString() : '';
        const icon = timeline.icon || 'fas fa-star';
        
        timelineContainer.innerHTML += `
          <div class="milestone-card ${timeline.featured ? 'featured-milestone' : ''}">
            <div class="milestone-icon">
              <i class="${icon}"></i>
            </div>
            <div class="milestone-content">
              <h3>${timeline.title}</h3>
              <p class="mileline-date">
                <i class="far fa-calendar-alt"></i> ${date}
              </p>
              <p>${timeline.description}</p>
              <span class="milestone-category">${timeline.category}</span>
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading timeline:', error);
      toggleSectionVisibility('timeline', true);
    });
}

// Load gallery data
function loadGallery() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  const galleryContainer = document.getElementById('galleryContainer');
  
  db.collection('users').doc(userId).collection('gallery').orderBy('date', 'desc').get()
    .then(snapshot => {
      galleryContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('gallery', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const galleryItem = doc.data();
        const date = galleryItem.date ? new Date(galleryItem.date.seconds * 1000).toLocaleDateString() : '';
        const tools = galleryItem.tools ? galleryItem.tools.split(',').map(tool => tool.trim()) : [];
        
        galleryContainer.innerHTML += `
          <div class="gallery-item">
            ${galleryItem.featured ? '<span class="featured-badge-gallery">Featured</span>' : ''}
            <img src="${galleryItem.imageUrl || 'https://via.placeholder.com/300x200'}" alt="${galleryItem.title}" class="gallery-image">
            <div class="gallery-overlay">
              <h3 class="gallery-title">${galleryItem.title}</h3>
              <p class="gallery-category">${galleryItem.category}</p>
              ${tools.length > 0 ? `
                <div class="gallery-tools">
                  ${tools.map(tool => `<span class="gallery-tool">${tool}</span>`).join('')}
                </div>
              ` : ''}
              ${galleryItem.link ? `
                <a href="${galleryItem.link}" class="gallery-link" target="_blank">
                  <i class="fas fa-external-link-alt"></i> View Project
                </a>
              ` : ''}
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading gallery:', error);
      toggleSectionVisibility('gallery', true);
    });
}

// Load social profiles data
function loadSocialProfiles() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("uid");
  
  const socialProfilesContainer = document.getElementById('socialProfilesContainer');
  
  db.collection('users').doc(userId).collection('socialProfiles').orderBy('platform').get()
    .then(snapshot => {
      socialProfilesContainer.innerHTML = '';
      
      if (snapshot.empty) {
        toggleSectionVisibility('social', true);
        return;
      }
      
      snapshot.forEach(doc => {
        const socialProfile = doc.data();
        const platformName = socialProfile.platform === 'custom' ? socialProfile.customName : socialProfile.platform;
        const icon = socialProfile.icon || getDefaultIcon(socialProfile.platform);
        
        socialProfilesContainer.innerHTML += `
          <div class="social-profile-card">
            <div class="social-icon">
              <i class="${icon}"></i>
            </div>
            <div class="social-info">
              <h3>${platformName} ${socialProfile.featured ? '<span class="featured-badge-social">Featured</span>' : ''}</h3>
              ${socialProfile.username ? `<p>@${socialProfile.username}</p>` : ''}
              <a href="${socialProfile.url}" class="social-link" target="_blank">
                <i class="fas fa-external-link-alt"></i> Visit Profile
              </a>
            </div>
          </div>
        `;
      });
    })
    .catch(error => {
      console.error('Error loading social profiles:', error);
      toggleSectionVisibility('social', true);
    });
}

// Helper function to get default icon for social platforms
function getDefaultIcon(platform) {
  switch (platform) {
    case 'github':
      return 'fab fa-github';
    case 'linkedin':
      return 'fab fa-linkedin-in';
    case 'twitter':
      return 'fab fa-twitter';
    case 'facebook':
      return 'fab fa-facebook-f';
    case 'instagram':
      return 'fab fa-instagram';
    case 'youtube':
      return 'fab fa-youtube';
    case 'medium':
      return 'fab fa-medium-m';
    case 'dev':
      return 'fab fa-dev';
    case 'stackoverflow':
      return 'fab fa-stack-overflow';
    case 'codepen':
      return 'fab fa-codepen';
    case 'kaggle':
      return 'fab fa-kaggle';
    case 'credly':
      return 'fas fa-award';
    case 'google-cloud':
      return 'fab fa-google';
    case 'hackerrank':
      return 'fab fa-hackerrank';
    case 'leetcode':
      return 'fas fa-code';
    default:
      return 'fas fa-globe';
  }
}

// Initialize all data loading when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadUserTheme(); 
  loadProfile();
  loadResume();
  loadSkills();
  loadLanguages();
  loadExperience();
  loadProjects();
  loadResearch();
  loadCertificates();
  loadOpenSource();
  loadAwards();
  loadTimeline();
  loadGallery();
  loadSocialProfiles();
});