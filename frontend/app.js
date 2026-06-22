localStorage.removeItem('gokuldham_apiUrl');
const defaultApiUrl = (window.location.origin && window.location.origin.startsWith('http')) 
    ? window.location.origin 
    : 'https://gokhuldhamsociety.onrender.com';

const state = {
    apiUrl: defaultApiUrl,
    token: localStorage.getItem('gokuldham_token') || null,
    user: JSON.parse(localStorage.getItem('gokuldham_user')) || null,
    activeTab: localStorage.getItem('gokuldham_activeTab') || null,
    technicians: []
};


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

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('slide-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4500);
}

async function apiCall(endpoint, options = {}) {
    const url = `${state.apiUrl}${endpoint}`;
    const headers = options.headers || {};
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    
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


function switchAuthTab(tab) {
    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function switchPortalTab(tab) {
    state.activeTab = tab;
    localStorage.setItem('gokuldham_activeTab', tab);
    
    const sidebar = document.getElementById('sidebarMenu');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
    if (overlay && overlay.classList.contains('active')) {
        overlay.classList.remove('active');
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const targetLink = Array.from(document.querySelectorAll('.nav-link')).find(link => 
        link.getAttribute('onclick') && link.getAttribute('onclick').includes(tab)
    );
    if (targetLink) targetLink.classList.add('active');
    
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) {
        targetView.classList.add('active');
    } else {
        console.error(`View container 'view-${tab}' not found`);
    }
    
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

async function renderAppLayout() {
    if (!state.token || !state.user) {
        document.getElementById('authView').classList.add('active');
        document.getElementById('appWorkspace').classList.remove('active');
        return;
    }
    
    document.getElementById('authView').classList.remove('active');
    document.getElementById('appWorkspace').classList.add('active');
    
    const displayName = state.user.name || state.user.email || 'User';
    document.getElementById('userNameBadge').innerText = displayName;
    document.getElementById('userRoleBadge').innerText = state.user.role === 'admin' ? 'Secretary' : 'Member';
    document.getElementById('userAvatarBadge').innerText = displayName.charAt(0).toUpperCase();
    
    const isAdmin = state.user.role === 'admin';
    document.getElementById('memberNav').style.display = isAdmin ? 'none' : 'flex';
    document.getElementById('adminNav').style.display = isAdmin ? 'flex' : 'none';
    
    if (isAdmin) {
        try {
            state.technicians = await apiCall('/technicians');
        } catch (err) {
            console.error("Failed to cache technicians:", err);
        }
    }
    
    let defaultTab = isAdmin ? 'admin-overview' : 'my-complaints';
    if (state.activeTab && (
        (isAdmin && ['admin-overview', 'admin-complaints', 'admin-proposals', 'admin-technicians'].includes(state.activeTab)) ||
    (!isAdmin && ['my-complaints', 'all-complaints', 'file-complaint', 'proposals', 'submit-proposal'].includes(state.activeTab))
    )) {
        defaultTab = state.activeTab;
    }
    
    switchPortalTab(defaultTab);
}


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
        
        const decoded = decodeJwt(response.access_token);
        
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
        
        e.target.reset();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const role = 'member'; 
    
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
        
        document.getElementById('loginEmail').value = email;
        e.target.reset();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

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



async function loadMyComplaints() {
    const listContainer = document.getElementById('myComplaintsList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Fetching complaints...</p></div>';
    
    try {
        const complaints = await apiCall('/complaints/my');
        if (complaints.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 012-2" /></svg>
                    <p>No complaints reported by you</p>
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
                    <button class="btn btn-danger" style="width: 100%; padding: 6px 12px; font-size: 0.85rem; margin-top: auto;" onclick="deleteComplaint('${complaint.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 14px; height: 14px; vertical-align: middle;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete Complaint</span>
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

async function loadAllComplaints() {
    const listContainer = document.getElementById('allComplaintsList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Fetching society complaints...</p></div>';

    try {
        const complaints = await apiCall('/complaints');
        if (complaints.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 012-2" /></svg>
                    <p>No complaints have been filed in the society yet!</p>
                </div>`;
            return;
        }

        const currentUserId = state.user ? state.user.id : null;

        listContainer.innerHTML = complaints.map(complaint => {
            const statusClass = complaint.status.toLowerCase().replace(" ", "");
            const imageTag = complaint.image_url ? `<img class="item-image" src="${complaint.image_url}" alt="${complaint.title}">` : '';
            const filerName = complaint.users ? complaint.users.name : 'Society Member';
            const isOwn = currentUserId && complaint.user_id === currentUserId;
            const ownerTag = isOwn
                ? `<span class="item-owner-badge badge-own">📌 Your Complaint</span>`
                : `<span class="item-owner-badge badge-other">👥 Filed by: ${filerName}</span>`;
            return `
                <div class="item-card">
                    <span class="item-badge badge-${statusClass}">${complaint.status}</span>
                    ${ownerTag}
                    ${imageTag}
                    <h3>${complaint.title}</h3>
                    <p class="description">${complaint.description}</p>
                    <div class="item-meta">
                        <span>Reported: ${formatDate(complaint.created_at)}</span>
                        <span>Staff: ${complaint.assigned_technician ? 'Allocated' : 'Pending'}</span>
                    </div>
                    ${isOwn ? `
                    <button class="btn btn-danger" style="width: 100%; padding: 6px 12px; font-size: 0.85rem; margin-top: auto;" onclick="deleteComplaint('${complaint.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 14px; height: 14px; vertical-align: middle;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete Complaint</span>
                    </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

document.getElementById('newComplaintForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('complaintTitle').value.trim();
    const description = document.getElementById('complaintDesc').value.trim();
    const fileInput = document.getElementById('complaintImage');
    
    if (!title || !description || !fileInput.files[0]) {
        showToast("Please enter all details, including attaching an image.", "error");
        return;
    }
    
    const submitBtn = document.getElementById('submitComplaintBtn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Filing complaint...";
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', fileInput.files[0]);
        
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

async function deleteComplaint(complaintId) {
    if (!confirm("Are you sure you want to delete this complaint? This action cannot be undone.")) {
        return;
    }
    try {
        await apiCall(`/complaints/${complaintId}`, {
            method: 'DELETE'
        });
        showToast("Complaint deleted successfully!", "success");
        if (state.activeTab === 'my-complaints') {
            loadMyComplaints();
        } else if (state.activeTab === 'all-complaints') {
            loadAllComplaints();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

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
            
            const proposerName = proposal.users ? proposal.users.name : 'Society Member';
            const currentUserId = state.user ? state.user.id : null;
            const isOwn = currentUserId && proposal.user_id === currentUserId;
            const ownerTag = isOwn
                ? `<span class="item-owner-badge badge-own">📌 Your Proposal</span>`
                : `<span class="item-owner-badge badge-other">👥 Proposed by: ${proposerName}</span>`;
            
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
                    ${ownerTag}
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
        
        proposals.forEach(proposal => {
            if (proposal.poll_enabled) {
                updatePollResultsUI(proposal.id);
            }
        });
        
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

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

document.getElementById('newProposalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('proposalTitle').value.trim();
    const description = document.getElementById('proposalDesc').value.trim();
    const pollEnabled = document.getElementById('proposalPollEnabled').checked;
    const fileInput = document.getElementById('proposalImage');
    
    if (!title || !description || !fileInput.files[0]) {
        showToast("Please enter all details, including attaching an image.", "error");
        return;
    }
    
    const submitBtn = document.getElementById('submitProposalBtn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Submitting proposal...";
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('poll_enabled', pollEnabled);
        formData.append('image', fileInput.files[0]);
        
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
                        <span>Filer: ${complaint.users ? complaint.users.name : complaint.user_id.slice(0,8)}</span>
                        <span>Date: ${formatDate(complaint.created_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

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
                        <span>Filer: ${proposal.users ? proposal.users.name : proposal.user_id.slice(0,8)}</span>
                        <span>Date: ${formatDate(proposal.created_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        proposals.forEach(proposal => {
            if (proposal.poll_enabled) {
                updateAdminPollResultsUI(proposal.id);
            }
        });
    } catch (err) {
        listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--danger);"><p>Error: ${err.message}</p></div>`;
    }
}

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

async function loadAdminTechnicians() {
    const listContainer = document.getElementById('techniciansList');
    listContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading technicians...</p></div>';
    
    try {
        const technicians = await apiCall('/technicians');
        state.technicians = technicians; 
        
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





const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenuClose = document.getElementById('mobileMenuClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarMenu = document.getElementById('sidebarMenu');

function openMobileMenu() {
    if (sidebarMenu) sidebarMenu.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
}

function closeMobileMenu() {
    if (sidebarMenu) sidebarMenu.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', openMobileMenu);
}
if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileMenu);
}
if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileMenu);
}


window.addEventListener('DOMContentLoaded', () => {
    if (state.token) {
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
