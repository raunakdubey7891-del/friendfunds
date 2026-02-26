// Data storage
let users = JSON.parse(localStorage.getItem('friendlend_users')) || [];
let loans = JSON.parse(localStorage.getItem('friendlend_loans')) || [];
let investments = JSON.parse(localStorage.getItem('friendlend_investments')) || [];
let payments = JSON.parse(localStorage.getItem('friendlend_payments')) || [];
let userDocuments = JSON.parse(localStorage.getItem('friendlend_documents')) || {};

// Sample data if empty
if (loans.length === 0) {
    loans = [
        {
            id: 1,
            borrower: 'Nirmal',
            purpose: 'Education Fee',
            amount: 15000,
            term: 12,
            interest: 8,
            status: 'active',
            date: '2023-09-15',
            monthlyPayment: 1302,
            funded: 8000,
            investors: [],
            documents: null,
            agreementAccepted: false
        },
        {
            id: 2,
            borrower: 'Harsh',
            purpose: 'Vacation',
            amount: 8000,
            term: 6,
            interest: 8,
            status: 'active',
            date: '2023-10-05',
            monthlyPayment: 1360,
            funded: 3000,
            investors: [],
            documents: null,
            agreementAccepted: false
        },
        {
            id: 3,
            borrower: 'Mohit',
            purpose: 'Laptop Purchase',
            amount: 25000,
            term: 18,
            interest: 8,
            status: 'active',
            date: '2023-10-20',
            monthlyPayment: 1484,
            funded: 12000,
            investors: [],
            documents: null,
            agreementAccepted: false
        },
        {
            id: 4,
            borrower: 'Shubham',
            purpose: 'Air condition Purchase',
            amount: 35000,
            term: 18,
            interest: 8,
            status: 'active',
            date: '2023-10-20',
            monthlyPayment: 2078,
            funded: 15000,
            investors: [],
            documents: null,
            agreementAccepted: false
        }
    ];
    localStorage.setItem('friendlend_loans', JSON.stringify(loans));
}

if (users.length === 0) {
    users = [
        {
            id: 1,
            username: 'Nirmal',
            password: 'password123',
            email: 'Nirmal@example.com',
            balance: 1000000,
            rememberMe: false,
            kycStatus: 'pending',
            documents: []
        },
        {
            id: 2,
            username: 'Harsh',
            password: 'password123',
            email: 'Harsh@example.com',
            balance: 1000000,
            rememberMe: false,
            kycStatus: 'pending',
            documents: []
        },
        {
            id: 3,
            username: 'Mohit',
            password: 'password123',
            email: 'Mohit@example.com',
            balance: 1000000,
            rememberMe: false,
            kycStatus: 'pending',
            documents: []
        },
        {
            id: 4,
            username: 'Shubham',
            password: 'password123',
            email: 'Shubham@example.com',
            balance: 1000000,
            rememberMe: false,
            kycStatus: 'pending',
            documents: []
        }
    ];
    localStorage.setItem('friendlend_users', JSON.stringify(users));
}

