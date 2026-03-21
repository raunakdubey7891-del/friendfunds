// =============================================
// FriendFunds — script.js (Supabase version)
// =============================================

// ── Supabase client ──────────────────────────────────────────
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://hnyghcigcypjdqgjzgle.supabase.co';   
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueWdoY2lnY3lwamRxZ2p6Z2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzY3MTYsImV4cCI6MjA4OTY1MjcxNn0.2HHKB8qc6YrZ0eZXGNjygLq6CsOz9yCa8PRWWdp6WVs';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── In-memory cache (populated from DB on load) ───────────────
let users       = [];
let loans       = [];
let investments = [];

// ── Global state ──────────────────────────────────────────────
let currentUser = null;
let updateInterval;
let uploadedFiles = { aadhaar: null, undertaking: null };

const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_HERE';

// ── Supabase helpers ──────────────────────────────────────────

async function fetchAll() {
  const [u, l, i] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('loans').select('*, loan_investors(*)'),
    supabase.from('investments').select('*'),
  ]);
  if (u.data) users       = u.data;
  if (l.data) loans       = l.data.map(normalizeLoan);
  if (i.data) investments = i.data.map(normalizeInvestment);
}

// Map DB snake_case → camelCase used throughout the UI
function normalizeLoan(l) {
  return {
    id:               l.id,
    borrower:         l.borrower_username,
    purpose:          l.purpose,
    amount:           Number(l.amount),
    term:             l.term,
    interest:         Number(l.interest),
    status:           l.status,
    date:             l.date,
    monthlyPayment:   Number(l.monthly_payment),
    funded:           Number(l.funded),
    investors:        (l.loan_investors || []).map(inv => ({
      investor:  inv.investor_username,
      amount:    Number(inv.amount),
      paymentId: inv.payment_id,
    })),
    documents: l.aadhaar_path ? {
      aadhaar: {
        name:    l.aadhaar_name,
        size:    l.aadhaar_size,
        path:    l.aadhaar_path,
      },
      undertaking: {
        name:    l.undertaking_name,
        size:    l.undertaking_size,
        path:    l.undertaking_path,
      },
      agreementAccepted: l.agreement_accepted,
      agreementDate:     l.agreement_date,
    } : null,
    agreementAccepted: l.agreement_accepted,
  };
}

function normalizeInvestment(i) {
  return {
    id:             i.id,
    loanId:         i.loan_id,
    investor:       i.investor_username,
    amount:         Number(i.amount),
    expectedReturn: Number(i.expected_return),
    status:         i.status,
    paymentId:      i.payment_id,
    paymentMethod:  i.payment_method,
    date:           i.date,
  };
}

