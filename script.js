// ===== SUPABASE SETUP =====
// 🔴 IMPORTANT: REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://zjqdcuurearuxvxvejjj.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcWRjdXVyZWFydXh2eHZlampqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDg3MDAsImV4cCI6MjA4OTQyNDcwMH0.U7iTsV0NUlO0Tncuqjsy-9dPjltvmf4lQF4L1CrgENw';  

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== GLOBAL VARIABLES (EXACTLY LIKE YOUR ORIGINAL) =====
let users = [];
let loans = [];
let investments = [];
let payments = [];
let userDocuments = {};
let currentUser = null;
let updateInterval;
let uploadedFiles = {
    aadhaar: null,
    undertaking: null
};
let currentLoanForInvestment = null;

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_HERE'; // Replace with your Razorpay key

// ===== LOAD DATA FROM SUPABASE =====
async function loadData() {
    try {
        // Load users
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*');
        
        if (usersError) throw usersError;
        users = usersData || [];

        // Load loans
        const { data: loansData, error: loansError } = await supabase
            .from('loans')
            .select('*')
            .order('id', { ascending: false });
        
        if (loansError) throw loansError;
        loans = loansData || [];

        // Load investments
        const { data: investmentsData, error: investmentsError } = await supabase
            .from('investments')
            .select('*');
        
        if (investmentsError) throw investmentsError;
        investments = investmentsData || [];

        // Render everything
        renderLoanRequests();
        renderInvestmentOpportunities();
        
        // If user is logged in, update dashboard
        if (currentUser) {
            renderUserDashboard();
        }
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error connecting to database');
    }
}

// ===== LOGIN FUNCTION =====
async function loginUser(usernameOrEmail, password) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
            .eq('password', password);

        if (error) throw error;
        return data[0] || null;
    } catch (error) {
        console.error('Login error:', error);
        return null;
    }
}

// ===== REGISTER FUNCTION =====
async function registerUser(username, password, email) {
    try {
        // Check if username exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('username', username);

        if (existingUser && existingUser.length > 0) {
            showNotification('Username already exists');
            return null;
        }

        // Check if email exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (existingEmail && existingEmail.length > 0) {
            showNotification('Email already registered');
            return null;
        }

        // Create new user
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username: username,
                    password: password,
                    email: email,
                    balance: 50000,
                    kycStatus: 'pending',
                    documents: []
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Registration failed');
        return null;
    }
}