// Global variables
let currentUser = null;
let updateInterval;
let signaturePad;
let uploadedFiles = {
    aadhaar: null,
    undertaking: null
};
let currentLoanForInvestment = null;

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_HERE'; // Replace with your Razorpay key

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
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

    // Initialize signature pad
    initSignaturePad();

    // Initialize file upload handlers
    initFileUploadHandlers();

    // Check saved user
    const savedUser = localStorage.getItem('friendlend_currentUser');
    const rememberMe = localStorage.getItem('friendlend_rememberMe') === 'true';

    if (savedUser && rememberMe) {
        currentUser = JSON.parse(savedUser);
        updateUIAfterLogin();
        showNotification(`Welcome back, ${currentUser.username}!`);
    }

    // Initial render
    renderLoanRequests();
    renderInvestmentOpportunities();
    startRealTimeUpdates();

    // Login button
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.style.display = 'flex';
        });
    }

    // Get Started button
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

    // Learn More button
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Register link
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'flex';
        });
    }

    // Forgot password link
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            forgotPasswordModal.style.display = 'flex';
        });
    }

    // Back to login link
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            forgotPasswordModal.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }

    // Close buttons
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

    // Close document viewer
    if (closeDocumentViewer) {
        closeDocumentViewer.addEventListener('click', function() {
            documentViewerModal.style.display = 'none';
        });
    }

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            showSection(target);
        });
    });

    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
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
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usernameOrEmail = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            const user = users.find(u =>
                (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
                u.password === password
            );

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

    // Register form
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('new-username').value;
            const password = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const email = document.getElementById('email').value;

            if (password !== confirmPassword) {
                showNotification('Passwords do not match');
                return;
            }

            if (users.find(u => u.username === username)) {
                showNotification('Username already exists');
                return;
            }

            if (users.find(u => u.email === email)) {
                showNotification('Email already registered');
                return;
            }

            const newUser = {
                id: Date.now(),
                username,
                password,
                email,
                balance: 50000,
                rememberMe: false,
                kycStatus: 'pending',
                documents: []
            };

            users.push(newUser);
            localStorage.setItem('friendlend_users', JSON.stringify(users));
            registerModal.style.display = 'none';
            registerForm.reset();
            showNotification('Registration successful! Please login.');
            document.getElementById('username').value = username;
            loginModal.style.display = 'flex';
        });
    }

    // Forgot password form
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

    // Loan request form
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

            // Reset file uploads and signature
            resetUploads();
            
            // Show agreement modal
            if (agreementModal) {
                agreementModal.style.display = 'flex';
            }
        });
    }

    // Save signature button
    const saveSignatureBtn = document.getElementById('save-signature');
    if (saveSignatureBtn) {
        saveSignatureBtn.addEventListener('click', function() {
            if (signaturePad && !signaturePad.isEmpty()) {
                const signatureData = signaturePad.toDataURL();
                document.getElementById('signature-data').value = signatureData;
                document.getElementById('signature-status').innerHTML = '✓ Signature saved';
                document.getElementById('signature-status').style.color = '#2ecc71';
                showNotification('Signature saved successfully');
            } else {
                showNotification('Please draw your signature first');
            }
        });
    }

    // Agreement form submit
    if (agreementForm) {
        agreementForm.addEventListener('submit', function(e) {
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
            
            // Check if signature is provided and saved
            const signatureData = document.getElementById('signature-data').value;
            if (!signatureData) {
                showNotification('Please draw and save your digital signature');
                return;
            }
            
            // Check if terms are agreed
            const agreeTerms = document.getElementById('agree-terms');
            if (!agreeTerms.checked) {
                showNotification('Please agree to the terms and conditions');
                return;
            }
            
            // Get loan details
            const purpose = document.getElementById('agreement-purpose').value;
            const amount = parseInt(document.getElementById('agreement-amount').value);
            const term = parseInt(document.getElementById('agreement-term').value);
            const monthlyPayment = parseInt(document.getElementById('agreement-monthly-payment').value);
            
            if (!currentUser) {
                showNotification('Please login first');
                agreementModal.style.display = 'none';
                loginModal.style.display = 'flex';
                return;
            }
            
            // Create document URLs for browser viewing
            const aadhaarUrl = createDocumentUrl(uploadedFiles.aadhaar, 'aadhaar');
            const undertakingUrl = createDocumentUrl(uploadedFiles.undertaking, 'undertaking');
            
            // Create document record with view URLs
            const documentRecord = {
                aadhaar: {
                    name: uploadedFiles.aadhaar.name,
                    type: uploadedFiles.aadhaar.type,
                    size: uploadedFiles.aadhaar.size,
                    dataUrl: aadhaarUrl,
                    viewUrl: aadhaarUrl,
                    uploadedAt: new Date().toISOString()
                },
                undertaking: {
                    name: uploadedFiles.undertaking.name,
                    type: uploadedFiles.undertaking.type,
                    size: uploadedFiles.undertaking.size,
                    dataUrl: undertakingUrl,
                    viewUrl: undertakingUrl,
                    uploadedAt: new Date().toISOString()
                },
                signature: signatureData,
                signatureImage: signatureData,
                agreementAccepted: true,
                agreementDate: new Date().toISOString()
            };
            
            // Create the new loan
            const newLoan = {
                id: Date.now(),
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
                documents: documentRecord,
                agreementAccepted: true,
                agreementDate: new Date().toISOString()
            };
            
            loans.push(newLoan);
            localStorage.setItem('friendlend_loans', JSON.stringify(loans));
            
            // Update user's KYC status
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) {
                users[userIndex].kycStatus = 'verified';
                users[userIndex].documents = users[userIndex].documents || [];
                users[userIndex].documents.push({
                    type: 'loan_documents',
                    loanId: newLoan.id,
                    date: new Date().toISOString(),
                    documents: {
                        aadhaar: documentRecord.aadhaar,
                        undertaking: documentRecord.undertaking
                    }
                });
                currentUser = users[userIndex];
                localStorage.setItem('friendlend_users', JSON.stringify(users));
                localStorage.setItem('friendlend_currentUser', JSON.stringify(currentUser));
            }
            
            // Store documents in userDocuments for easy access
            userDocuments[`${currentUser.username}_${newLoan.id}`] = documentRecord;
            localStorage.setItem('friendlend_documents', JSON.stringify(userDocuments));
            
            // Close agreement modal
            agreementModal.style.display = 'none';
            
            // Update success modal with document summary
            const successSummary = document.getElementById('success-document-summary');
            if (successSummary) {
                successSummary.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-id-card" style="color: #3498db; width: 20px;"></i>
                        <span style="font-size: 0.9rem;">Aadhaar: <strong>${uploadedFiles.aadhaar.name}</strong></span>
                        <button onclick="openDocumentInBrowser('aadhaar', ${newLoan.id})" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-left: auto; cursor: pointer;">
                            <i class="fas fa-external-link-alt"></i> View
                        </button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-file-pdf" style="color: #e74c3c; width: 20px;"></i>
                        <span style="font-size: 0.9rem;">Undertaking: <strong>${uploadedFiles.undertaking.name}</strong></span>
                        <button onclick="openDocumentInBrowser('undertaking', ${newLoan.id})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-left: auto; cursor: pointer;">
                            <i class="fas fa-external-link-alt"></i> View
                        </button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-pen" style="color: #2ecc71; width: 20px;"></i>
                        <span style="font-size: 0.9rem;">Digital Signature: <strong>Provided</strong></span>
                        <button onclick="viewSignatureInBrowser(${newLoan.id})" style="background: #2ecc71; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-left: auto; cursor: pointer;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                `;
            }
            
            // Show success modal
            if (successModal) {
                successModal.style.display = 'flex';
            }
            
            // Update displays
            renderLoanRequests();
            renderInvestmentOpportunities();
            
            showNotification('Loan request created with documents successfully!');
        });
    }

    // Cancel agreement button
    const cancelBtn = document.getElementById('cancel-agreement');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            agreementModal.style.display = 'none';
        });
    }

    // Close agreement button
    const closeAgreement = document.getElementById('close-agreement');
    if (closeAgreement) {
        closeAgreement.addEventListener('click', function() {
            agreementModal.style.display = 'none';
        });
    }

    // Success OK button
    const successOkBtn = document.getElementById('success-ok-btn');
    if (successOkBtn) {
        successOkBtn.addEventListener('click', function() {
            successModal.style.display = 'none';
        });
    }

    // Close success button
    const closeSuccess = document.getElementById('close-success');
    if (closeSuccess) {
        closeSuccess.addEventListener('click', function() {
            successModal.style.display = 'none';
        });
    }

    // Clear signature button
    const clearSignature = document.getElementById('clear-signature');
    if (clearSignature) {
        clearSignature.addEventListener('click', function() {
            if (signaturePad) {
                signaturePad.clear();
                document.getElementById('signature-data').value = '';
                document.getElementById('signature-status').innerHTML = 'Signature not saved';
                document.getElementById('signature-status').style.color = '#e74c3c';
            }
        });
    }

    // Razorpay payment button
    if (razorpayPayBtn) {
        razorpayPayBtn.addEventListener('click', function() {
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
            
            const loanId = investForm.getAttribute('data-loan-id');
            const loan = loans.find(l => l.id == loanId);
            
            if (!loan) {
                showNotification('Loan not found');
                return;
            }
            
            const remaining = loan.amount - loan.funded;
            if (amount > remaining) {
                showNotification(`Amount exceeds remaining loan amount of ₹${remaining}`);
                return;
            }
            
            if (amount > currentUser.balance) {
                showNotification('Insufficient balance. Please add funds to your account.');
                return;
            }
            
            // Initialize Razorpay payment
            const options = {
                key: RAZORPAY_KEY_ID,
                amount: amount * 100, // Amount in paise
                currency: 'INR',
                name: 'FriendFunds',
                description: `Investment in ${loan.purpose}`,
                image: 'https://friendfunds.in/logo.png',
                handler: function(response) {
                    // Payment successful
                    processInvestment(loanId, amount, response);
                },
                prefill: {
                    name: currentUser.username,
                    email: currentUser.email,
                    contact: ''
                },
                notes: {
                    address: 'FriendFunds Investment'
                },
                theme: {
                    color: '#3498db'
                },
                modal: {
                    ondismiss: function() {
                        showNotification('Payment cancelled');
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            rzp.open();
        });
    }

    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.nav-links').classList.toggle('active');
        });
    }

    // Password visibility toggle
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

    // Close modals when clicking outside
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
});

