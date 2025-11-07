// Data storage (simulating a database)
let users = JSON.parse(localStorage.getItem('friendlend_users')) || [];
let loans = JSON.parse(localStorage.getItem('friendlend_loans')) || [];
let investments = JSON.parse(localStorage.getItem('friendlend_investments')) || [];
let payments = JSON.parse(localStorage.getItem('friendlend_payments')) || [];

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
            investors: []
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
            investors: []
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
            investors: []
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
            investors: []
        }
    ];
    localStorage.setItem('friendlend_loans', JSON.stringify(loans));
}

// Add sample users if empty
if (users.length === 0) {
    users = [
        {
            id: 1,
            username: 'Nirmal',
            password: 'password123',
            email: 'Nirmal@example.com',
            balance: 1000000,
            rememberMe: false
        },
        {
            id: 2,
            username: 'Harsh',
            password: 'password123',
            email: 'Harsh@example.com',
            balance: 1000000,
            rememberMe: false
        },
        {
            id: 3,
            username: 'Mohit',
            password: 'password123',
            email: 'Mohit@example.com',
            balance: 1000000,
            rememberMe: false
        },
        {
            id: 4,
            username: 'Shubham',
            password: 'password123',
            email: 'Shubham@example.com',
            balance: 1000000,
            rememberMe: false
        }
    ];
    localStorage.setItem('friendlend_users', JSON.stringify(users));
}

// Current user
let currentUser = null;

// Real-time update interval
let updateInterval;

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const loanDetailModal = document.getElementById('loan-detail-modal');
    const investModal = document.getElementById('invest-modal');
    const loginBtn = document.getElementById('login-btn');
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
    const investForm = document.getElementById('invest-form');
    const activeLoansContainer = document.getElementById('active-loans-container');
    const investmentOpportunitiesContainer = document.getElementById('investment-opportunities-container');
    const userLoansContainer = document.getElementById('user-loans-container');
    const userInvestmentsContainer = document.getElementById('user-investments-container');
    const userProfileContainer = document.getElementById('user-profile-container');
    const userDashboard = document.getElementById('user-dashboard');
    const mainContent = document.getElementById('main-content');
    const menuToggle = document.querySelector('.menu-toggle');
    const passwordToggles = document.querySelectorAll('.password-toggle');
    const rememberMeCheckbox = document.getElementById('remember-me');

    renderLoanRequests();
    renderInvestmentOpportunities();

    // Check if user is logged in with remember me
    const savedUser = localStorage.getItem('friendlend_currentUser');
    const rememberMe = localStorage.getItem('friendlend_rememberMe') === 'true';

    if (savedUser && rememberMe) {
        currentUser = JSON.parse(savedUser);
        updateUIAfterLogin();
        showNotification(`Welcome back, ${currentUser.username}!`);
    }

    // Start real-time updates
    startRealTimeUpdates();

    // Event Listeners
    loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        loginModal.style.display = 'flex';
    });

    getStartedBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (currentUser) {
            showSection('dashboard');
        } else {
            loginModal.style.display = 'flex';
        }
    });

    learnMoreBtn.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
    });

    registerLink.addEventListener('click', function (e) {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'flex';
    });

    forgotPasswordLink.addEventListener('click', function (e) {
        e.preventDefault();
        loginModal.style.display = 'none';
        forgotPasswordModal.style.display = 'flex';
    });

    backToLoginLink.addEventListener('click', function (e) {
        e.preventDefault();
        forgotPasswordModal.style.display = 'none';
        loginModal.style.display = 'flex';
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', function () {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            forgotPasswordModal.style.display = 'none';
            loanDetailModal.style.display = 'none';
            investModal.style.display = 'none';
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            showSection(target);
        });
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const usernameOrEmail = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rememberMe = rememberMeCheckbox.checked;

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

    // Replace the registerForm event listener with this code:
registerForm.addEventListener('submit', function (e) {
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
        balance: 50000, // Starting balance
        rememberMe: false
    };

    users.push(newUser);
    localStorage.setItem('friendlend_users', JSON.stringify(users));

    // Close the registration modal
    registerModal.style.display = 'none';
    
    // Clear the registration form
    registerForm.reset();
    
    // Show success notification
    showNotification('Registration successful! Please login with your credentials.');
    
    // Auto-fill the login form with the new username
    document.getElementById('username').value = username;
    
    // Show the login modal immediately
    loginModal.style.display = 'flex';
});

    forgotPasswordForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('reset-email').value;

        const user = users.find(u => u.email === email);

        if (user) {
            // In a real application, you would send an email here
            // For this demo, we'll just show a notification with the password
            showNotification(`Password recovery email sent to ${email}. Your password is: ${user.password}`);
            forgotPasswordModal.style.display = 'none';
            loginModal.style.display = 'flex';
        } else {
            showNotification('No account found with that email address');
        }
    });

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

        // Calculate monthly payment with 8% interest
        const monthlyInterest = 8 / 12 / 100;
        const monthlyPayment = amount * monthlyInterest * Math.pow(1 + monthlyInterest, term) / (Math.pow(1 + monthlyInterest, term) - 1);

        const newLoan = {
            id: Date.now(),
            borrower: currentUser.username,
            purpose,
            amount,
            term,
            interest: 8,
            status: 'active',
            date: new Date().toISOString().split('T')[0],
            monthlyPayment: Math.round(monthlyPayment),
            funded: 0,
            investors: []
        };

        loans.push(newLoan);
        localStorage.setItem('friendlend_loans', JSON.stringify(loans));

        loanRequestForm.reset();
        renderLoanRequests();
        renderInvestmentOpportunities();
        showNotification('Loan request created successfully!');

        // Simulate real-time update for other users
        simulateRealTimeUpdate();
    });

    investForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const amount = parseInt(document.getElementById('invest-amount').value);
        const loanId = parseInt(investForm.getAttribute('data-loan-id'));

        const loan = loans.find(l => l.id === loanId);

        if (!loan) {
            showNotification('Loan not found');
            return;
        }

        if (amount > currentUser.balance) {
            showNotification('Insufficient balance');
            return;
        }

        if (amount > (loan.amount - loan.funded)) {
            showNotification('Amount exceeds remaining loan amount');
            return;
        }

        // Update loan
        loan.funded += amount;
        if (loan.funded >= loan.amount) {
            loan.status = 'funded';
        }

        // Update user balance
        currentUser.balance -= amount;
        users = users.map(u => u.id === currentUser.id ? currentUser : u);

        // Create investment record
        const investment = {
            id: Date.now(),
            loanId: loan.id,
            investor: currentUser.username,
            amount,
            date: new Date().toISOString().split('T')[0],
            expectedReturn: Math.round(amount * (1 + 8 / 100 * loan.term / 12)),
            status: 'active'
        };

        investments.push(investment);
        loan.investors.push({
            investor: currentUser.username,
            amount
        });

        // Update all storage
        localStorage.setItem('friendlend_loans', JSON.stringify(loans));
        localStorage.setItem('friendlend_users', JSON.stringify(users));
        localStorage.setItem('friendlend_investments', JSON.stringify(investments));
        localStorage.setItem('friendlend_currentUser', JSON.stringify(currentUser));

        investModal.style.display = 'none';
        renderLoanRequests();
        renderInvestmentOpportunities();

        if (userDashboard.style.display === 'block') {
            renderUserDashboard();
        }

        showNotification(`Successfully invested ₹${amount} in ${loan.purpose}`);

        // Simulate real-time update for other users
        simulateRealTimeUpdate();
    });

    // Mobile menu toggle
    menuToggle.addEventListener('click', function () {
        document.querySelector('.nav-links').classList.toggle('active');
    });

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
    });
});

// Functions
function showSection(target) {
    if (target === 'dashboard' && !currentUser) {
        showNotification('Please login first to access the dashboard');
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    // Hide all main sections
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });

    // Special handling for home - show both hero and features
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

    // Close mobile menu if open
    document.querySelector('.nav-links').classList.remove('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    notificationText.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function updateUIAfterLogin() {
    const loginBtn = document.getElementById('login-btn');

    loginBtn.textContent = 'Logout';
    loginBtn.removeEventListener('click', null);
    loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        currentUser = null;
        localStorage.removeItem('friendlend_currentUser');
        localStorage.removeItem('friendlend_rememberMe');
        loginBtn.textContent = 'Login';
        document.getElementById('user-dashboard').style.display = 'none';
        showSection('home');
        showNotification('Logged out successfully');

        // Reset login button behavior
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('login-modal').style.display = 'flex';
        });
    });
}

