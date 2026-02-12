import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  orderBy,
  writeBatch,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db, ADMIN_UID, NILANTHA_MODERATORS } from "./firebase.js";

let userProfileCache = {}; // Global cache for user profile data (fixes Auth photoURL length limit)
async function getUserProfile(uid) {
  if (userProfileCache[uid]) return userProfileCache[uid];
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    userProfileCache[uid] = snap.data();
    return userProfileCache[uid];
  }
  return null;
}

const appContainer = document.getElementById('app-container');
const headerElement = document.getElementById('app-header');

// --- Theme Toggling ---
function toggleTheme() {
  // Remove any login/register page classes
  document.body.className = '';

  const root = document.documentElement;
  const currentTheme = root.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // Dispatch custom event if needed
  window.dispatchEvent(new Event('theme-change'));
}

// Initial Theme Check
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
document.body.className = ''; // Remove any page-specific classes

// --- Helpers ---
function showFloatingModal(content) {
  const existing = document.getElementById('floating-modal-container');
  if (existing) existing.classList.remove('hidden');
  else {
    const modal = document.createElement('div');
    modal.id = "floating-modal-container";
    modal.className = "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in zoom-in duration-300";
    modal.innerHTML = `
            <div class="smart-card relative max-w-lg w-full m-4 shadow-2xl bg-[var(--bg-secondary)]">
                <button onclick="document.getElementById('floating-modal-container').classList.add('hidden')" class="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl font-bold">&times;</button>
                <div id="modal-content">${content}</div>
            </div>
        `;
    document.body.appendChild(modal);
  }
  // Update content if re-using
  const c = document.getElementById('modal-content');
  if (c) c.innerHTML = content;
}

function closeFloatingModal() {
  const m = document.getElementById('floating-modal-container');
  if (m) m.classList.add('hidden');
}

// --- Header ---
export async function renderHeader(user, navigate, logout) {
  if (!user) {
    headerElement.style.display = 'none';
    return;
  }
  headerElement.style.display = 'flex';

  // Profile Picture Logic (Get from Firestore to avoid Auth photoURL limits)
  const profile = await getUserProfile(user.uid);
  const photoURL = profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=4f46e5&color=fff`;

  headerElement.innerHTML = `
        <div class="flex items-center gap-3 cursor-pointer" onclick="navigateTo('/home')">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                ST
            </div>
            <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] hidden sm:block">StudyTracker</span>
        </div>

        <nav class="hidden md:flex gap-6 items-center flex-1 justify-center">
            <button class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors" onclick="navigateTo('/home')">Dashboard</button>
            <button class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors" onclick="navigateTo('/timetable')">Time Table</button>
            <button class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors" onclick="navigateTo('/recordings')">Lectures</button>
            ${user.uid === ADMIN_UID ? `<button class="text-indigo-400 hover:text-indigo-300 font-bold transition-colors" onclick="navigateTo('/adminpanel')">Admin</button>` : ''}
        </nav>

        <div class="flex items-center gap-4">
            <button id="theme-btn" class="theme-toggle-btn">
                ${localStorage.getItem('theme') === 'light' ? '🌗' : '☀️'}
            </button>
            
            <div class="relative group">
                <button id="profile-btn" class="w-10 h-10 rounded-full border border-[var(--glass-border)] overflow-hidden transition-transform hover:scale-105 focus:ring-2 focus:ring-indigo-500">
                    <img src="${photoURL}" class="w-full h-full object-cover">
                </button>
                
                <!-- Dropdown -->
                <div class="profile-dropdown">
                    <div class="profile-dropdown-content">
                        <div class="px-3 py-2 border-b border-[var(--glass-border)] mb-1">
                            <p class="text-sm font-bold text-[var(--text-primary)] truncate">${user.displayName}</p>
                            <p class="text-xs text-[var(--text-secondary)] truncate">${user.email}</p>
                        </div>
                        <button class="w-full text-left p-2 hover:bg-[var(--primary)] hover:text-white rounded-lg text-sm text-[var(--text-primary)] transition-colors" onclick="navigateTo('/profile')">Profile Settings</button>
                        ${user.uid === ADMIN_UID ? `<button class="w-full text-left p-2 hover:bg-[var(--primary)] hover:text-white rounded-lg text-sm text-[var(--text-primary)] transition-colors" onclick="navigateTo('/adminpanel')">Admin Dashboard</button>` : ''}
                        <div class="h-px bg-[var(--glass-border)] my-1"></div>
                        <button id="logout-btn" class="w-full text-left p-2 hover:bg-red-500/10 text-red-400 rounded-lg text-sm transition-colors">Sign Out</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.getElementById('theme-btn').onclick = async () => {
    toggleTheme();
    await renderHeader(user, navigate, logout);
  };

  // Proper event listener for logout
  document.getElementById('logout-btn').onclick = async () => {
    try {
      if (window._activityTrackingInterval) {
        clearInterval(window._activityTrackingInterval);
      }
      userProfileCache = {}; // Clear cache on logout
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };
}

// --- Welcome Redirect ---
export function renderWelcome(navigate) { navigate('/login'); }