// Create document URL for browser viewing
function createDocumentUrl(file, type) {
    // Create a blob URL for the file
    const blob = new Blob([file], { type: file.type });
    return URL.createObjectURL(blob);
}

// Open document in new browser tab
window.openDocumentInBrowser = function(docType, loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || !loan.documents) return;
    
    const documentData = loan.documents[docType];
    if (!documentData) return;
    
    // Open the document URL in a new tab
    if (documentData.dataUrl) {
        window.open(documentData.dataUrl, '_blank');
    } else {
        showNotification('Document URL not available');
    }
};

// View signature in new browser tab
window.viewSignatureInBrowser = function(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || !loan.documents) return;
    
    // Create a temporary HTML page with the signature
    const signatureHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Digital Signature - ${loan.borrower}</title>
            <style>
                body { font-family: Arial; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                .container { text-align: center; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h2 { color: #333; margin-bottom: 1rem; }
                .signature-box { border: 2px solid #3498db; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
                img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
                .details { color: #666; margin-top: 1rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Digital Signature</h2>
                <div class="signature-box">
                    <img src="${loan.documents.signatureImage}" alt="Digital Signature">
                </div>
                <div class="details">
                    <p><strong>Borrower:</strong> ${loan.borrower}</p>
                    <p><strong>Loan:</strong> ${loan.purpose}</p>
                    <p><strong>Date:</strong> ${new Date(loan.documents.agreementDate).toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Create blob and open in new tab
    const blob = new Blob([signatureHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};

// Process investment after payment
function processInvestment(loanId, amount, paymentResponse) {
    const loan = loans.find(l => l.id == loanId);
    if (!loan) return;
    
    // Update loan
    loan.funded += parseInt(amount);
    if (loan.funded >= loan.amount) {
        loan.status = 'funded';
    }
    
    // Update user balance
    currentUser.balance -= parseInt(amount);
    users = users.map(u => u.id === currentUser.id ? currentUser : u);
    
    // Create investment record
    const investment = {
        id: Date.now(),
        loanId: loan.id,
        investor: currentUser.username,
        amount: parseInt(amount),
        date: new Date().toISOString().split('T')[0],
        expectedReturn: Math.round(parseInt(amount) * (1 + 8 / 100 * loan.term / 12)),
        status: 'active',
        paymentId: paymentResponse.razorpay_payment_id,
        paymentMethod: 'Razorpay'
    };
    
    investments.push(investment);
    loan.investors.push({
        investor: currentUser.username,
        amount: parseInt(amount),
        paymentId: paymentResponse.razorpay_payment_id
    });
    
    // Save all data
    localStorage.setItem('friendlend_loans', JSON.stringify(loans));
    localStorage.setItem('friendlend_users', JSON.stringify(users));
    localStorage.setItem('friendlend_investments', JSON.stringify(investments));
    localStorage.setItem('friendlend_currentUser', JSON.stringify(currentUser));
    
    // Close invest modal
    document.getElementById('invest-modal').style.display = 'none';
    
    // Update displays
    renderLoanRequests();
    renderInvestmentOpportunities();
    
    if (document.getElementById('user-dashboard').style.display === 'block') {
        renderUserDashboard();
    }
    
    showNotification(`Successfully invested ₹${amount} in ${loan.purpose} via Razorpay! Payment ID: ${paymentResponse.razorpay_payment_id}`);
    simulateRealTimeUpdate();
}

// Initialize Signature Pad with fixes
function initSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (canvas) {
        // Set canvas dimensions
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            throttle: 16,
            minWidth: 1,
            maxWidth: 2.5
        });
        
        // Handle resize
        function resizeCanvas() {
            const data = signaturePad.toData();
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            signaturePad.fromData(data);
        }
        
        window.addEventListener('resize', resizeCanvas);
    }
}

// Initialize File Upload Handlers
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

// Handle File Upload
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

// Update File Preview
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

// Remove File (make global)
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

// Reset Uploads
function resetUploads() {
    uploadedFiles = {
        aadhaar: null,
        undertaking: null
    };
    
    document.getElementById('aadhaar-upload').value = '';
    document.getElementById('undertaking-upload').value = '';
    
    if (signaturePad) {
        signaturePad.clear();
        document.getElementById('signature-data').value = '';
        document.getElementById('signature-status').innerHTML = 'Signature not saved';
        document.getElementById('signature-status').style.color = '#e74c3c';
    }
    
    // Reset previews
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

// Show Section
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

// Show Notification
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

// Update UI After Login
function updateUIAfterLogin() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = 'Logout';
        
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
            
            this.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('login-modal').style.display = 'flex';
            });
        });
    }
}

