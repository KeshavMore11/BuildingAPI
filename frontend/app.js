// Global Application State
const state = {
    apiUrl: localStorage.getItem('gokuldham_apiUrl') || 'http://127.0.0.1:8000',
    token: localStorage.getItem('gokuldham_token') || null,
    user: JSON.parse(localStorage.getItem('gokuldham_user')) || null,
    activeTab: localStorage.getItem('gokuldham_activeTab') || null,
    technicians: []
};

// --- UTILITIES & HELPERS ---

// Base64 JWT Decoder
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("JWT Decode error:", e);
        return null;
    }
}

// Show Custom Toast Alert
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    
    // Auto dismiss
    setTimeout(() => {
        toast.classList.add('slide-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4500);
}

// Generic API Call Wrapper
async function apiCall(endpoint, options = {}) {
    const url = `${state.apiUrl}${endpoint}`;
    const headers = options.headers || {};
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    // Setup JSON Content-Type if payload is plain object
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    
    try {
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            let errorMsg = `HTTP Error ${response.status}`;
            try {
                const errJson = await response.json();
                if (errJson && errJson.detail) {
                    if (Array.isArray(errJson.detail)) {
                        errorMsg = errJson.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
                    } else {
                        errorMsg = errJson.detail;
                    }
                }
            } catch (jsonErr) {}
            
            if (response.status === 401) {
                logout();
                showToast("Session expired or unauthorized. Please login again.", "error");
            }
            throw new Error(errorMsg);
        }
        
        if (response.status === 204) return null;
        return await response.json();
    } catch (err) {
        console.error(`API Call [${endpoint}] failed:`, err);
        throw err;
    }
}

// Image upload preview helper
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    const container = document.getElementById(`${previewId}Container`);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            container.classList.add('active');
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = "";
        container.classList.remove('active');
    }
}

// Date formatter
function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// --- VIEW NAVIGATION & ROUTING ---

function switchAuthTab(tab) {
    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function switchPortalTab(tab) {
    state.activeTab = tab;
    localStorage.setItem('gokuldham_activeTab', tab);
    
    // Update sidebar layout selection
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Find matching link
    const targetLink = Array.from(document.querySelectorAll('.nav-link')).find(link => 
        link.getAttribute('onclick') && link.getAttribute('onclick').includes(tab)
    );
    if (targetLink) targetLink.classList.add('active');
    
    // Update viewport sections
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) {
        targetView.classList.add('active');
    } else {
        console.error(`View container 'view-${tab}' not found`);
    }
    
    // Dispatch data fetches depending on active section
    if (tab === 'my-complaints') {
        loadMyComplaints();
    } else if (tab === 'all-complaints') {
        loadAllComplaints();
    } else if (tab === 'proposals') {
        loadProposals();
    } else if (tab === 'admin-overview') {
        loadAdminOverview();
    } else if (tab === 'admin-complaints') {
        loadAdminComplaints();
    } else if (tab === 'admin-proposals') {
        loadAdminProposals();
    } else if (tab === 'admin-technicians') {
        loadAdminTechnicians();
    }
}

// Renders the workspace and updates navigation depending on role
async function renderAppLayout() {
    if (!state.token || !state.user) {
        // Show auth, hide workspace
        document.getElementById('authView').classList.add('active');
        document.getElementById('appWorkspace').classList.remove('active');
        return;
    }
    
    // Hide auth, show workspace
    document.getElementById('authView').classList.remove('active');
    document.getElementById('appWorkspace').classList.add('active');
    
    // Set up badge labels
    document.getElementById('userNameBadge').innerText = state.user.name || state.user.email;
    document.getElementById('userRoleBadge').innerText = state.user.role === 'admin' ? 'Secretary' : 'Member';
    
    const isAdmin = state.user.role === 'admin';
    document.getElementById('memberNav').style.display = isAdmin ? 'none' : 'flex';
    document.getElementById('adminNav').style.display = isAdmin ? 'flex' : 'none';
    
    // Cache technicians if Admin
    if (isAdmin) {
        try {
            state.technicians = await apiCall('/technicians');
        } catch (err) {
            console.error("Failed to cache technicians:", err);
        }
    }
    
    // Switch to last active tab or fallback
    let defaultTab = isAdmin ? 'admin-overview' : 'my-complaints';
    if (state.activeTab && (
        (isAdmin && ['admin-overview', 'admin-complaints', 'admin-proposals', 'admin-technicians'].includes(state.activeTab)) ||
        (!isAdmin && ['my-complaints', 'file-complaint', 'all-complaints', 'proposals', 'submit-proposal'].includes(state.activeTab))
    )) {
        defaultTab = state.activeTab;
    }
    
    switchPortalTab(defaultTab);
}