// --- Login ---
export function renderLogin(navigate) {
  headerElement.style.display = 'none';

  // Force light theme on login page
  document.body.className = 'login-page';
  document.documentElement.setAttribute('data-theme', 'light');

  appContainer.innerHTML = `
        <div class="flex min-h-screen items-center justify-center p-4">
            <div class="smart-card w-full max-w-md bg-[var(--bg-secondary)] relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">Welcome Back</h1>
                    <p class="text-[var(--text-secondary)]">Sign in to continue your progress</p>
                </div>

                <form id="login-form" class="space-y-4">
                    <input type="email" name="email" placeholder="Email" class="smart-input" required>
                    <input type="password" name="password" placeholder="Password" class="smart-input" required>
                    <button type="submit" class="w-full btn-primary py-3 rounded-xl mt-4">Sign In</button>
                </form>

                <div class="my-6 flex items-center gap-4">
                    <hr class="flex-1 border-[var(--glass-border)]">
                    <span class="text-xs text-[var(--text-secondary)]uppercase">Or continue with</span>
                    <hr class="flex-1 border-[var(--glass-border)]">
                </div>

                <button id="google-login" class="w-full bg-[var(--bg-root)] border border-[var(--glass-border)] text-[var(--text-primary)] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--glass-border)] transition-colors">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5"> Google Account
                </button>

                <p class="text-center mt-6 text-sm text-[var(--text-secondary)]">
                    Don't have an account? <a href="#/register" class="text-indigo-400 font-bold hover:underline">Sign up</a>
                </p>
            </div>
        </div>
    `;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
      // Restore theme
      document.body.className = '';
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      navigate('/home');
    } catch (err) { alert(err.message); }
  };

  document.getElementById('google-login').onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const ref = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // Create profile if doesn't exist
        await setDoc(ref, {
          firstName: u.displayName || 'User',
          email: u.email,
          photoURL: u.photoURL,
          examYear: '2026 A/L',
          createdAt: new Date().toISOString()
        });
      }

      // Restore theme
      document.body.className = '';
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      navigate('/home');
    } catch (err) { alert(err.message); }
  };
}

// --- Register ---
export function renderRegister(navigate) {
  headerElement.style.display = 'none';

  // Force light theme on register page
  document.body.className = 'register-page';
  document.documentElement.setAttribute('data-theme', 'light');

  appContainer.innerHTML = `
        <div class="flex min-h-screen items-center justify-center p-4">
             <div class="smart-card w-full max-w-lg bg-[var(--bg-secondary)] relative">
                <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">Create Account</h2>
                <form id="register-form" class="grid gap-4">
                    <div class="grid grid-cols-2 gap-4">
                        <input name="name" placeholder="Full Name" class="smart-input" required>
                        <input name="birthday" onfocus="(this.type='date')" placeholder="Birthday" class="smart-input" required>
                    </div>
                    <input name="email" type="email" placeholder="Email" class="smart-input" required>
                    <input name="phone" placeholder="Phone" class="smart-input" required>
                    <input name="school" placeholder="School" class="smart-input" required>
                    <select name="examYear" class="smart-input">
                        <option value="2026 A/L">2026 A/L</option>
                        <option value="2027 A/L">2027 A/L</option>
                    </select>
                    <input name="password" type="password" placeholder="Password" class="smart-input" required>
                    
                    <button type="submit" class="w-full btn-primary py-3 rounded-xl mt-2">Create Account</button>
                </form>
                
                <div class="my-6 flex items-center gap-4">
                    <hr class="flex-1 border-[var(--glass-border)]">
                    <span class="text-xs text-[var(--text-secondary)] uppercase">Or continue with</span>
                    <hr class="flex-1 border-[var(--glass-border)]">
                </div>

                <button id="google-signup" class="w-full bg-[var(--bg-root)] border border-[var(--glass-border)] text-[var(--text-primary)] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--glass-border)] transition-colors">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5"> Google Account
                </button>
                
                 <p class="text-center mt-4 text-sm text-[var(--text-secondary)]">Already have an account? <a href="#/login" class="text-indigo-400 font-bold hover:underline">Login</a></p>
             </div>
        </div>
    `;

  document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const cred = await createUserWithEmailAndPassword(auth, f.get('email'), f.get('password'));
      await updateProfile(cred.user, { displayName: f.get('name') });
      await setDoc(doc(db, 'users', cred.user.uid), {
        firstName: f.get('name'),
        email: f.get('email'),
        phone: f.get('phone'),
        birthday: f.get('birthday'),
        school: f.get('school'),
        examYear: f.get('examYear'),
        createdAt: new Date().toISOString()
      });
      // Restore theme
      document.body.className = '';
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      navigate('/home');
    } catch (err) { alert(err.message); }
  };

  // Google Sign Up
  document.getElementById('google-signup').onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const ref = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // Create profile if doesn't exist
        await setDoc(ref, {
          firstName: u.displayName || 'User',
          email: u.email,
          photoURL: u.photoURL,
          examYear: '2026 A/L',
          createdAt: new Date().toISOString()
        });
      }

      // Restore theme
      document.body.className = '';
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      navigate('/home');
    } catch (err) {
      alert(err.message);
    }
  };
}