// ===== CREATE LOAN FUNCTION =====
async function createLoan(loanData) {
    try {
        const { data, error } = await supabase
            .from('loans')
            .insert([loanData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Create loan error:', error);
        return null;
    }
}

// ===== UPDATE LOAN FUNCTION =====
async function updateLoan(loanId, updates) {
    try {
        const { data, error } = await supabase
            .from('loans')
            .update(updates)
            .eq('id', loanId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Update loan error:', error);
        return null;
    }
}

// ===== CREATE INVESTMENT FUNCTION =====
async function createInvestment(investmentData) {
    try {
        const { data, error } = await supabase
            .from('investments')
            .insert([investmentData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Create investment error:', error);
        return null;
    }
}

// ===== UPDATE USER FUNCTION =====
async function updateUser(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Update user error:', error);
        return null;
    }
}

// ===== DOCUMENT UPLOAD FUNCTION =====
async function uploadDocument(userId, loanId, file, documentType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                // Store document in loans table documents field (like original)
                const documentData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: reader.result,
                    uploadedAt: new Date().toISOString()
                };
                resolve(documentData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = error => reject(error);
    });
}

// ===== INITIALIZE PAGE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing...');
    
    // Load data from Supabase
    loadData();
    
    // DOM Elements
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const loanDetailModal = document.getElementById('loan-detail-modal');
    const investModal = document.getElementById('invest-modal');
    const agreementModal = document.getElementById('loan-agreement-modal');
    const successModal = document.getElementById('upload-success-modal');
    const documentViewerModal = document.getElementById('document-viewer-modal');
    const getStartedBtn = document.getElementById('get-started-btn');
    const learnMoreBtn = document.getElementById('learn-more-btn');
    const registerLink = document.getElementById('register-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');
    const closeButtons = document.querySelectorAll('.close');
    const navLinks = document.querySelectorAll('.nav-link');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const loanRequestForm = document.getElementById('loan-request-form');
    const agreementForm = document.getElementById('loan-agreement-form');
    const investForm = document.getElementById('invest-form');
    const menuToggle = document.querySelector('.menu-toggle');
    const passwordToggles = document.querySelectorAll('.password-toggle');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const razorpayPayBtn = document.getElementById('razorpay-pay-btn');
    const closeDocumentViewer = document.getElementById('close-document-viewer');

    // Check saved user
    const savedUser = localStorage.getItem('friendlend_currentUser');
    const rememberMe = localStorage.getItem('friendlend_rememberMe') === 'true';

    if (savedUser && rememberMe) {
        currentUser = JSON.parse(savedUser);
        updateUIAfterLogin();
        showNotification(`Welcome back, ${currentUser.username}!`);
    }

    // Initialize file upload handlers
    initFileUploadHandlers();

    // ===== LOGIN BUTTON =====
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Login button clicked');
            if (loginModal) {
                loginModal.style.display = 'flex';
            }
        });
    }

    // ===== GET STARTED BUTTON =====
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentUser) {
                showSection('dashboard');
            } else {
                loginModal.style.display = 'flex';
            }
        });
    }

    // ===== LEARN MORE BUTTON =====
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ===== REGISTER LINK =====
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'flex';
        });
    }

    // ===== FORGOT PASSWORD LINK =====
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            forgotPasswordModal.style.display = 'flex';
        });
    }

    // ===== BACK TO LOGIN LINK =====
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            forgotPasswordModal.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }

    // ===== CLOSE BUTTONS =====
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            forgotPasswordModal.style.display = 'none';
            loanDetailModal.style.display = 'none';
            investModal.style.display = 'none';
            if (agreementModal) agreementModal.style.display = 'none';
            if (successModal) successModal.style.display = 'none';
            if (documentViewerModal) documentViewerModal.style.display = 'none';
        });
    });

    // ===== CLOSE DOCUMENT VIEWER =====
    if (closeDocumentViewer) {
        closeDocumentViewer.addEventListener('click', function() {
            documentViewerModal.style.display = 'none';
        });
    }

    // ===== NAVIGATION =====
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            showSection(target);
        });
    });

    // ===== TABS =====
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            if (tabId === 'documents' && currentUser) {
                renderUserDocuments();
            }
        });
    });

    // ===== LOGIN FORM =====
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usernameOrEmail = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            const user = await loginUser(usernameOrEmail, password);

            if (user) {
                currentUser = user;
                localStorage.setItem('friendlend_currentUser', JSON.stringify(user));
                localStorage.setItem('friendlend_rememberMe', rememberMe);
                updateUIAfterLogin();
                loginModal.style.display = 'none';
                showNotification('Login successful!');
            } else {
                showNotification('Invalid username/email or password');
            }
        });
    }

    // ===== REGISTER FORM =====
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('new-username').value;
            const password = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const email = document.getElementById('email').value;

            if (password !== confirmPassword) {
                showNotification('Passwords do not match');
                return;
            }

            const newUser = await registerUser(username, password, email);

            if (newUser) {
                registerModal.style.display = 'none';
                registerForm.reset();
                showNotification('Registration successful! Please login.');
                document.getElementById('username').value = username;
                loginModal.style.display = 'flex';
            }
        });
    }

    // ===== FORGOT PASSWORD FORM =====
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            const user = users.find(u => u.email === email);
            if (user) {
                showNotification(`Password recovery email sent. Your password is: ${user.password}`);
                forgotPasswordModal.style.display = 'none';
                loginModal.style.display = 'flex';
            } else {
                showNotification('No account found with that email address');
            }
        });
    }

    // ===== LOAN REQUEST FORM =====
    if (loanRequestForm) {
        loanRequestForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!currentUser) {
                showNotification('Please login to create a loan request');
                loginModal.style.display = 'flex';
                return;
            }

            const purpose = document.getElementById('purpose').value;
            const amount = parseInt(document.getElementById('amount').value);
            const term = parseInt(document.getElementById('term').value);

            const monthlyInterest = 8 / 12 / 100;
            const monthlyPayment = amount * monthlyInterest * Math.pow(1 + monthlyInterest, term) / (Math.pow(1 + monthlyInterest, term) - 1);

            document.getElementById('agreement-purpose').value = purpose;
            document.getElementById('agreement-amount').value = amount;
            document.getElementById('agreement-term').value = term;
            document.getElementById('agreement-monthly-payment').value = Math.round(monthlyPayment);

            document.getElementById('summary-purpose').textContent = purpose;
            document.getElementById('summary-amount').textContent = amount.toLocaleString();
            document.getElementById('summary-term').textContent = term;
            document.getElementById('summary-monthly').textContent = Math.round(monthlyPayment).toLocaleString();

            resetUploads();

            if (agreementModal) {
                agreementModal.style.display = 'flex';
            }
        });
    }

    // ===== AGREEMENT FORM =====
    if (agreementForm) {
        agreementForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (!uploadedFiles.aadhaar || !uploadedFiles.undertaking) {
                showNotification('Please upload all required documents');
                return;
            }

            if (!document.getElementById('agree-terms').checked) {
                showNotification('Please agree to the terms and conditions');
                return;
            }

            const purpose = document.getElementById('agreement-purpose').value;
            const amount = parseInt(document.getElementById('agreement-amount').value);
            const term = parseInt(document.getElementById('agreement-term').value);
            const monthlyPayment = parseInt(document.getElementById('agreement-monthly-payment').value);

            try {
                // Create document URLs
                const aadhaarUrl = await uploadDocument(currentUser.id, null, uploadedFiles.aadhaar, 'aadhaar');
                const undertakingUrl = await uploadDocument(currentUser.id, null, uploadedFiles.undertaking, 'undertaking');

                // Create new loan
                const newLoan = {
                    borrower: currentUser.username,
                    purpose: purpose,
                    amount: amount,
                    term: term,
                    interest: 8,
                    status: 'active',
                    date: new Date().toISOString().split('T')[0],
                    monthlyPayment: monthlyPayment,
                    funded: 0,
                    investors: [],
                    documents: {
                        aadhaar: aadhaarUrl,
                        undertaking: undertakingUrl
                    },
                    agreementAccepted: true,
                    agreementDate: new Date().toISOString()
                };

                const createdLoan = await createLoan(newLoan);

                if (createdLoan) {
                    // Update user's KYC status
                    await updateUser(currentUser.id, { kycStatus: 'verified' });
                    currentUser.kycStatus = 'verified';

                    // Close agreement modal
                    agreementModal.style.display = 'none';

                    // Refresh data
                    await loadData();

                    showNotification('Loan request created with documents successfully!');
                }
            } catch (error) {
                console.error('Error creating loan:', error);
                showNotification('Failed to create loan');
            }
        });
    }

    // ===== CANCEL AGREEMENT BUTTON =====
    const cancelBtn = document.getElementById('cancel-agreement');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            agreementModal.style.display = 'none';
        });
    }

    // ===== CLOSE AGREEMENT BUTTON =====
    const closeAgreement = document.getElementById('close-agreement');
    if (closeAgreement) {
        closeAgreement.addEventListener('click', function() {
            agreementModal.style.display = 'none';
        });
    }

    // ===== MOBILE MENU TOGGLE =====
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.nav-links').classList.toggle('active');
        });
    }

    // ===== PASSWORD VISIBILITY TOGGLE =====
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.innerHTML = '<i class="far fa-eye-slash"></i>';
            } else {
                input.type = 'password';
                this.innerHTML = '<i class="far fa-eye"></i>';
            }
        });
    });

    // ===== CLOSE MODALS WHEN CLICKING OUTSIDE =====
    window.addEventListener('click', function(e) {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === registerModal) registerModal.style.display = 'none';
        if (e.target === forgotPasswordModal) forgotPasswordModal.style.display = 'none';
        if (e.target === loanDetailModal) loanDetailModal.style.display = 'none';
        if (e.target === investModal) investModal.style.display = 'none';
        if (e.target === agreementModal) agreementModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
        if (e.target === documentViewerModal) documentViewerModal.style.display = 'none';
    });

    // Start real-time updates
    startRealTimeUpdates();
});

