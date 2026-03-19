// Supabase configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://qcgzjjkudjmwbbowoxop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZ3pqamt1ZGptd2Jib3dveG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjgzNzEsImV4cCI6MjA4OTUwNDM3MX0.ON6APz59cLDGOtRbngmb8tuP2e-Q0zNFMb9TpRR5Vqc';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Razorpay configuration (test mode)
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_TEST_KEY'; // Replace with your Razorpay test key

// Global variables
let currentUser = null;
let updateInterval;
let uploadedFiles = {
    aadhaar: null,
    undertaking: null
};
let currentLoanForInvestment = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async function () {
    // Check for existing session
    await checkSession();
    
    // Initialize with sample data if empty
    await initializeSampleData();
    
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
    const menuToggle = document.querySelector('.menu-toggle');
    const passwordToggles = document.querySelectorAll('.password-toggle');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const razorpayPayBtn = document.getElementById('razorpay-pay-btn');
    const closeDocumentViewer = document.getElementById('close-document-viewer');

    // Initialize file upload handlers
    initFileUploadHandlers();

    // Initial render
    await renderLoanRequests();
    await renderInvestmentOpportunities();
    startRealTimeUpdates();

    // Login button
    if (loginBtn) {
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentUser) {
                logout();
            } else {
                loginModal.style.display = 'flex';
            }
        });
    }

    // Get Started button
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentUser) {
                showSection('dashboard');
            } else {
                loginModal.style.display = 'flex';
            }
        });
    }

    // Learn More button
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Register link
    if (registerLink) {
        registerLink.addEventListener('click', function (e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'flex';
        });
    }

    // Forgot password link
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function (e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            forgotPasswordModal.style.display = 'flex';
        });
    }

    // Back to login link
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function (e) {
            e.preventDefault();
            forgotPasswordModal.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }

    // Close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', function () {
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

    // Close document viewer
    if (closeDocumentViewer) {
        closeDocumentViewer.addEventListener('click', function () {
            documentViewerModal.style.display = 'none';
        });
    }

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            showSection(target);
        });
    });

    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            // If documents tab, render user documents
            if (tabId === 'documents' && currentUser) {
                renderUserDocuments();
            }
        });
    });

    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const usernameOrEmail = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            await login(usernameOrEmail, password, rememberMe);
        });
    }

    // Register form
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const username = document.getElementById('new-username').value;
            const password = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const email = document.getElementById('email').value;

            if (password !== confirmPassword) {
                showNotification('Passwords do not match');
                return;
            }

            await register(username, email, password);
        });
    }

    // Forgot password form
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            await forgotPassword(email);
        });
    }

    // Loan request form
    if (loanRequestForm) {
        loanRequestForm.addEventListener('submit', function (e) {
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

            // Store in hidden fields
            document.getElementById('agreement-purpose').value = purpose;
            document.getElementById('agreement-amount').value = amount;
            document.getElementById('agreement-term').value = term;
            document.getElementById('agreement-monthly-payment').value = Math.round(monthlyPayment);

            // Update summary
            document.getElementById('summary-purpose').textContent = purpose;
            document.getElementById('summary-amount').textContent = amount.toLocaleString();
            document.getElementById('summary-term').textContent = term;
            document.getElementById('summary-monthly').textContent = Math.round(monthlyPayment).toLocaleString();

            // Reset file uploads
            resetUploads();

            // Show agreement modal
            if (agreementModal) {
                agreementModal.style.display = 'flex';
            }
        });
    }

    // Agreement form submit
    if (agreementForm) {
        agreementForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Check if all documents are uploaded
            if (!uploadedFiles.aadhaar) {
                showNotification('Please upload your Aadhaar card');
                return;
            }

            if (!uploadedFiles.undertaking) {
                showNotification('Please upload signed undertaking');
                return;
            }

            // Check if terms are agreed
            const agreeTerms = document.getElementById('agree-terms');
            if (!agreeTerms.checked) {
                showNotification('Please agree to the terms and conditions');
                return;
            }

            if (!currentUser) {
                showNotification('Please login first');
                agreementModal.style.display = 'none';
                loginModal.style.display = 'flex';
                return;
            }

            await createLoanWithDocuments();
        });
    }

    // Cancel agreement button
    const cancelBtn = document.getElementById('cancel-agreement');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            agreementModal.style.display = 'none';
        });
    }

    // Close agreement button
    const closeAgreement = document.getElementById('close-agreement');
    if (closeAgreement) {
        closeAgreement.addEventListener('click', function () {
            agreementModal.style.display = 'none';
        });
    }

    // Success OK button
    const successOkBtn = document.getElementById('success-ok-btn');
    if (successOkBtn) {
        successOkBtn.addEventListener('click', function () {
            successModal.style.display = 'none';
        });
    }

    // Close success button
    const closeSuccess = document.getElementById('close-success');
    if (closeSuccess) {
        closeSuccess.addEventListener('click', function () {
            successModal.style.display = 'none';
        });
    }

    // Razorpay payment button
    if (razorpayPayBtn) {
        razorpayPayBtn.addEventListener('click', function () {
            if (!currentUser) {
                showNotification('Please login first');
                investModal.style.display = 'none';
                loginModal.style.display = 'flex';
                return;
            }

            const amount = document.getElementById('invest-amount').value;
            if (!amount || amount < 1000) {
                showNotification('Please enter minimum investment amount of ₹1000');
                return;
            }

            const loanId = document.getElementById('invest-form').getAttribute('data-loan-id');
            processRazorpayPayment(loanId, parseInt(amount));
        });
    }

    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            document.querySelector('.nav-links').classList.toggle('active');
        });
    }

    // Password visibility toggle
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
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

    // Close modals when clicking outside
    window.addEventListener('click', function (e) {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === registerModal) registerModal.style.display = 'none';
        if (e.target === forgotPasswordModal) forgotPasswordModal.style.display = 'none';
        if (e.target === loanDetailModal) loanDetailModal.style.display = 'none';
        if (e.target === investModal) investModal.style.display = 'none';
        if (e.target === agreementModal) agreementModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
        if (e.target === documentViewerModal) documentViewerModal.style.display = 'none';
    });
});