// --- Dashboard ---
export async function renderHome(user) {
  let dailyGoal = 4;
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists() && userDoc.data().dailyGoal) dailyGoal = userDoc.data().dailyGoal;
  } catch (e) { }

  appContainer.innerHTML = `
        <div class="max-w-7xl mx-auto pt-8 pb-12">
            <!-- Greeting & Quick Actions -->
            <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 class="text-3xl font-bold text-[var(--text-primary)]">Hello, ${user.displayName?.split(' ')[0]}! 👋</h1>
                    <p class="text-[var(--text-secondary)]">Track your progress and stay consistent.</p>
                </div>
                <button onclick="openLogEntryModal()" class="btn-primary flex items-center gap-2">
                    <span class="text-xl">+</span> Log Study Time
                </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Main Stats Column -->
                <div class="lg:col-span-2 space-y-8">
                    <!-- Weekly Chart -->
                    <div class="smart-card">
                         <div class="flex justify-between items-center mb-6">
                            <h3 class="font-bold text-[var(--text-primary)]">Weekly Performance 📊</h3>
                            <select id="chart-duration" class="bg-[var(--bg-root)] text-sm text-[var(--text-primary)] border border-[var(--glass-border)] rounded-lg px-3 py-1 outline-none cursor-pointer">
                                <option value="7">Last 7 Days</option>
                                <option value="14">Last 14 Days</option>
                            </select>
                        </div>
                        <div class="h-64"><canvas id="weekly-chart"></canvas></div>
                    </div>

                    <!-- Monthly Chart -->
                    <div class="smart-card">
                         <div class="flex justify-between items-center mb-6">
                            <h3 class="font-bold text-[var(--text-primary)]">Monthly Overview 📅</h3>
                            <span class="text-xs text-[var(--text-secondary)]">Total hours per month</span>
                        </div>
                        <div class="h-64"><canvas id="monthly-chart"></canvas></div>
                    </div>
                </div>

                <!-- Side Panel -->
                <div class="space-y-6">
                    <!-- Daily Goal Widget -->
                    <div class="smart-card text-center relative">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-sm font-bold text-[var(--text-secondary)] uppercase">Daily Goal</h3>
                            <button onclick="editDailyGoal(${dailyGoal})" class="text-indigo-400 hover:text-indigo-300 transition-colors p-2 bg-indigo-500/10 rounded-lg" title="Edit Daily Goal">
                                <span class="text-lg">✏️</span>
                            </button>
                        </div>
                         <div class="relative w-40 h-40 mx-auto flex items-center justify-center">
                            <svg class="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" stroke-width="10" fill="transparent" class="text-[var(--bg-root)]" />
                                <circle id="goal-ring" cx="80" cy="80" r="70" stroke="currentColor" stroke-width="10" fill="transparent" class="text-indigo-500 transition-all duration-1000" stroke-dasharray="439.8" stroke-dashoffset="439.8" stroke-linecap="round" />
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center">
                                <span id="today-hours" class="text-4xl font-bold text-[var(--text-primary)]">0</span>
                                <span class="text-sm text-[var(--text-secondary)]">of ${dailyGoal}h</span>
                            </div>
                        </div>
                        <p id="goal-msg" class="text-sm text-[var(--text-secondary)] mt-4">Keep pushing!</p>
                    </div>

                    <!-- Quick Links -->
                    <div class="smart-card">
                        <h3 class="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">Quick Access</h3>
                        <div class="grid grid-cols-2 gap-3">
                             <button onclick="navigateTo('/timetable')" class="flex flex-col items-center p-4 rounded-xl bg-[var(--bg-root)] hover:bg-[var(--glass-border)] transition-colors border border-[var(--glass-border)]">
                                <span class="text-3xl mb-2">📅</span>
                                <span class="font-bold text-sm text-[var(--text-primary)]">Schedule</span>
                             </button>
                             <button onclick="navigateTo('/recordings')" class="lecture-highlight flex flex-col items-center p-4 rounded-xl transition-all duration-300 border-2">
                                <span class="text-3xl mb-2">🎥</span>
                                <span class="font-bold text-sm">Lectures</span>
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Initialize logic
  let currentDuration = 7;
  const durationSelect = document.getElementById('chart-duration');

  const updateCharts = () => renderCharts(user.uid, dailyGoal, currentDuration);

  durationSelect.onchange = (e) => {
    currentDuration = parseInt(e.target.value);
    updateCharts();
  };

  updateCharts();

  // -- Floating Functions for Window Scope --
  window.editDailyGoal = async (current) => {
    const newGoal = prompt("Set new daily goal (hours):", current);
    if (newGoal && !isNaN(newGoal)) {
      await updateDoc(doc(db, 'users', user.uid), { dailyGoal: Number(newGoal) });
      renderHome(user); // refresh
    }
  };

  window.openLogEntryModal = () => {
    showFloatingModal(`
            <h3 class="text-xl font-bold text-[var(--text-primary)] mb-4">Log Study Session</h3>
            <form id="log-form" class="grid gap-4">
                <input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" class="smart-input">
                <input type="number" name="hours" placeholder="Hours (e.g. 2.5)" step="0.1" max="24" class="smart-input" required>
                <button class="btn-primary w-full py-3 rounded-xl">Save Entry</button>
            </form>
        `);
    document.getElementById('log-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const date = f.date.value;
      const hours = Number(f.hours.value);

      const q = query(collection(db, 'studyLogs'), where('userId', '==', user.uid), where('date', '==', date));
      const s = await getDocs(q);
      if (!s.empty) await updateDoc(doc(db, 'studyLogs', s.docs[0].id), { hours });
      else await addDoc(collection(db, 'studyLogs'), { userId: user.uid, date, hours, createdAt: new Date().toISOString() });

      closeFloatingModal();
      renderHome(user);
    };
  };
}


let weeklyChartInstance = null;
let monthlyChartInstance = null;

async function renderCharts(uid, dailyGoal, days) {
  const q = query(collection(db, 'studyLogs'), where('userId', '==', uid));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => d.data());

  const today = new Date();

  // --- Daily Goal Ring Logic ---
  const todayStr = today.toISOString().slice(0, 10);
  const todayLog = data.find(x => x.date === todayStr);
  const todayHours = todayLog ? todayLog.hours : 0;

  const ring = document.getElementById('goal-ring');
  const todayText = document.getElementById('today-hours');
  if (ring && todayText) {
    todayText.textContent = todayHours;
    const pct = Math.min(todayHours / dailyGoal, 1);
    const dash = 439.8;
    const offset = dash - (dash * pct);
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = pct >= 1 ? 'var(--success)' : 'var(--primary)';
    document.getElementById('goal-msg').textContent = pct >= 1 ? "Goal Reached! 🎉" : `${(dailyGoal - todayHours).toFixed(1)}h remaining`;
  }

  // --- Weekly Line Chart Data ---
  const wLabels = [];
  const wValues = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    wLabels.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
    const entry = data.find(x => x.date === ds);
    wValues.push(entry ? entry.hours : 0);
  }

  // --- Monthly Bar Chart Data ---
  const mData = {};
  data.forEach(d => {
    const k = d.date.slice(0, 7); // YYYY-MM
    mData[k] = (mData[k] || 0) + d.hours;
  });
  const mLabels = Object.keys(mData).sort();
  const mValues = mLabels.map(k => mData[k]);


  // --- Render Weekly ---
  const ctxW = document.getElementById('weekly-chart');
  if (ctxW) {
    if (weeklyChartInstance) weeklyChartInstance.destroy();
    weeklyChartInstance = new Chart(ctxW.getContext('2d'), {
      type: 'line',
      data: {
        labels: wLabels,
        datasets: [{
          label: 'Study Hours',
          data: wValues,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#4f46e5',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(125,125,125,0.1)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // --- Render Monthly ---
  const ctxM = document.getElementById('monthly-chart');
  if (ctxM) {
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(ctxM.getContext('2d'), {
      type: 'bar',
      data: {
        labels: mLabels,
        datasets: [{
          label: 'Total Hours',
          data: mValues,
          backgroundColor: '#06b6d4',
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(125,125,125,0.1)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// --- Admin Panel (Enhanced with Real-time Stats) ---
export async function renderAdmin(user) {
  appContainer.innerHTML = `
        <div class="max-w-7xl mx-auto pt-8">
            <h2 class="text-3xl font-bold text-[var(--text-primary)] mb-6">Admin Console 🛠️</h2>
            
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="smart-card text-center">
                    <h3 class="text-sm font-bold text-[var(--text-secondary)] uppercase mb-2">Active Users</h3>
                    <p id="active-users-count" class="text-4xl font-bold text-indigo-400">—</p>
                    <p class="text-xs text-[var(--text-secondary)] mt-1">Currently online</p>
                </div>
                <div class="smart-card text-center">
                    <h3 class="text-sm font-bold text-[var(--text-secondary)] uppercase mb-2">Daily Logins</h3>
                    <p id="daily-logins-count" class="text-4xl font-bold text-cyan-400">—</p>
                    <p class="text-xs text-[var(--text-secondary)] mt-1">Today's unique visitors</p>
                </div>
                <div class="smart-card text-center">
                    <h3 class="text-sm font-bold text-[var(--text-secondary)] uppercase mb-2">Total Users</h3>
                    <p id="total-users-count" class="text-4xl font-bold text-emerald-400">—</p>
                    <p class="text-xs text-[var(--text-secondary)] mt-1">Registered accounts</p>
                </div>
            </div>
            
            <!-- Filters -->
            <div class="smart-card mb-6">
                <div class="flex flex-wrap gap-4 items-center mb-4">
                    <input id="search-term" placeholder="Search name/email/school..." class="smart-input flex-1 min-w-[200px]">
                    <select id="filter-batch" class="smart-input w-auto">
                        <option value="">All Batches</option>
                        <option value="2026 A/L">2026 A/L</option>
                        <option value="2027 A/L">2027 A/L</option>
                    </select>
                </div>
            </div>

            <div class="smart-card overflow-hidden p-0">
                <div class="overflow-x-auto">
                    <table class="smart-table">
                        <thead class="bg-[var(--bg-root)]">
                            <tr>
                                <th>Student</th>
                                <th>Email</th>
                                <th>School</th>
                                <th>Batch</th>
                                <th>Phone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="user-table-body">
                            <tr><td colspan="6" class="text-center p-8">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

  // Fetch users and set up real-time listener
  const usersSnap = await getDocs(collection(db, 'users'));
  const allUsers = usersSnap.docs.map(dsc => ({ id: dsc.id, ...dsc.data() }));

  // Update total users count
  document.getElementById('total-users-count').textContent = allUsers.length;

  // Track daily logins (users who logged in today)
  const today = new Date().toISOString().slice(0, 10);
  const dailyLoginQuery = query(
    collection(db, 'userActivity'),
    where('date', '==', today)
  );

  // Real-time listener for both Daily Logins and Active Users
  try {
    onSnapshot(dailyLoginQuery, (snapshot) => {
      // 1. Daily Logins (Unique users who had any activity today)
      document.getElementById('daily-logins-count').textContent = snapshot.size || 0;

      // 2. Active Users (Users active within last 5 minutes)
      const updateActiveCount = () => {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        const activeUsers = snapshot.docs.filter(doc => doc.data().lastActive > fiveMinutesAgo);
        const uniqueActiveIds = new Set(activeUsers.map(doc => doc.data().userId));
        document.getElementById('active-users-count').textContent = uniqueActiveIds.size || 0;
      };

      // Initial update
      updateActiveCount();

      // Periodically update active count as time passes (every 30s)
      if (window._adminStatsInterval) clearInterval(window._adminStatsInterval);
      window._adminStatsInterval = setInterval(updateActiveCount, 30000);
    }, (error) => {
      console.log('Activity query error:', error);
      document.getElementById('daily-logins-count').textContent = '0';
      document.getElementById('active-users-count').textContent = '0';
    });
  } catch (e) {
    document.getElementById('daily-logins-count').textContent = '0';
    document.getElementById('active-users-count').textContent = '0';
  }

  const renderTable = (users) => {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = users.map(u => `
            <tr>
                <td class="font-bold">${u.firstName || 'N/A'}</td>
                <td class="text-sm text-[var(--text-secondary)]">${u.email}</td>
                <td>${u.school || '-'}</td>
                <td><span class="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-xs font-bold">${u.examYear || 'N/A'}</span></td>
                <td class="text-sm">${u.phone || '-'}</td>
                <td><button onclick="viewUserDetail('${u.id}')" class="btn-ghost text-xs border border-[var(--glass-border)]">View Full Profile</button></td>
            </tr>
        `).join('');
  };

  renderTable(allUsers);

  // Filtering Logic
  const filter = () => {
    const term = document.getElementById('search-term').value.toLowerCase();
    const batch = document.getElementById('filter-batch').value;
    const filtered = allUsers.filter(u => {
      const matchName = (u.firstName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || (u.school || '').toLowerCase().includes(term);
      const matchBatch = batch ? u.examYear === batch : true;
      return matchName && matchBatch;
    });
    renderTable(filtered);
  };

  document.getElementById('search-term').oninput = filter;
  document.getElementById('filter-batch').onchange = filter;

  window.viewUserDetail = async (uid) => {
    const u = allUsers.find(x => x.id === uid);

    // Fetch logs for mini chart
    const logQ = query(collection(db, 'studyLogs'), where('userId', '==', uid));
    const logSnap = await getDocs(logQ);
    const totalHours = logSnap.docs.reduce((a, b) => a + b.data().hours, 0);

    showFloatingModal(`
            <div class="text-center">
                <div class="w-20 h-20 rounded-full mx-auto bg-slate-700 mb-4 overflow-hidden border-2 border-indigo-500">
                    <img src="${u.photoURL || 'https://ui-avatars.com/api/?name=' + u.firstName}" class="w-full h-full object-cover">
                </div>
                <h3 class="text-2xl font-bold text-[var(--text-primary)]">${u.firstName}</h3>
                <p class="text-[var(--text-secondary)] mb-6">${u.email}</p>
                
                <div class="grid grid-cols-2 gap-4 mb-6 text-left bg-[var(--bg-root)] p-4 rounded-xl">
                    <div><p class="text-xs text-[var(--text-secondary)] uppercase">Batch</p><p class="font-bold">${u.examYear || '-'}</p></div>
                    <div><p class="text-xs text-[var(--text-secondary)] uppercase">School</p><p class="font-bold">${u.school || '-'}</p></div>
                    <div><p class="text-xs text-[var(--text-secondary)] uppercase">Phone</p><p class="font-bold">${u.phone || '-'}</p></div>
                    <div><p class="text-xs text-[var(--text-secondary)] uppercase">Total Study</p><p class="font-bold text-indigo-400">${totalHours} Hrs</p></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                     <button onclick="closeFloatingModal()" class="btn-ghost w-full">Close</button>
                     <button onclick="window.deleteUser('${uid}')" class="bg-red-500/10 text-red-400 hover:bg-red-500/20 py-2 rounded-lg font-bold transition-colors">Delete User</button>
                </div>
            </div>
        `);
  };

  window.deleteUser = async (uid) => {
    if (confirm("Are you sure? This cannot be undone.")) {
      await deleteDoc(doc(db, 'users', uid));
      closeFloatingModal();
      renderAdmin(user);
    }
  };
}