// ===== SHOW SECTION =====
function showSection(target) {
    if (target === 'dashboard' && !currentUser) {
        showNotification('Please login first to access the dashboard');
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });

    if (target === 'home') {
        document.querySelector('.hero').style.display = 'block';
        document.querySelector('.features').style.display = 'block';
        document.getElementById('dashboard').style.display = 'block';
    } else if (target === 'dashboard') {
        document.getElementById('user-dashboard').style.display = 'block';
        renderUserDashboard();
    } else {
        document.getElementById(target).style.display = 'block';
    }

    document.querySelector('.nav-links').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== SHOW NOTIFICATION =====
function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    if (notification && notificationText) {
        notificationText.textContent = message;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// ===== UPDATE UI AFTER LOGIN =====
function updateUIAfterLogin() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = 'Logout';

        // Clone and replace to remove old event listeners
        loginBtn.replaceWith(loginBtn.cloneNode(true));
        const newLoginBtn = document.getElementById('login-btn');

        newLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            currentUser = null;
            localStorage.removeItem('friendlend_currentUser');
            localStorage.removeItem('friendlend_rememberMe');
            this.textContent = 'Login';
            document.getElementById('user-dashboard').style.display = 'none';
            showSection('home');
            showNotification('Logged out successfully');

            // Re-attach login modal handler
            this.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('login-modal').style.display = 'flex';
            });
        });
    }
}

