const STORAGE_USERS = 'anvil_users';
const STORAGE_MATCHES = 'anvil_matches';
const STORAGE_CURRENT_USER = 'anvil_current_user';

let matches = [];
let currentUser = null;

function initData() {
    let users = localStorage.getItem(STORAGE_USERS);
    if (!users) {
        const defaultUsers = [
            { id: '1', login: 'admin', password: 'admin123', role: 'admin', name: 'Захар (Админ)' },
            { id: '2', login: 'user', password: 'user123', role: 'user', name: 'Дмитрий' }
        ];
        localStorage.setItem(STORAGE_USERS, JSON.stringify(defaultUsers));
    }

    let storedMatches = localStorage.getItem(STORAGE_MATCHES);
    if (!storedMatches) {
        const defaultMatches = [
            { id: 'm1', title: '⚽ ЧМ по футболу: Финал', datetime: getFutureDate(2), streamUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', status: 'upcoming' },
            { id: 'm2', title: '🏀 ANVIL Cup Баскетбол', datetime: getFutureDate(5), streamUrl: 'https://www.youtube.com/embed/3JZ_D3ELwOQ', status: 'upcoming' },
            { id: 'm3', title: '🎮 Киберспорт: LoL Grand Final', datetime: getFutureDate(1), streamUrl: 'https://www.youtube.com/embed/kJQP7kiw5Fk', status: 'upcoming' }
        ];
        localStorage.setItem(STORAGE_MATCHES, JSON.stringify(defaultMatches));
    }
    matches = JSON.parse(localStorage.getItem(STORAGE_MATCHES));
    
    let sessUser = sessionStorage.getItem(STORAGE_CURRENT_USER);
    if (sessUser) {
        currentUser = JSON.parse(sessUser);
    }
}

function getFutureDate(daysFromNow) {
    let date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(20, 0, 0, 0);
    return date.toISOString().slice(0, 16);
}

function saveMatches() {
    localStorage.setItem(STORAGE_MATCHES, JSON.stringify(matches));
}

function getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_USERS));
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function register(login, password, name) {
    const users = getUsers();
    if (users.find(u => u.login === login)) {
        throw new Error('❌ Пользователь с таким логином уже существует');
    }
    const newUser = {
        id: Date.now().toString(),
        login,
        password,
        role: 'user',
        name: name || login
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
}

function login(login, password) {
    const users = getUsers();
    const user = users.find(u => u.login === login && u.password === password);
    if (!user) throw new Error('❌ Неверный логин или пароль');
    const sessionUser = { ...user };
    delete sessionUser.password;
    currentUser = sessionUser;
    sessionStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(currentUser));
    return currentUser;
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem(STORAGE_CURRENT_USER);
    renderApp();
}

function addMatch(title, datetime, streamUrl) {
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Доступ только админу');
    const newMatch = {
        id: Date.now().toString(),
        title,
        datetime,
        streamUrl,
        status: new Date(datetime) <= new Date() ? 'live' : 'upcoming'
    };
    matches.push(newMatch);
    saveMatches();
    renderApp();
}

function updateMatch(id, title, datetime, streamUrl) {
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Доступ только админу');
    const index = matches.findIndex(m => m.id === id);
    if (index !== -1) {
        matches[index] = { 
            ...matches[index], 
            title, 
            datetime, 
            streamUrl,
            status: new Date(datetime) <= new Date() ? 'live' : 'upcoming'
        };
        saveMatches();
        renderApp();
    }
}

function deleteMatch(id) {
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Доступ только админу');
    matches = matches.filter(m => m.id !== id);
    saveMatches();
    renderApp();
}

function renderApp() {
    const app = document.getElementById('app');
    const nav = document.getElementById('nav-links');
    
    if (currentUser) {
        nav.innerHTML = `
            <button class="nav-btn" onclick="window.showMatchesView()">📅 Расписание</button>
            <button class="nav-btn" onclick="window.showLiveView()">📺 Прямые эфиры</button>
            ${currentUser.role === 'admin' ? '<button class="nav-btn" onclick="window.showAdminPanel()">⚙️ Админ панель</button>' : ''}
            <div class="user-info">👤 ${escapeHtml(currentUser.name)} (${currentUser.role === 'admin' ? 'Админ' : 'Пользователь'})</div>
            <button class="logout-btn" onclick="window.logout()">🚪 Выйти</button>
        `;
    } else {
        nav.innerHTML = `<button class="nav-btn" onclick="window.showAuth()">🔐 Вход / Регистрация</button>`;
    }

    if (!currentUser) {
        showAuth();
        return;
    }

    showMatchesView();
}