// --- Timetable (with user-specific caching) ---
let timetableCache = {};
let timetableCacheTime = {};
const CACHE_DURATION = 30000; // 30 seconds

export async function renderTimetable(user) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Check cache first (user-specific)
  let data;
  const now = Date.now();
  if (timetableCache[user.uid] && (now - timetableCacheTime[user.uid] < CACHE_DURATION)) {
    data = timetableCache[user.uid];
  } else {
    const docRef = doc(db, "timetable", user.uid);
    const snap = await getDoc(docRef);
    data = snap.exists() ? snap.data() : {};
    timetableCache[user.uid] = data;
    timetableCacheTime[user.uid] = now;
  }

  appContainer.innerHTML = `
        <div class="max-w-7xl mx-auto pt-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-[var(--text-primary)]">Time Table 📅</h2>
                <div class="flex gap-2">
                    <button id="tt-save" class="btn-primary text-sm px-4">Save Changes</button>
                    <button id="tt-pdf" class="btn-ghost border border-[var(--glass-border)] text-sm px-4">Export PDF</button>
                </div>
            </div>
            
            <div class="smart-card p-0 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="smart-table min-w-max">
                        <thead class="bg-[var(--bg-secondary)] text-[var(--primary)]">
                            <tr>
                                <th class="w-24 text-center">Time</th>
                                ${days.map(d => `<th class="text-center">${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${hours.map(h => `
                                <tr>
                                    <td class="text-center font-bold text-[var(--text-secondary)] border-r border-[var(--glass-border)] bg-[var(--bg-root)]">
                                        ${h === 12 ? '12 PM' : (h > 12 ? (h - 12) + ' PM' : h + ' AM')}
                                    </td>
                                    ${days.map((d, i) => {
    const k = `tt_${i}_${h}`;
    return `<td class="p-1"><input id="${k}" value="${data[k] || ''}" class="w-full bg-transparent border-none text-center outline-none text-sm placeholder-opacity-20 hover:bg-[var(--bg-root)] focus:bg-[var(--bg-root)] rounded transition-colors py-2" placeholder="-"></td>`;
  }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

  document.getElementById('tt-save').onclick = async () => {
    const newData = {};
    hours.forEach(h => days.forEach((d, i) => { const k = `tt_${i}_${h}`; const v = document.getElementById(k).value; if (v) newData[k] = v; }));
    const docRef = doc(db, "timetable", user.uid);
    await setDoc(docRef, newData);
    // Update cache
    timetableCache[user.uid] = newData;
    timetableCacheTime[user.uid] = Date.now();
    alert("Timetable Saved!");
  };

  // PDF Logic
  document.getElementById('tt-pdf').onclick = () => {
    const pdf = new jspdf.jsPDF('l', 'pt', 'a4');
    const body = hours.map(h => [h > 12 ? h - 12 + ' PM' : h + ' AM', ...days.map((d, i) => document.getElementById(`tt_${i}_${h}`).value || '')]);
    pdf.autoTable({ head: [['Time', ...days]], body, theme: 'grid', styles: { fillColor: [30, 41, 59], textColor: 255 }, headStyles: { fillColor: [79, 70, 229] } });
    pdf.save('TimeTable.pdf');
  };
}

// --- Dynamic Content Management (Order, Edit, Delete) ---
// --- Content Actions helper (re-export safe) ---
window.deleteItem = async (id) => { if (confirm("Remove this item?")) { await deleteDoc(doc(db, "lessonContents", id)); document.dispatchEvent(new CustomEvent('refresh-content')); } };
window.editItem = async (id, oldText, oldLink) => {
  const text = prompt("Edit Title:", oldText);
  const link = prompt("Edit Link:", oldLink);
  if (text && link) { await updateDoc(doc(db, "lessonContents", id), { text, link }); document.dispatchEvent(new CustomEvent('refresh-content')); }
};

// Move item up/down
window.moveItemUp = async (id, currentIndex, lessonId) => {
  try {
    // Get all items for this lesson
    const q = query(collection(db, "lessonContents"), where("lessonId", "==", lessonId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (currentIndex <= 0) return; // Can't move up if already first

    // Swap with previous item
    const temp = items[currentIndex];
    items[currentIndex] = items[currentIndex - 1];
    items[currentIndex - 1] = temp;

    // Renumber all items
    const batch = writeBatch(db);
    items.forEach((item, index) => {
      const itemRef = doc(db, "lessonContents", item.id);
      batch.update(itemRef, { order: index + 1 });
    });

    await batch.commit();

    // Clear cache for this lesson
    delete contentCache[lessonId];
    delete contentCacheTime[lessonId];

    document.dispatchEvent(new CustomEvent('refresh-content'));
  } catch (error) {
    console.error('Move up error:', error);
    alert('Failed to move item');
  }
};

window.moveItemDown = async (id, currentIndex, lessonId) => {
  try {
    // Get all items for this lesson
    const q = query(collection(db, "lessonContents"), where("lessonId", "==", lessonId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (currentIndex >= items.length - 1) return; // Can't move down if already last

    // Swap with next item
    const temp = items[currentIndex];
    items[currentIndex] = items[currentIndex + 1];
    items[currentIndex + 1] = temp;

    // Renumber all items
    const batch = writeBatch(db);
    items.forEach((item, index) => {
      const itemRef = doc(db, "lessonContents", item.id);
      batch.update(itemRef, { order: index + 1 });
    });

    await batch.commit();

    // Clear cache for this lesson
    delete contentCache[lessonId];
    delete contentCacheTime[lessonId];

    document.dispatchEvent(new CustomEvent('refresh-content'));
  } catch (error) {
    console.error('Move down error:', error);
    alert('Failed to move item');
  }
};
// window.moveItem logic remains but needs to trigger refresh-content

// --- Render Content Page with BIG CARDS (with caching) ---
let contentCache = {};
let contentCacheTime = {};
const CONTENT_CACHE_DURATION = 20000; // 20 seconds

export async function openLessonPage(subject, type, day, user) {
  const lessonId = `${subject}_${type}_${day}`;
  const canEdit = (user.uid === ADMIN_UID) || (NILANTHA_MODERATORS.includes(user.uid) && subject === 'physics-nilantha');

  appContainer.innerHTML = `
        <div class="max-w-5xl mx-auto pt-8">
            <h2 class="text-3xl font-bold text-[var(--text-primary)] mb-6">Day ${day} Content</h2>
            <div id="content-list" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">Loading...</div>
            
            ${canEdit ? `
                <div class="smart-card border-dashed border-2 border-[var(--glass-border)] shadow-none">
                    <h3 class="text-sm font-bold text-[var(--test-secondary)] uppercase mb-4">Upload Material</h3>
                    <div class="flex gap-4">
                        <input id="add-text" placeholder="Title (e.g. Video Part 1)" class="smart-input flex-1">
                        <input id="add-link" placeholder="Share Link URL" class="smart-input flex-1">
                        <button id="add-btn" class="btn-primary">Add</button>
                    </div>
                </div>
            `: ''}
        </div>
    `;

  const loadContent = async (forceRefresh = false) => {
    const list = document.getElementById('content-list');

    // Check cache first
    const now = Date.now();
    if (!forceRefresh && contentCache[lessonId] && contentCacheTime[lessonId] && (now - contentCacheTime[lessonId] < CONTENT_CACHE_DURATION)) {
      renderContentCards(contentCache[lessonId], list, canEdit, lessonId);
      return;
    }

    // Fetch from Firebase
    const q = query(collection(db, "lessonContents"), where("lessonId", "==", lessonId), orderBy("order", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<div class="col-span-full p-8 text-center text-[var(--text-secondary)] italic border border-[var(--glass-border)] rounded-xl">No content uploaded yet.</div>`;
      return;
    }

    const contentData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Update cache
    contentCache[lessonId] = contentData;
    contentCacheTime[lessonId] = now;

    renderContentCards(contentData, list, canEdit, lessonId);
  };

  // Refresh listener for external window functions
  const refreshHandler = () => loadContent(true);
  document.addEventListener('refresh-content', refreshHandler, { once: true });

  if (canEdit) {
    document.getElementById('add-btn').onclick = async () => {
      const text = document.getElementById('add-text').value;
      const link = document.getElementById('add-link').value;
      if (!text || !link) return;
      // get count
      const q = query(collection(db, "lessonContents"), where("lessonId", "==", lessonId));
      const sn = await getDocs(q);
      await addDoc(collection(db, "lessonContents"), { lessonId, text, link, order: sn.size + 1, createdAt: Date.now() });
      document.getElementById('add-text').value = '';
      document.getElementById('add-link').value = '';
      loadContent(true);
    };
  }
  loadContent();
}

