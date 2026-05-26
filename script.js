let currentUser = null;
let reminderKey = 'reminders_default'; // Default key
let reminders = [];
let timeouts = {}; // Stores reminder popups
let isAudioUnlocked = false; // NEW: Track audio unlock state


const loginModal = document.getElementById('loginModal');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const userInfo = document.getElementById('userInfo');
const reminderForm = document.getElementById('reminderForm');
const reminderList = document.getElementById('reminderList');
const noReminders = document.getElementById('noReminders');
const mainVoiceBtn = document.getElementById('mainVoiceBtn');
const conflictModal = document.getElementById('conflictModal');
const conflictText = document.getElementById('conflictText');
const conflictCancel = document.getElementById('conflictCancel');
const conflictAddAnyway = document.getElementById('conflictAddAnyway');

// --- Notification Sound ---
const notificationSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
notificationSound.preload = 'auto';

// --- NEW: Robust Audio Unlock Function ---
function unlockAudio() {
    if (isAudioUnlocked) {
        return; // Audio is already unlocked
    }
    
    // Try to play and pause the sound
    notificationSound.play().then(() => {
        notificationSound.pause();
        notificationSound.currentTime = 0;
        isAudioUnlocked = true;
        console.log("Audio unlocked successfully.");
        // Once unlocked, remove this listener
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    }).catch(error => {
        // This is not a critical error, just a warning
        console.warn("Audio unlock attempt failed:", error);
    });
}

// --- Login/Auth ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser = document.getElementById('username').value.trim();
    if (!currentUser) {
        alert('Please enter a User ID');
        return;
    }
    
    // --- Call the new unlock function on login ---
    unlockAudio();
    // --- END FIX ---

    // Set user-specific key
    reminderKey = `reminders_${currentUser}`;
    
    // Show user info and logout button
    userInfo.innerHTML = `
        <span>Welcome, <strong>${currentUser}</strong></span>
        <button id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>
    `;
    // Add logout listener
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Hide login, show app
    loginModal.classList.remove('show');
    appContainer.classList.add('show');
    
    // Load data and render
    loadReminders();
    renderReminders();
});

function logout() {
    // Clear state
    currentUser = null;
    reminders = [];
    clearAllTimeouts();
    
    // Show login, hide app
    appContainer.classList.remove('show');
    loginModal.classList.add('show');
    
    
    userInfo.innerHTML = '';
    reminderList.innerHTML = '';
    noReminders.style.display = 'block';
    document.getElementById('username').value = '';
}

// --- Data Functions ---
function loadReminders() {
    reminders = JSON.parse(localStorage.getItem(reminderKey)) || [];
}

function saveReminders() {
    localStorage.setItem(reminderKey, JSON.stringify(reminders));
}

function clearAllTimeouts() {
    for (const id in timeouts) {
        clearTimeout(timeouts[id]);
    }
    timeouts = {};
}


