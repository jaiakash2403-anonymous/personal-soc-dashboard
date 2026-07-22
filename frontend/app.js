// Aura Personal SOC Dashboard - Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let activeTab = 'dashboard';
    let scanData = null;
    let systemChart = null;
    let chartDataLimit = 15;
    let chartTimeLabels = [];
    let cpuData = [];
    let ramData = [];
    let netDownData = [];
    let netUpData = [];
    let sessionActive = false;
    let networkPollInterval = null;
    
    // Admin Directory state cache
    let adminUsersCache = [];

    // Initialize UI Elements
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Auth elements
    const authOverlay = document.getElementById('auth-overlay');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const authError = document.getElementById('auth-error');
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');
    const btnLogout = document.getElementById('btn-logout');
    const navAdminItem = document.getElementById('nav-admin');
    
    // Scan elements
    const btnScan = document.getElementById('btn-scan');
    const scanIcon = document.getElementById('scan-icon');
    const scanOverlay = document.getElementById('scan-overlay');
    const scanProgressTitle = document.getElementById('scan-progress-title');
    const scanProgressFile = document.getElementById('scan-progress-file');
    const scanProgressBar = document.getElementById('scan-progress-bar');
    
    // Search & Report elements
    const softwareSearchInput = document.getElementById('software-search');
    const btnSaveReport = document.getElementById('btn-save-report');

    // Threat Modal elements
    const threatModal = document.getElementById('threat-modal');
    const threatModalDesc = document.getElementById('threat-modal-desc');
    const threatModalRecs = document.getElementById('threat-modal-recs');
    const btnCloseThreatModal = document.getElementById('btn-close-threat-modal');

    // Admin Search element
    const adminSearchInput = document.getElementById('admin-search');

    // ==========================================
    // 🔑 AUTHENTICATION AND ROLE DEPLOYMENT
    // ==========================================

    goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
        authError.classList.add('hidden');
    });

    goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        formRegister.classList.add('hidden');
        formLogin.classList.remove('hidden');
        authError.classList.add('hidden');
    });

    // Handle Login Submit
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (typeof pywebview === 'undefined' || !pywebview.api) {
            showAuthError("Connection with SOC background service lost. Retry.");
            return;
        }

        try {
            const res = await pywebview.api.login_user(email, password);
            if (res.success) {
                loginSuccess(res.username, res.role);
            } else {
                showAuthError(res.error);
            }
        } catch (err) {
            showAuthError("Login failed: " + err);
        }
    });

    // Handle Register Submit
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (password.length < 8) {
            showAuthError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirm) {
            showAuthError("Passwords do not match.");
            return;
        }

        if (typeof pywebview === 'undefined' || !pywebview.api) {
            showAuthError("Connection with SOC service lost.");
            return;
        }

        try {
            const res = await pywebview.api.register_user(email, password);
            if (res.success) {
                showToast("Account registered! Logging in...", true);
                const loginRes = await pywebview.api.login_user(email, password);
                if (loginRes.success) {
                    loginSuccess(loginRes.username, loginRes.role);
                } else {
                    showAuthError("Autologin failed. Please log in manually.");
                    formRegister.classList.add('hidden');
                    formLogin.classList.remove('hidden');
                }
            } else {
                showAuthError(res.error);
            }
        } catch (err) {
            showAuthError("Registration failed: " + err);
        }
    });

    function showAuthError(msg) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
        
        const card = document.querySelector('.auth-card');
        card.classList.remove('animate-shake');
        void card.offsetWidth; 
        card.classList.add('animate-shake');
    }

    function loginSuccess(username, role) {
        sessionActive = true;
        authOverlay.classList.add('hidden');
        document.getElementById('profile-username').textContent = username;
        
        // Show Admin Console navigation tab if role matches admin
        if (role === 'admin') {
            navAdminItem.classList.remove('hidden');
            showToast(`Console unlocked. Welcome, Admin ${username}!`, true);
        } else {
            navAdminItem.classList.add('hidden');
            showToast(`Console unlocked. Welcome, ${username}!`, true);
        }
        
        // Start live telemetry loops
        startSystemLoadPolling();
        startNetworkConnectionsPolling();
        
        // Trigger scan automatically on log in
        setTimeout(() => {
            triggerSystemScan();
        }, 800);
    }

    // Handle Logout
    btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (typeof pywebview !== 'undefined' && pywebview.api) {
            await pywebview.api.logout_user();
        }
        
        sessionActive = false;
        clearInterval(networkPollInterval);
        
        // Clear forms and reset states
        document.getElementById('profile-username').textContent = "User";
        document.getElementById('login-email').value = "";
        document.getElementById('login-password').value = "";
        document.getElementById('register-email').value = "";
        document.getElementById('register-password').value = "";
        document.getElementById('register-confirm').value = "";
        
        navAdminItem.classList.add('hidden');
        authOverlay.classList.remove('hidden');
        formRegister.classList.add('hidden');
        formLogin.classList.remove('hidden');
        authError.classList.add('hidden');
        
        switchTab('dashboard');
        showToast("SOC Console locked.", true);
    });

    // ==========================================
    // 🔀 TAB ROUTING AND DATA LOAD TRIGGERS
    // ==========================================

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    document.addEventListener('click', (e) => {
        const goTab = e.target.closest('[data-tab-go]');
        if (goTab) {
            e.preventDefault();
            const targetTab = goTab.getAttribute('data-tab-go');
            switchTab(targetTab);
            if (goTab.id === 'btn-fix-threat-modal') {
                threatModal.classList.add('hidden');
            }
        }
    });

    function switchTab(tabId) {
        activeTab = tabId;
        
        // Trigger Admin Database Query if Admin panel is chosen
        if (tabId === 'admin-panel') {
            loadAdminDirectory();
        }

        // Update sidebar items
        navItems.forEach(nav => {
            if (nav.getAttribute('data-tab') === tabId) {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        });

        // Update display contents
        tabContents.forEach(content => {
            if (content.id === `tab-${tabId}`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    // ==========================================
    // 📊 CHART.JS REAL-TIME RESOURCE TELEMETRY
    // ==========================================

    const ctx = document.getElementById('systemLoadChart').getContext('2d');
    
    const cpuGradient = ctx.createLinearGradient(0, 0, 0, 220);
    cpuGradient.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
    cpuGradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

    const ramGradient = ctx.createLinearGradient(0, 0, 0, 220);
    ramGradient.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    ramGradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    systemChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartTimeLabels,
            datasets: [
                {
                    label: 'CPU Load (%)',
                    data: cpuData,
                    borderColor: '#4f46e5',
                    borderWidth: 2,
                    backgroundColor: cpuGradient,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'RAM Usage (%)',
                    data: ramData,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    backgroundColor: ramGradient,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Net Down (KB/s)',
                    data: netDownData,
                    borderColor: '#f59e0b',
                    borderWidth: 1.5,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Net Up (KB/s)',
                    data: netUpData,
                    borderColor: '#a855f7',
                    borderWidth: 1.5,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false 
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1e293b',
                    titleFont: { family: 'Inter', size: 11 },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.datasetIndex < 2) {
                                    label += context.parsed.y + '%';
                                } else {
                                    label += context.parsed.y + ' KB/s';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: { family: 'Inter', size: 10 },
                        maxTicksLimit: 6
                    }
                },
                y: {
                    min: 0,
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        font: { family: 'Inter', size: 10 }
                    }
                }
            }
        }
    });

    function startSystemLoadPolling() {
        setInterval(async () => {
            if (!sessionActive) return;
            if (typeof pywebview !== 'undefined' && pywebview.api) {
                try {
                    const stats = await pywebview.api.get_system_load();
                    if (stats && stats.timestamp) {
                        chartTimeLabels.push(stats.timestamp);
                        cpuData.push(stats.cpu);
                        ramData.push(stats.ram);
                        netDownData.push(stats.net_recv);
                        netUpData.push(stats.net_sent);

                        document.getElementById('live-net-down-rate').innerHTML = `<i class="fa-solid fa-download"></i> Down: <strong>${stats.net_recv} KB/s</strong>`;
                        document.getElementById('live-net-up-rate').innerHTML = `<i class="fa-solid fa-upload"></i> Up: <strong>${stats.net_sent} KB/s</strong>`;

                        if (chartTimeLabels.length > chartDataLimit) {
                            chartTimeLabels.shift();
                            cpuData.shift();
                            ramData.shift();
                            netDownData.shift();
                            netUpData.shift();
                        }

                        systemChart.update('none');
                    }
                } catch (e) {
                    console.error("Error polling loads: ", e);
                }
            }
        }, 2500);
    }

    // ==========================================
    // 🌐 ACTIVE NETWORK SOCKET CONNECTIONS FEED
    // ==========================================

    function startNetworkConnectionsPolling() {
        pollConnections();
        networkPollInterval = setInterval(pollConnections, 4000);
    }

    async function pollConnections() {
        if (!sessionActive) return;
        if (typeof pywebview === 'undefined' || !pywebview.api) return;

        try {
            const conns = await pywebview.api.get_active_connections();
            populateNetworkTable(conns);
        } catch (e) {
            console.error("Error updating connection telemetry: ", e);
        }
    }

    function populateNetworkTable(connsArray) {
        const body = document.getElementById('network-table-body');
        body.innerHTML = '';
        document.getElementById('net-count-badge').textContent = `${connsArray.length} Sockets`;

        if (connsArray.length === 0) {
            body.innerHTML = `<tr><td colspan="5" class="table-empty">No active TCP socket connections traced.</td></tr>`;
            return;
        }

        connsArray.forEach(conn => {
            const tr = document.createElement('tr');
            
            let statusBadgeClass = 'badge';
            if (conn.status === 'ESTABLISHED') statusBadgeClass += ' badge-on';
            else if (conn.status === 'LISTEN') statusBadgeClass += ' bg-indigo-faded text-indigo';
            else statusBadgeClass += ' bg-accent text-secondary';
            
            let processDecor = `<strong>${conn.process}</strong>`;
            if (conn.status === 'ESTABLISHED' && !['chrome.exe', 'edge.exe', 'firefox.exe', 'discord.exe', 'spotify.exe', 'teams.exe', 'svchost.exe', 'explorer.exe', 'system', 'system idle', 'access denied'].includes(conn.process.toLowerCase())) {
                processDecor = `<strong class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> ${conn.process}</strong>`;
            }

            tr.innerHTML = `
                <td>${processDecor}</td>
                <td><code style="font-family: var(--font-mono); font-size: 11px;">${conn.local}</code></td>
                <td><code style="font-family: var(--font-mono); font-size: 11px; color: var(--color-indigo);">${conn.remote}</code></td>
                <td><span class="${statusBadgeClass}" style="font-size: 11px;">${conn.status}</span></td>
                <td><code>${conn.pid}</code></td>
            `;
            body.appendChild(tr);
        });
    }

    // ==========================================
    // 👥 ADMIN PANELS USER DIRECTORY CONTROLLER
    // ==========================================

    async function loadAdminDirectory() {
        if (typeof pywebview === 'undefined' || !pywebview.api) return;
        
        try {
            const res = await pywebview.api.get_users_list();
            if (res.success) {
                adminUsersCache = res.users;
                populateAdminTable(adminUsersCache);
            } else {
                showToast("Admin Load Failed: " + res.error, false);
            }
        } catch (e) {
            showToast("Database query exception: " + e, false);
        }
    }

    function populateAdminTable(usersArray) {
        const body = document.getElementById('admin-table-body');
        body.innerHTML = '';
        document.getElementById('admin-user-count-badge').textContent = `${usersArray.length} Users`;

        if (usersArray.length === 0) {
            body.innerHTML = `<tr><td colspan="5" class="table-empty">No registered user directories.</td></tr>`;
            return;
        }

        usersArray.forEach(user => {
            const tr = document.createElement('tr');
            
            // Format score badge
            let scoreBadge = '';
            if (user.last_score === -1) {
                scoreBadge = `<span class="badge" style="background-color: var(--bg-accent); color: var(--text-secondary);">No Scan</span>`;
            } else {
                const s = user.last_score;
                let bgClass = 'vulnerable';
                if (s >= 90) bgClass = 'secure';
                else if (s >= 70) bgClass = 'stable';
                else if (s >= 50) bgClass = 'warning';
                
                scoreBadge = `<span class="status-badge ${bgClass}">${s}%</span>`;
            }

            // Role Badge styling
            const roleBadge = `<span class="badge badge-${user.role.toLowerCase()}">${user.role.toUpperCase()}</span>`;

            tr.innerHTML = `
                <td><strong>${user.email}</strong></td>
                <td>${roleBadge}</td>
                <td><code>${user.registered_at}</code></td>
                <td>${scoreBadge}</td>
                <td><code>${user.last_scan_time}</code></td>
            `;
            body.appendChild(tr);
        });
    }

    // Admin Panel Search Filter
    adminSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            populateAdminTable(adminUsersCache);
            return;
        }

        const filtered = adminUsersCache.filter(user => {
            return user.email.toLowerCase().includes(query) || 
                   user.role.toLowerCase().includes(query) ||
                   user.last_scan_time.toLowerCase().includes(query);
        });
        populateAdminTable(filtered);
    });


    // ==========================================
    // 🛡️ SECURITY SCAN PIPELINE & MODALS
    // ==========================================

    async function triggerSystemScan() {
        if (!sessionActive) return;
        if (typeof pywebview === 'undefined' || !pywebview.api) {
            showToast("SOC service disconnected.", false);
            return;
        }

        scanOverlay.classList.remove('hidden');
        btnScan.disabled = true;
        scanIcon.classList.add('fa-spin');
        
        let progress = 0;
        const progressSteps = [
            { threshold: 15, title: "Auditing Local Firewall...", desc: "Reading firewall active policies..." },
            { threshold: 40, title: "Scanning Windows Registry...", desc: "Searching historical hardware USB enum keys..." },
            { threshold: 60, title: "Analyzing Security Event Logs...", desc: "Reading Logon and Logoff system identifiers..." },
            { threshold: 75, title: "Checking Password Baseline...", desc: "Scanning document roots for plaintext credential files..." },
            { threshold: 90, title: "Cataloging Applications...", desc: "Reading HKLM/HKCU software indexes..." },
            { threshold: 100, title: "Aggregating Threat Score...", desc: "Compiling dashboard reports..." }
        ];

        const progressInterval = setInterval(() => {
            if (progress < 95) {
                progress += Math.floor(Math.random() * 5) + 2;
                if (progress > 95) progress = 95;
                
                const step = progressSteps.find(s => progress <= s.threshold) || progressSteps[progressSteps.length - 1];
                scanProgressTitle.textContent = step.title;
                scanProgressFile.textContent = step.desc;
                scanProgressBar.style.width = `${progress}%`;
            }
        }, 100);

        try {
            const results = await pywebview.api.run_full_scan();
            
            clearInterval(progressInterval);
            scanProgressTitle.textContent = "Scan Pipeline Completed!";
            scanProgressFile.textContent = "Applying analytics...";
            scanProgressBar.style.width = "100%";
            
            setTimeout(() => {
                scanOverlay.classList.add('hidden');
                btnScan.disabled = false;
                scanIcon.classList.remove('fa-spin');
                
                scanData = results;
                renderScanData();
                showToast("Endpoint scan compiled successfully!", true);

                if (results.has_critical) {
                    triggerCriticalThreatModal(results);
                }

            }, 600);

        } catch (error) {
            clearInterval(progressInterval);
            scanOverlay.classList.add('hidden');
            btnScan.disabled = false;
            scanIcon.classList.remove('fa-spin');
            showToast("Scan failed: " + error, false);
            console.error(error);
        }
    }

    function triggerCriticalThreatModal(results) {
        playAlertSound();

        const critRecs = results.recommendations.filter(r => r.severity === 'CRITICAL');
        threatModalDesc.innerHTML = `Mitigate the following critical threat vector(s) immediately to secure host registry and credentials files. Total Score docked by <strong>25 points</strong>.`;
        
        threatModalRecs.innerHTML = '';
        critRecs.forEach(r => {
            const row = document.createElement('div');
            row.className = 'modal-rec-row';
            row.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <div><strong>${r.title}</strong>: ${r.description}</div>`;
            threatModalRecs.appendChild(row);
        });

        threatModal.classList.remove('hidden');
    }

    function playAlertSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const playBeep = (delay, freq, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + delay + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + duration);
            };
            
            playBeep(0, 880, 0.16);
            playBeep(0.24, 880, 0.16);
        } catch (e) {
            console.error("Alert chime playback failed: ", e);
        }
    }

    btnCloseThreatModal.addEventListener('click', () => {
        threatModal.classList.add('hidden');
    });

    // Render results in UI
    function renderScanData() {
        if (!scanData) return;

        document.getElementById('last-scan-time').textContent = `Last Scan: ${scanData.scan_time}`;

        const score = scanData.score;
        const grade = scanData.grade;
        const status = scanData.status;
        
        document.getElementById('score-grade').textContent = grade;
        document.getElementById('score-percent').textContent = `${score}%`;
        
        const statusBadge = document.getElementById('score-status');
        statusBadge.textContent = status;
        statusBadge.className = 'status-badge'; 
        
        const descriptionEl = document.getElementById('score-description');
        const gaugeFill = document.getElementById('gauge-fill-deg');
        
        if (grade === 'A') {
            statusBadge.classList.add('secure');
            descriptionEl.textContent = "Excellent. Your endpoint matches standard corporate security baselines.";
            gaugeFill.style.borderColor = '#10b981';
        } else if (grade === 'B') {
            statusBadge.classList.add('stable');
            descriptionEl.textContent = "Good security baseline. Consider mitigating minor events to fully secure host.";
            gaugeFill.style.borderColor = '#4f46e5';
        } else if (grade === 'C') {
            statusBadge.classList.add('warning');
            descriptionEl.textContent = "Warning. Important security features are disabled or credentials files exposed.";
            gaugeFill.style.borderColor = '#f59e0b';
        } else {
            statusBadge.classList.add('vulnerable');
            descriptionEl.textContent = "CRITICAL THREAT. Fix immediate vulnerabilities to safeguard local accounts.";
            gaugeFill.style.borderColor = '#f43f5e';
        }
        
        const rotation = Math.round((score / 100) * 360);
        gaugeFill.style.transform = `rotate(${rotation}deg)`;

        const fw = scanData.firewall;
        updateFirewallBadge('fw-domain', fw.Domain);
        updateFirewallBadge('fw-private', fw.Private);
        updateFirewallBadge('fw-public', fw.Public);
        
        const fwSummary = document.getElementById('fw-status-summary');
        if (fw.secure) {
            fwSummary.className = "firewall-footer secure";
            fwSummary.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>Private & Public networks are Protected</span>`;
        } else {
            fwSummary.className = "firewall-footer vulnerable";
            fwSummary.innerHTML = `<i class="fa-solid fa-shield-virus"></i> <span>Firewall disabled on active profile(s)</span>`;
        }

        document.getElementById('stat-usb-count').textContent = scanData.usb.length;
        document.getElementById('stat-software-count').textContent = scanData.software_count;
        document.getElementById('stat-pwd-policy').textContent = `${scanData.password.min_length} chars`;
        
        const unsafeCount = scanData.password.unsafe_files.length;
        const statUnsafeEl = document.getElementById('stat-unsafe-files');
        statUnsafeEl.textContent = unsafeCount;
        
        const unsafeBox = document.getElementById('stat-unsafe-box');
        if (unsafeCount > 0) {
            unsafeBox.className = 'stat-icon bg-rose pulse-danger';
            statUnsafeEl.style.color = '#e11d48';
        } else {
            unsafeBox.className = 'stat-icon bg-emerald';
            statUnsafeEl.style.color = '';
        }

        const recs = scanData.recommendations;
        
        let activeBadgeCount = 0;
        let critCount = 0, highCount = 0, medCount = 0, lowCount = 0;
        recs.forEach(r => {
            if (r.severity === 'CRITICAL') { critCount++; activeBadgeCount++; }
            else if (r.severity === 'HIGH') { highCount++; activeBadgeCount++; }
            else if (r.severity === 'MEDIUM') { medCount++; activeBadgeCount++; }
            else if (r.severity === 'LOW') { lowCount++; activeBadgeCount++; }
            else if (r.severity === 'INFO') lowCount++;
        });
        
        document.getElementById('recs-badge').textContent = activeBadgeCount;
        document.getElementById('rec-count-critical').textContent = critCount;
        document.getElementById('rec-count-high').textContent = highCount;
        document.getElementById('rec-count-medium').textContent = medCount;
        document.getElementById('rec-count-low').textContent = lowCount;

        const recsListEl = document.getElementById('recs-list');
        recsListEl.innerHTML = '';
        
        const feedListEl = document.getElementById('dashboard-recs-feed');
        feedListEl.innerHTML = '';

        if (recs.length === 0 || (recs.length === 1 && recs[0].severity === 'INFO')) {
            recsListEl.innerHTML = `
                <div class="card font-sans text-center text-secondary py-4">
                    <i class="fa-solid fa-circle-check text-success" style="font-size: 40px; margin-bottom: 12px;"></i>
                    <h4>Endpoint is fully secured!</h4>
                    <p>We found no active security baseline warnings.</p>
                </div>
            `;
            feedListEl.innerHTML = `
                <div class="feed-empty">
                    <i class="fa-solid fa-check-double text-success"></i>
                    <p>All checks passed. System is operating under secure baseline profiles.</p>
                </div>
            `;
        } else {
            recs.forEach((rec, idx) => {
                const sevClass = rec.severity.toLowerCase();
                const iconClass = rec.severity === 'CRITICAL' || rec.severity === 'HIGH' ? 'fa-triangle-exclamation' : 'fa-circle-info';
                
                const recCard = document.createElement('div');
                recCard.className = 'rec-card';
                recCard.innerHTML = `
                    <div class="rec-card-main">
                        <div class="feed-item-icon bg-${sevClass}-faded">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div class="rec-card-content">
                            <span class="severity-pill pill-${sevClass}">${rec.severity}</span>
                            <h4>${rec.title}</h4>
                            <p>${rec.description}</p>
                        </div>
                    </div>
                    <div class="rec-action">
                        <button class="btn-text" onclick="alert('Mitigation Strategy:\\n\\n${rec.title}\\n\\nDescription: ${rec.description}\\n\\nPlease correct this setting manually in Windows Control Panel, Group Policy Editor, or Settings app.')">Review Fix</button>
                    </div>
                `;
                recsListEl.appendChild(recCard);

                if (idx < 3) {
                    const feedItem = document.createElement('div');
                    feedItem.className = `feed-item border-${sevClass}`;
                    feedItem.innerHTML = `
                        <div class="feed-item-icon bg-${sevClass}-faded">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div class="feed-item-info">
                            <h4>${rec.title}</h4>
                            <p>${rec.description}</p>
                        </div>
                    `;
                    feedListEl.appendChild(feedItem);
                }
            });
        }

        const usbTableBody = document.getElementById('usb-table-body');
        usbTableBody.innerHTML = '';
        document.getElementById('usb-count-badge').textContent = `${scanData.usb.length} Devices`;
        
        scanData.usb.forEach(device => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${device.name}</strong></td>
                <td><code style="font-family: var(--font-mono); font-size: 11px; color: var(--color-indigo);">${device.serial}</code></td>
                <td><span class="badge" style="background-color: var(--bg-accent); color: var(--text-secondary);">Storage</span></td>
            `;
            usbTableBody.appendChild(tr);
        });

        const loginTableBody = document.getElementById('login-table-body');
        loginTableBody.innerHTML = '';
        document.getElementById('login-count-badge').textContent = `${scanData.logins.length} Logons`;
        
        scanData.logins.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code style="font-family: var(--font-mono);">${log.timestamp}</code></td>
                <td><span class="badge badge-on">Success</span></td>
                <td>${log.details}</td>
            `;
            loginTableBody.appendChild(tr);
        });

        populateSoftwareTable(scanData.software);
        document.getElementById('software-count-badge').textContent = `${scanData.software_count} Total`;

        document.getElementById('policy-min-len').textContent = scanData.password.min_length;
        document.getElementById('policy-history').textContent = scanData.password.history_length;
        
        const guestBadge = document.getElementById('policy-guest');
        if (scanData.password.guest_disabled) {
            guestBadge.textContent = "Disabled";
            guestBadge.className = "policy-status-badge badge-on";
        } else {
            guestBadge.textContent = "Active";
            guestBadge.className = "policy-status-badge badge-off";
        }

        const unsafeListEl = document.getElementById('unsafe-files-list');
        unsafeListEl.innerHTML = '';
        document.getElementById('unsafe-files-count-badge').textContent = `${unsafeCount} Found`;
        
        if (unsafeCount === 0) {
            unsafeListEl.innerHTML = `
                <div class="unsafe-empty-state">
                    <i class="fa-solid fa-circle-check text-success"></i>
                    <span>No plaintext password spreadsheets or text logs located in audited paths.</span>
                </div>
            `;
        } else {
            scanData.password.unsafe_files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'unsafe-file-item';
                item.innerHTML = `
                    <i class="fa-solid fa-file-csv"></i>
                    <div class="unsafe-file-meta">
                        <h4>${file.filename}</h4>
                        <p>${file.path}</p>
                    </div>
                    <span class="unsafe-file-size">${file.size_kb} KB</span>
                `;
                unsafeListEl.appendChild(item);
            });
        }

        generateReportDocument();
    }

    function updateFirewallBadge(elementId, state) {
        const el = document.getElementById(elementId);
        el.textContent = state;
        el.className = 'badge'; 
        if (state === 'ON') el.classList.add('badge-on');
        else if (state === 'OFF') el.classList.add('badge-off');
        else el.style.backgroundColor = '#94a3b8';
    }

    function populateSoftwareTable(softwareArray) {
        const body = document.getElementById('software-table-body');
        body.innerHTML = '';
        
        if (softwareArray.length === 0) {
            body.innerHTML = `<tr><td colspan="4" class="table-empty">No applications found in registry.</td></tr>`;
            return;
        }

        softwareArray.forEach(app => {
            const tr = document.createElement('tr');
            let dateStr = app.install_date;
            if (dateStr && dateStr.length === 8 && !isNaN(dateStr)) {
                dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            }

            tr.innerHTML = `
                <td><strong>${app.name}</strong></td>
                <td>${app.version}</td>
                <td>${app.publisher}</td>
                <td><code>${dateStr}</code></td>
            `;
            body.appendChild(tr);
        });
    }

    softwareSearchInput.addEventListener('input', (e) => {
        if (!scanData || !scanData.software) return;
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            populateSoftwareTable(scanData.software);
            return;
        }

        const filtered = scanData.software.filter(app => {
            return app.name.toLowerCase().includes(query) || 
                   app.publisher.toLowerCase().includes(query) ||
                   app.version.toLowerCase().includes(query);
        });

        populateSoftwareTable(filtered);
    });

    let compiledReportMarkdown = "";

    function generateReportDocument() {
        if (!scanData) return;

        const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let unsafeFilesMd = "";
        if (scanData.password.unsafe_files.length === 0) {
            unsafeFilesMd = "* [PASSED] No plain text credential files detected on Desktop/Documents.";
        } else {
            unsafeFilesMd = `* [WARNING] Detected ${scanData.password.unsafe_files.length} unsafe plaintext files containing credentials keywords:\n`;
            scanData.password.unsafe_files.forEach(f => {
                unsafeFilesMd += `  - Filename: \`${f.filename}\` (${f.size_kb} KB) | Path: \`${f.path}\` \n`;
            });
        }

        let recsListMd = "";
        scanData.recommendations.forEach(r => {
            recsListMd += `* **[${r.severity}] ${r.title}**: ${r.description}\n`;
        });

        compiledReportMarkdown = `# PERSONAL HOST ENDPOINT SECURITY REPORT

**Document ID:** SEC-REP-${new Date().getTime()}  
**Report Generated:** ${scanData.scan_time} (${date})  
**Target Host Monitored:** Local PC Endpoint  
**Audited User Account:** ${scanData.username}

---

## 1. Executive Security Summary

* **Overall Safety Grade:** \`${scanData.grade}\` (${scanData.score}/100)
* **Status Profile:** \`${scanData.status}\`

Your overall system configuration has been graded. Review the detailed security profile highlights below for risk reduction guidelines.

---

## 2. Windows Defender & Firewall Status
- **Domain Network profile:** \`${scanData.firewall.Domain}\`
- **Private Home network profile:** \`${scanData.firewall.Private}\`
- **Public Hotspot network profile:** \`${scanData.firewall.Public}\`
- **General Protection Rating:** ${scanData.firewall.secure ? "SECURED (Recommended)" : "VULNERABLE (Action Required)"}

---

## 3. Account Policies & Credentials Disclosure
- **Minimum Password Length Requirement:** \`${scanData.password.min_length}\` characters
- **Password Reuse History Logs Count:** \`${scanData.password.history_length}\` remembered passwords
- **Guest Session Access Disabled:** \`${scanData.password.guest_disabled ? "YES" : "NO"}\`
${unsafeFilesMd}

---

## 4. Software & Hardware Logs Summary
- **Audited Mounted USB Storage Devices in Log:** \`${scanData.usb.length}\` devices
- **Total Registered Software Applications cataloged:** \`${scanData.software_count}\` installations
- **Web Browser Safety Check Index:** \`${scanData.browser.score}/100\`

---

## 5. Security Recommendations Feed
${recsListMd}

---
*Report compiled by AURA Personal Endpoint SOC. Keep your dashboard updated regularly to capture threat vectors.*
`;

        const previewEl = document.getElementById('report-preview-text');
        previewEl.innerHTML = convertMarkdownToHtml(compiledReportMarkdown);
        btnSaveReport.disabled = false;
    }

    function convertMarkdownToHtml(markdown) {
        let html = markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^---$/gim, '<hr />')
            .replace(/\*\*(.*?)\*\"/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^\s*-\s*(.*$)/gim, '<li>$1</li>');
            
        html = html.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        
        const paragraphs = html.split('\n');
        html = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            if (p.startsWith('<h') || p.startsWith('<u') || p.startsWith('<l') || p.startsWith('<h') || p.startsWith('<hr')) {
                return p;
            }
            return `<p>${p}</p>`;
        }).join('\n');

        return html;
    }

    btnSaveReport.addEventListener('click', async () => {
        if (!compiledReportMarkdown) return;
        try {
            const saveRes = await pywebview.api.save_weekly_report(compiledReportMarkdown);
            if (saveRes && saveRes.success) {
                showToast(`Report saved: ${saveRes.path}`, true);
            } else if (saveRes && saveRes.error !== 'Dialog cancelled') {
                showToast("Save failed: " + saveRes.error, false);
            }
        } catch (err) {
            showToast("Export failed: " + err, false);
        }
    });

    function showToast(message, isSuccess = true) {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toast-icon');
        const msgSpan = document.getElementById('toast-message');

        msgSpan.textContent = message;
        if (isSuccess) {
            icon.className = 'fa-solid fa-circle-check text-success';
        } else {
            icon.className = 'fa-solid fa-circle-exclamation text-danger';
        }

        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3200);
    }

    // ==========================================
    // 📄 ETHICAL PRIVACY AND SECURITY CONSENT
    // ==========================================
    const consentGranted = localStorage.getItem('aura_soc_consent_granted');
    const consentOverlay = document.getElementById('consent-overlay');
    const formConsent = document.getElementById('form-consent');
    const btnCloseConsent = document.getElementById('btn-close-consent');
    
    if (consentGranted !== 'true') {
        if (consentOverlay) consentOverlay.classList.remove('hidden');
        if (authOverlay) authOverlay.classList.add('hidden');
        if (btnCloseConsent) btnCloseConsent.classList.add('hidden');
    } else {
        if (consentOverlay) consentOverlay.classList.add('hidden');
        if (btnCloseConsent) btnCloseConsent.classList.remove('hidden');
    }

    if (formConsent) {
        formConsent.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem('aura_soc_consent_granted', 'true');
            if (consentOverlay) consentOverlay.classList.add('hidden');
            if (btnCloseConsent) btnCloseConsent.classList.remove('hidden');
            
            // Show login interface now that consent is unlocked
            if (!sessionActive && authOverlay) {
                authOverlay.classList.remove('hidden');
            }
            showToast("Consent tokens verified. AURA Personal SOC unlocked!", true);
        });
    }

    if (btnCloseConsent) {
        btnCloseConsent.addEventListener('click', () => {
            if (consentOverlay) consentOverlay.classList.add('hidden');
        });
    }

    const btnViewConsentPolicy = document.getElementById('btn-view-consent-policy');
    const btnResetConsent = document.getElementById('btn-reset-consent');

    if (btnViewConsentPolicy) {
        btnViewConsentPolicy.addEventListener('click', () => {
            if (consentOverlay) consentOverlay.classList.remove('hidden');
        });
    }

    if (btnResetConsent) {
        btnResetConsent.addEventListener('click', () => {
            const confirmReset = confirm("Are you sure you want to revoke consent? This will lock the console and clear your consent status.");
            if (confirmReset) {
                localStorage.removeItem('aura_soc_consent_granted');
                location.reload();
            }
        });
    }
});