function renderContentCards(contentData, listElement, canEdit, lessonId) {
  listElement.innerHTML = contentData.map((item, index) => {
    const isFirst = index === 0;
    const isLast = index === contentData.length - 1;
    return `
                <div class="smart-card recording-card-big relative group">
                    <a href="${item.link}" target="_blank" class="flex flex-col items-center justify-center text-center h-full p-6 text-[var(--text-primary)]">
                        <div class="recording-icon-big text-5xl mb-4 text-indigo-400">▶</div>
                        <h3 class="text-xl font-bold mb-2 group-hover:text-[var(--primary)] transition-colors">${item.text}</h3>
                        <p class="text-xs text-[var(--text-secondary)]">Click to watch</p>
                    </a>
                    ${canEdit ? `
                        <div class="absolute top-2 right-2 flex gap-1 bg-[var(--bg-secondary)] rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity p-1">
                             ${!isFirst ? `<button onclick="moveItemUp('${item.id}', ${index}, '${lessonId}')" class="p-2 hover:text-blue-400" title="Move Up">⬆️</button>` : ''}
                             ${!isLast ? `<button onclick="moveItemDown('${item.id}', ${index}, '${lessonId}')" class="p-2 hover:text-blue-400" title="Move Down">⬇️</button>` : ''}
                             <button onclick="editItem('${item.id}', '${item.text}', '${item.link}')" class="p-2 hover:text-yellow-400" title="Edit">✏️</button>
                             <button onclick="deleteItem('${item.id}')" class="p-2 hover:text-red-400" title="Delete">🗑️</button>
                        </div>
                    ` : ''}
                </div>
            `;
  }).join('');
}