// ===== INITIALIZE FILE UPLOAD HANDLERS =====
function initFileUploadHandlers() {
    const aadhaarUpload = document.getElementById('aadhaar-upload');
    const undertakingUpload = document.getElementById('undertaking-upload');
    const aadhaarArea = document.getElementById('aadhaar-upload-area');
    const undertakingArea = document.getElementById('undertaking-upload-area');

    if (aadhaarArea && aadhaarUpload) {
        aadhaarArea.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-file')) {
                aadhaarUpload.click();
            }
        });

        aadhaarUpload.addEventListener('change', function(e) {
            handleFileUpload(this.files[0], 'aadhaar');
        });

        // Drag and drop
        aadhaarArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            aadhaarArea.style.borderColor = '#f39c12';
        });

        aadhaarArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            aadhaarArea.style.borderColor = '#3498db';
        });

        aadhaarArea.addEventListener('drop', (e) => {
            e.preventDefault();
            aadhaarArea.style.borderColor = '#3498db';
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileUpload(file, 'aadhaar');
            }
        });
    }

    if (undertakingArea && undertakingUpload) {
        undertakingArea.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-file')) {
                undertakingUpload.click();
            }
        });

        undertakingUpload.addEventListener('change', function(e) {
            handleFileUpload(this.files[0], 'undertaking');
        });

        undertakingArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            undertakingArea.style.borderColor = '#f39c12';
        });

        undertakingArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            undertakingArea.style.borderColor = '#3498db';
        });

        undertakingArea.addEventListener('drop', (e) => {
            e.preventDefault();
            undertakingArea.style.borderColor = '#3498db';
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileUpload(file, 'undertaking');
            }
        });
    }
}

// ===== HANDLE FILE UPLOAD =====
function handleFileUpload(file, type) {
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size should be less than 5MB');
        return;
    }

    // Check file type
    if (type === 'aadhaar') {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload PDF, JPG, or PNG file for Aadhaar');
            return;
        }
        uploadedFiles.aadhaar = file;
        updateFilePreview(file, 'aadhaar');
    } else {
        if (file.type !== 'application/pdf') {
            showNotification('Please upload PDF file for undertaking');
            return;
        }
        uploadedFiles.undertaking = file;
        updateFilePreview(file, 'undertaking');
    }
}

// ===== UPDATE FILE PREVIEW =====
function updateFilePreview(file, type) {
    const preview = document.getElementById(`${type}-preview`);
    const area = document.getElementById(`${type}-upload-area`);

    if (!preview || !area) return;

    const fileSize = (file.size / 1024).toFixed(2);
    const fileType = file.type.split('/').pop().toUpperCase();

    preview.innerHTML = `
        <i class="fas ${type === 'aadhaar' ? 'fa-id-card' : 'fa-file-pdf'}" style="font-size: 2rem; color: #2ecc71;"></i>
        <div class="file-info">
            <strong>${file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name}</strong><br>
            <span style="font-size: 0.85rem; color: #666;">${fileType} • ${fileSize} KB</span>
        </div>
        <div class="remove-file" onclick="removeFile('${type}')">
            <i class="fas fa-times-circle"></i> Remove
        </div>
    `;

    area.classList.add('has-file');
}

// ===== REMOVE FILE =====
window.removeFile = function(type) {
    if (type === 'aadhaar') {
        uploadedFiles.aadhaar = null;
        document.getElementById('aadhaar-upload').value = '';
    } else {
        uploadedFiles.undertaking = null;
        document.getElementById('undertaking-upload').value = '';
    }

    const area = document.getElementById(`${type}-upload-area`);
    const preview = document.getElementById(`${type}-preview`);

    if (area) area.classList.remove('has-file');

    if (preview) {
        if (type === 'aadhaar') {
            preview.innerHTML = `
                <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #3498db;"></i>
                <p style="margin: 5px 0; font-size: 0.9rem;">Click to upload Aadhaar</p>
                <p style="margin: 0; font-size: 0.75rem; color: #666;">PDF, JPG, PNG (Max 5MB)</p>
            `;
        } else {
            preview.innerHTML = `
                <i class="fas fa-file-pdf" style="font-size: 2rem; color: #e74c3c;"></i>
                <p style="margin: 5px 0; font-size: 0.9rem;">Click to upload undertaking</p>
                <p style="margin: 0; font-size: 0.75rem; color: #666;">PDF only (Max 5MB)</p>
            `;
        }
    }
};

// ===== RESET UPLOADS =====
function resetUploads() {
    uploadedFiles = {
        aadhaar: null,
        undertaking: null
    };

    document.getElementById('aadhaar-upload').value = '';
    document.getElementById('undertaking-upload').value = '';

    ['aadhaar', 'undertaking'].forEach(type => {
        const area = document.getElementById(`${type}-upload-area`);
        const preview = document.getElementById(`${type}-preview`);

        if (area) area.classList.remove('has-file');

        if (preview) {
            if (type === 'aadhaar') {
                preview.innerHTML = `
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #3498db;"></i>
                    <p style="margin: 5px 0; font-size: 0.9rem;">Click to upload Aadhaar</p>
                    <p style="margin: 0; font-size: 0.75rem; color: #666;">PDF, JPG, PNG (Max 5MB)</p>
                `;
            } else {
                preview.innerHTML = `
                    <i class="fas fa-file-pdf" style="font-size: 2rem; color: #e74c3c;"></i>
                    <p style="margin: 5px 0; font-size: 0.9rem;">Click to upload undertaking</p>
                    <p style="margin: 0; font-size: 0.75rem; color: #666;">PDF only (Max 5MB)</p>
                `;
            }
        }
    });
}