// ============== SUPABASE FUNCTIONS ==============

// Check for existing session
async function checkSession() {
    const savedUser = localStorage.getItem('friendlend_currentUser');
    const rememberMe = localStorage.getItem('friendlend_rememberMe') === 'true';

    if (savedUser && rememberMe) {
        const userData = JSON.parse(savedUser);
        // Verify user still exists in database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.id)
            .single();

        if (user && !error) {
            currentUser = user;
            updateUIAfterLogin();
            showNotification(`Welcome back, ${currentUser.username}!`);
        } else {
            // Clear invalid session
            localStorage.removeItem('friendlend_currentUser');
            localStorage.removeItem('friendlend_rememberMe');
        }
    }
}

// Login function
async function login(usernameOrEmail, password, rememberMe) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
            .eq('password', password)
            .single();

        if (user && !error) {
            currentUser = user;
            localStorage.setItem('friendlend_currentUser', JSON.stringify(user));
            localStorage.setItem('friendlend_rememberMe', rememberMe);
            updateUIAfterLogin();
            document.getElementById('login-modal').style.display = 'none';
            showNotification('Login successful!');
        } else {
            showNotification('Invalid username/email or password');
        }
    } catch (error) {
        showNotification('Login failed: ' + error.message);
    }
}

// Register function
async function register(username, email, password) {
    try {
        // Check if username exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username, email')
            .or(`username.eq.${username},email.eq.${email}`);

        if (existingUser && existingUser.length > 0) {
            if (existingUser.some(u => u.username === username)) {
                showNotification('Username already exists');
            } else {
                showNotification('Email already registered');
            }
            return;
        }

        // Create new user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([
                {
                    username: username,
                    email: email,
                    password: password,
                    balance: 50000,
                    kyc_status: 'pending',
                    documents: []
                }
            ])
            .select()
            .single();

        if (error) throw error;

        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('register-form').reset();
        showNotification('Registration successful! Please login.');
        document.getElementById('username').value = username;
        document.getElementById('login-modal').style.display = 'flex';
    } catch (error) {
        showNotification('Registration failed: ' + error.message);
    }
}