function renderLoanRequests() {
    const activeLoansContainer = document.getElementById('active-loans-container');
    activeLoansContainer.innerHTML = '';

    const activeLoans = loans.filter(loan => loan.status === 'active');

    if (activeLoans.length === 0) {
        activeLoansContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No active loan requests at the moment.</p>';
        return;
    }

    activeLoans.forEach(loan => {
        const progress = (loan.funded / loan.amount) * 100;

        const loanElement = document.createElement('div');
        loanElement.className = 'loan-request';
        loanElement.innerHTML = `
            <h4>${loan.purpose} by ${loan.borrower}</h4>
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

        activeLoansContainer.appendChild(loanElement);
    });

    // Add event listeners to the new buttons
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
}

function renderInvestmentOpportunities() {
    const investmentOpportunitiesContainer = document.getElementById('investment-opportunities-container');
    investmentOpportunitiesContainer.innerHTML = '';

    const opportunities = loans.filter(loan => loan.status === 'active' && loan.funded < loan.amount);

    if (opportunities.length === 0) {
        investmentOpportunitiesContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No investment opportunities at the moment.</p>';
        return;
    }

    opportunities.forEach(loan => {
        const remaining = loan.amount - loan.funded;
        const progress = (loan.funded / loan.amount) * 100;

        const opportunityElement = document.createElement('div');
        opportunityElement.className = 'investment-opportunity';
        opportunityElement.innerHTML = `
            <h4>${loan.purpose} by ${loan.borrower}</h4>
            <p><strong>Amount Needed:</strong> ₹${remaining.toLocaleString()}</p>
            <p><strong>Expected Return:</strong> 8% per annum</p>
            <p><strong>Risk Level:</strong> ${loan.borrower === 'john_doe' ? 'Low (Trusted Friend)' : 'Medium'}</p>
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
            <button class="btn btn-accent invest-btn" data-id="${loan.id}" style="margin-top: 15px;">Invest Now</button>
        `;

        investmentOpportunitiesContainer.appendChild(opportunityElement);
    });

    // Add event listeners to invest buttons
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
}
function showLoanDetails(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    
    const progress = (loan.funded / loan.amount) * 100;
    const totalRepayment = loan.monthlyPayment * loan.term;
    const totalInterest = totalRepayment - loan.amount;
    const monthlyInterest = totalInterest / loan.term;
    
    // Calculate days since creation
    const createdDate = new Date(loan.date);
    const today = new Date();
    const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
    
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
            <p><strong>Status:</strong> <span style="color: ${loan.status === 'active' ? 'var(--secondary)' : 'var(--primary)'}; font-weight: 500;">${loan.status}</span></p>
            <p><strong>Funded:</strong> ${progress.toFixed(1)}% (₹${loan.funded.toLocaleString()})</p>
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
        </div>
        <h4 style="margin-top: 1.5rem;">Investors</h4>
        ${loan.investors.length > 0 ? 
            loan.investors.map(inv => `<p>${inv.investor}: ₹${inv.amount.toLocaleString()}</p>`).join('') : 
            '<p>No investors yet</p>'
        }
        ${currentUser && currentUser.username !== loan.borrower && loan.status === 'active' ? 
            `<button class="btn btn-accent invest-btn" data-id="${loan.id}" style="margin-top: 1.5rem;">Invest in this Loan</button>` : ''}
    `;
    
    document.getElementById('loan-detail-modal').style.display = 'flex';
    
    // Add event listener to invest button in modal
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

    // Prevent users from investing in their own loans
    if (currentUser && currentUser.username === loan.borrower) {
        showNotification("You cannot invest in your own loan");
        return;
    }

    const remaining = loan.amount - loan.funded;

    document.getElementById('invest-amount').value = '';
    document.getElementById('invest-amount').setAttribute('max', remaining);
    document.getElementById('invest-amount').setAttribute('placeholder', `Max: ₹${remaining.toLocaleString()}`);
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

    // Render borrowed loans
    const userLoans = loans.filter(loan => loan.borrower === currentUser.username);
    userLoansContainer.innerHTML = '';

    if (userLoans.length === 0) {
        userLoansContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">You have no active loans.</p>';
    } else {
        userLoans.forEach(loan => {
            const progress = (loan.funded / loan.amount) * 100;
            const totalRepayment = loan.monthlyPayment * loan.term;

            const loanElement = document.createElement('div');
            loanElement.className = 'loan-request';
            loanElement.innerHTML = `
                <h4>${loan.purpose}</h4>
                <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
                <p><strong>Funded:</strong> ${progress.toFixed(1)}%</p>
                <p><strong>Term:</strong> ${loan.term} months</p>
                <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
                <p><strong>Total Repayment:</strong> ₹${totalRepayment.toLocaleString()}</p>
                <p><strong>Status:</strong> <span style="color: ${loan.status === 'active' ? 'var(--secondary)' : 'var(--primary)'}; font-weight: 500;">${loan.status}</span></p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progress}%"></div>
                </div>
                <button class="btn btn-primary view-loan" data-id="${loan.id}" style="margin-top: 15px;">View Details</button>
            `;

            userLoansContainer.appendChild(loanElement);
        });

        // Add event listeners to view loan buttons in user dashboard
        userLoansContainer.querySelectorAll('.view-loan').forEach(button => {
            button.addEventListener('click', function () {
                const loanId = parseInt(this.getAttribute('data-id'));
                showLoanDetails(loanId);
            });
        });
    }

    // Render investments
    const userInvestments = investments.filter(inv => inv.investor === currentUser.username);
    userInvestmentsContainer.innerHTML = '';

    if (userInvestments.length === 0) {
        userInvestmentsContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">You have no investments.</p>';
    } else {
        userInvestments.forEach(investment => {
            const loan = loans.find(l => l.id === investment.loanId);
            if (!loan) return;

            const investmentElement = document.createElement('div');
            investmentElement.className = 'investment-opportunity';
            investmentElement.innerHTML = `
                <h4>${loan.purpose} by ${loan.borrower}</h4>
                <p><strong>Invested Amount:</strong> ₹${investment.amount.toLocaleString()}</p>
                <p><strong>Expected Return:</strong> ₹${investment.expectedReturn.toLocaleString()}</p>
                <p><strong>Status:</strong> <span style="color: ${investment.status === 'active' ? 'var(--secondary)' : 'var(--primary)'}; font-weight: 500;">${investment.status}</span></p>
                <button class="btn btn-primary view-investment" data-id="${investment.id}">View Details</button>
            `;

            userInvestmentsContainer.appendChild(investmentElement);
        });

        // Add event listeners to view investment buttons
        userInvestmentsContainer.querySelectorAll('.view-investment').forEach(button => {
            button.addEventListener('click', function () {
                const investmentId = parseInt(this.getAttribute('data-id'));
                showInvestmentDetails(investmentId);
            });
        });
    }

    // Render profile
    userProfileContainer.innerHTML = `
        <div class="loan-details">
            <p><strong>Username:</strong> ${currentUser.username}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Account Balance:</strong> ₹${currentUser.balance.toLocaleString()}</p>
            <p><strong>Active Loans:</strong> ${userLoans.length}</p>
            <p><strong>Active Investments:</strong> ${userInvestments.length}</p>
        </div>
        <div style="margin-top: 1.5rem;">
            <button class="btn btn-danger" id="logout-btn">Logout</button>
        </div>
    `;

    // Add logout button event listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
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
function startRealTimeUpdates() {
    // Simulate real-time updates every 10 seconds
    updateInterval = setInterval(() => {
        // In a real application, this would check for updates from a server
        // For this demo, we'll just refresh the data
        loans = JSON.parse(localStorage.getItem('friendlend_loans')) || [];
        investments = JSON.parse(localStorage.getItem('friendlend_investments')) || [];

        // Only update if the user is on a relevant page
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
    // In a real application, this would push updates to all connected clients
    // For this demo, we'll just show a notification
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
            <p><strong>Loan Term:</strong> ${loan.term} months</p>
            <p><strong>Interest Rate:</strong> ${loan.interest}% per annum</p>
            <p><strong>Expected Total Return:</strong> ₹${totalReturn.toLocaleString()}</p>
            <p><strong>Expected Profit:</strong> ₹${profit.toLocaleString()}</p>
            <p><strong>ROI:</strong> ${roi.toFixed(2)}%</p>
            <p><strong>Monthly Return:</strong> ₹${monthlyReturn.toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: ${investment.status === 'active' ? 'var(--secondary)' : 'var(--primary)'}; font-weight: 500;">${investment.status}</span></p>
        </div>
        <h4 style="margin-top: 1.5rem;">Loan Details</h4>
        <div class="loan-details">
            <p><strong>Total Loan Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
            <p><strong>Amount Funded:</strong> ₹${loan.funded.toLocaleString()} (${((loan.funded / loan.amount) * 100).toFixed(1)}%)</p>
            <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
            <p><strong>Loan Status:</strong> <span style="color: ${loan.status === 'active' ? 'var(--secondary)' : 'var(--primary)'}; font-weight: 500;">${loan.status}</span></p>
        </div>
    `;

    document.getElementById('loan-detail-modal').style.display = 'flex';

}