window.showMatchesView = function() {
    const app = document.getElementById('app');
    const now = new Date();
    const liveMatches = matches.filter(m => new Date(m.datetime) <= now);
    const upcomingMatches = matches.filter(m => new Date(m.datetime) > now);
    
    let html = `<h2>📅 Расписание соревнований и прогнозов ANVIL</h2>`;
    
    if (liveMatches.length > 0) {
        html += `<div class="current-stream"><h3>🔴 ПРЯМО СЕЙЧАС <span class="live-badge">LIVE</span></h3>`;
        liveMatches.forEach(m => {
            html += `
                <div class="match-card" style="border-left-color: #ff0000;">
                    <div class="match-title">${escapeHtml(m.title)}</div>
                    <div class="match-datetime">📅 ${new Date(m.datetime).toLocaleString()}</div>
                    <button onclick="window.watchStream('${m.id}')" class="stream-link">▶ Смотреть эфир</button>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    html += `<div class="matches-grid">`;
    upcomingMatches.forEach(m => {
        html += `
            <div class="match-card">
                <div class="match-title">${escapeHtml(m.title)}</div>
                <div class="match-datetime">📅 ${new Date(m.datetime).toLocaleString()}</div>
                <div class="match-datetime">🎯 Ставки и прогнозы открыты</div>
                <button onclick="window.watchStream('${m.id}')" class="stream-link">🎥 Смотреть трансляцию</button>
            </div>
        `;
    });
    html += `</div>`;
    if (upcomingMatches.length === 0 && liveMatches.length === 0) html += `<p style="text-align:center;">Нет запланированных матчей</p>`;
    app.innerHTML = html;
};

window.watchStream = function(matchId) {
    const match = matches.find(m => m.id === matchId);
    if (!match) {
        alert('Матч не найден');
        return;
    }
    const app = document.getElementById('app');
    app.innerHTML = `
        <button onclick="window.showMatchesView()" class="nav-btn" style="margin-bottom:25px;">← Назад к расписанию</button>
        <div class="match-card">
            <h2 style="color:#ff6b35;">${escapeHtml(match.title)}</h2>
            <div style="margin: 15px 0;">📅 ${new Date(match.datetime).toLocaleString()}</div>
            <div class="iframe-container">
                <iframe src="${escapeHtml(match.streamUrl)}" allowfullscreen></iframe>
            </div>
        </div>
    `;
};

window.showLiveView = function() {
    const app = document.getElementById('app');
    const now = new Date();
    const liveMatches = matches.filter(m => new Date(m.datetime) <= now);
    if (liveMatches.length === 0) {
        app.innerHTML = `<h2>📺 Прямые эфиры ANVIL</h2><p style="text-align:center;">Сейчас нет активных прямых трансляций.</p><button onclick="window.showMatchesView()" class="nav-btn">Вернуться к расписанию</button>`;
        return;
    }
    let html = `<h2>📺 Прямые эфиры ANVIL</h2><div class="matches-grid">`;
    liveMatches.forEach(m => {
        html += `
            <div class="match-card">
                <div class="match-title">🔴 ${escapeHtml(m.title)}</div>
                <button onclick="window.watchStream('${m.id}')" class="stream-link">Смотреть LIVE</button>
            </div>
        `;
    });
    html += `</div><button onclick="window.showMatchesView()" class="nav-btn">К расписанию</button>`;
    app.innerHTML = html;
};

window.showAdminPanel = function() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Нет прав администратора');
        showMatchesView();
        return;
    }
    const app = document.getElementById('app');
    let matchesListHtml = matches.map(m => `
        <div class="match-card" style="margin-bottom:20px;">
            <strong>${escapeHtml(m.title)}</strong> | ${new Date(m.datetime).toLocaleString()}
            <br><small>🔗 ${escapeHtml(m.streamUrl.substring(0, 60))}...</small>
            <div style="margin-top:15px;">
                <button onclick="window.editMatch('${m.id}')">✏️ Редактировать</button>
                <button class="delete-btn" onclick="window.deleteMatchAdmin('${m.id}')">🗑 Удалить</button>
            </div>
        </div>
    `).join('');
    
    app.innerHTML = `
        <div class="admin-panel">
            <h2>⚙️ Админ панель ANVIL</h2>
            <h3>➕ Добавить матч / эфир</h3>
            <div class="form-group">
                <label>Название события</label>
                <input type="text" id="newTitle" placeholder="Финал Кубка ANVIL 2026">
            </div>
            <div class="form-group">
                <label>Дата и время</label>
                <input type="datetime-local" id="newDatetime">
            </div>
            <div class="form-group">
                <label>URL для вставки (iframe src)</label>
                <input type="text" id="newUrl" placeholder="https://www.youtube.com/embed/...">
            </div>
            <button onclick="window.addMatchFromAdmin()">➕ Добавить событие</button>
            
            <h3 style="margin-top:40px;">📋 Управление существующими эфирами</h3>
            <div id="matchesListAdmin">${matchesListHtml || '<p>Нет событий</p>'}</div>
        </div>
        <button onclick="window.showMatchesView()" style="margin-top:20px;">На главную</button>
    `;
};

window.addMatchFromAdmin = function() {
    const title = document.getElementById('newTitle').value;
    const datetime = document.getElementById('newDatetime').value;
    const url = document.getElementById('newUrl').value;
    if (!title || !datetime || !url) {
        alert('Заполните все поля!');
        return;
    }
    addMatch(title, datetime, url);
};

window.editMatch = function(id) {
    const match = matches.find(m => m.id === id);
    if (!match) return;
    const newTitle = prompt('Новое название:', match.title);
    const newDatetime = prompt('Новая дата и время (YYYY-MM-DDTHH:MM):', match.datetime);
    const newUrl = prompt('Новый URL трансляции:', match.streamUrl);
    if (newTitle && newDatetime && newUrl) {
        updateMatch(id, newTitle, newDatetime, newUrl);
    }
};

window.deleteMatchAdmin = function(id) {
    if (confirm('Удалить трансляцию?')) {
        deleteMatch(id);
    }
};

window.showAuth = function() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-container" id="authForm">
            <h2 id="authTitle">Вход в ANVIL</h2>
            <div class="form-group">
                <label>Логин</label>
                <input type="text" id="loginInput" placeholder="admin / user">
            </div>
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" id="passwordInput" placeholder="••••••">
            </div>
            <div class="form-group" id="nameGroup" style="display:none;">
                <label>Ваше имя</label>
                <input type="text" id="nameInput" placeholder="Имя">
            </div>
            <button id="submitAuthBtn">Войти</button>
            <div class="toggle-auth" id="toggleAuthBtn">Нет аккаунта? Зарегистрироваться</div>
            <div id="authError" class="error-msg"></div>
        </div>
    `;
    
    let isLogin = true;
    const titleEl = document.getElementById('authTitle');
    const submitBtn = document.getElementById('submitAuthBtn');
    const nameGroup = document.getElementById('nameGroup');
    const toggleBtn = document.getElementById('toggleAuthBtn');
    const errorDiv = document.getElementById('authError');
    
    const updateForm = () => {
        if (isLogin) {
            titleEl.innerText = 'Вход в ANVIL';
            submitBtn.innerText = 'Войти';
            nameGroup.style.display = 'none';
            toggleBtn.innerText = 'Нет аккаунта? Зарегистрироваться';
        } else {
            titleEl.innerText = 'Регистрация ANVIL';
            submitBtn.innerText = 'Зарегистрироваться';
            nameGroup.style.display = 'block';
            toggleBtn.innerText = 'Уже есть аккаунт? Войти';
        }
    };
    
    toggleBtn.onclick = () => {
        isLogin = !isLogin;
        updateForm();
        errorDiv.innerText = '';
    };
    
    submitBtn.onclick = () => {
        const loginVal = document.getElementById('loginInput').value;
        const passVal = document.getElementById('passwordInput').value;
        try {
            if (isLogin) {
                const user = login(loginVal, passVal);
                renderApp();
            } else {
                const nameVal = document.getElementById('nameInput').value;
                if (!loginVal || !passVal) throw new Error('Заполните все поля');
                register(loginVal, passVal, nameVal);
                alert('✅ Регистрация успешна! Теперь войдите.');
                isLogin = true;
                updateForm();
                errorDiv.innerText = '';
                document.getElementById('passwordInput').value = '';
            }
        } catch (err) {
            errorDiv.innerText = err.message;
        }
    };
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

initData();
renderApp();