// Upload a file to Supabase Storage and return its path
async function uploadDocument(file, username, loanPurpose, docType) {
  const ext  = file.name.split('.').pop();
  const path = `${username}/${Date.now()}_${docType}.${ext}`;
  const { error } = await supabase.storage
    .from('kyc-documents')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

// Get a signed URL (valid 60 min) to view a private document
async function getDocumentUrl(path) {
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {

  // Restore session from sessionStorage (not localStorage — security improvement)
  const savedUser = sessionStorage.getItem('ff_currentUser');
  if (savedUser) {
    try { currentUser = JSON.parse(savedUser); } catch (_) {}
  }
  // Also check localStorage for "remember me"
  const remembered = localStorage.getItem('ff_currentUser');
  if (!currentUser && remembered) {
    try { currentUser = JSON.parse(remembered); } catch (_) {}
  }

  // Load data from Supabase
  showLoading(true);
  await fetchAll();
  showLoading(false);

  if (currentUser) {
    // Sync currentUser with fresh DB data
    currentUser = users.find(u => u.id === currentUser.id) || currentUser;
    updateUIAfterLogin();
    showNotification(`Welcome back, ${currentUser.username}!`);
  }

  renderLoanRequests();
  renderInvestmentOpportunities();
  startRealTimeUpdates();

  // ── DOM refs ────────────────────────────────────────────────
  const loginBtn            = document.getElementById('login-btn');
  const loginModal          = document.getElementById('login-modal');
  const registerModal       = document.getElementById('register-modal');
  const forgotPasswordModal = document.getElementById('forgot-password-modal');
  const loanDetailModal     = document.getElementById('loan-detail-modal');
  const investModal         = document.getElementById('invest-modal');
  const agreementModal      = document.getElementById('loan-agreement-modal');
  const successModal        = document.getElementById('upload-success-modal');
  const documentViewerModal = document.getElementById('document-viewer-modal');
  const getStartedBtn       = document.getElementById('get-started-btn');
  const learnMoreBtn        = document.getElementById('learn-more-btn');
  const registerLink        = document.getElementById('register-link');
  const forgotPasswordLink  = document.getElementById('forgot-password-link');
  const backToLoginLink     = document.getElementById('back-to-login');
  const closeButtons        = document.querySelectorAll('.close');
  const navLinks            = document.querySelectorAll('.nav-link');
  const tabs                = document.querySelectorAll('.tab');
  const tabContents         = document.querySelectorAll('.tab-content');
  const loginForm           = document.getElementById('login-form');
  const registerForm        = document.getElementById('register-form');
  const forgotPasswordForm  = document.getElementById('forgot-password-form');
  const loanRequestForm     = document.getElementById('loan-request-form');
  const agreementForm       = document.getElementById('loan-agreement-form');
  const menuToggle          = document.querySelector('.menu-toggle');
  const passwordToggles     = document.querySelectorAll('.password-toggle');
  const rememberMeCheckbox  = document.getElementById('remember-me');
  const razorpayPayBtn      = document.getElementById('razorpay-pay-btn');
  const closeDocumentViewer = document.getElementById('close-document-viewer');

  initFileUploadHandlers();

  // ── Buttons / nav ────────────────────────────────────────────

  if (loginBtn) {
    loginBtn.addEventListener('click', e => {
      e.preventDefault();
      loginModal.style.display = 'flex';
    });
  }

  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', e => {
      e.preventDefault();
      currentUser ? showSection('dashboard') : (loginModal.style.display = 'flex');
    });
  }

  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (registerLink) {
    registerLink.addEventListener('click', e => {
      e.preventDefault();
      loginModal.style.display = 'none';
      registerModal.style.display = 'flex';
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', e => {
      e.preventDefault();
      loginModal.style.display = 'none';
      forgotPasswordModal.style.display = 'flex';
    });
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', e => {
      e.preventDefault();
      forgotPasswordModal.style.display = 'none';
      loginModal.style.display = 'flex';
    });
  }

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      [loginModal, registerModal, forgotPasswordModal, loanDetailModal,
       investModal, agreementModal, successModal, documentViewerModal]
        .forEach(m => { if (m) m.style.display = 'none'; });
    });
  });

  if (closeDocumentViewer) {
    closeDocumentViewer.addEventListener('click', () => {
      documentViewerModal.style.display = 'none';
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showSection(link.getAttribute('data-target'));
    });
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      const tabId = this.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      this.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
      if (tabId === 'documents' && currentUser) renderUserDocuments();
    });
  });

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.querySelector('.nav-links').classList.toggle('active');
    });
  }

  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', function () {
      const input = this.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      this.innerHTML = input.type === 'password'
        ? '<i class="far fa-eye"></i>'
        : '<i class="far fa-eye-slash"></i>';
    });
  });

  window.addEventListener('click', e => {
    [loginModal, registerModal, forgotPasswordModal, loanDetailModal,
     investModal, agreementModal, successModal, documentViewerModal]
      .forEach(m => { if (e.target === m) m.style.display = 'none'; });
  });

  document.getElementById('cancel-agreement')?.addEventListener('click', () => {
    agreementModal.style.display = 'none';
  });
  document.getElementById('close-agreement')?.addEventListener('click', () => {
    agreementModal.style.display = 'none';
  });
  document.getElementById('success-ok-btn')?.addEventListener('click', () => {
    successModal.style.display = 'none';
  });
  document.getElementById('close-success')?.addEventListener('click', () => {
    successModal.style.display = 'none';
  });

  // ── Login form ────────────────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const usernameOrEmail = document.getElementById('username').value.trim();
      const password        = document.getElementById('password').value;
      const rememberMe      = rememberMeCheckbox?.checked || false;

      showLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
        .eq('password_hash', password)
        .single();
      showLoading(false);

      if (error || !data) {
        showNotification('Invalid username/email or password');
        return;
      }

      currentUser = data;
      sessionStorage.setItem('ff_currentUser', JSON.stringify(currentUser));
      if (rememberMe) localStorage.setItem('ff_currentUser', JSON.stringify(currentUser));

      updateUIAfterLogin();
      loginModal.style.display = 'none';
      loginForm.reset();
      showNotification('Login successful!');
    });
  }

  // ── Register form ─────────────────────────────────────────────
  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const username        = document.getElementById('new-username').value.trim();
      const password        = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const email           = document.getElementById('email').value.trim();

      if (password !== confirmPassword) {
        showNotification('Passwords do not match'); return;
      }

      showLoading(true);
      const { data, error } = await supabase
        .from('users')
        .insert([{ username, email, password_hash: password, balance: 50000, kyc_status: 'pending' }])
        .select()
        .single();
      showLoading(false);

      if (error) {
        if (error.code === '23505') {
          showNotification('Username or email already exists');
        } else {
          showNotification('Registration failed: ' + error.message);
        }
        return;
      }

      users.push(data);
      registerModal.style.display = 'none';
      registerForm.reset();
      showNotification('Registration successful! Please login.');
      document.getElementById('username').value = username;
      loginModal.style.display = 'flex';
    });
  }

  // ── Forgot password ───────────────────────────────────────────
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('reset-email').value.trim();

      showLoading(true);
      const { data } = await supabase
        .from('users')
        .select('password_hash')
        .eq('email', email)
        .single();
      showLoading(false);

      if (data) {
        // In production send a real email; here we mimic original behaviour
        showNotification(`Password recovery: your password is ${data.password_hash}`);
        forgotPasswordModal.style.display = 'none';
        loginModal.style.display = 'flex';
      } else {
        showNotification('No account found with that email address');
      }
    });
  }

  // ── Loan request form ─────────────────────────────────────────
  if (loanRequestForm) {
    loanRequestForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentUser) {
        showNotification('Please login to create a loan request');
        loginModal.style.display = 'flex';
        return;
      }

      const purpose  = document.getElementById('purpose').value;
      const amount   = parseInt(document.getElementById('amount').value);
      const term     = parseInt(document.getElementById('term').value);
      const r        = 8 / 12 / 100;
      const monthly  = Math.round(amount * r * Math.pow(1 + r, term) / (Math.pow(1 + r, term) - 1));

      document.getElementById('agreement-purpose').value        = purpose;
      document.getElementById('agreement-amount').value         = amount;
      document.getElementById('agreement-term').value           = term;
      document.getElementById('agreement-monthly-payment').value = monthly;

      document.getElementById('summary-purpose').textContent = purpose;
      document.getElementById('summary-amount').textContent  = amount.toLocaleString();
      document.getElementById('summary-term').textContent    = term;
      document.getElementById('summary-monthly').textContent = monthly.toLocaleString();

      resetUploads();
      if (agreementModal) agreementModal.style.display = 'flex';
    });
  }

  // ── Agreement form ─────────────────────────────────────────────
  if (agreementForm) {
    agreementForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!uploadedFiles.aadhaar)     { showNotification('Please upload your Aadhaar card'); return; }
      if (!uploadedFiles.undertaking) { showNotification('Please upload signed undertaking'); return; }
      if (!document.getElementById('agree-terms').checked) {
        showNotification('Please agree to the terms and conditions'); return;
      }
      if (!currentUser) {
        showNotification('Please login first');
        agreementModal.style.display = 'none';
        loginModal.style.display = 'flex';
        return;
      }

      const purpose       = document.getElementById('agreement-purpose').value;
      const amount        = parseInt(document.getElementById('agreement-amount').value);
      const term          = parseInt(document.getElementById('agreement-term').value);
      const monthlyPayment = parseInt(document.getElementById('agreement-monthly-payment').value);

      showLoading(true);

      try {
        // 1. Upload files to Supabase Storage
        const aadhaarPath     = await uploadDocument(uploadedFiles.aadhaar,     currentUser.username, purpose, 'aadhaar');
        const undertakingPath = await uploadDocument(uploadedFiles.undertaking,  currentUser.username, purpose, 'undertaking');

        // 2. Insert loan row
        const { data: newLoan, error: loanErr } = await supabase
          .from('loans')
          .insert([{
            borrower_username:  currentUser.username,
            purpose,
            amount,
            term,
            interest:           8,
            status:             'active',
            date:               new Date().toISOString().split('T')[0],
            monthly_payment:    monthlyPayment,
            funded:             0,
            agreement_accepted: true,
            agreement_date:     new Date().toISOString(),
            aadhaar_name:       uploadedFiles.aadhaar.name,
            aadhaar_size:       uploadedFiles.aadhaar.size,
            aadhaar_path:       aadhaarPath,
            undertaking_name:   uploadedFiles.undertaking.name,
            undertaking_size:   uploadedFiles.undertaking.size,
            undertaking_path:   undertakingPath,
          }])
          .select()
          .single();

        if (loanErr) throw loanErr;

        // 3. Update user KYC status
        await supabase
          .from('users')
          .update({ kyc_status: 'verified' })
          .eq('id', currentUser.id);

        currentUser.kyc_status = 'verified';
        sessionStorage.setItem('ff_currentUser', JSON.stringify(currentUser));
        if (localStorage.getItem('ff_currentUser'))
          localStorage.setItem('ff_currentUser', JSON.stringify(currentUser));

        // 4. Refresh cache
        await fetchAll();

        showLoading(false);
        agreementModal.style.display = 'none';

        // Show success modal
        const successSummary = document.getElementById('success-document-summary');
        if (successSummary) {
          successSummary.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <i class="fas fa-id-card" style="color:#3498db;width:20px;"></i>
              <span style="font-size:0.9rem;">Aadhaar: <strong>${uploadedFiles.aadhaar.name}</strong></span>
              <button onclick="viewStorageDocument('${aadhaarPath}')" style="background:#3498db;color:white;border:none;padding:5px 10px;border-radius:4px;margin-left:auto;cursor:pointer;">
                <i class="fas fa-external-link-alt"></i> View
              </button>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <i class="fas fa-file-pdf" style="color:#e74c3c;width:20px;"></i>
              <span style="font-size:0.9rem;">Undertaking: <strong>${uploadedFiles.undertaking.name}</strong></span>
              <button onclick="viewStorageDocument('${undertakingPath}')" style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:4px;margin-left:auto;cursor:pointer;">
                <i class="fas fa-external-link-alt"></i> View
              </button>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <i class="fas fa-check-circle" style="color:#2ecc71;width:20px;"></i>
              <span style="font-size:0.9rem;">Documents uploaded to Supabase Storage</span>
            </div>
          `;
        }
        if (successModal) successModal.style.display = 'flex';

        renderLoanRequests();
        renderInvestmentOpportunities();
        showNotification('Loan request created with documents successfully!');

      } catch (err) {
        showLoading(false);
        showNotification('Error submitting loan: ' + err.message);
      }
    });
  }

  // ── Razorpay payment button ────────────────────────────────────
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
        showNotification('Please enter minimum investment amount of ₹1000'); return;
      }

      const loanId = document.getElementById('invest-form').getAttribute('data-loan-id');
      const loan   = loans.find(l => l.id === loanId);
      if (!loan) { showNotification('Loan not found'); return; }

      const remaining = loan.amount - loan.funded;
      if (amount > remaining) {
        showNotification(`Amount exceeds remaining loan amount of ₹${remaining}`); return;
      }
      if (amount > currentUser.balance) {
        showNotification('Insufficient balance.'); return;
      }

      const options = {
        key:         RAZORPAY_KEY_ID,
        amount:      amount * 100,
        currency:    'INR',
        name:        'FriendFunds',
        description: `Investment in ${loan.purpose}`,
        handler: function (response) {
          processInvestment(loanId, amount, response);
        },
        prefill: { name: currentUser.username, email: currentUser.email },
        theme:   { color: '#3498db' },
        modal:   { ondismiss: () => showNotification('Payment cancelled') },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    });
  }
});

// ── Open document from Supabase Storage ─────────────────────────
window.viewStorageDocument = async function (path) {
  try {
    showLoading(true);
    const url = await getDocumentUrl(path);
    showLoading(false);
    window.open(url, '_blank');
  } catch (err) {
    showLoading(false);
    showNotification('Could not load document: ' + err.message);
  }
};

// Keep backward-compatible openDocumentInBrowser used in detail modals
window.openDocumentInBrowser = async function (docType, loanId) {
  const loan = loans.find(l => l.id === loanId);
  if (!loan?.documents) return;
  const path = loan.documents[docType]?.path;
  if (!path) { showNotification('Document path not found'); return; }
  await window.viewStorageDocument(path);
};

// ── Process investment (called after Razorpay success) ───────────
async function processInvestment(loanId, amount, paymentResponse) {
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;

  const intAmount     = parseInt(amount);
  const newFunded     = loan.funded + intAmount;
  const newStatus     = newFunded >= loan.amount ? 'funded' : 'active';
  const expectedReturn = Math.round(intAmount * (1 + 8 / 100 * loan.term / 12));

  showLoading(true);

  try {
    // 1. Update loan funded amount
    await supabase.from('loans')
      .update({ funded: newFunded, status: newStatus })
      .eq('id', loanId);

    // 2. Insert investment record
    await supabase.from('investments').insert([{
      loan_id:          loanId,
      investor_username: currentUser.username,
      amount:           intAmount,
      expected_return:  expectedReturn,
      status:           'active',
      payment_id:       paymentResponse.razorpay_payment_id,
      payment_method:   'Razorpay',
      date:             new Date().toISOString().split('T')[0],
    }]);

    // 3. Insert into loan_investors
    await supabase.from('loan_investors').insert([{
      loan_id:           loanId,
      investor_username: currentUser.username,
      amount:            intAmount,
      payment_id:        paymentResponse.razorpay_payment_id,
    }]);

    // 4. Deduct balance from investor
    const newBalance = currentUser.balance - intAmount;
    await supabase.from('users')
      .update({ balance: newBalance })
      .eq('id', currentUser.id);
    currentUser.balance = newBalance;
    sessionStorage.setItem('ff_currentUser', JSON.stringify(currentUser));
    if (localStorage.getItem('ff_currentUser'))
      localStorage.setItem('ff_currentUser', JSON.stringify(currentUser));

    // 5. Refresh cache
    await fetchAll();
    showLoading(false);

    document.getElementById('invest-modal').style.display = 'none';
    renderLoanRequests();
    renderInvestmentOpportunities();

    if (document.getElementById('user-dashboard').style.display === 'block') {
      renderUserDashboard();
    }

    showNotification(`Successfully invested ₹${amount} via Razorpay! ID: ${paymentResponse.razorpay_payment_id}`);

  } catch (err) {
    showLoading(false);
    showNotification('Investment error: ' + err.message);
  }
}

// ── File upload handlers ─────────────────────────────────────────
function initFileUploadHandlers() {
  ['aadhaar', 'undertaking'].forEach(type => {
    const input = document.getElementById(`${type}-upload`);
    const area  = document.getElementById(`${type}-upload-area`);
    if (!input || !area) return;

    area.addEventListener('click', e => {
      if (!e.target.classList.contains('remove-file')) input.click();
    });
    input.addEventListener('change', e => handleFileUpload(e.target.files[0], type));
    area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = '#f39c12'; });
    area.addEventListener('dragleave', e => { e.preventDefault(); area.style.borderColor = '#3498db'; });
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.style.borderColor = '#3498db';
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file, type);
    });
  });
}

function handleFileUpload(file, type) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showNotification('File size should be less than 5MB'); return; }

  if (type === 'aadhaar') {
    const valid = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!valid.includes(file.type)) { showNotification('Please upload PDF, JPG, or PNG for Aadhaar'); return; }
    uploadedFiles.aadhaar = file;
  } else {
    if (file.type !== 'application/pdf') { showNotification('Please upload PDF for undertaking'); return; }
    uploadedFiles.undertaking = file;
  }
  updateFilePreview(file, type);
}

function updateFilePreview(file, type) {
  const preview = document.getElementById(`${type}-preview`);
  const area    = document.getElementById(`${type}-upload-area`);
  if (!preview || !area) return;

  const fileSize = (file.size / 1024).toFixed(2);
  const fileExt  = file.type.split('/').pop().toUpperCase();

  preview.innerHTML = `
    <i class="fas ${type === 'aadhaar' ? 'fa-id-card' : 'fa-file-pdf'}" style="font-size:2rem;color:#2ecc71;"></i>
    <div class="file-info">
      <strong>${file.name.length > 30 ? file.name.substring(0, 30) + '…' : file.name}</strong><br>
      <span style="font-size:0.85rem;color:#666;">${fileExt} • ${fileSize} KB</span>
    </div>
    <div class="remove-file" onclick="removeFile('${type}')">
      <i class="fas fa-times-circle"></i> Remove
    </div>
  `;
  area.classList.add('has-file');
}

window.removeFile = function (type) {
  uploadedFiles[type] = null;
  document.getElementById(`${type}-upload`).value = '';
  const area    = document.getElementById(`${type}-upload-area`);
  const preview = document.getElementById(`${type}-preview`);
  if (area) area.classList.remove('has-file');
  if (preview) {
    if (type === 'aadhaar') {
      preview.innerHTML = `
        <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:#3498db;"></i>
        <p style="margin:5px 0;font-size:0.9rem;">Click to upload Aadhaar</p>
        <p style="margin:0;font-size:0.75rem;color:#666;">PDF, JPG, PNG (Max 5MB)</p>`;
    } else {
      preview.innerHTML = `
        <i class="fas fa-file-pdf" style="font-size:2rem;color:#e74c3c;"></i>
        <p style="margin:5px 0;font-size:0.9rem;">Click to upload undertaking</p>
        <p style="margin:0;font-size:0.75rem;color:#666;">PDF only (Max 5MB)</p>`;
    }
  }
};

function resetUploads() {
  uploadedFiles = { aadhaar: null, undertaking: null };
  ['aadhaar', 'undertaking'].forEach(type => window.removeFile(type));
}

// ── Show / hide loading overlay ───────────────────────────────────
function showLoading(visible) {
  let el = document.getElementById('ff-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ff-loading';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;align-items:center;justify-content:center;';
    el.innerHTML = '<div style="background:white;padding:2rem 3rem;border-radius:12px;font-weight:600;font-size:1.1rem;color:#2c3e50;"><i class="fas fa-spinner fa-spin" style="margin-right:10px;color:#3498db;"></i>Loading…</div>';
    document.body.appendChild(el);
  }
  el.style.display = visible ? 'flex' : 'none';
}

// ── Navigation ────────────────────────────────────────────────────
function showSection(target) {
  if (target === 'dashboard' && !currentUser) {
    showNotification('Please login first to access the dashboard');
    document.getElementById('login-modal').style.display = 'flex';
    return;
  }

  document.querySelectorAll('section').forEach(s => s.style.display = 'none');

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

// ── Notification ──────────────────────────────────────────────────
function showNotification(message) {
  const n = document.getElementById('notification');
  const t = document.getElementById('notification-text');
  if (n && t) {
    t.textContent = message;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 3500);
  }
}

// ── Update UI after login ─────────────────────────────────────────
function updateUIAfterLogin() {
  const loginBtn = document.getElementById('login-btn');
  if (!loginBtn) return;
  loginBtn.textContent = 'Logout';
  const clone = loginBtn.cloneNode(true);
  loginBtn.replaceWith(clone);
  clone.addEventListener('click', e => {
    e.preventDefault();
    currentUser = null;
    sessionStorage.removeItem('ff_currentUser');
    localStorage.removeItem('ff_currentUser');
    clone.textContent = 'Login';
    document.getElementById('user-dashboard').style.display = 'none';
    showSection('home');
    showNotification('Logged out successfully');
    clone.addEventListener('click', ev => {
      ev.preventDefault();
      document.getElementById('login-modal').style.display = 'flex';
    });
  });
}

// ── Render loan requests ──────────────────────────────────────────
function renderLoanRequests() {
  const container = document.getElementById('active-loans-container');
  if (!container) return;

  container.innerHTML = '';
  const activeLoans = loans.filter(l => l.status === 'active');

  if (!activeLoans.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">No active loan requests at the moment.</p>';
    return;
  }

  activeLoans.forEach(loan => {
    const progress   = (loan.funded / loan.amount) * 100;
    const kycStatus  = loan.documents
      ? '<span style="color:#2ecc71;font-size:0.8rem;"><i class="fas fa-check-circle"></i> KYC Done</span>'
      : '<span style="color:#e74c3c;font-size:0.8rem;"><i class="fas fa-times-circle"></i> KYC Pending</span>';

    const el = document.createElement('div');
    el.className = 'loan-request';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h4 style="margin:0;">${loan.purpose} by ${loan.borrower}</h4>
        ${kycStatus}
      </div>
      <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
      <p><strong>Term:</strong> ${loan.term} months</p>
      <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
      <p><strong>Funded:</strong> ${progress.toFixed(1)}% (₹${loan.funded.toLocaleString()})</p>
      <div class="progress-bar"><div class="progress" style="width:${progress}%"></div></div>
      <div style="display:flex;gap:10px;margin-top:15px;">
        <button class="btn btn-primary view-loan" data-id="${loan.id}">View Details</button>
        ${currentUser && currentUser.username !== loan.borrower
          ? `<button class="btn btn-accent invest-btn" data-id="${loan.id}">Invest</button>`
          : ''}
      </div>
    `;
    container.appendChild(el);
  });

  container.querySelectorAll('.view-loan').forEach(b =>
    b.addEventListener('click', () => showLoanDetails(b.getAttribute('data-id'))));
  container.querySelectorAll('.invest-btn').forEach(b =>
    b.addEventListener('click', () => {
      if (!currentUser) {
        showNotification('Please login to invest');
        document.getElementById('login-modal').style.display = 'flex';
        return;
      }
      showInvestModal(b.getAttribute('data-id'));
    }));
}