// --- AUTHENTICATION FLOWS ---

// Login Handle
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Authenticating...";
    submitBtn.disabled = true;
    
    try {
        const response = await apiCall('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        
        state.token = response.access_token;
        localStorage.setItem('gokuldham_token', response.access_token);
        
        // Decode Token and retrieve User details
        const decoded = decodeJwt(response.access_token);
        
        // Call /auth/me to fetch user full profile
        let userProfile;
        try {
            userProfile = await apiCall('/auth/me');
        } catch (meErr) {
            console.warn("Could not fetch full profile from /auth/me, using token fallback:", meErr);
            if (decoded) {
                userProfile = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    name: decoded.email.split('@')[0]
                };
            } else {
                throw meErr;
            }
        }
        state.user = userProfile;
        localStorage.setItem('gokuldham_user', JSON.stringify(userProfile));
        
        showToast(`Welcome back to Gokuldham, ${userProfile.name}!`, "success");
        await renderAppLayout();
        
        // Reset inputs
        e.target.reset();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

// Registration Handle
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const role = 'member'; // Hardcoded fallback to member role
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Creating profile...";
    submitBtn.disabled = true;
    
    try {
        await apiCall('/auth/register', {
            method: 'POST',
            body: { name, email, password, role }
        });
        
        showToast("Registration successful! Please login with your credentials.", "success");
        switchAuthTab('login');
        
        // Prefill login email
        document.getElementById('loginEmail').value = email;
        e.target.reset();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

// Logout Handle
function logout() {
    state.token = null;
    state.user = null;
    state.activeTab = null;
    localStorage.removeItem('gokuldham_token');
    localStorage.removeItem('gokuldham_user');
    localStorage.removeItem('gokuldham_activeTab');
    
    document.getElementById('authView').classList.add('active');
    document.getElementById('appWorkspace').classList.remove('active');
    showToast("Successfully logged out from portal.", "info");
}

document.getElementById('logoutBtn').addEventListener('click', logout);


// --- MEMBER WORKFLOW LOADER & ACTIONS ---

// Load member's complaints
async function loadMyComplaints() {
    const listContainer = document.getElementById('myComplaintsList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Fetching complaints...</p></div>';
    
    try {
        const complaints = await apiCall('/complaints/my');
        if (complaints.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 012-2" /></svg>
                    <p>No complaints reported. Gokuldham is clean and safe!</p>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = complaints.map(complaint => {
            const statusClass = complaint.status.toLowerCase().replace(" ", "");
            const imageTag = complaint.image_url ? `<img class="item-image" src="${complaint.image_url}" alt="${complaint.title}">` : '';
            return `
                <div class="item-card">
                    <span class="item-badge badge-${statusClass}">${complaint.status}</span>
                    ${imageTag}
                    <h3>${complaint.title}</h3>
                    <p class="description">${complaint.description}</p>
                    <div class="item-meta">
                        <span>Reported: ${formatDate(complaint.created_at)}</span>
                        <span>Staff: ${complaint.assigned_technician ? 'Allocated' : 'Pending'}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

// Load all society complaints (read-only view for all members)
async function loadAllComplaints() {
    const listContainer = document.getElementById('allComplaintsList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Fetching society complaints...</p></div>';
    
    try {
        const complaints = await apiCall('/complaints');
        if (complaints.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p>No complaints have been filed in the society yet.</p>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = complaints.map(complaint => {
            const statusClass = complaint.status.toLowerCase().replace(" ", "");
            const imageTag = complaint.image_url ? `<img class="item-image" src="${complaint.image_url}" alt="${complaint.title}">` : '';
            return `
                <div class="item-card">
                    <span class="item-badge badge-${statusClass}">${complaint.status}</span>
                    ${imageTag}
                    <h3>${complaint.title}</h3>
                    <p class="description">${complaint.description}</p>
                    <div class="item-meta">
                        <span>Reported: ${formatDate(complaint.created_at)}</span>
                        <span>Staff: ${complaint.assigned_technician ? 'Allocated' : 'Pending'}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

// File new complaint
document.getElementById('newComplaintForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('complaintTitle').value.trim();
    const description = document.getElementById('complaintDesc').value.trim();
    const fileInput = document.getElementById('complaintImage');
    
    const submitBtn = document.getElementById('submitComplaintBtn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Filing complaint...";
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        }
        
        await apiCall('/complaints', {
            method: 'POST',
            body: formData
        });
        
        showToast("Maintenance complaint filed successfully!", "success");
        e.target.reset();
        document.getElementById('complaintPreviewContainer').classList.remove('active');
        switchPortalTab('my-complaints');
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

// Load proposals and their polling details
async function loadProposals() {
    const listContainer = document.getElementById('proposalsList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Fetching proposals...</p></div>';
    
    try {
        const proposals = await apiCall('/proposals');
        if (proposals.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    <p>No improvement proposals have been submitted yet.</p>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = proposals.map(proposal => {
            const statusClass = proposal.status.toLowerCase();
            const imageTag = proposal.image_url ? `<img class="item-image" src="${proposal.image_url}" alt="${proposal.title}">` : '';
            
            let pollHtml = '';
            if (proposal.poll_enabled) {
                pollHtml = `
                    <div class="poll-section" id="poll-${proposal.id}">
                        <div class="poll-stats">
                            <span class="favor-label">Favor: Loading...</span>
                            <span class="against-label">Against: Loading...</span>
                        </div>
                        <div class="poll-results-bar">
                            <div class="bar-favor" style="width: 0%"></div>
                            <div class="bar-against" style="width: 0%"></div>
                        </div>
                        <div class="vote-actions">
                            <button class="vote-btn vote-btn-favor" onclick="castVote('${proposal.id}', 'Favor')">👍 Favor</button>
                            <button class="vote-btn vote-btn-against" onclick="castVote('${proposal.id}', 'Against')">👎 Against</button>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="item-card">
                    <span class="item-badge badge-${statusClass}">${proposal.status}</span>
                    ${imageTag}
                    <h3>${proposal.title}</h3>
                    <p class="description">${proposal.description}</p>
                    ${pollHtml}
                    <div class="item-meta">
                        <span>Submitted: ${formatDate(proposal.created_at)}</span>
                        <span>Scope: Public upgrade</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Post-render: Fetch results for active polls asynchronously
        proposals.forEach(proposal => {
            if (proposal.poll_enabled) {
                updatePollResultsUI(proposal.id);
            }
        });
        
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

// Update voting percentages on UI
async function updatePollResultsUI(proposalId) {
    const pollContainer = document.getElementById(`poll-${proposalId}`);
    if (!pollContainer) return;
    
    try {
        const results = await apiCall(`/polls/${proposalId}/results`);
        const total = results.total_votes;
        const favorCount = results.favor;
        const againstCount = results.against;
        
        const favorPct = total > 0 ? (favorCount / total) * 100 : 0;
        const againstPct = total > 0 ? (againstCount / total) * 100 : 0;
        
        pollContainer.querySelector('.favor-label').innerText = `Favor: ${favorCount} (${favorPct.toFixed(0)}%)`;
        pollContainer.querySelector('.against-label').innerText = `Against: ${againstCount} (${againstPct.toFixed(0)}%)`;
        
        pollContainer.querySelector('.bar-favor').style.width = `${favorPct}%`;
        pollContainer.querySelector('.bar-against').style.width = `${againstPct}%`;
    } catch (err) {
        console.error(`Error loading poll results for ${proposalId}:`, err);
    }
}

// Cast user vote on poll
async function castVote(proposalId, voteValue) {
    try {
        await apiCall(`/polls/${proposalId}/vote`, {
            method: 'POST',
            body: { vote: voteValue }
        });
        
        showToast(`Your vote '${voteValue}' has been recorded.`, "success");
        updatePollResultsUI(proposalId);
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Submit a new proposal
document.getElementById('newProposalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('proposalTitle').value.trim();
    const description = document.getElementById('proposalDesc').value.trim();
    const pollEnabled = document.getElementById('proposalPollEnabled').checked;
    const fileInput = document.getElementById('proposalImage');
    
    const submitBtn = document.getElementById('submitProposalBtn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Submitting proposal...";
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('poll_enabled', pollEnabled);
        if (fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        }
        
        await apiCall('/proposals', {
            method: 'POST',
            body: formData
        });
        
        showToast("Society upgrade proposal submitted successfully!", "success");
        e.target.reset();
        document.getElementById('proposalPreviewContainer').classList.remove('active');
        switchPortalTab('proposals');
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});


// --- ADMIN PORTAL WORKFLOW LOADER & ACTIONS ---

// Fetch aggregate statistics
async function loadAdminOverview() {
    try {
        const stats = await apiCall('/dashboard/stats');
        document.getElementById('statTotalComplaints').innerText = stats.total_complaints || 0;
        document.getElementById('statPendingComplaints').innerText = stats.pending_complaints || 0;
        document.getElementById('statProgressComplaints').innerText = stats.in_progress_complaints || 0;
        document.getElementById('statCompletedComplaints').innerText = stats.completed_complaints || 0;
        document.getElementById('statTotalProposals').innerText = stats.total_proposals || 0;
    } catch (err) {
        showToast("Failed to refresh dashboard stats: " + err.message, "error");
    }
}

// Fetch complaints for Admin dashboard
async function loadAdminComplaints() {
    const listContainer = document.getElementById('adminComplaintsList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading society complaints...</p></div>';
    
    try {
        const complaints = await apiCall('/complaints');
        if (complaints.length === 0) {
            listContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>No complaints filed in society!</p></div>';
            return;
        }
        
        listContainer.innerHTML = complaints.map(complaint => {
            const statusClass = complaint.status.toLowerCase().replace(" ", "");
            const imageTag = complaint.image_url ? `<img class="item-image" src="${complaint.image_url}" alt="${complaint.title}">` : '';
            
            // Build technician options
            const techOptions = state.technicians.map(tech => 
                `<option value="${tech.id}" ${complaint.assigned_technician === tech.id ? 'selected' : ''}>${tech.name} (${tech.craft})</option>`
            ).join('');
            
            return `
                <div class="item-card">
                    <span class="item-badge badge-${statusClass}">${complaint.status}</span>
                    ${imageTag}
                    <h3>${complaint.title}</h3>
                    <p class="description">${complaint.description}</p>
                    
                    <div class="admin-action-controls">
                        <!-- Assign Tech Form -->
                        <div class="form-group" style="margin-bottom: 8px;">
                            <label style="font-size:0.75rem;">Allocate Technician</label>
                            <select class="form-control" style="padding: 6px 10px; font-size: 0.85rem;" onchange="adminAssignTechnician('${complaint.id}', this.value)">
                                <option value="">-- Unassigned --</option>
                                ${techOptions}
                            </select>
                        </div>
                        
                        <!-- Update Status Form -->
                        <div class="form-group" style="margin-bottom: 8px;">
                            <label style="font-size:0.75rem;">Update Status</label>
                            <select class="form-control" style="padding: 6px 10px; font-size: 0.85rem;" onchange="adminUpdateStatus('${complaint.id}', this.value)">
                                <option value="Pending" ${complaint.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed" ${complaint.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Rejected" ${complaint.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div class="item-meta">
                        <span>Filer: ${complaint.user_id.slice(0,8)}...</span>
                        <span>Date: ${formatDate(complaint.created_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

// Action: Assign Technician
async function adminAssignTechnician(complaintId, technicianId) {
    try {
        const payload = {
            assigned_technician: technicianId ? technicianId : null
        };
        await apiCall(`/complaints/${complaintId}/assign`, {
            method: 'PUT',
            body: payload
        });
        showToast("Technician updated successfully!", "success");
        loadAdminComplaints();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Action: Update status of complaint
async function adminUpdateStatus(complaintId, newStatus) {
    try {
        await apiCall(`/complaints/${complaintId}/status`, {
            method: 'PUT',
            body: { status: newStatus }
        });
        showToast(`Complaint status shifted to '${newStatus}'`, "success");
        loadAdminComplaints();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Fetch all proposals for Admin
async function loadAdminProposals() {
    const listContainer = document.getElementById('adminProposalsList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading society proposals...</p></div>';
    
    try {
        const proposals = await apiCall('/proposals');
        if (proposals.length === 0) {
            listContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>No proposals submitted.</p></div>';
            return;
        }
        
        listContainer.innerHTML = proposals.map(proposal => {
            const statusClass = proposal.status.toLowerCase();
            const imageTag = proposal.image_url ? `<img class="item-image" src="${proposal.image_url}" alt="${proposal.title}">` : '';
            
            let pollHtml = '';
            if (proposal.poll_enabled) {
                pollHtml = `
                    <div class="poll-section" id="poll-admin-${proposal.id}">
                        <div class="poll-stats">
                            <span class="favor-label">Favor: Loading...</span>
                            <span class="against-label">Against: Loading...</span>
                        </div>
                        <div class="poll-results-bar">
                            <div class="bar-favor" style="width: 0%"></div>
                            <div class="bar-against" style="width: 0%"></div>
                        </div>
                    </div>
                `;
            }
            
            let actionHtml = '';
            if (proposal.status === 'Pending') {
                actionHtml = `
                    <div style="display: flex; gap: 8px; margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 12px;">
                        <button class="btn btn-primary" style="flex:1; padding: 6px 12px; font-size: 0.8rem;" onclick="adminUpdateProposalStatus('${proposal.id}', 'Approved')">Approve</button>
                        <button class="btn btn-danger" style="flex:1; padding: 6px 12px; font-size: 0.8rem;" onclick="adminUpdateProposalStatus('${proposal.id}', 'Rejected')">Reject</button>
                    </div>
                `;
            }
            
            return `
                <div class="item-card">
                    <span class="item-badge badge-${statusClass}">${proposal.status}</span>
                    ${imageTag}
                    <h3>${proposal.title}</h3>
                    <p class="description">${proposal.description}</p>
                    ${pollHtml}
                    ${actionHtml}
                    <div class="item-meta">
                        <span>Filer: ${proposal.user_id.slice(0,8)}...</span>
                        <span>Date: ${formatDate(proposal.created_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Post render: Load results
        proposals.forEach(proposal => {
            if (proposal.poll_enabled) {
                updateAdminPollResultsUI(proposal.id);
            }
        });
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

// Update Admin Poll results
async function updateAdminPollResultsUI(proposalId) {
    const pollContainer = document.getElementById(`poll-admin-${proposalId}`);
    if (!pollContainer) return;
    
    try {
        const results = await apiCall(`/polls/${proposalId}/results`);
        const total = results.total_votes;
        const favorCount = results.favor;
        const againstCount = results.against;
        
        const favorPct = total > 0 ? (favorCount / total) * 100 : 0;
        const againstPct = total > 0 ? (againstCount / total) * 100 : 0;
        
        pollContainer.querySelector('.favor-label').innerText = `Favor: ${favorCount} (${favorPct.toFixed(0)}%)`;
        pollContainer.querySelector('.against-label').innerText = `Against: ${againstCount} (${againstPct.toFixed(0)}%)`;
        
        pollContainer.querySelector('.bar-favor').style.width = `${favorPct}%`;
        pollContainer.querySelector('.bar-against').style.width = `${againstPct}%`;
    } catch (err) {
        console.error(`Error loading poll results for admin ${proposalId}:`, err);
    }
}

// Action: Approve or Reject a proposal
async function adminUpdateProposalStatus(proposalId, newStatus) {
    try {
        await apiCall(`/proposals/${proposalId}/status`, {
            method: 'PUT',
            body: { status: newStatus }
        });
        showToast(`Proposal status changed to '${newStatus}'`, "success");
        loadAdminProposals();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Load registered service technicians
async function loadAdminTechnicians() {
    const listContainer = document.getElementById('techniciansList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading technicians...</p></div>';
    
    try {
        const technicians = await apiCall('/technicians');
        state.technicians = technicians; // Refresh cache
        
        if (technicians.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">No technicians registered.</p>';
            return;
        }
        
        listContainer.innerHTML = technicians.map(tech => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background-color: var(--bg-primary);">
                <div>
                    <h4 style="font-size: 1rem;">${tech.name}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">Phone: ${tech.phone}</p>
                </div>
                <span class="craft-badge">${tech.craft}</span>
            </div>
        `).join('');
    } catch (err) {
        listContainer.innerHTML = `<p style="color: var(--danger); font-size: 0.9rem;">Failed to fetch technicians: ${err.message}</p>`;
    }
}

// Form: Register New Technician
document.getElementById('newTechnicianForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('techName').value.trim();
    const craft = document.getElementById('techCraft').value;
    const phone = document.getElementById('techPhone').value.trim();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Registering...";
    submitBtn.disabled = true;
    
    try {
        await apiCall('/technicians', {
            method: 'POST',
            body: { name, craft, phone }
        });
        
        showToast(`Technician '${name}' registered successfully!`, "success");
        e.target.reset();
        loadAdminTechnicians();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});


// --- SYSTEM SETTINGS (API CONFIGURATION) ---

const apiConfigModal = document.getElementById('apiConfigModal');

function openApiConfigModal() {
    document.getElementById('apiUrlInput').value = state.apiUrl;
    apiConfigModal.classList.add('active');
}

function closeApiConfigModal() {
    apiConfigModal.classList.remove('active');
}

document.getElementById('openApiSettingsBtn').addEventListener('click', openApiConfigModal);
document.getElementById('closeApiConfig').addEventListener('click', closeApiConfigModal);
document.getElementById('saveApiConfig').addEventListener('click', () => {
    const val = document.getElementById('apiUrlInput').value.trim();
    if (val) {
        state.apiUrl = val;
        localStorage.setItem('gokuldham_apiUrl', val);
        showToast(`API base path saved: ${val}`, "success");
        closeApiConfigModal();
        renderAppLayout();
    } else {
        showToast("Please enter a valid API URL", "warning");
    }
});

document.getElementById('resetApiConfig').addEventListener('click', () => {
    const def = 'http://127.0.0.1:8000';
    document.getElementById('apiUrlInput').value = def;
    state.apiUrl = def;
    localStorage.setItem('gokuldham_apiUrl', def);
    showToast(`API URL reset to default: ${def}`, "info");
    closeApiConfigModal();
    renderAppLayout();
});


// --- INITIALIZATION ---

window.addEventListener('DOMContentLoaded', () => {
    // Check if there is an active session
    if (state.token) {
        // Double check session validity with auth/me
        apiCall('/auth/me')
            .then(profile => {
                state.user = profile;
                localStorage.setItem('gokuldham_user', JSON.stringify(profile));
                renderAppLayout();
            })
            .catch(err => {
                console.warn("Auto login /auth/me failed, checking cached state or token details:", err);
                const decoded = decodeJwt(state.token);
                if (decoded) {
                    if (!state.user) {
                        state.user = {
                            id: decoded.id,
                            email: decoded.email,
                            role: decoded.role,
                            name: decoded.email.split('@')[0]
                        };
                        localStorage.setItem('gokuldham_user', JSON.stringify(state.user));
                    }
                    renderAppLayout();
                } else {
                    logout();
                }
            });
    } else {
        renderAppLayout();
    }
});