// Render Functions
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
                        <div class="document-meta">${loan.documents.aadhaar.name} • ${(loan.documents.aadhaar.size/1024).toFixed(2)} KB</div>
                    </div>
                    <button onclick="openDocumentInBrowser('aadhaar', ${loan.id})" class="view-document" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> View in Browser
                    </button>
                </div>
                <div class="document-item">
                    <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                    <div class="document-info">
                        <div class="document-name">Signed Undertaking</div>
                        <div class="document-meta">${loan.documents.undertaking.name} • ${(loan.documents.undertaking.size/1024).toFixed(2)} KB</div>
                    </div>
                    <button onclick="openDocumentInBrowser('undertaking', ${loan.id})" class="view-document" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> View in Browser
                    </button>
                </div>
                <div class="document-item">
                    <i class="fas fa-pen" style="color: #2ecc71;"></i>
                    <div class="document-info">
                        <div class="document-name">Digital Signature</div>
                        <div class="document-meta">Provided on ${new Date(loan.documents.agreementDate).toLocaleDateString()}</div>
                    </div>
                    <button onclick="viewSignatureInBrowser(${loan.id})" class="view-document" style="background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-eye"></i> View Signature
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

function renderUserDashboard() {
    if (!currentUser) return;

    const userLoansContainer = document.getElementById('user-loans-container');
    const userInvestmentsContainer = document.getElementById('user-investments-container');
    const userProfileContainer = document.getElementById('user-profile-container');

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

// Render user documents
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
                    
                    <div class="document-item">
                        <i class="fas fa-pen" style="color: #2ecc71;"></i>
                        <div class="document-info">
                            <div class="document-name">Digital Signature</div>
                            <div class="document-meta">Signed on ${new Date(loan.documents.agreementDate).toLocaleDateString()}</div>
                        </div>
                        <button onclick="viewSignatureInBrowser(${loan.id})" style="background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-eye"></i> View Signature
                        </button>
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function startRealTimeUpdates() {
    updateInterval = setInterval(() => {
        loans = JSON.parse(localStorage.getItem('friendlend_loans')) || [];
        investments = JSON.parse(localStorage.getItem('friendlend_investments')) || [];

        if (document.getElementById('dashboard').style.display !== 'none' ||
            document.getElementById('home').style.display !== 'none') {
            renderLoanRequests();
            renderInvestmentOpportunities();
        }

        if (document.getElementById('user-dashboard').style.display === 'block') {
            renderUserDashboard();
        }
    }, 10000);
}

function simulateRealTimeUpdate() {
    showNotification("Update sent to all users in real-time");
}

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