// ── Render investment opportunities ───────────────────────────────
function renderInvestmentOpportunities() {
  const container = document.getElementById('investment-opportunities-container');
  if (!container) return;

  container.innerHTML = '';
  const opps = loans.filter(l => l.status === 'active' && l.funded < l.amount);

  if (!opps.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">No investment opportunities at the moment.</p>';
    return;
  }

  opps.forEach(loan => {
    const remaining = loan.amount - loan.funded;
    const progress  = (loan.funded / loan.amount) * 100;
    const kycStatus = loan.documents
      ? '<span style="color:#2ecc71;"><i class="fas fa-check-circle"></i> KYC Verified</span>'
      : '<span style="color:#e74c3c;"><i class="fas fa-times-circle"></i> KYC Pending</span>';

    const el = document.createElement('div');
    el.className = 'investment-opportunity';
    el.innerHTML = `
      <h4>${loan.purpose} by ${loan.borrower}</h4>
      <p><strong>Amount Needed:</strong> ₹${remaining.toLocaleString()}</p>
      <p><strong>Expected Return:</strong> 8% per annum</p>
      <p><strong>KYC Status:</strong> ${kycStatus}</p>
      <div class="progress-bar"><div class="progress" style="width:${progress}%"></div></div>
      <button class="btn btn-accent invest-btn" data-id="${loan.id}" style="margin-top:15px;">Invest Now</button>
    `;
    container.appendChild(el);
  });

  container.querySelectorAll('.invest-btn').forEach(b =>
    b.addEventListener('click', () => {
      if (!currentUser) {
        showNotification('Please login to invest');
        document.getElementById('login-modal').style.display = 'flex';
        return;
      }
      showInvestModal(b.getAttribute('data-id'));
    }));
}