// ===== RENDER LOAN REQUESTS =====
function renderLoanRequests() {
    const container = document.getElementById('active-loans-container');
    if (!container) return;

    container.innerHTML = '';
    const activeLoans = loans.filter(loan => loan.status === 'active');

    if (activeLoans.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No active loan requests at the moment.</p>';
        return;
    }

    activeLoans.forEach(loan => {
        const progress = (loan.funded / loan.amount) * 100;
        const kycStatus = loan.documents ?
            '<span style="color: #2ecc71; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> KYC Done</span>' :
            '<span style="color: #e74c3c; font-size: 0.8rem;"><i class="fas fa-times-circle"></i> KYC Pending</span>';

        const element = document.createElement('div');
        element.className = 'loan-request';
        element.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0;">${loan.purpose} by ${loan.borrower}</h4>
                ${kycStatus}
            </div>
            <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
            <p><strong>Term:</strong> ${loan.term} months</p>
            <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
            <p><strong>Funded:</strong> ${progress.toFixed(1)}% (₹${loan.funded.toLocaleString()})</p>
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn btn-primary view-loan" data-id="${loan.id}">View Details</button>
                ${currentUser && currentUser.username !== loan.borrower ? `<button class="btn btn-accent invest-btn" data-id="${loan.id}">Invest</button>` : ''}
            </div>
        `;
        container.appendChild(element);
    });

    // Add event listeners
    document.querySelectorAll('.view-loan').forEach(button => {
        button.addEventListener('click', function() {
            const loanId = parseInt(this.getAttribute('data-id'));
            showLoanDetails(loanId);
        });
    });

    document.querySelectorAll('.invest-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (!currentUser) {
                showNotification('Please login to invest');
                document.getElementById('login-modal').style.display = 'flex';
                return;
            }
            const loanId = parseInt(this.getAttribute('data-id'));
            showInvestModal(loanId);
        });
    });
}

// ===== RENDER INVESTMENT OPPORTUNITIES =====
function renderInvestmentOpportunities() {
    const container = document.getElementById('investment-opportunities-container');
    if (!container) return;

    container.innerHTML = '';
    const opportunities = loans.filter(loan => loan.status === 'active' && loan.funded < loan.amount);

    if (opportunities.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No investment opportunities at the moment.</p>';
        return;
    }

    opportunities.forEach(loan => {
        const remaining = loan.amount - loan.funded;
        const progress = (loan.funded / loan.amount) * 100;
        const kycStatus = loan.documents ?
            '<span style="color: #2ecc71;"><i class="fas fa-check-circle"></i> KYC Verified</span>' :
            '<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> KYC Pending</span>';

        const element = document.createElement('div');
        element.className = 'investment-opportunity';
        element.innerHTML = `
            <h4>${loan.purpose} by ${loan.borrower}</h4>
            <p><strong>Amount Needed:</strong> ₹${remaining.toLocaleString()}</p>
            <p><strong>Expected Return:</strong> 8% per annum</p>
            <p><strong>KYC Status:</strong> ${kycStatus}</p>
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
            <button class="btn btn-accent invest-btn" data-id="${loan.id}" style="margin-top: 15px;">Invest Now</button>
        `;
        container.appendChild(element);
    });

    document.querySelectorAll('.invest-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (!currentUser) {
                showNotification('Please login to invest');
                document.getElementById('login-modal').style.display = 'flex';
                return;
            }
            const loanId = parseInt(this.getAttribute('data-id'));
            showInvestModal(loanId);
        });
    });
}

// ===== SHOW LOAN DETAILS =====
function showLoanDetails(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const progress = (loan.funded / loan.amount) * 100;
    const totalRepayment = loan.monthlyPayment * loan.term;
    const totalInterest = totalRepayment - loan.amount;
    const monthlyInterest = totalInterest / loan.term;
    const createdDate = new Date(loan.date);
    const today = new Date();
    const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

    const documentStatus = loan.documents ?
        '<span style="color: #2ecc71;"><i class="fas fa-check-circle"></i> Documents Uploaded</span>' :
        '<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Documents Pending</span>';

    let documentsHtml = '';
    if (loan.documents) {
        documentsHtml = `
            <h4 style="margin-top: 1.5rem;">Documents (Click to View)</h4>
            <div class="document-viewer">
                <div class="document-item">
                    <i class="fas fa-id-card" style="color: #3498db;"></i>
                    <div class="document-info">
                        <div class="document-name">Aadhaar Card</div>
                        <div class="document-meta">${loan.documents.aadhaar.name} • ${(loan.documents.aadhaar.size / 1024).toFixed(2)} KB</div>
                    </div>
                    <button onclick="openDocumentInBrowser('aadhaar', ${loan.id})" class="view-document" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> View in Browser
                    </button>
                </div>
                <div class="document-item">
                    <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                    <div class="document-info">
                        <div class="document-name">Signed Undertaking</div>
                        <div class="document-meta">${loan.documents.undertaking.name} • ${(loan.documents.undertaking.size / 1024).toFixed(2)} KB</div>
                    </div>
                    <button onclick="openDocumentInBrowser('undertaking', ${loan.id})" class="view-document" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> View in Browser
                    </button>
                </div>
            </div>
        `;
    }

    document.getElementById('loan-detail-title').textContent = `Loan Details: ${loan.purpose}`;
    document.getElementById('loan-detail-content').innerHTML = `
        <div class="loan-details">
            <p><strong>Borrower:</strong> ${loan.borrower}</p>
            <p><strong>Purpose:</strong> ${loan.purpose}</p>
            <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
            <p><strong>Term:</strong> ${loan.term} months</p>
            <p><strong>Interest Rate:</strong> ${loan.interest}% per annum</p>
            <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
            <p><strong>Total Repayment:</strong> ₹${totalRepayment.toLocaleString()}</p>
            <p><strong>Total Interest:</strong> ₹${totalInterest.toLocaleString()}</p>
            <p><strong>Monthly Interest:</strong> ₹${monthlyInterest.toLocaleString()}</p>
            <p><strong>Created:</strong> ${loan.date} (${daysSinceCreation} days ago)</p>
            <p><strong>Status:</strong> <span style="color: ${loan.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${loan.status}</span></p>
            <p><strong>KYC Status:</strong> ${documentStatus}</p>
            <p><strong>Funded:</strong> ${progress.toFixed(1)}% (₹${loan.funded.toLocaleString()})</p>
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
        </div>
        ${documentsHtml}
        <h4 style="margin-top: 1.5rem;">Investors</h4>
        ${loan.investors.length > 0 ?
            loan.investors.map(inv => `<p>${inv.investor}: ₹${inv.amount.toLocaleString()} ${inv.paymentId ? '<small style="color: #666;">(Razorpay)</small>' : ''}</p>`).join('') :
            '<p>No investors yet</p>'
        }
        ${currentUser && currentUser.username !== loan.borrower && loan.status === 'active' ?
            `<button class="btn btn-accent invest-btn" data-id="${loan.id}" style="margin-top: 1.5rem;">Invest in this Loan</button>` : ''}
    `;

    document.getElementById('loan-detail-modal').style.display = 'flex';

    const investBtn = document.querySelector('#loan-detail-content .invest-btn');
    if (investBtn) {
        investBtn.addEventListener('click', function() {
            document.getElementById('loan-detail-modal').style.display = 'none';
            showInvestModal(loanId);
        });
    }
}

// ===== SHOW INVEST MODAL =====
function showInvestModal(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    if (currentUser && currentUser.username === loan.borrower) {
        showNotification("You cannot invest in your own loan");
        return;
    }

    const remaining = loan.amount - loan.funded;
    const investAmount = document.getElementById('invest-amount');
    if (investAmount) {
        investAmount.value = '';
        investAmount.setAttribute('max', remaining);
        investAmount.setAttribute('placeholder', `Max: ₹${remaining.toLocaleString()}`);
    }

    document.getElementById('invest-loan-purpose').textContent = `Purpose: ${loan.purpose}`;
    document.getElementById('invest-loan-amount').textContent = `Total Amount: ₹${loan.amount.toLocaleString()}`;
    document.getElementById('invest-loan-term').textContent = `Term: ${loan.term} months`;
    document.getElementById('invest-monthly-payment').textContent = `Monthly Payment: ₹${loan.monthlyPayment.toLocaleString()}`;

    document.getElementById('invest-form').setAttribute('data-loan-id', loanId);
    document.getElementById('invest-modal').style.display = 'flex';
}

// ===== RENDER USER DASHBOARD =====
function renderUserDashboard() {
    if (!currentUser) return;

    const userLoansContainer = document.getElementById('user-loans-container');
    const userInvestmentsContainer = document.getElementById('user-investments-container');
    const userProfileContainer = document.getElementById('user-profile-container');

    // Render user loans
    const userLoans = loans.filter(loan => loan.borrower === currentUser.username);
    userLoansContainer.innerHTML = '';

    if (userLoans.length === 0) {
        userLoansContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">You have no active loans.</p>';
    } else {
        userLoans.forEach(loan => {
            const progress = (loan.funded / loan.amount) * 100;
            const totalRepayment = loan.monthlyPayment * loan.term;
            const element = document.createElement('div');
            element.className = 'loan-request';
            element.innerHTML = `
                <h4>${loan.purpose}</h4>
                <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
                <p><strong>Funded:</strong> ${progress.toFixed(1)}%</p>
                <p><strong>Term:</strong> ${loan.term} months</p>
                <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
                <p><strong>Total Repayment:</strong> ₹${totalRepayment.toLocaleString()}</p>
                <p><strong>Status:</strong> <span style="color: ${loan.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${loan.status}</span></p>
                <p><strong>Documents:</strong> ${loan.documents ?
                    '<span style="color: #2ecc71;"><i class="fas fa-check-circle"></i> Uploaded</span>' :
                    '<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Pending</span>'}
                </p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progress}%"></div>
                </div>
                <button class="btn btn-primary view-loan" data-id="${loan.id}" style="margin-top: 15px;">View Details</button>
            `;
            userLoansContainer.appendChild(element);
        });

        userLoansContainer.querySelectorAll('.view-loan').forEach(button => {
            button.addEventListener('click', function() {
                const loanId = parseInt(this.getAttribute('data-id'));
                showLoanDetails(loanId);
            });
        });
    }

    // Render user investments
    const userInvestments = investments.filter(inv => inv.investor === currentUser.username);
    userInvestmentsContainer.innerHTML = '';

    if (userInvestments.length === 0) {
        userInvestmentsContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">You have no investments.</p>';
    } else {
        userInvestments.forEach(investment => {
            const loan = loans.find(l => l.id === investment.loanId);
            if (!loan) return;
            const element = document.createElement('div');
            element.className = 'investment-opportunity';
            element.innerHTML = `
                <h4>${loan.purpose} by ${loan.borrower}</h4>
                <p><strong>Invested Amount:</strong> ₹${investment.amount.toLocaleString()}</p>
                <p><strong>Expected Return:</strong> ₹${investment.expectedReturn.toLocaleString()}</p>
                <p><strong>Payment Method:</strong> ${investment.paymentMethod || 'Wallet'}</p>
                ${investment.paymentId ? `<p><small>Payment ID: ${investment.paymentId}</small></p>` : ''}
                <p><strong>Borrower KYC:</strong> ${loan.documents ?
                    '<span style="color: #2ecc71;">Verified</span>' :
                    '<span style="color: #e74c3c;">Pending</span>'}
                </p>
                <p><strong>Status:</strong> <span style="color: ${investment.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${investment.status}</span></p>
                <button class="btn btn-primary view-investment" data-id="${investment.id}">View Details</button>
            `;
            userInvestmentsContainer.appendChild(element);
        });

        userInvestmentsContainer.querySelectorAll('.view-investment').forEach(button => {
            button.addEventListener('click', function() {
                const investmentId = parseInt(this.getAttribute('data-id'));
                showInvestmentDetails(investmentId);
            });
        });
    }

    // Render user profile
    const totalInvested = userInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalBorrowed = userLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const kycBadge = currentUser.kycStatus === 'verified' ?
        '<span class="kyc-badge kyc-verified"><i class="fas fa-check-circle"></i> KYC Verified</span>' :
        '<span class="kyc-badge kyc-pending"><i class="fas fa-clock"></i> KYC Pending</span>';

    userProfileContainer.innerHTML = `
        <div class="loan-details">
            <p><strong>Username:</strong> ${currentUser.username}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Account Balance:</strong> ₹${currentUser.balance.toLocaleString()}</p>
            <p><strong>Active Loans:</strong> ${userLoans.length} (₹${totalBorrowed.toLocaleString()})</p>
            <p><strong>Active Investments:</strong> ${userInvestments.length} (₹${totalInvested.toLocaleString()})</p>
            <p><strong>KYC Status:</strong> ${kycBadge}</p>
            <p><strong>Documents:</strong> ${currentUser.documents ? currentUser.documents.length : 0}</p>
        </div>
        <div style="margin-top: 1.5rem;">
            <button class="btn btn-danger" id="logout-btn">Logout</button>
        </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            currentUser = null;
            localStorage.removeItem('friendlend_currentUser');
            localStorage.removeItem('friendlend_rememberMe');
            document.getElementById('login-btn').textContent = 'Login';
            document.getElementById('user-dashboard').style.display = 'none';
            showSection('home');
            showNotification('Logged out successfully');
        });
    }
}

