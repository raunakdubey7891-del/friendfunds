// ============================================
// FRIENDFUNDS - COMPLETE SCRIPT.JS
// WITH PROPER SUPABASE STORAGE FOR DOCUMENTS
// ============================================

// ============================================
// DATA STORAGE - INITIALIZED FROM SUPABASE
// ============================================
let users = [];
let loans = [];
let investments = [];
let payments = [];
let userDocuments = {};

// Global variables
let currentUser = null;
let updateInterval;
let uploadedFiles = {
    aadhaar: null,
    undertaking: null
};
let currentLoanForInvestment = null;

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_HERE'; // Replace with your Razorpay test key

// ============================================
// REAL-TIME DATA LOADING FROM SUPABASE
// ============================================

// Load loans in real-time
async function loadLoansRealtime() {
    if (!window.supabase) {
        console.log("Waiting for Supabase...");
        setTimeout(loadLoansRealtime, 1000);
        return;
    }
    
    try {
        // Load loans
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
            loans = data;
            renderLoanRequests();
            renderInvestmentOpportunities();
            if (currentUser) {
                renderUserDashboard();
                renderUserDocuments();
            }
        }

        // Real-time subscription
        supabase
            .channel('loans-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'loans' },
                (payload) => {
                    console.log('Loans updated:', payload);
                    loadLoansRealtime(); // Reload on any change
                }
            )
            .subscribe();
    } catch (error) {
        console.error('Error loading loans:', error);
    }
}