// ── Show loan details modal ────────────────────────────────────────
function showLoanDetails(loanId) {
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;

  const progress       = (loan.funded / loan.amount) * 100;
  const totalRepayment = loan.monthlyPayment * loan.term;
  const totalInterest  = totalRepayment - loan.amount;
  const docStatus      = loan.documents
    ? '<span style="color:#2ecc71;"><i class="fas fa-check-circle"></i> Documents Uploaded</span>'
    : '<span style="color:#e74c3c;"><i class="fas fa-times-circle"></i> Documents Pending</span>';

  let docsHtml = '';
  if (loan.documents) {
    docsHtml = `
      <h4 style="margin-top:1.5rem;">Documents (Click to View)</h4>
      <div class="document-viewer">
        <div class="document-item">
          <i class="fas fa-id-card" style="color:#3498db;"></i>
          <div class="document-info">
            <div class="document-name">Aadhaar Card</div>
            <div class="document-meta">${loan.documents.aadhaar.name} • ${(loan.documents.aadhaar.size / 1024).toFixed(2)} KB</div>
          </div>
          <button onclick="openDocumentInBrowser('aadhaar','${loan.id}')"
            style="background:#3498db;color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;">
            <i class="fas fa-external-link-alt"></i> View
          </button>
        </div>
        <div class="document-item">
          <i class="fas fa-file-pdf" style="color:#e74c3c;"></i>
          <div class="document-info">
            <div class="document-name">Signed Undertaking</div>
            <div class="document-meta">${loan.documents.undertaking.name} • ${(loan.documents.undertaking.size / 1024).toFixed(2)} KB</div>
          </div>
          <button onclick="openDocumentInBrowser('undertaking','${loan.id}')"
            style="background:#e74c3c;color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;">
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
      <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
      <p><strong>Total Repayment:</strong> ₹${totalRepayment.toLocaleString()}</p>
      <p><strong>Total Interest:</strong> ₹${totalInterest.toLocaleString()}</p>
      <p><strong>Status:</strong> <span style="color:${loan.status === 'active' ? '#2ecc71' : '#3498db'};font-weight:500;">${loan.status}</span></p>
      <p><strong>KYC Status:</strong> ${docStatus}</p>
      <p><strong>Funded:</strong> ${progress.toFixed(1)}% (₹${loan.funded.toLocaleString()})</p>
      <div class="progress-bar"><div class="progress" style="width:${progress}%"></div></div>
    </div>
    ${docsHtml}
    <h4 style="margin-top:1.5rem;">Investors</h4>
    ${loan.investors.length
      ? loan.investors.map(inv => `<p>${inv.investor}: ₹${inv.amount.toLocaleString()} ${inv.paymentId ? '<small style="color:#666;">(Razorpay)</small>' : ''}</p>`).join('')
      : '<p>No investors yet</p>'}
    ${currentUser && currentUser.username !== loan.borrower && loan.status === 'active'
      ? `<button class="btn btn-accent invest-btn" data-id="${loan.id}" style="margin-top:1.5rem;">Invest in this Loan</button>`
      : ''}
  `;

  document.getElementById('loan-detail-modal').style.display = 'flex';

  const investBtn = document.querySelector('#loan-detail-content .invest-btn');
  if (investBtn) {
    investBtn.addEventListener('click', () => {
      document.getElementById('loan-detail-modal').style.display = 'none';
      showInvestModal(loanId);
    });
  }
}

// ── Show invest modal ─────────────────────────────────────────────
function showInvestModal(loanId) {
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;
  if (currentUser?.username === loan.borrower) {
    showNotification('You cannot invest in your own loan'); return;
  }

  const remaining = loan.amount - loan.funded;
  const investAmount = document.getElementById('invest-amount');
  if (investAmount) {
    investAmount.value = '';
    investAmount.max   = remaining;
    investAmount.placeholder = `Max: ₹${remaining.toLocaleString()}`;
  }

  document.getElementById('invest-loan-purpose').textContent    = `Purpose: ${loan.purpose}`;
  document.getElementById('invest-loan-amount').textContent     = `Total Amount: ₹${loan.amount.toLocaleString()}`;
  document.getElementById('invest-loan-term').textContent       = `Term: ${loan.term} months`;
  document.getElementById('invest-monthly-payment').textContent = `Monthly Payment: ₹${loan.monthlyPayment.toLocaleString()}`;

  document.getElementById('invest-form').setAttribute('data-loan-id', loanId);
  document.getElementById('invest-modal').style.display = 'flex';
}

// ── Render user dashboard ──────────────────────────────────────────
function renderUserDashboard() {
  if (!currentUser) return;

  const userLoans       = loans.filter(l => l.borrower === currentUser.username);
  const userInvestments = investments.filter(i => i.investor === currentUser.username);

  // Borrowed tab
  const loansContainer = document.getElementById('user-loans-container');
  loansContainer.innerHTML = '';
  if (!userLoans.length) {
    loansContainer.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">You have no active loans.</p>';
  } else {
    userLoans.forEach(loan => {
      const progress = (loan.funded / loan.amount) * 100;
      const el = document.createElement('div');
      el.className = 'loan-request';
      el.innerHTML = `
        <h4>${loan.purpose}</h4>
        <p><strong>Amount:</strong> ₹${loan.amount.toLocaleString()}</p>
        <p><strong>Funded:</strong> ${progress.toFixed(1)}%</p>
        <p><strong>Term:</strong> ${loan.term} months</p>
        <p><strong>Monthly Payment:</strong> ₹${loan.monthlyPayment.toLocaleString()}</p>
        <p><strong>Status:</strong> <span style="color:${loan.status === 'active' ? '#2ecc71' : '#3498db'};font-weight:500;">${loan.status}</span></p>
        <p><strong>Documents:</strong> ${loan.documents
          ? '<span style="color:#2ecc71;"><i class="fas fa-check-circle"></i> Uploaded</span>'
          : '<span style="color:#e74c3c;"><i class="fas fa-times-circle"></i> Pending</span>'}</p>
        <div class="progress-bar"><div class="progress" style="width:${progress}%"></div></div>
        <button class="btn btn-primary view-loan" data-id="${loan.id}" style="margin-top:15px;">View Details</button>
      `;
      loansContainer.appendChild(el);
    });
    loansContainer.querySelectorAll('.view-loan').forEach(b =>
      b.addEventListener('click', () => showLoanDetails(b.getAttribute('data-id'))));
  }

  // Lent/investments tab
  const invContainer = document.getElementById('user-investments-container');
  invContainer.innerHTML = '';
  if (!userInvestments.length) {
    invContainer.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">You have no investments.</p>';
  } else {
    userInvestments.forEach(investment => {
      const loan = loans.find(l => l.id === investment.loanId);
      if (!loan) return;
      const el = document.createElement('div');
      el.className = 'investment-opportunity';
      el.innerHTML = `
        <h4>${loan.purpose} by ${loan.borrower}</h4>
        <p><strong>Invested Amount:</strong> ₹${investment.amount.toLocaleString()}</p>
        <p><strong>Expected Return:</strong> ₹${investment.expectedReturn.toLocaleString()}</p>
        <p><strong>Payment Method:</strong> ${investment.paymentMethod || 'Wallet'}</p>
        ${investment.paymentId ? `<p><small>Payment ID: ${investment.paymentId}</small></p>` : ''}
        <p><strong>Status:</strong> <span style="color:${investment.status === 'active' ? '#2ecc71' : '#3498db'};font-weight:500;">${investment.status}</span></p>
        <button class="btn btn-primary view-investment" data-id="${investment.id}">View Details</button>
      `;
      invContainer.appendChild(el);
    });
    invContainer.querySelectorAll('.view-investment').forEach(b =>
      b.addEventListener('click', () => showInvestmentDetails(b.getAttribute('data-id'))));
  }

  // Profile tab
  const totalInvested  = userInvestments.reduce((s, i) => s + i.amount, 0);
  const totalBorrowed  = userLoans.reduce((s, l) => s + l.amount, 0);
  const kycBadge = currentUser.kyc_status === 'verified'
    ? '<span class="kyc-badge kyc-verified"><i class="fas fa-check-circle"></i> KYC Verified</span>'
    : '<span class="kyc-badge kyc-pending"><i class="fas fa-clock"></i> KYC Pending</span>';

  document.getElementById('user-profile-container').innerHTML = `
    <div class="loan-details">
      <p><strong>Username:</strong> ${currentUser.username}</p>
      <p><strong>Email:</strong> ${currentUser.email}</p>
      <p><strong>Account Balance:</strong> ₹${Number(currentUser.balance).toLocaleString()}</p>
      <p><strong>Active Loans:</strong> ${userLoans.length} (₹${totalBorrowed.toLocaleString()})</p>
      <p><strong>Active Investments:</strong> ${userInvestments.length} (₹${totalInvested.toLocaleString()})</p>
      <p><strong>KYC Status:</strong> ${kycBadge}</p>
    </div>
    <div style="margin-top:1.5rem;">
      <button class="btn btn-danger" id="logout-btn">Logout</button>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('ff_currentUser');
    localStorage.removeItem('ff_currentUser');
    document.getElementById('login-btn').textContent = 'Login';
    document.getElementById('user-dashboard').style.display = 'none';
    showSection('home');
    showNotification('Logged out successfully');
  });
}

// ── Render user documents tab ─────────────────────────────────────
function renderUserDocuments() {
  const container = document.getElementById('user-documents-container');
  if (!container || !currentUser) return;

  const userLoans = loans.filter(l => l.borrower === currentUser.username && l.documents);

  if (!userLoans.length) {
    container.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">No documents uploaded yet.</p>';
    return;
  }

  let html = '<div class="document-viewer">';
  userLoans.forEach(loan => {
    html += `
      <div style="background:#f8f9fa;border-radius:8px;padding:1rem;margin-bottom:1.5rem;">
        <h4 style="margin:0 0 1rem 0;color:#2c3e50;">Loan: ${loan.purpose} (₹${loan.amount.toLocaleString()})</h4>
        <div class="document-item">
          <i class="fas fa-id-card" style="color:#3498db;"></i>
          <div class="document-info">
            <div class="document-name">Aadhaar Card</div>
            <div class="document-meta">${loan.documents.aadhaar.name}</div>
          </div>
          <button onclick="openDocumentInBrowser('aadhaar','${loan.id}')"
            style="background:#3498db;color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;">
            <i class="fas fa-external-link-alt"></i> View
          </button>
        </div>
        <div class="document-item">
          <i class="fas fa-file-pdf" style="color:#e74c3c;"></i>
          <div class="document-info">
            <div class="document-name">Signed Undertaking</div>
            <div class="document-meta">${loan.documents.undertaking.name}</div>
          </div>
          <button onclick="openDocumentInBrowser('undertaking','${loan.id}')"
            style="background:#e74c3c;color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;">
            <i class="fas fa-external-link-alt"></i> View
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ── Show investment details modal ──────────────────────────────────
function showInvestmentDetails(investmentId) {
  const investment = investments.find(i => i.id === investmentId);
  if (!investment) return;
  const loan = loans.find(l => l.id === investment.loanId);
  if (!loan) return;

  const profit       = investment.expectedReturn - investment.amount;
  const roi          = (profit / investment.amount) * 100;
  const monthlyRet   = profit / loan.term;

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
      <p><strong>Expected Total Return:</strong> ₹${investment.expectedReturn.toLocaleString()}</p>
      <p><strong>Expected Profit:</strong> ₹${profit.toLocaleString()}</p>
      <p><strong>ROI:</strong> ${roi.toFixed(2)}%</p>
      <p><strong>Monthly Return:</strong> ₹${monthlyRet.toLocaleString()}</p>
      <p><strong>Status:</strong> <span style="color:${investment.status === 'active' ? '#2ecc71' : '#3498db'};font-weight:500;">${investment.status}</span></p>
    </div>
  `;

  document.getElementById('loan-detail-modal').style.display = 'flex';
}

// ── Real-time polling (every 15 sec) ──────────────────────────────
function startRealTimeUpdates() {
  updateInterval = setInterval(async () => {
    await fetchAll();
    renderLoanRequests();
    renderInvestmentOpportunities();
    if (document.getElementById('user-dashboard').style.display === 'block') {
      renderUserDashboard();
    }
  }, 15000);
}