function renderReminders() {
    clearAllTimeouts(); // Clear old popups before re-rendering
    list = reminderList;
    list.innerHTML = '';
    
    if (reminders.length === 0) {
        noReminders.style.display = 'block';
        return;
    } 
    
    noReminders.style.display = 'none';
    
    // Sort reminders by date and time (O(n log n))
    reminders.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    
    reminders.forEach(reminder => {
        const card = document.createElement('div');
        card.className = 'reminder-card';
        card.innerHTML = `
            <h3>${reminder.title}</h3>
            <p><i class="fas fa-calendar-alt"></i> ${reminder.date}</p>
            <p><i class="fas fa-clock"></i> ${reminder.time}</p>
            <div class="reminder-actions">
                <!-- "Complete" Button -->
                <button class="complete-btn" data-id="${reminder.id}"><i class="fas fa-check"></i> Complete</button>
                <button class="edit-btn" data-id="${reminder.id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="delete-btn" data-id="${reminder.id}"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
        list.appendChild(card);
    });
    
    schedulePopups();
}

// --- Add Reminder & Conflict Handling ---
reminderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    
    if (!title || !date || !time) {
        alert('Please fill all fields.');
        return;
    }

    const newReminder = {
        id: Date.now(),
        title,
        date,
        time
    };

    // Conflict Check
    const conflict = reminders.find(r => r.date === date && r.time === time);
    
    if (conflict) {
        
        conflictText.textContent = `A reminder "${conflict.title}" already exists at this exact time. What would you like to do?`;
        conflictModal.classList.add('show');
        

        conflictAddAnyway.onclick = () => {
            proceedWithAdd(newReminder);
            conflictModal.classList.remove('show');
        };
        conflictCancel.onclick = () => {
            conflictModal.classList.remove('show');
        };

    } else {
        // No conflict, add directly
        proceedWithAdd(newReminder);
    }
});

function proceedWithAdd(reminder) {
    reminders.push(reminder);
    saveReminders();
    renderReminders();
    reminderForm.reset();
}

// buttons (Complete, Edit, Delete) ---
reminderList.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    const id = parseInt(button.dataset.id);
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    if (button.classList.contains('delete-btn')) {
        reminders = reminders.filter(r => r.id !== id);
        saveReminders();
        if (timeouts[id]) clearTimeout(timeouts[id]);
        renderReminders();
    } else if (button.classList.contains('edit-btn')) {
        const newTitle = prompt('Edit Title:', reminder.title);
        const newDate = prompt('Edit Date (YYYY-MM-DD):', reminder.date);
        const newTime = prompt('Edit Time (HH:MM):', reminder.time);
        
        if (newTitle && newDate && newTime) {
            // Check for conflict on edit
            const conflict = reminders.find(r => r.date === newDate && r.time === newTime && r.id !== id);
            if (conflict) {
                alert(`Error: A reminder ("${conflict.title}") already exists at this exact time.`);
                return;
            }
            
            reminder.title = newTitle;
            reminder.date = newDate;
            reminder.time = newTime;
            saveReminders();
            renderReminders();
        }
    } else if (button.classList.contains('complete-btn')) {
        // Mark as Completed
        const card = e.target.closest('.reminder-card');
        card.classList.add('fade-out-complete');
        
        // Wait for animation (0.5s)
        setTimeout(() => {
            reminders = reminders.filter(r => r.id !== id);
            saveReminders();
            if (timeouts[id]) clearTimeout(timeouts[id]);
            renderReminders();
        }, 500);
    }
});

// --- Toast Notifications (Bigger & With Sound) ---
function showToast(reminder) {
    notificationSound.play().catch(e => {
        console.error("Audio play failed:", e);
        // If it fails, try one last time to unlock
        unlockAudio();
    });

    const toastContainer = document.querySelector('.toast-container') || (() => {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    })();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div>
            <h4><i class="fas fa-bell"></i> Reminder!</h4>
            <p><strong>${reminder.title}</strong></p>
            <p>${reminder.date} at ${reminder.time}</p>
        </div>
        <button class="close-btn">&times;</button>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);

    toast.querySelector('.close-btn').addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    });
}

// --- Popup Scheduling ---
function schedulePopups() {
    const now = new Date();
    reminders.forEach(reminder => {
        const reminderTime = new Date(`${reminder.date}T${reminder.time}`);
        const diff = reminderTime - now;
        
        if (diff > 0 && !timeouts[reminder.id]) {
            timeouts[reminder.id] = setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification(`Reminder: ${reminder.title}`, {
                        body: `Scheduled for ${reminder.date} at ${reminder.time}`,
                        icon: 'https://placehold.co/64x64/4CAF50/FFFFFF?text=🔔'
                    });
                    // Play sound even for system notification
                    notificationSound.play().catch(e => console.error("Audio play failed:", e));
                } else {
                    // Fallback to custom toast (which has sound)
                    showToast(reminder);
                }
                delete timeouts[reminder.id];
            }, diff);
        }
    });
}

// --- Advanced Voice Recognition ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    mainVoiceBtn.addEventListener('click', () => {
        recognition.start();
        mainVoiceBtn.classList.add('listening');
        mainVoiceBtn.title = "Listening...";
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        parseVoiceCommand(transcript);
    };

    recognition.onspeechend = () => {
        // This fires when the user stops talking
        recognition.stop(); // Tell the service to stop processing
    };
    
    // NEW: onend event
    // This event fires when recognition has fully stopped
    recognition.onend = () => {
        mainVoiceBtn.classList.remove('listening');
        mainVoiceBtn.title = "Add Reminder by Voice";
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        // UI reset is now handled by 'onend', which fires after errors too,
        // but we can leave this here as a fallback.
        mainVoiceBtn.classList.remove('listening');
        mainVoiceBtn.title = "Add Reminder by Voice";
    };

} else {
    mainVoiceBtn.style.display = 'none'; // Hide if not supported
}

function parseVoiceCommand(transcript) {
    // Example: "Remind me to call mom on October 31st at 10 AM"
    // Example: "Add reminder go to gym tomorrow at 5:30 PM"
    // Example: "Meeting with boss next Friday at 2 PM"

    let title = transcript;
    let date = new Date();
    let time = null;

    // --- Parse Time ---
    const timeMatch = transcript.match(/at\s+(.*?)(?=\s+on|\s+next|\s+this|$)/i) || transcript.match(/at\s+(.*)/i);
    if (timeMatch) {
        const timeString = timeMatch[1];
        const parsedTime = parseTime(timeString);
        if (parsedTime) {
            date.setHours(parsedTime.hours, parsedTime.minutes, 0);
            time = formatTimeForInput(date);
            // Remove time from title
            title = title.replace(timeMatch[0], '').trim();
        }
    }
    
    // --- Parse Date ---
    const dateMatch = transcript.match(/on\s+(.*?)(?=\s+at|$)/i) || transcript.match(/(tomorrow|today|next\s+\w+)/i);
     if (dateMatch) {
        const dateString = dateMatch[1] || dateMatch[0];
        const parsedDate = parseDate(dateString);
        if (parsedDate) {
            date.setFullYear(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
            // Remove date from title
            title = title.replace(dateMatch[0], '').trim();
        }
    }

    // Clean Title 
  
    title = title.replace(/^(remind me to|add reminder|reminder to|set reminder|meeting with)\s+/i, '').trim();
    
    // Capitalize first letter
    if (title) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    // Set form fields
    document.getElementById('title').value = title;
    document.getElementById('date').value = formatDateForInput(date);
    if (time) {
        document.getElementById('time').value = time;
    }
}

// --- Voice Helper Functions ---

function parseDate(dateString) {
    dateString = dateString.toLowerCase();
    const today = new Date();
    
    if (dateString.includes('today')) {
        return today;
    }
    if (dateString.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    }
    if (dateString.startsWith('next')) {
        const dayName = dateString.split(' ')[1];
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let targetDay = days.indexOf(dayName);
        if (targetDay === -1) return null;
        
        const next = new Date(today);
        next.setDate(today.getDate() + (targetDay + 7 - today.getDay()) % 7);
        // If it's 0, it means today, so add 7
        if (next.getDate() === today.getDate()) {
             next.setDate(next.getDate() + 7);
        }
        return next;
    }
    
    // Try to parse with Date.parse (e.g., "October 31st")
    const parsed = Date.parse(dateString);
    if (!isNaN(parsed)) {
        const d = new Date(parsed);
        // Date.parse might pick a wrong year if no year is specified
        d.setFullYear(today.getFullYear());
        if (d < today) { // If date is in the past, assume next year
            d.setFullYear(today.getFullYear() + 1);
        }
        return d;
    }

    return null; // Could not parse
}

function parseTime(timeString) {
    timeString = timeString.toLowerCase().replace(/\./g, ''); // "5.30" -> "530"
    let hours = 0;
    let minutes = 0;
    let isPM = timeString.includes('pm');

    // "5:30 pm" or "5 30"
    let match = timeString.match(/(\d{1,2})[:\s](\d{2})/);
    if (match) {
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
    } 
    // "5 pm" or "5am"
    else {
        match = timeString.match(/(\d{1,2})/);
        if (!match) return null;
        hours = parseInt(match[0]);
    }

    if (hours < 1 || hours > 12) {
        // Might be 24-hour time
        if(hours >= 0 && hours <= 23) {
            // "17:30"
            match = timeString.match(/(\d{1,2}):(\d{2})/);
            if(match) {
                 return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
            }
        }
    }
    
    if (isPM && hours !== 12) {
        hours += 12;
    }
    if (!isPM && hours === 12) { // 12 AM
        hours = 0;
    }
    
    return { hours, minutes };
}

function formatDateForInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatTimeForInput(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

// --- Initial Setup ---
// Request notification permission on load
if ('Notification' in window) {
    Notification.requestPermission();
}

// --- NEW: Add global listeners to unlock audio on first interaction ---
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);


// Check for initial login (this script runs on load)
// The login modal is shown by default via CSS,
// so no extra JS is needed to show it initially.