// Load investments in real-time
async function loadInvestmentsRealtime() {
    try {
        const { data, error } = await supabase
            .from('investments')
            .select('*');
        
        if (error) throw error;
        
        if (data) {
            investments = data;
        }

        supabase
            .channel('investments-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'investments' },
                (payload) => {
                    console.log('Investments updated:', payload);
                    loadInvestmentsRealtime();
                    if (currentUser) renderUserDashboard();
                }
            )
            .subscribe();
    } catch (error) {
        console.error('Error loading investments:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');
        
        if (error) throw error;
        
        if (data) {
            users = data;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// ============================================
// SUPABASE STORAGE FOR DOCUMENTS
// ============================================

// Upload file to Supabase Storage
async function uploadDocument(file, userId, documentType, loanId) {
    try {
        // Create a unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${documentType}_${loanId}_${Date.now()}.${fileExt}`;
        const filePath = `loan-documents/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        return {
            path: filePath,
            url: urlData.publicUrl,
            name: file.name,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
}

// ============================================
// INITIALIZE SAMPLE DATA
// ============================================

async function initializeSampleData() {
    try {
        // Check if loans exist
        const { data: existingLoans, error: loanError } = await supabase
            .from('loans')
            .select('*')
            .limit(1);
        
        if (loanError) throw loanError;
        
        if (!existingLoans || existingLoans.length === 0) {
            console.log("Adding sample loans...");
            
            const sampleLoans = [
                {
                    borrower: 'Nirmal',
                    purpose: 'Education Fee',
                    amount: 15000,
                    term: 12,
                    interest: 8,
                    status: 'active',
                    date: new Date().toISOString().split('T')[0],
                    monthly_payment: 1302,
                    funded: 8000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false,
                    created_at: new Date().toISOString()
                },
                {
                    borrower: 'Harsh',
                    purpose: 'Vacation',
                    amount: 8000,
                    term: 6,
                    interest: 8,
                    status: 'active',
                    date: new Date().toISOString().split('T')[0],
                    monthly_payment: 1360,
                    funded: 3000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false,
                    created_at: new Date().toISOString()
                },
                {
                    borrower: 'Mohit',
                    purpose: 'Laptop Purchase',
                    amount: 25000,
                    term: 18,
                    interest: 8,
                    status: 'active',
                    date: new Date().toISOString().split('T')[0],
                    monthly_payment: 1484,
                    funded: 12000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false,
                    created_at: new Date().toISOString()
                },
                {
                    borrower: 'Shubham',
                    purpose: 'Air Conditioner',
                    amount: 35000,
                    term: 18,
                    interest: 8,
                    status: 'active',
                    date: new Date().toISOString().split('T')[0],
                    monthly_payment: 2078,
                    funded: 15000,
                    investors: [],
                    documents: null,
                    agreement_accepted: false,
                    created_at: new Date().toISOString()
                }
            ];
            
            for (const loan of sampleLoans) {
                await supabase.from('loans').insert([loan]);
            }
            console.log("Sample loans added!");
        }

        // Check if users exist
        const { data: existingUsers, error: userError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
        
        if (userError) throw userError;
        
        if (!existingUsers || existingUsers.length === 0) {
            console.log("Adding sample users...");
            
            const sampleUsers = [
                {
                    username: 'Nirmal',
                    password: 'password123',
                    email: 'nirmal@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                },
                {
                    username: 'Harsh',
                    password: 'password123',
                    email: 'harsh@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                },
                {
                    username: 'Mohit',
                    password: 'password123',
                    email: 'mohit@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                },
                {
                    username: 'Shubham',
                    password: 'password123',
                    email: 'shubham@example.com',
                    balance: 1000000,
                    kyc_status: 'pending',
                    documents: []
                }
            ];
            
            for (const user of sampleUsers) {
                await supabase.from('users').insert([user]);
            }
            console.log("Sample users added!");
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

// ============================================
// AUTHENTICATION
// ============================================

// Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const usernameOrEmail = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me')?.checked || false;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
            .eq('password', password)
            .single();
        
        if (error) throw error;
        
        if (data) {
            currentUser = data;
            if (rememberMe) {
                localStorage.setItem('friendfunds_currentUser', JSON.stringify(data));
                localStorage.setItem('friendfunds_rememberMe', 'true');
            }
            updateUIAfterLogin();
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('login-form').reset();
            showNotification('Login successful!');
            renderUserDashboard();
            renderUserDocuments();
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Invalid username/email or password');
    }
});

// Register
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const email = document.getElementById('email').value;
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match');
        return;
    }
    
    try {
        // Check if username exists
        const { data: existingUsername } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (existingUsername) {
            showNotification('Username already exists');
            return;
        }
        
        // Check if email exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (existingEmail) {
            showNotification('Email already registered');
            return;
        }
        
        // Create new user
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password,
                    email,
                    balance: 50000,
                    kyc_status: 'pending',
                    documents: []
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        if (data) {
            users.push(data);
            document.getElementById('register-modal').style.display = 'none';
            document.getElementById('register-form').reset();
            showNotification('Registration successful! Please login.');
            document.getElementById('username').value = username;
            document.getElementById('login-modal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed');
    }
});

// Forgot password
document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error) throw error;
        
        if (data) {
            showNotification(`Password recovery: Your password is: ${data.password}`);
            document.getElementById('forgot-password-modal').style.display = 'none';
            document.getElementById('forgot-password-form').reset();
            document.getElementById('login-modal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Password recovery error:', error);
        showNotification('No account found with that email address');
    }
});

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('friendfunds_currentUser');
    localStorage.removeItem('friendfunds_rememberMe');
    
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = 'Login';
        loginBtn.removeEventListener('click', logout);
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('login-modal').style.display = 'flex';
        });
    }
    
    document.getElementById('user-dashboard').style.display = 'none';
    showSection('home');
    showNotification('Logged out successfully');
}

// Check saved user
function checkSavedUser() {
    const savedUser = localStorage.getItem('friendfunds_currentUser');
    const rememberMe = localStorage.getItem('friendfunds_rememberMe') === 'true';

    if (savedUser && rememberMe) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUIAfterLogin();
            showNotification(`Welcome back, ${currentUser.username}!`);
            renderUserDashboard();
            renderUserDocuments();
        } catch (error) {
            console.error('Error loading saved user:', error);
            localStorage.removeItem('friendfunds_currentUser');
            localStorage.removeItem('friendfunds_rememberMe');
        }
    }
}

// ============================================
// CREATE LOAN REQUEST
// ============================================

document.getElementById('loan-request-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login to create a loan request');
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    
    const purpose = document.getElementById('purpose').value;
    const amount = parseInt(document.getElementById('amount').value);
    const term = parseInt(document.getElementById('term').value);
    
    // Calculate monthly payment with 8% interest
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
    document.getElementById('loan-agreement-modal').style.display = 'flex';
});

// ============================================
// SUBMIT LOAN AGREEMENT WITH FILE UPLOAD
// ============================================

document.getElementById('loan-agreement-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login first');
        document.getElementById('loan-agreement-modal').style.display = 'none';
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    
    // Validate file uploads
    if (!uploadedFiles.aadhaar || !uploadedFiles.undertaking) {
        showNotification('Please upload all required documents');
        return;
    }
    
    if (!document.getElementById('agree-terms').checked) {
        showNotification('Please agree to terms and conditions');
        return;
    }
    
    // Show uploading notification
    showNotification('Uploading documents...');
    
    try {
        const purpose = document.getElementById('agreement-purpose').value;
        const amount = parseInt(document.getElementById('agreement-amount').value);
        const term = parseInt(document.getElementById('agreement-term').value);
        const monthlyPayment = parseInt(document.getElementById('agreement-monthly-payment').value);
        
        // Step 1: Upload Aadhaar to Supabase Storage
        const aadhaarFile = uploadedFiles.aadhaar;
        const aadhaarData = await uploadDocument(
            aadhaarFile, 
            currentUser.id || currentUser.username, 
            'aadhaar',
            Date.now()
        );
        
        // Step 2: Upload Undertaking to Supabase Storage
        const undertakingFile = uploadedFiles.undertaking;
        const undertakingData = await uploadDocument(
            undertakingFile, 
            currentUser.id || currentUser.username, 
            'undertaking',
            Date.now()
        );
        
        // Step 3: Create document record (store only metadata and URLs, not file data)
        const documentRecord = {
            aadhaar: {
                name: aadhaarFile.name,
                type: aadhaarFile.type,
                size: aadhaarFile.size,
                url: aadhaarData.url,
                path: aadhaarData.path,
                uploadedAt: new Date().toISOString()
            },
            undertaking: {
                name: undertakingFile.name,
                type: undertakingFile.type,
                size: undertakingFile.size,
                url: undertakingData.url,
                path: undertakingData.path,
                uploadedAt: new Date().toISOString()
            },
            agreementAccepted: true,
            agreementDate: new Date().toISOString()
        };
        
        // Step 4: Create loan in database
        const { data: loanData, error: loanError } = await supabase
            .from('loans')
            .insert([
                {
                    borrower: currentUser.username,
                    borrower_id: currentUser.id,
                    purpose: purpose,
                    amount: amount,
                    term: term,
                    interest: 8,
                    status: 'active',
                    date: new Date().toISOString().split('T')[0],
                    monthly_payment: monthlyPayment,
                    funded: 0,
                    investors: [],
                    documents: documentRecord, // Store metadata, not file data
                    agreement_accepted: true,
                    agreement_date: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (loanError) throw loanError;
        
        // Step 5: Update user's KYC status and document records
        const updatedDocs = [...(currentUser.documents || []), {
            type: 'loan_documents',
            loanId: loanData.id,
            date: new Date().toISOString(),
            documents: {
                aadhaar: documentRecord.aadhaar,
                undertaking: documentRecord.undertaking
            }
        }];
        
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                kyc_status: 'verified',
                documents: updatedDocs
            })
            .eq('id', currentUser.id);
        
        if (updateError) throw updateError;
        
        // Update current user
        currentUser.kyc_status = 'verified';
        currentUser.documents = updatedDocs;
        
        // Close agreement modal
        document.getElementById('loan-agreement-modal').style.display = 'none';
        
        // Update success modal with document links
        const successSummary = document.getElementById('success-document-summary');
        if (successSummary) {
            successSummary.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    <i class="fas fa-id-card" style="color: #3498db; font-size: 1.5rem;"></i>
                    <div style="flex: 1; text-align: left;">
                        <div style="font-weight: 500; font-size: 0.9rem;">Aadhaar Card</div>
                        <div style="font-size: 0.8rem; color: #666;">${aadhaarFile.name}</div>
                    </div>
                    <a href="${aadhaarData.url}" target="_blank" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-size: 0.9rem;">
                        <i class="fas fa-external-link-alt"></i> View
                    </a>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    <i class="fas fa-file-pdf" style="color: #e74c3c; font-size: 1.5rem;"></i>
                    <div style="flex: 1; text-align: left;">
                        <div style="font-weight: 500; font-size: 0.9rem;">Signed Undertaking</div>
                        <div style="font-size: 0.8rem; color: #666;">${undertakingFile.name}</div>
                    </div>
                    <a href="${undertakingData.url}" target="_blank" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-size: 0.9rem;">
                        <i class="fas fa-external-link-alt"></i> View
                    </a>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #d4edda; border-radius: 8px; color: #155724;">
                    <i class="fas fa-check-circle" style="font-size: 1.2rem;"></i>
                    <span style="font-size: 0.9rem;">Documents uploaded successfully! Loan request created.</span>
                </div>
            `;
        }
        
        // Show success modal
        document.getElementById('upload-success-modal').style.display = 'flex';
        
        // Reset file uploads
        resetUploads();
        
        // Refresh loans
        await loadLoansRealtime();
        
        showNotification('Loan request created with documents successfully!');
        
    } catch (error) {
        console.error('Error creating loan:', error);
        showNotification('Error creating loan: ' + error.message);
    }
});

// Helper function to open document in new tab
window.openDocumentInBrowser = function (url) {
    if (url) {
        window.open(url, '_blank');
    } else {
        showNotification('Document URL not available');
    }
};

// ============================================
// FILE UPLOAD HANDLING
// ============================================

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
                aadhaarUpload.files = e.dataTransfer.files;
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
                undertakingUpload.files = e.dataTransfer.files;
            }
        });
    }
}