// --- Profile (with Custom Avatar) ---
export async function renderProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  const d = snap.exists() ? snap.data() : {};
  userProfileCache[user.uid] = d; // Sync cache

  appContainer.innerHTML = `
        <div class="max-w-2xl mx-auto pt-10">
            <h2 class="text-3xl font-bold text-[var(--text-primary)] mb-8">Profile Settings</h2>
            
            <div class="smart-card mb-6 flex items-center gap-6">
                 <div class="w-24 h-24 rounded-full border-2 border-indigo-500 overflow-hidden relative group">
                    <img id="profile-preview" src="${d.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}" class="w-full h-full object-cover">
                    <button onclick="changeAvatar()" class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity">Change</button>
                 </div>
                 <div>
                    <h3 class="text-xl font-bold text-[var(--text-primary)]">${d.firstName}</h3>
                    <p class="text-[var(--text-secondary)]">Student • ${d.examYear || 'Batch N/A'}</p>
                 </div>
            </div>

            <form id="profile-form" class="smart-card space-y-4">
                 <div class="grid md:grid-cols-2 gap-4">
                     <div><label class="text-xs uppercase font-bold text-[var(--text-secondary)]">Full Name</label><input name="firstName" value="${d.firstName || ''}" class="smart-input"></div>
                     <div><label class="text-xs uppercase font-bold text-[var(--text-secondary)]">Birthday</label><input name="birthday" value="${d.birthday || ''}" class="smart-input"></div>
                 </div>
                 <div class="grid md:grid-cols-2 gap-4">
                      <div><label class="text-xs uppercase font-bold text-[var(--text-secondary)]">School</label><input name="school" value="${d.school || ''}" class="smart-input"></div>
                      <div><label class="text-xs uppercase font-bold text-[var(--text-secondary)]">Phone</label><input name="phone" value="${d.phone || ''}" class="smart-input"></div>
                 </div>
                 <button class="btn-primary w-full mt-4">Save Changes</button>
            </form>
        </div>
    `;

  window.changeAvatar = async () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Show loading state
      const preview = document.getElementById('profile-preview');
      const originalSrc = preview.src;
      preview.style.opacity = '0.5';

      try {
        // Use Canvas to resize image and reduce Base64 size
        const photoURL = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 400; // Profile pic doesn't need to be huge
              const MAX_HEIGHT = 400;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });

        // Update database (Don't use updateProfile as Auth photoURL has short length limits)
        await updateDoc(doc(db, 'users', user.uid), { photoURL });
        userProfileCache[user.uid] = { ...(userProfileCache[user.uid] || {}), photoURL };

        // Update preview
        preview.src = photoURL;
        preview.style.opacity = '1';
        alert("Profile picture updated!");
        await renderHeader(user, window.navigateTo, signOut);
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to update image. Try a smaller file.');
        preview.src = originalSrc;
        preview.style.opacity = '1';
      }
    };

    input.click();
  };

  document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await updateDoc(doc(db, 'users', user.uid), {
      firstName: f.get('firstName'),
      school: f.get('school'),
      phone: f.get('phone'),
      birthday: f.get('birthday')
    });
    await updateProfile(user, { displayName: f.get('firstName') });
    alert("Profile Updated!");
  };
}