// ===== RENDER USER DOCUMENTS =====
function renderUserDocuments() {
    const container = document.getElementById('user-documents-container');
    if (!container || !currentUser) return;

    const userLoans = loans.filter(loan => loan.borrower === currentUser.username && loan.documents);

    if (userLoans.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No documents uploaded yet.</p>';
        return;
    }

    let html = '<div class="document-viewer">';

    userLoans.forEach(loan => {
        if (loan.documents) {
            html += `
                <div style="background: #f8f9fa; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #2c3e50;">Loan: ${loan.purpose} (₹${loan.amount.toLocaleString()})</h4>
                    
                    <div class="document-item">
                        <i class="fas fa-id-card" style="color: #3498db;"></i>
                        <div class="document-info">
                            <div class="document-name">Aadhaar Card</div>
                            <div class="document-meta">${loan.documents.aadhaar.name}</div>
                        </div>
                        <button onclick="openDocumentInBrowser('aadhaar', ${loan.id})" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-external-link-alt"></i> View in Browser
                        </button>
                    </div>
                    
                    <div class="document-item">
                        <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                        <div class="document-info">
                            <div class="document-name">Signed Undertaking</div>
                            <div class="document-meta">${loan.documents.undertaking.name}</div>
                        </div>
                        <button onclick="openDocumentInBrowser('undertaking', ${loan.id})" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-external-link-alt"></i> View in Browser
                        </button>
                    </div>
                    
                </div>
            `;
        }
    });

    html += '</div>';
    container.innerHTML = html;
}