function handleFileUpload(file, type) {
    if (!file) return;

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size should be less than 5MB');
        return;
    }

    // Validate file type
    if (type === 'aadhaar') {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload PDF, JPG, or PNG file for Aadhaar');
            return;
        }
        uploadedFiles.aadhaar = file;
    } else {
        if (file.type !== 'application/pdf') {
            showNotification('Please upload PDF file for undertaking');
            return;
        }
        uploadedFiles.undertaking = file;
    }
    
    updateFilePreview(file, type);
}

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

// ============================================
// RENDER FUNCTIONS
// ============================================

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
            <p><strong>Monthly Payment:</strong> ₹${loan.monthly_payment?.toLocaleString()}</p>
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
            const loanId = this.getAttribute('data-id');
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
            const loanId = this.getAttribute('data-id');
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
        button.addEventListener('click', function () {
            if (!currentUser) {
                showNotification('Please login to invest');
                document.getElementById('login-modal').style.display = 'flex';
                return;
            }
            const loanId = this.getAttribute('data-id');
            showInvestModal(loanId);
        });
    });
}

function showLoanDetails(loanId) {
    const loan = loans.find(l => l.id == loanId);
    if (!loan) return;
    
    const monthlyPayment = loan.monthly_payment;
    const progress = (loan.funded / loan.amount) * 100;
    const totalRepayment = monthlyPayment * loan.term;
    const totalInterest = totalRepayment - loan.amount;
    
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
                    <a href="${loan.documents.aadhaar.url}" target="_blank" class="view-document" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; text-decoration: none;">
                        <i class="fas fa-external-link-alt"></i> View
                    </a>
                </div>
                <div class="document-item">
                    <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                    <div class="document-info">
                        <div class="document-name">Signed Undertaking</div>
                        <div class="document-meta">${loan.documents.undertaking.name}</div>
                    </div>
                    <a href="${loan.documents.undertaking.url}" target="_blank" class="view-document" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; text-decoration: none;">
                        <i class="fas fa-external-link-alt"></i> View
                    </a>
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
            <p><strong>Monthly Payment:</strong> ₹${monthlyPayment.toLocaleString()}</p>
            <p><strong>Total Repayment:</strong> ₹${totalRepayment.toLocaleString()}</p>
            <p><strong>Total Interest:</strong> ₹${totalInterest.toLocaleString()}</p>
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
    `;
    
    document.getElementById('loan-detail-modal').style.display = 'flex';
}

function showInvestModal(loanId) {
    const loan = loans.find(l => l.id == loanId);
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
    document.getElementById('invest-monthly-payment').textContent = `Monthly Payment: ₹${loan.monthly_payment.toLocaleString()}`;

    document.getElementById('invest-form').setAttribute('data-loan-id', loanId);
    document.getElementById('invest-modal').style.display = 'flex';
}

// ============================================
// INVESTMENT WITH RAZORPAY
// ============================================

async function investInLoan(loanId, amount, paymentResponse) {
    const loan = loans.find(l => l.id == loanId);
    if (!loan) return;
    
    try {
        // Update loan
        const newFunded = loan.funded + parseInt(amount);
        const newStatus = newFunded >= loan.amount ? 'funded' : 'active';
        
        const newInvestors = [...(loan.investors || []), {
            investor: currentUser.username,
            amount: parseInt(amount),
            paymentId: paymentResponse.razorpay_payment_id,
            date: new Date().toISOString()
        }];
        
        // Update loan in database
        const { error: loanError } = await supabase
            .from('loans')
            .update({
                funded: newFunded,
                status: newStatus,
                investors: newInvestors
            })
            .eq('id', loanId);
        
        if (loanError) throw loanError;
        
        // Update user balance
        const newBalance = currentUser.balance - parseInt(amount);
        const { error: userError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', currentUser.id);
        
        if (userError) throw userError;
        
        // Create investment record
        const investment = {
            loan_id: loanId,
            investor: currentUser.username,
            investor_id: currentUser.id,
            amount: parseInt(amount),
            date: new Date().toISOString().split('T')[0],
            expected_return: Math.round(parseInt(amount) * (1 + 8 / 100 * loan.term / 12)),
            status: 'active',
            payment_id: paymentResponse.razorpay_payment_id,
            payment_method: 'Razorpay',
            created_at: new Date().toISOString()
        };
        
        const { error: invError } = await supabase
            .from('investments')
            .insert([investment]);
        
        if (invError) throw invError;
        
        // Update local user balance
        currentUser.balance = newBalance;
        
        document.getElementById('invest-modal').style.display = 'none';
        
        showNotification(`Successfully invested ₹${amount} in ${loan.purpose}!`);
        
        // Refresh data
        await loadLoansRealtime();
        await loadInvestmentsRealtime();
        
    } catch (error) {
        console.error('Investment error:', error);
        showNotification('Investment failed: ' + error.message);
    }
}

document.getElementById('razorpay-pay-btn')?.addEventListener('click', function () {
    if (!currentUser) {
        showNotification('Please login first');
        document.getElementById('invest-modal').style.display = 'none';
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    
    const amount = document.getElementById('invest-amount').value;
    const loanId = document.getElementById('invest-form').getAttribute('data-loan-id');
    const loan = loans.find(l => l.id == loanId);
    
    if (!amount || amount < 1000) {
        showNotification('Please enter minimum investment amount of ₹1000');
        return;
    }
    
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
        amount: amount * 100,
        currency: 'INR',
        name: 'FriendFunds',
        description: `Investment in ${loan.purpose}`,
        image: 'https://friendfunds.in/logo.png',
        handler: function (response) {
            investInLoan(loanId, amount, response);
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
            ondismiss: function () {
                showNotification('Payment cancelled');
            }
        }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
});

// ============================================
// USER DASHBOARD FUNCTIONS
// ============================================

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
            const element = document.createElement('div');
            element.className = 'loan-request';
            element.innerHTML = `
                <h4>${loan.purpose}</h4>
                <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
                <p><strong>Funded:</strong> ${progress.toFixed(1)}%</p>
                <p><strong>Term:</strong> ${loan.term} months</p>
                <p><strong>Monthly Payment:</strong> ₹${loan.monthly_payment.toLocaleString()}</p>
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
                const loanId = this.getAttribute('data-id');
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
            const loan = loans.find(l => l.id == investment.loan_id);
            if (!loan) return;
            const element = document.createElement('div');
            element.className = 'investment-opportunity';
            element.innerHTML = `
                <h4>${loan.purpose} by ${loan.borrower}</h4>
                <p><strong>Invested Amount:</strong> ₹${investment.amount.toLocaleString()}</p>
                <p><strong>Expected Return:</strong> ₹${investment.expected_return?.toLocaleString()}</p>
                <p><strong>Payment Method:</strong> ${investment.payment_method || 'Wallet'}</p>
                ${investment.payment_id ? `<p><small>Payment ID: ${investment.payment_id}</small></p>` : ''}
                <p><strong>Status:</strong> <span style="color: ${investment.status === 'active' ? '#2ecc71' : '#3498db'}; font-weight: 500;">${investment.status}</span></p>
            `;
            userInvestmentsContainer.appendChild(element);
        });
    }

    // Render user profile
    const totalInvested = userInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalBorrowed = userLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const kycBadge = currentUser.kyc_status === 'verified' ?
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
        </div>
        <div style="margin-top: 1.5rem;">
            <button class="btn btn-danger" id="logout-btn">Logout</button>
        </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            logout();
        });
    }
}

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
                        <a href="${loan.documents.aadhaar.url}" target="_blank" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; text-decoration: none;">
                            <i class="fas fa-external-link-alt"></i> View
                        </a>
                    </div>
                    
                    <div class="document-item">
                        <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                        <div class="document-info">
                            <div class="document-name">Signed Undertaking</div>
                            <div class="document-meta">${loan.documents.undertaking.name}</div>
                        </div>
                        <a href="${loan.documents.undertaking.url}" target="_blank" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; text-decoration: none;">
                            <i class="fas fa-external-link-alt"></i> View
                        </a>
                    </div>
                </div>
            `;
        }
    });

    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// UI FUNCTIONS
// ============================================

function showSection(target) {
    if (target === 'dashboard' && !currentUser) {
        showNotification('Please login first to access the dashboard');
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    // Hide all sections
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });

    // Show target section
    if (target === 'home') {
        document.querySelector('.hero').style.display = 'block';
        document.querySelector('.features').style.display = 'block';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('user-dashboard').style.display = 'none';
    } else if (target === 'dashboard') {
        document.getElementById('user-dashboard').style.display = 'block';
        document.querySelector('.hero').style.display = 'none';
        document.querySelector('.features').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
        renderUserDashboard();
        renderUserDocuments();
    }

    // Close mobile menu
    document.querySelector('.nav-links')?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

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

function updateUIAfterLogin() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.textContent = 'Logout';
        loginBtn.removeEventListener('click', loginBtn.click);
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }
    showSection('dashboard');
}

// ============================================
// INITIALIZE THE PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Starting FriendFunds with Supabase Storage...");
    
    // DOM Elements
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const loanDetailModal = document.getElementById('loan-detail-modal');
    const investModal = document.getElementById('invest-modal');
    const agreementModal = document.getElementById('loan-agreement-modal');
    const successModal = document.getElementById('upload-success-modal');
    const getStartedBtn = document.getElementById('get-started-btn');
    const learnMoreBtn = document.getElementById('learn-more-btn');
    const registerLink = document.getElementById('register-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');
    const closeButtons = document.querySelectorAll('.close');
    const navLinks = document.querySelectorAll('.nav-link');
    const tabs = document.querySelectorAll('.tab');
    const menuToggle = document.querySelector('.menu-toggle');
    const passwordToggles = document.querySelectorAll('.password-toggle');
    const cancelBtn = document.getElementById('cancel-agreement');
    const closeAgreement = document.getElementById('close-agreement');
    const successOkBtn = document.getElementById('success-ok-btn');
    const closeSuccess = document.getElementById('close-success');

    // Initialize file upload handlers
    initFileUploadHandlers();

    // Check saved user
    checkSavedUser();

    // Load data from Supabase
    setTimeout(() => {
        loadLoansRealtime();
        loadInvestmentsRealtime();
        loadUsers();
        initializeSampleData();
    }, 1000);

    // Initial render
    renderLoanRequests();
    renderInvestmentOpportunities();

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
        });
    });

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
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            if (tabId === 'documents' && currentUser) {
                renderUserDocuments();
            }
        });
    });

    // Cancel agreement button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            agreementModal.style.display = 'none';
            resetUploads();
        });
    }

    // Close agreement button
    if (closeAgreement) {
        closeAgreement.addEventListener('click', function () {
            agreementModal.style.display = 'none';
            resetUploads();
        });
    }

    // Success OK button
    if (successOkBtn) {
        successOkBtn.addEventListener('click', function () {
            successModal.style.display = 'none';
        });
    }

    // Close success button
    if (closeSuccess) {
        closeSuccess.addEventListener('click', function () {
            successModal.style.display = 'none';
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
    });
    
    console.log("✅ FriendFunds with Supabase Storage Ready!");
});