// Forgot password function
async function forgotPassword(email) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('password')
            .eq('email', email)
            .single();

        if (user && !error) {
            showNotification(`Password recovery: Your password is: ${user.password}`);
            document.getElementById('forgot-password-modal').style.display = 'none';
            document.getElementById('login-modal').style.display = 'flex';
        } else {
            showNotification('No account found with that email address');
        }
    } catch (error) {
        showNotification('Error: ' + error.message);
    }
}

// Logout function
async function logout() {
    currentUser = null;
    localStorage.removeItem('friendlend_currentUser');
    localStorage.removeItem('friendlend_rememberMe');
    document.getElementById('login-btn').textContent = 'Login';
    document.getElementById('user-dashboard').style.display = 'none';
    showSection('home');
    showNotification('Logged out successfully');
}

// Initialize sample data
async function initializeSampleData() {
    try {
        // Check if loans exist
        const { data: existingLoans, error: checkError } = await supabase
            .from('loans')
            .select('id')
            .limit(1);

        if (existingLoans && existingLoans.length === 0) {
            // Insert sample loans
            const sampleLoans = [
                {
                    borrower: 'Nirmal',
                    purpose: 'Education Fee',
                    amount: 15000,
                    term: 12,
                    interest: 8,
                    status: 'active',
                    date: '2023-09-15',
                    monthly_payment: 1302,
                    funded: 8000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false
                },
                {
                    borrower: 'Harsh',
                    purpose: 'Vacation',
                    amount: 8000,
                    term: 6,
                    interest: 8,
                    status: 'active',
                    date: '2023-10-05',
                    monthly_payment: 1360,
                    funded: 3000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false
                },
                {
                    borrower: 'Mohit',
                    purpose: 'Laptop Purchase',
                    amount: 25000,
                    term: 18,
                    interest: 8,
                    status: 'active',
                    date: '2023-10-20',
                    monthly_payment: 1484,
                    funded: 12000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false
                },
                {
                    borrower: 'Shubham',
                    purpose: 'Air condition Purchase',
                    amount: 35000,
                    term: 18,
                    interest: 8,
                    status: 'active',
                    date: '2023-10-20',
                    monthly_payment: 2078,
                    funded: 15000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false
                }
            ];

            const { error: insertError } = await supabase
                .from('loans')
                .insert(sampleLoans);

            if (insertError) console.error('Error inserting sample loans:', insertError);
        }

        // Check if users exist
        const { data: existingUsers, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (existingUsers && existingUsers.length === 0) {
            // Insert sample users
            const sampleUsers = [
                {
                    username: 'Nirmal',
                    password: 'password123',
                    email: 'Nirmal@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                },
                {
                    username: 'Harsh',
                    password: 'password123',
                    email: 'Harsh@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                },
                {
                    username: 'Mohit',
                    password: 'password123',
                    email: 'Mohit@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                },
                {
                    username: 'Shubham',
                    password: 'password123',
                    email: 'Shubham@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                }
            ];

            const { error: insertError } = await supabase
                .from('users')
                .insert(sampleUsers);

            if (insertError) console.error('Error inserting sample users:', insertError);
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

// Create loan with documents
async function createLoanWithDocuments() {
    try {
        const purpose = document.getElementById('agreement-purpose').value;
        const amount = parseInt(document.getElementById('agreement-amount').value);
        const term = parseInt(document.getElementById('agreement-term').value);
        const monthlyPayment = parseInt(document.getElementById('agreement-monthly-payment').value);

        // Create document URLs for viewing
        const aadhaarUrl = URL.createObjectURL(uploadedFiles.aadhaar);
        const undertakingUrl = URL.createObjectURL(uploadedFiles.undertaking);

        // Create document record
        const documentRecord = {
            aadhaar: {
                name: uploadedFiles.aadhaar.name,
                type: uploadedFiles.aadhaar.type,
                size: uploadedFiles.aadhaar.size,
                dataUrl: aadhaarUrl,
                uploadedAt: new Date().toISOString()
            },
            undertaking: {
                name: uploadedFiles.undertaking.name,
                type: uploadedFiles.undertaking.type,
                size: uploadedFiles.undertaking.size,
                dataUrl: undertakingUrl,
                uploadedAt: new Date().toISOString()
            },
            agreementAccepted: true,
            agreementDate: new Date().toISOString()
        };

        // Create the new loan
        const newLoan = {
            borrower: currentUser.username,
            purpose: purpose,
            amount: amount,
            term: term,
            interest: 8,
            status: 'active',
            date: new Date().toISOString().split('T')[0],
            monthly_payment: monthlyPayment,
            funded: 0,
            investors: [],
            documents: documentRecord,
            agreement_accepted: true,
            agreement_date: new Date().toISOString()
        };

        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .insert([newLoan])
            .select()
            .single();

        if (loanError) throw loanError;

        // Update user's KYC status
        const { error: userError } = await supabase
            .from('users')
            .update({ 
                kyc_status: 'verified',
                documents: supabase.sql`jsonb_set(COALESCE(documents, '[]'::jsonb), '{${currentUser.documents ? currentUser.documents.length : 0}}', 
                    '{"type": "loan_documents", "loanId": ${loan.id}, "date": "${new Date().toISOString()}", "documents": ${JSON.stringify(documentRecord)}}'::jsonb)`
            })
            .eq('id', currentUser.id);

        if (userError) throw userError;

        // Update current user
        currentUser.kyc_status = 'verified';
        localStorage.setItem('friendlend_currentUser', JSON.stringify(currentUser));

        // Close agreement modal
        document.getElementById('loan-agreement-modal').style.display = 'none';

        // Update success modal
        const successSummary = document.getElementById('success-document-summary');
        if (successSummary) {
            successSummary.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-id-card" style="color: #3498db; width: 20px;"></i>
                    <span style="font-size: 0.9rem;">Aadhaar: <strong>${uploadedFiles.aadhaar.name}</strong></span>
                    <button onclick="window.open('${aadhaarUrl}', '_blank')" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-left: auto; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> View
                    </button>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-file-pdf" style="color: #e74c3c; width: 20px;"></i>
                    <span style="font-size: 0.9rem;">Undertaking: <strong>${uploadedFiles.undertaking.name}</strong></span>
                    <button onclick="window.open('${undertakingUrl}', '_blank')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-left: auto; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> View
                    </button>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-check-circle" style="color: #2ecc71; width: 20px;"></i>
                    <span style="font-size: 0.9rem;">Documents submitted successfully</span>
                </div>
            `;
        }

        // Show success modal
        document.getElementById('upload-success-modal').style.display = 'flex';

        // Update displays
        await renderLoanRequests();
        await renderInvestmentOpportunities();

        showNotification('Loan request created with documents successfully!');
    } catch (error) {
        showNotification('Error creating loan: ' + error.message);
    }
}

// Process Razorpay payment
function processRazorpayPayment(loanId, amount) {
    const options = {
        key: RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: 'INR',
        name: 'FriendFunds',
        description: 'Investment in Loan',
        handler: async function (response) {
            await processInvestment(loanId, amount, response);
        },
        prefill: {
            name: currentUser.username,
            email: currentUser.email,
            contact: ''
        },
        theme: {
            color: '#3498db'
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

// Process investment
async function processInvestment(loanId, amount, paymentResponse) {
    try {
        // Get loan details
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (loanError) throw loanError;

        const remaining = loan.amount - loan.funded;
        if (amount > remaining) {
            showNotification(`Amount exceeds remaining loan amount of ₹${remaining}`);
            return;
        }

        if (amount > currentUser.balance) {
            showNotification('Insufficient balance');
            return;
        }

        // Update loan
        const newFunded = loan.funded + amount;
        const newStatus = newFunded >= loan.amount ? 'funded' : 'active';
        
        const investors = loan.investors || [];
        investors.push({
            investor: currentUser.username,
            amount: amount,
            paymentId: paymentResponse.razorpay_payment_id
        });

        const { error: updateError } = await supabase
            .from('loans')
            .update({
                funded: newFunded,
                status: newStatus,
                investors: investors
            })
            .eq('id', loanId);

        if (updateError) throw updateError;

        // Update user balance
        const newBalance = currentUser.balance - amount;
        const { error: userError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', currentUser.id);

        if (userError) throw userError;

        // Create investment record
        const investment = {
            loan_id: loanId,
            investor: currentUser.username,
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            expected_return: Math.round(amount * (1 + 8 / 100 * loan.term / 12)),
            status: 'active',
            payment_id: paymentResponse.razorpay_payment_id,
            payment_method: 'Razorpay'
        };

        const { error: investError } = await supabase
            .from('investments')
            .insert([investment]);

        if (investError) throw investError;

        // Update current user balance
        currentUser.balance = newBalance;
        localStorage.setItem('friendlend_currentUser', JSON.stringify(currentUser));

        // Close invest modal
        document.getElementById('invest-modal').style.display = 'none';

        // Update displays
        await renderLoanRequests();
        await renderInvestmentOpportunities();

        if (document.getElementById('user-dashboard').style.display === 'block') {
            await renderUserDashboard();
        }

        showNotification(`Successfully invested ₹${amount} in ${loan.purpose}!`);
        simulateRealTimeUpdate();
    } catch (error) {
        showNotification('Investment failed: ' + error.message);
    }
}

// ============== RENDER FUNCTIONS ==============

// Render loan requests
async function renderLoanRequests() {
    const container = document.getElementById('active-loans-container');
    if (!container) return;

    try {
        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        container.innerHTML = '';

        if (!loans || loans.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No active loan requests at the moment.</p>';
            return;
        }

        loans.forEach(loan => {
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
                <p><strong>Monthly Payment:</strong> ₹${loan.monthly_payment.toLocaleString()}</p>
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
            button.addEventListener('click', function () {
                const loanId = parseInt(this.getAttribute('data-id'));
                showLoanDetails(loanId);
            });
        });

        document.querySelectorAll('.invest-btn').forEach(button => {
            button.addEventListener('click', function () {
                if (!currentUser) {
                    showNotification('Please login to invest');
                    document.getElementById('login-modal').style.display = 'flex';
                    return;
                }
                const loanId = parseInt(this.getAttribute('data-id'));
                showInvestModal(loanId);
            });
        });
    } catch (error) {
        console.error('Error rendering loans:', error);
    }
}

// Render investment opportunities
async function renderInvestmentOpportunities() {
    const container = document.getElementById('investment-opportunities-container');
    if (!container) return;

    try {
        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('status', 'active')
            .filter('funded', 'lt', supabase.column('amount'))
            .order('created_at', { ascending: false });

        if (error) throw error;

        container.innerHTML = '';

        if (!loans || loans.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No investment opportunities at the moment.</p>';
            return;
        }

        loans.forEach(loan => {
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
            button.addEventListener('click', function () {
                if (!currentUser) {
                    showNotification('Please login to invest');
                    document.getElementById('login-modal').style.display = 'flex';
                    return;
                }
                const loanId = parseInt(this.getAttribute('data-id'));
                showInvestModal(loanId);
            });
        });
    } catch (error) {
        console.error('Error rendering opportunities:', error);
    }
}

// Show loan details
async function showLoanDetails(loanId) {
    try {
        const { data: loan, error } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (error || !loan) return;

        const progress = (loan.funded / loan.amount) * 100;
        const totalRepayment = loan.monthly_payment * loan.term;
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
                            <div class="document-meta">${loan.documents.aadhaar.name}</div>
                        </div>
                        <button onclick="window.open('${loan.documents.aadhaar.dataUrl}', '_blank')" class="view-document" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-external-link-alt"></i> View
                        </button>
                    </div>
                    <div class="document-item">
                        <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                        <div class="document-info">
                            <div class="document-name">Signed Undertaking</div>
                            <div class="document-meta">${loan.documents.undertaking.name}</div>
                        </div>
                        <button onclick="window.open('${loan.documents.undertaking.dataUrl}', '_blank')" class="view-document" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-external-link-alt"></i> View
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
                <p><strong>Monthly Payment:</strong> ₹${loan.monthly_payment.toLocaleString()}</p>
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
            ${loan.investors && loan.investors.length > 0 ?
                loan.investors.map(inv => `<p>${inv.investor}: ₹${inv.amount.toLocaleString()}</p>`).join('') :
                '<p>No investors yet</p>'
            }
            ${currentUser && currentUser.username !== loan.borrower && loan.status === 'active' ?
                `<button class="btn btn-accent invest-btn" data-id="${loan.id}" style="margin-top: 1.5rem;">Invest in this Loan</button>` : ''}
        `;

        document.getElementById('loan-detail-modal').style.display = 'flex';

        const investBtn = document.querySelector('#loan-detail-content .invest-btn');
        if (investBtn) {
            investBtn.addEventListener('click', function () {
                document.getElementById('loan-detail-modal').style.display = 'none';
                showInvestModal(loanId);
            });
        }
    } catch (error) {
        console.error('Error loading loan details:', error);
    }
}

// Show invest modal
async function showInvestModal(loanId) {
    try {
        const { data: loan, error } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (error || !loan) return;

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
        document.getElementById('invest-monthly-payment').textContent = `Monthly Payment: ₹${loan.monthly_payment.toLocaleString()}`;

        document.getElementById('invest-form').setAttribute('data-loan-id', loanId);
        document.getElementById('invest-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error showing invest modal:', error);
    }
}

// Render user dashboard
async function renderUserDashboard() {
    if (!currentUser) return;

    const userLoansContainer = document.getElementById('user-loans-container');
    const userInvestmentsContainer = document.getElementById('user-investments-container');
    const userProfileContainer = document.getElementById('user-profile-container');

    try {
        // Get user loans
        const { data: userLoans, error: loansError } = await supabase
            .from('loans')
            .select('*')
            .eq('borrower', currentUser.username);

        if (loansError) throw loansError;

        userLoansContainer.innerHTML = '';

        if (!userLoans || userLoans.length === 0) {
            userLoansContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">You have no active loans.</p>';
        } else {
            userLoans.forEach(loan => {
                const progress = (loan.funded / loan.amount) * 100;
                const totalRepayment = loan.monthly_payment * loan.term;
                const element = document.createElement('div');
                element.className = 'loan-request';
                element.innerHTML = `
                    <h4>${loan.purpose}</h4>
                    <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
                    <p><strong>Funded:</strong> ${progress.toFixed(1)}%</p>
                    <p><strong>Term:</strong> ${loan.term} months</p>
                    <p><strong>Monthly Payment:</strong> ₹${loan.monthly_payment.toLocaleString()}</p>
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
                button.addEventListener('click', function () {
                    const loanId = parseInt(this.getAttribute('data-id'));
                    showLoanDetails(loanId);
                });
            });
        }

        // Get user investments
        const { data: userInvestments, error: investError } = await supabase
            .from('investments')
            .select('*')
            .eq('investor', currentUser.username);

        if (investError) throw investError;

        userInvestmentsContainer.innerHTML = '';

        if (!userInvestments || userInvestments.length === 0) {
            userInvestmentsContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">You have no investments.</p>';
        } else {
            for (const investment of userInvestments) {
                const { data: loan, error: loanError } = await supabase
                    .from('loans')
                    .select('*')
                    .eq('id', investment.loan_id)
                    .single();

                if (loanError) continue;

                const element = document.createElement('div');
                element.className = 'investment-opportunity';
                element.innerHTML = `
                    <h4>${loan.purpose} by ${loan.borrower}</h4>
                    <p><strong>Invested Amount:</strong> ₹${investment.amount.toLocaleString()}</p>
                    <p><strong>Expected Return:</strong> ₹${investment.expected_return.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${investment.payment_method || 'Wallet'}</p>
                    ${investment.payment_id ? `<p><small>Payment ID: ${investment.payment_id}</small></p>` : ''}
                    <p><strong>Borrower KYC:</strong> ${loan.documents ?
                        '<span style="color: #2ecc71;">Verified</span>' :
                        '<span style="color: #e74c3c;">Pending</span>'}
                    </p>
                    <p><strong>Status:</strong> <span style="color: ${investment.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${investment.status}</span></p>
                    <button class="btn btn-primary view-investment" data-id="${investment.id}">View Details</button>
                `;
                userInvestmentsContainer.appendChild(element);
            }

            userInvestmentsContainer.querySelectorAll('.view-investment').forEach(button => {
                button.addEventListener('click', function () {
                    const investmentId = parseInt(this.getAttribute('data-id'));
                    showInvestmentDetails(investmentId);
                });
            });
        }

        // Render profile
        const totalInvested = userInvestments ? userInvestments.reduce((sum, inv) => sum + inv.amount, 0) : 0;
        const totalBorrowed = userLoans ? userLoans.reduce((sum, loan) => sum + loan.amount, 0) : 0;
        const kycBadge = currentUser.kyc_status === 'verified' ?
            '<span class="kyc-badge kyc-verified"><i class="fas fa-check-circle"></i> KYC Verified</span>' :
            '<span class="kyc-badge kyc-pending"><i class="fas fa-clock"></i> KYC Pending</span>';

        userProfileContainer.innerHTML = `
            <div class="loan-details">
                <p><strong>Username:</strong> ${currentUser.username}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Account Balance:</strong> ₹${currentUser.balance.toLocaleString()}</p>
                <p><strong>Active Loans:</strong> ${userLoans ? userLoans.length : 0} (₹${totalBorrowed.toLocaleString()})</p>
                <p><strong>Active Investments:</strong> ${userInvestments ? userInvestments.length : 0} (₹${totalInvested.toLocaleString()})</p>
                <p><strong>KYC Status:</strong> ${kycBadge}</p>
                <p><strong>Documents:</strong> ${currentUser.documents ? currentUser.documents.length : 0}</p>
            </div>
            <div style="margin-top: 1.5rem;">
                <button class="btn btn-danger" id="logout-btn">Logout</button>
            </div>
        `;

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    } catch (error) {
        console.error('Error rendering user dashboard:', error);
    }
}

// Render user documents
async function renderUserDocuments() {
    const container = document.getElementById('user-documents-container');
    if (!container || !currentUser) return;

    try {
        const { data: userLoans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('borrower', currentUser.username)
            .not('documents', 'is', null);

        if (error) throw error;

        if (!userLoans || userLoans.length === 0) {
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
                            <button onclick="window.open('${loan.documents.aadhaar.dataUrl}', '_blank')" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-external-link-alt"></i> View
                            </button>
                        </div>
                        
                        <div class="document-item">
                            <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                            <div class="document-info">
                                <div class="document-name">Signed Undertaking</div>
                                <div class="document-meta">${loan.documents.undertaking.name}</div>
                            </div>
                            <button onclick="window.open('${loan.documents.undertaking.dataUrl}', '_blank')" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-external-link-alt"></i> View
                            </button>
                        </div>
                        
                    </div>
                `;
            }
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error rendering documents:', error);
    }
}

// Show investment details
async function showInvestmentDetails(investmentId) {
    try {
        const { data: investment, error } = await supabase
            .from('investments')
            .select('*')
            .eq('id', investmentId)
            .single();

        if (error || !investment) return;

        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', investment.loan_id)
            .single();

        if (loanError || !loan) return;

        const totalReturn = investment.expected_return;
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
                <p><strong>Payment Method:</strong> ${investment.payment_method || 'Wallet'}</p>
                ${investment.payment_id ? `<p><strong>Payment ID:</strong> ${investment.payment_id}</p>` : ''}
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
                <p><strong>Monthly Payment:</strong> ₹${loan.monthly_payment.toLocaleString()}</p>
                <p><strong>Loan Status:</strong> <span style="color: ${loan.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${loan.status}</span></p>
            </div>
        `;

        document.getElementById('loan-detail-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error showing investment details:', error);
    }
}

// ============== UTILITY FUNCTIONS ==============

// Show section
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

// Show notification
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

// Update UI after login
function updateUIAfterLogin() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = 'Logout';
    }
}

// Initialize file upload handlers
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

        aadhaarUpload.addEventListener('change', function (e) {
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

        undertakingUpload.addEventListener('change', function (e) {
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

// Handle file upload
function handleFileUpload(file, type) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size should be less than 5MB');
        return;
    }

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

// Update file preview
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

// Remove file
window.removeFile = function (type) {
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

// Reset uploads
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

// Start real-time updates
function startRealTimeUpdates() {
    updateInterval = setInterval(async () => {
        if (document.getElementById('dashboard').style.display !== 'none' ||
            document.getElementById('home').style.display !== 'none') {
            await renderLoanRequests();
            await renderInvestmentOpportunities();
        }

        if (document.getElementById('user-dashboard').style.display === 'block' && currentUser) {
            await renderUserDashboard();
        }
    }, 10000);
}

// Simulate real-time update
function simulateRealTimeUpdate() {
    showNotification("Update sent to all users in real-time");
}

// Make functions global for onclick handlers
window.removeFile = removeFile;
window.openDocumentInBrowser = function(url) {
    window.open(url, '_blank');
};