// ===== OPEN DOCUMENT IN BROWSER =====
window.openDocumentInBrowser = function(docType, loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || !loan.documents) return;

    const documentData = loan.documents[docType];
    if (!documentData || !documentData.dataUrl) return;

    // Open in new tab
    const newWindow = window.open();
    if (documentData.type.startsWith('image/')) {
        newWindow.document.write(`
            <html>
                <head><title>${documentData.name}</title></head>
                <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh;">
                    <img src="${documentData.dataUrl}" style="max-width:100%; max-height:100vh;">
                </body>
            </html>
        `);
    } else {
        newWindow.location.href = documentData.dataUrl;
    }
};

// ===== START REAL-TIME UPDATES =====
function startRealTimeUpdates() {
    updateInterval = setInterval(() => {
        loadData();
    }, 10000);
}

// ===== SIMULATE REAL-TIME UPDATE =====
function simulateRealTimeUpdate() {
    showNotification("Update sent to all users in real-time");
}

// ===== SHOW INVESTMENT DETAILS =====
function showInvestmentDetails(investmentId) {
    const investment = investments.find(inv => inv.id === investmentId);
    if (!investment) return;

    const loan = loans.find(l => l.id === investment.loanId);
    if (!loan) return;

    const totalReturn = investment.expectedReturn;
    const profit = totalReturn - investment.amount;
    const roi = (profit / investment.amount) * 100;
    const monthlyReturn = (totalReturn - investment.amount) / loan.term;

    document.getElementById('loan-detail-title').textContent = `Investment Details: ${loan.purpose}`;
    document.getElementById('loan-detail-content').innerHTML = `
        <div class="loan-details">
            <p><strong>Loan Purpose:</strong> ${loan.purpose}</p>
            <p><strong>Borrower:</strong> ${loan.borrower}</p>
            <p><strong>Investment Amount:</strong> ₹${investment.amount.toLocaleString()}</p>
            <p><strong>Investment Date:</strong> ${investment.date}</p>
            <p><strong>Payment Method:</strong> ${investment.paymentMethod || 'Wallet'}</p>
            ${investment.paymentId ? `<p><strong>Payment ID:</strong> ${investment.paymentId}</p>` : ''}
            <p><strong>Loan Term:</strong> ${loan.term} months</p>
            <p><strong>Interest Rate:</strong> ${loan.interest}% per annum</p>
            <p><strong>Expected Total Return:</strong> ₹${totalReturn.toLocaleString()}</p>
            <p><strong>Expected Profit:</strong> ₹${profit.toLocaleString()}</p>
            <p><strong>ROI:</strong> ${roi.toFixed(2)}%</p>
            <p><strong>Monthly Return:</strong> ₹${monthlyReturn.toLocaleString()}</p>
            <p><strong>Borrower KYC:</strong> ${loan.documents ?
                '<span style="color: #2ecc71;">Verified</span>' :
                '<span style="color: #e74c3c;">Pending</span>'}
            </p>
            <p><strong>Status:</strong> <span style="color: ${investment.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${investment.status}</span></p>
        </div>
        <h4 style="margin-top: 1.5rem;">Loan Details</h4>
        <div class="loan-details">
            <p><strong>Total Loan Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
            <p><strong>Amount Funded:</strong> ₹${loan.funded.toLocaleString()} (${((loan.funded / loan.amount) * 100).toFixed(1)}%)</p>
            <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
            <p><strong>Loan Status:</strong> <span style="color: ${loan.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${loan.status}</span></p>
        </div>
    `;

    document.getElementById('loan-detail-modal').style.display = 'flex';
}
