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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Admin Dashboard Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Check admin authentication
    auth.onAuthStateChanged(user => {
        if (!user) {
            showAdminLogin();
        } else {
            verifyAdminAccess(user.uid);
        }
    });

    function showAdminLogin() {
        document.body.innerHTML = `
            <div class="admin-login">
                <div class="login-container">
                    <h1>AlfaVox Admin Portal</h1>
                    <form id="adminLoginForm">
                        <div class="form-group">
                            <label>Admin Email</label>
                            <input type="email" id="adminEmail" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="adminPassword" required>
                        </div>
                        <button type="submit" class="btn-login">Login</button>
                        <div id="loginError" class="error-message"></div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Authenticating...';
            
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return db.collection('adminUsers').doc(userCredential.user.uid).get();
                })
                .then(doc => {
                    if (!doc.exists || doc.data().role !== 'officialAdmin') {
                        throw new Error('Unauthorized access');
                    }
                    initAdminDashboard();
                })
                .catch(error => {
                    console.error('Admin login error:', error);
                    document.getElementById('loginError').textContent = 
                        error.code === 'auth/wrong-password' ? 'Invalid credentials' : 
                        'You are not authorized to access this portal';
                    auth.signOut();
                })
                .finally(() => {
                    btn.disabled = false;
                    btn.textContent = 'Login';
                });
        });
    }

    function verifyAdminAccess(uid) {
        db.collection('adminUsers').doc(uid).get()
            .then(doc => {
                if (doc.exists && doc.data().role === 'officialAdmin') {
                    initAdminDashboard();
                } else {
                    throw new Error('Not an admin');
                }
            })
            .catch(error => {
                console.error('Admin verification failed:', error);
                auth.signOut();
                showAdminLogin();
            });
    }

    function initAdminDashboard() {
        document.body.innerHTML = `
            <div class="admin-container">
                <header class="admin-header">
                    <h1>AlfaVox Admin Dashboard</h1>
                    <div class="admin-actions">
                        <button id="refreshBtn" class="btn-action">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button id="logoutBtn" class="btn-action">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </header>

                <div class="dashboard-content">
                    <!-- Stats Overview -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>Total Users</h3>
                            <p id="totalUsers">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Active</h3>
                            <p id="activeUsers">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Pending</h3>
                            <p id="pendingUsers">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Expired</h3>
                            <p id="expiredUsers">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Trials</h3>
                            <p id="trialUsers">0</p>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="filters">
                        <select id="statusFilter" class="filter-select">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="blocked">Blocked</option>
                        </select>
                        
                        <select id="planFilter" class="filter-select">
                            <option value="">All Plans</option>
                            <option value="trial">Trial</option>
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                            <option value="90">90 Days</option>
                        </select>
                        
                        <input type="text" id="searchInput" class="search-input" placeholder="Search users...">
                        <button id="exportBtn" class="btn-export">
                            <i class="fas fa-file-export"></i> Export
                        </button>
                    </div>

                    <!-- Main Data Table -->
                    <div class="data-table-container">
                        <table id="usersTable">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Plan</th>
                                    <th>Status</th>
                                    <th>Start Date</th>
                                    <th>Expiry Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody"></tbody>
                        </table>
                    </div>
                </div>

                <!-- User Details Modal -->
                <div id="userModal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="modalTitle">User Details</h2>
                            <span class="close-modal">&times;</span>
                        </div>
                        <div class="modal-body" id="modalBody">
                            <!-- Dynamic content will be loaded here -->
                        </div>
                        <div class="modal-footer">
                            <button id="approveBtn" class="btn-success">Approve</button>
                            <button id="rejectBtn" class="btn-danger">Reject</button>
                            <button id="blockBtn" class="btn-warning">Block</button>
                            <button id="activateBtn" class="btn-success">Activate</button>
                            <button id="extendBtn" class="btn-info">Extend</button>
                            <button id="closeModalBtn" class="btn-neutral">Close</button>
                        </div>
                    </div>
                </div>

                <!-- Extend Subscription Modal -->
                <div id="extendModal" class="modal hidden">
                    <div class="modal-content">
                        <h3>Extend Subscription</h3>
                        <div class="form-group">
                            <label>Extension Period (days)</label>
                            <input type="number" id="extendDays" min="1" value="30">
                        </div>
                        <div class="modal-actions">
                            <button id="confirmExtendBtn" class="btn-success">Confirm</button>
                            <button id="cancelExtendBtn" class="btn-neutral">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize UI elements
        const usersTableBody = document.getElementById('usersTableBody');
        const statusFilter = document.getElementById('statusFilter');
        const planFilter = document.getElementById('planFilter');
        const searchInput = document.getElementById('searchInput');
        const refreshBtn = document.getElementById('refreshBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const exportBtn = document.getElementById('exportBtn');
        const userModal = document.getElementById('userModal');
        const modalBody = document.getElementById('modalBody');
        const closeModalBtn = document.getElementById('closeModalBtn');

        // State management
        let currentSelectedUser = null;
        let allUsersData = [];

        // Event listeners
        refreshBtn.addEventListener('click', loadData);
        logoutBtn.addEventListener('click', handleLogout);
        exportBtn.addEventListener('click', exportToExcel);
        statusFilter.addEventListener('change', loadData);
        planFilter.addEventListener('change', loadData);
        searchInput.addEventListener('input', filterUsers);
        closeModalBtn.addEventListener('click', () => userModal.classList.add('hidden'));

        // Initial data load
        loadData();

        // Main data loading function
        function loadData() {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            // Clear previous data
            usersTableBody.innerHTML = '<tr><td colspan="8" class="loading-row">Loading data...</td></tr>';
            
            // Load both subscriptions and portfolios
            Promise.all([
                db.collection('subscriptions').get(),
                db.collection('portfolios').get()
            ])
            .then(([subscriptionsSnapshot, portfoliosSnapshot]) => {
                // Process data
                const usersMap = new Map();
                
                // Process subscriptions first
                subscriptionsSnapshot.forEach(doc => {
                    const data = doc.data();
                    usersMap.set(data.userId, {
                        ...data,
                        subscriptionId: doc.id,
                        portfolioData: null
                    });
                });
                
                // Merge with portfolio data
                portfoliosSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (usersMap.has(data.userId)) {
                        usersMap.get(data.userId).portfolioData = data;
                    } else {
                        // Handle case where portfolio exists without subscription
                        usersMap.set(data.userId, {
                            userId: data.userId,
                            subscriptionId: null,
                            portfolioData: data
                        });
                    }
                });
                
                // Convert to array and sort by latest first
                allUsersData = Array.from(usersMap.values()).sort((a, b) => {
                    const dateA = a.portfolioData?.updatedAt || a.requestedAt || '';
                    const dateB = b.portfolioData?.updatedAt || b.requestedAt || '';
                    return dateB.localeCompare(dateA);
                });
                
                updateStats(allUsersData);
                renderUsersTable(allUsersData);
            })
            .catch(error => {
                console.error('Error loading data:', error);
                usersTableBody.innerHTML = '<tr><td colspan="8" class="error-row">Error loading data</td></tr>';
            })
            .finally(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
        }

        function updateStats(users) {
            const now = new Date();
            let total = 0, active = 0, pending = 0, expired = 0, trials = 0;
            
            users.forEach(user => {
                total++;
                if (user.isTrial) trials++;
                
                const status = user.portfolioData?.subscription?.status || user.status;
                const expiryDate = user.portfolioData?.subscription?.expiryDate || user.expiryDate;
                
                if (status === 'pending') {
                    pending++;
                } else if (status === 'active') {
                    if (expiryDate && new Date(expiryDate) < now) {
                        expired++;
                    } else {
                        active++;
                    }
                } else if (status === 'expired') {
                    expired++;
                }
            });
            
            document.getElementById('totalUsers').textContent = total;
            document.getElementById('activeUsers').textContent = active;
            document.getElementById('pendingUsers').textContent = pending;
            document.getElementById('expiredUsers').textContent = expired;
            document.getElementById('trialUsers').textContent = trials;
        }

        function renderUsersTable(users) {
            usersTableBody.innerHTML = '';
            
            if (users.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="8" class="empty-row">No users found</td></tr>';
                return;
            }
            
            const now = new Date();
            const statusFilterValue = statusFilter.value;
            const planFilterValue = planFilter.value;
            
            users.forEach(user => {
                // Apply filters
                const status = user.portfolioData?.subscription?.status || user.status;
                const plan = user.portfolioData?.subscription?.plan || user.plan;
                
                if (statusFilterValue && status !== statusFilterValue) return;
                if (planFilterValue && plan !== planFilterValue) return;
                
                // Calculate days remaining if active
                let daysRemaining = '';
                if (status === 'active' && user.portfolioData?.subscription?.expiryDate) {
                    const expiry = new Date(user.portfolioData.subscription.expiryDate);
                    const diffTime = expiry - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    daysRemaining = diffDays > 0 ? `${diffDays}d left` : 'Expired';
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.userId || 'N/A'}</td>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>
                        ${plan === 'trial' ? '7-Day Trial' : 
                         plan ? `${plan} Days` : 'N/A'}
                    </td>
                    <td class="status-cell ${status || 'unknown'}">
                        ${status || 'N/A'} ${daysRemaining ? `(${daysRemaining})` : ''}
                    </td>
                    <td>
                        ${user.portfolioData?.subscription?.startDate ? 
                         formatDate(user.portfolioData.subscription.startDate) : 'N/A'}
                    </td>
                    <td>
                        ${user.portfolioData?.subscription?.expiryDate ? 
                         formatDate(user.portfolioData.subscription.expiryDate) : 'N/A'}
                    </td>
                    <td>
                        <button class="btn-action btn-view" data-id="${user.userId}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                `;
                usersTableBody.appendChild(row);
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.btn-view').forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    showUserDetails(userId);
                });
            });
        }

        function filterUsers() {
            const searchTerm = searchInput.value.toLowerCase();
            if (!searchTerm) {
                renderUsersTable(allUsersData);
                return;
            }
            
            const filtered = allUsersData.filter(user => 
                (user.userId && user.userId.toLowerCase().includes(searchTerm)) ||
                (user.name && user.name.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm))
            );
            
            renderUsersTable(filtered);
        }

        function showUserDetails(userId) {
            const user = allUsersData.find(u => u.userId === userId);
            if (!user) return;
            
            currentSelectedUser = user;
            
            // Prepare modal content
            let modalContent = `
                <div class="user-details">
                    <div class="detail-row">
                        <span class="detail-label">User ID:</span>
                        <span>${user.userId || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span>${user.name || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span>${user.email || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span>${user.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Plan:</span>
                        <span>
                            ${user.portfolioData?.subscription?.plan || user.plan || 'N/A'}
                            ${user.isTrial ? '(Trial)' : ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="status-badge ${user.portfolioData?.subscription?.status || user.status || 'unknown'}">
                            ${user.portfolioData?.subscription?.status || user.status || 'N/A'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Start Date:</span>
                        <span>
                            ${user.portfolioData?.subscription?.startDate ? 
                              formatDate(user.portfolioData.subscription.startDate) : 'N/A'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Expiry Date:</span>
                        <span>
                            ${user.portfolioData?.subscription?.expiryDate ? 
                              formatDate(user.portfolioData.subscription.expiryDate) : 'N/A'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Grace Period:</span>
                        <span>
                            ${user.portfolioData?.subscription?.gracePeriodEndsAt ? 
                              formatDate(user.portfolioData.subscription.gracePeriodEndsAt) : 'N/A'}
                        </span>
                    </div>
            `;
            
            // Add payment proof if available
            if (user.paymentProof) {
                modalContent += `
                    <div class="detail-row">
                        <span class="detail-label">Payment Proof:</span>
                        <a href="${user.paymentProof}" target="_blank" class="proof-link">
                            View Proof
                        </a>
                        <img src="${user.paymentProof}" alt="Payment Proof" class="proof-image">
                    </div>
                `;
            }
            
            // Add transaction ID if available
            if (user.portfolioData?.subscription?.transactionId) {
                modalContent += `
                    <div class="detail-row">
                        <span class="detail-label">Transaction ID:</span>
                        <span>${user.portfolioData.subscription.transactionId}</span>
                    </div>
                `;
            }
            
            modalContent += `</div>`;
            modalBody.innerHTML = modalContent;
            
            // Set up action buttons based on status
            setupActionButtons(user.portfolioData?.subscription?.status || user.status);
            
            // Show modal
            userModal.classList.remove('hidden');
        }

        function setupActionButtons(status) {
            // Get all action buttons
            const approveBtn = document.getElementById('approveBtn');
            const rejectBtn = document.getElementById('rejectBtn');
            const blockBtn = document.getElementById('blockBtn');
            const activateBtn = document.getElementById('activateBtn');
            const extendBtn = document.getElementById('extendBtn');
            
            // Hide all by default
            [approveBtn, rejectBtn, blockBtn, activateBtn, extendBtn].forEach(btn => {
                btn.style.display = 'none';
            });
            
            // Show relevant buttons based on status
            switch(status) {
                case 'pending':
                    approveBtn.style.display = 'inline-block';
                    rejectBtn.style.display = 'inline-block';
                    break;
                case 'active':
                    blockBtn.style.display = 'inline-block';
                    extendBtn.style.display = 'inline-block';
                    break;
                case 'expired':
                    activateBtn.style.display = 'inline-block';
                    extendBtn.style.display = 'inline-block';
                    break;
                case 'blocked':
                    activateBtn.style.display = 'inline-block';
                    break;
            }
            
            // Add event listeners
            approveBtn.onclick = () => approveUser();
            rejectBtn.onclick = () => rejectUser();
            blockBtn.onclick = () => updateUserStatus('blocked');
            activateBtn.onclick = () => updateUserStatus('active');
            extendBtn.onclick = () => showExtendModal();
        }

        function approveUser() {
            if (!currentSelectedUser || !confirm('Approve this subscription?')) return;
            
            const approveBtn = document.getElementById('approveBtn');
            approveBtn.disabled = true;
            approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Show transaction ID modal
            const transactionModal = document.createElement('div');
            transactionModal.className = 'modal';
            transactionModal.innerHTML = `
                <div class="modal-content small-modal">
                    <h3>Enter Transaction Details</h3>
                    <div class="form-group">
                        <label>Transaction ID *</label>
                        <input type="text" id="transactionIdInput" required>
                    </div>
                    <div class="modal-actions">
                        <button id="confirmTransactionBtn" class="btn-success">Confirm</button>
                        <button id="cancelTransactionBtn" class="btn-neutral">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(transactionModal);
            
            document.getElementById('confirmTransactionBtn').onclick = () => {
                const transactionId = document.getElementById('transactionIdInput').value.trim();
                if (!transactionId) {
                    alert('Please enter a transaction ID');
                    return;
                }
                
                completeApproval(transactionId);
                document.body.removeChild(transactionModal);
            };
            
            document.getElementById('cancelTransactionBtn').onclick = () => {
                document.body.removeChild(transactionModal);
                approveBtn.disabled = false;
                approveBtn.innerHTML = 'Approve';
            };
        }

        function completeApproval(transactionId) {
            const approveBtn = document.getElementById('approveBtn');
            const userId = currentSelectedUser.userId;
            const now = new Date();
            
            // Calculate expiry date based on plan
            let expiryDate = new Date();
            const plan = currentSelectedUser.portfolioData?.subscription?.plan || currentSelectedUser.plan;
            
            if (plan === 'trial') {
                expiryDate.setDate(now.getDate() + 7); // 7-day trial
            } else if (plan === '30') {
                expiryDate.setDate(now.getDate() + 30);
            } else if (plan === '60') {
                expiryDate.setDate(now.getDate() + 60);
            } else if (plan === '90') {
                expiryDate.setDate(now.getDate() + 90);
            } else {
                expiryDate.setDate(now.getDate() + 30); // Default 30 days
            }
            
            // Calculate grace period (3 days after expiry)
            const gracePeriodEndsAt = new Date(expiryDate);
            gracePeriodEndsAt.setDate(expiryDate.getDate() + 3);
            
            // Update both subscriptions and portfolios collections
            const batch = db.batch();
            
            // Update subscription
            const subRef = db.collection('subscriptions').doc(userId);
            batch.update(subRef, {
                status: 'active',
                processedAt: now.toISOString(),
                processedBy: auth.currentUser.uid,
                transactionId: transactionId
            });
            
            // Update portfolio
            const portfolioRef = db.collection('portfolios').doc(userId);
            batch.set(portfolioRef, {
                'subscription.status': 'active',
                'subscription.startDate': now.toISOString(),
                'subscription.expiryDate': expiryDate.toISOString(),
                'subscription.gracePeriodEndsAt': gracePeriodEndsAt.toISOString(),
                'subscription.transactionId': transactionId,
                updatedAt: now.toISOString()
            });
            
            batch.commit()
                .then(() => {
                    alert('Subscription approved successfully!');
                    loadData();
                    userModal.classList.add('hidden');
                })
                .catch(error => {
                    console.error('Approval error:', error);
                    alert('Error approving subscription: ' + error.message);
                })
                .finally(() => {
                    approveBtn.disabled = false;
                    approveBtn.innerHTML = 'Approve';
                });
        }

        function rejectUser() {
            if (!currentSelectedUser || !confirm('Reject this subscription?')) return;
            
            const rejectBtn = document.getElementById('rejectBtn');
            rejectBtn.disabled = true;
            rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            const userId = currentSelectedUser.userId;
            const now = new Date();
            
            db.collection('subscriptions').doc(userId).update({
                status: 'rejected',
                processedAt: now.toISOString(),
                processedBy: auth.currentUser.uid
            })
            .then(() => {
                alert('Subscription rejected');
                loadData();
                userModal.classList.add('hidden');
            })
            .catch(error => {
                console.error('Rejection error:', error);
                alert('Error rejecting subscription: ' + error.message);
            })
            .finally(() => {
                rejectBtn.disabled = false;
                rejectBtn.innerHTML = 'Reject';
            });
        }

        function updateUserStatus(newStatus) {
            if (!currentSelectedUser || !confirm(`Change status to ${newStatus}?`)) return;
            
            const actionBtn = document.getElementById(newStatus === 'blocked' ? 'blockBtn' : 'activateBtn');
            actionBtn.disabled = true;
            actionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            const userId = currentSelectedUser.userId;
            const now = new Date();
            
            // Update both collections
            const batch = db.batch();
            
            // Update subscription
            const subRef = db.collection('subscriptions').doc(userId);
            batch.update(subRef, {
                status: newStatus,
                updatedAt: now.toISOString()
            });
            
            // Update portfolio if exists
            if (currentSelectedUser.portfolioData) {
                const portfolioRef = db.collection('portfolios').doc(userId);
                batch.update(portfolioRef, {
                    'subscription.status': newStatus,
                    updatedAt: now.toISOString()
                });
            }
            
            batch.commit()
                .then(() => {
                    alert(`Status updated to ${newStatus}`);
                    loadData();
                    userModal.classList.add('hidden');
                })
                .catch(error => {
                    console.error('Status update error:', error);
                    alert('Error updating status: ' + error.message);
                })
                .finally(() => {
                    actionBtn.disabled = false;
                    actionBtn.innerHTML = newStatus === 'blocked' ? 'Block' : 'Activate';
                });
        }

        function showExtendModal() {
            if (!currentSelectedUser) return;
            
            const extendModal = document.getElementById('extendModal');
            document.getElementById('extendDays').value = '30';
            extendModal.classList.remove('hidden');
            
            document.getElementById('confirmExtendBtn').onclick = extendSubscription;
            document.getElementById('cancelExtendBtn').onclick = () => {
                extendModal.classList.add('hidden');
            };
        }

        function extendSubscription() {
            const extendDays = parseInt(document.getElementById('extendDays').value);
            if (!extendDays || extendDays < 1) {
                alert('Please enter a valid number of days');
                return;
            }
            
            if (!currentSelectedUser || !confirm(`Extend subscription by ${extendDays} days?`)) return;
            
            const confirmBtn = document.getElementById('confirmExtendBtn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extending...';
            
            const userId = currentSelectedUser.userId;
            const now = new Date();
            
            // Get current expiry date or use now if not available
            let currentExpiry = new Date();
            if (currentSelectedUser.portfolioData?.subscription?.expiryDate) {
                currentExpiry = new Date(currentSelectedUser.portfolioData.subscription.expiryDate);
                if (currentExpiry < now) currentExpiry = now; // If already expired, extend from now
            }
            
            // Calculate new expiry date
            const newExpiry = new Date(currentExpiry);
            newExpiry.setDate(currentExpiry.getDate() + extendDays);
            
            // Calculate new grace period (3 days after new expiry)
            const newGracePeriod = new Date(newExpiry);
            newGracePeriod.setDate(newExpiry.getDate() + 3);
            
            // Update both collections
            const batch = db.batch();
            
            // Update subscription
            const subRef = db.collection('subscriptions').doc(userId);
            batch.update(subRef, {
                expiryDate: newExpiry.toISOString(),
                gracePeriodEndsAt: newGracePeriod.toISOString(),
                updatedAt: now.toISOString()
            });
            
            // Update portfolio
            const portfolioRef = db.collection('portfolios').doc(userId);
            batch.update(portfolioRef, {
                'subscription.expiryDate': newExpiry.toISOString(),
                'subscription.gracePeriodEndsAt': newGracePeriod.toISOString(),
                updatedAt: now.toISOString()
            });
            
            batch.commit()
                .then(() => {
                    alert(`Subscription extended by ${extendDays} days`);
                    loadData();
                    document.getElementById('extendModal').classList.add('hidden');
                    userModal.classList.add('hidden');
                })
                .catch(error => {
                    console.error('Extension error:', error);
                    alert('Error extending subscription: ' + error.message);
                })
                .finally(() => {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = 'Confirm';
                });
        }

        function exportToExcel() {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            
            try {
                // Prepare data
                const data = [];
                const headers = [
                    'User ID', 'Name', 'Email', 'Phone', 
                    'Plan', 'Status', 'Start Date', 
                    'Expiry Date', 'Grace Period', 
                    'Transaction ID', 'Payment Proof'
                ];
                
                allUsersData.forEach(user => {
                    data.push([
                        user.userId || '',
                        user.name || '',
                        user.email || '',
                        user.phone || '',
                        user.portfolioData?.subscription?.plan || user.plan || '',
                        user.portfolioData?.subscription?.status || user.status || '',
                        user.portfolioData?.subscription?.startDate ? 
                            formatDate(user.portfolioData.subscription.startDate) : '',
                        user.portfolioData?.subscription?.expiryDate ? 
                            formatDate(user.portfolioData.subscription.expiryDate) : '',
                        user.portfolioData?.subscription?.gracePeriodEndsAt ? 
                            formatDate(user.portfolioData.subscription.gracePeriodEndsAt) : '',
                        user.portfolioData?.subscription?.transactionId || '',
                        user.paymentProof || ''
                    ]);
                });
                
                // Create workbook
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
                XLSX.utils.book_append_sheet(wb, ws, 'Subscriptions');
                
                // Generate file name with current date
                const dateStr = new Date().toISOString().slice(0, 10);
                XLSX.writeFile(wb, `AlfaVox_Subscriptions_${dateStr}.xlsx`);
            } catch (error) {
                console.error('Export error:', error);
                alert('Error exporting data: ' + error.message);
            } finally {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Export';
            }
        }

        function handleLogout() {
            auth.signOut()
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                    alert('Error during logout. Please try again.');
                });
        }

        function formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
});