// Preserve other necessary exports (renderSubjects, renderType, etc.) simply referencing the updated styles


export function renderSubjects(navigate) {
  const TEACHERS = [
    { id: 'maths', name: 'Ruwan Darshana', subject: 'Combined Maths', img: 'https://api.combinedmaths.lk/files-public/profiles/281124/1862199793225306112.jpg', color: 'indigo' },
    { id: 'physics', name: 'Anuradha Perera', subject: 'Physics', img: 'https://static.indeepa.lk/lecturer/7/en/652248466c448.jpg', color: 'cyan' },
    { id: 'chemistry', name: 'Amila Dasanayake', subject: 'Chemistry', img: 'https://static.indeepa.lk/lecturer/6/en/6522475ddf2bf.jpg', color: 'emerald' },
    { id: 'physics-nilantha', name: 'Nilantha Jayasooriya', subject: 'Physics', img: 'https://susipvan.lk/img/teachers/2/Nilantha-Jayasooriya.jpg', color: 'rose' }
  ];
  appContainer.innerHTML = `
        <div class="max-w-6xl mx-auto pt-8">
            <h2 class="text-3xl font-bold text-[var(--text-primary)] mb-8">Lecture Hall 📚</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                ${TEACHERS.map(t => `
                    <div class="smart-card p-0 overflow-hidden cursor-pointer group" onclick="navigateTo('/recording/${t.id}')">
                        <div class="h-48 overflow-hidden"><img src="${t.img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"></div>
                        <div class="p-6">
                            <span class="text-xs font-bold uppercase tracking-wider text-${t.color}-400 mb-1 block">${t.subject}</span>
                            <h3 class="text-xl font-bold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">${t.name}</h3>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

export function renderType(subject, navigate) {
  appContainer.innerHTML = `
        <div class="max-w-4xl mx-auto pt-12 text-center">
            <h2 class="text-4xl font-bold text-[var(--text-primary)] mb-4 uppercase tracking-widest">${subject}</h2>
            <div class="grid md:grid-cols-3 gap-6 mt-12">
                ${[{ id: 'theory', icon: '📚', label: 'Theory' }, { id: 'revision', icon: '🔄', label: 'Revision' }, { id: 'paper', icon: '📝', label: 'Paper Class' }]
      .map(i => `<div onclick="navigateTo('/recording/${subject}/${i.id}')" class="smart-card hover:border-indigo-500 cursor-pointer group"><div class="text-6xl mb-4 group-hover:scale-110 transition-transform">${i.icon}</div><h3 class="text-2xl font-bold text-[var(--text-primary)]">${i.label}</h3></div>`).join('')}
            </div>
        </div>
    `;
}

export async function renderLessons(subject, type, navigate, user) {
  appContainer.innerHTML = `
        <div class="max-w-5xl mx-auto pt-8">
            <h2 class="text-2xl font-bold text-[var(--text-primary)] capitalize mb-6">${subject} / ${type}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="lesson-grid"><div class="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div></div>
        </div>
    `;
  const lessonMap = {};
  try {
    const q = query(collection(db, "lessons"), where("subject", "==", subject), where("type", "==", type));
    const snap = await getDocs(q);
    snap.forEach(d => lessonMap[d.data().day] = d.data().title);
  } catch (e) { console.error(e); }
  const grid = document.getElementById('lesson-grid');
  grid.innerHTML = '';
  const canEdit = (user.uid === ADMIN_UID) || (NILANTHA_MODERATORS.includes(user.uid) && subject === 'physics-nilantha'); // Simplified permission check for brevity

  for (let i = 1; i <= 20; i++) {
    const day = String(i).padStart(2, "0");
    const title = lessonMap[day] || `Day ${day} Lesson`;
    const card = document.createElement('div');
    card.className = "smart-card p-4 flex justify-between items-center group cursor-pointer hover:bg-[var(--glass-border)]";
    card.innerHTML = `<div class="flex items-center gap-4" onclick="navigateTo('/recording/${subject}/${type}/lesson${day}')"><div class="w-10 h-10 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">${day}</div><span class="font-medium text-[var(--text-primary)]">${title}</span></div>`;
    if (canEdit) {
      const btn = document.createElement('button');
      btn.innerHTML = `✎`;
      btn.className = "text-[var(--text-secondary)] hover:text-yellow-400 p-2 invisible group-hover:visible";
      btn.onclick = (e) => {
        e.stopPropagation();
        const newT = prompt("Rename Lesson:", title);
        if (newT) setDoc(doc(db, "lessons", `${subject}_${type}_${day}`), { title: newT, subject, type, day, updatedAt: Date.now() }).then(() => renderLessons(subject, type, navigate, user));
      };
      card.appendChild(btn);
    }
    grid.appendChild(card);
  }
}

// --- Mobile Navigation ---
export function updateMobileNav(currentPath) {
  // Remove existing mobile nav
  const existing = document.getElementById('mobile-nav');
  if (existing) existing.remove();

  // Don't show on login/register pages
  if (currentPath === '/login' || currentPath === '/register' || currentPath === '/' || currentPath === '/welcome') {
    return;
  }

  // Determine active state based on path
  const isHome = currentPath === '/home';
  const isTimetable = currentPath === '/timetable';
  const isRecordings = currentPath.startsWith('/recording') || currentPath === '/recordings';
  const isProfile = currentPath === '/profile';
  const isAdmin = currentPath === '/adminpanel';

  const nav = document.createElement('div');
  nav.id = 'mobile-nav';
  nav.className = 'mobile-nav';
  nav.innerHTML = `
    <div class="flex justify-around items-center max-w-md mx-auto">
      <div class="mobile-nav-item ${isHome ? 'active' : ''}" onclick="navigateTo('/home')">
        <span class="text-2xl">🏠</span>
        <span>Home</span>
      </div>
      <div class="mobile-nav-item ${isTimetable ? 'active' : ''}" onclick="navigateTo('/timetable')">
        <span class="text-2xl">📅</span>
        <span>Timetable</span>
      </div>
      <div class="mobile-nav-item ${isRecordings ? 'active' : ''}" onclick="navigateTo('/recordings')">
        <span class="text-2xl">🎥</span>
        <span>Lectures</span>
      </div>
      <div class="mobile-nav-item ${isProfile || isAdmin ? 'active' : ''}" onclick="navigateTo('/profile')">
        <span class="text-2xl">👤</span>
        <span>Profile</span>
      </div>
    </div>
  `;

  document.body.appendChild(nav);
}

// --- User Activity Tracking ---
export async function trackUserActivity(userId) {
  if (!userId) return;

  // Clear existing interval if any
  if (window._activityTrackingInterval) {
    clearInterval(window._activityTrackingInterval);
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const activityRef = doc(db, 'userActivity', `${userId}_${today}`);

    // Update or create activity document
    await setDoc(activityRef, {
      userId: userId,
      date: today,
      lastActive: Date.now()
    }, { merge: true });

    // Set up periodic updates (every 2 minutes while active)
    const intervalId = setInterval(async () => {
      try {
        await updateDoc(activityRef, {
          lastActive: Date.now()
        });
      } catch (e) {
        console.error('Activity tracking update failed:', e);
      }
    }, 2 * 60 * 1000);

    // Store interval ID for cleanup
    window._activityTrackingInterval = intervalId;
  } catch (error) {
    console.error('Failed to track user activity:', error);
  }
}
