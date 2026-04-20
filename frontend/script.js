const API = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
        window.location.href = 'login.html';
    }
    return res;
}

async function loadEvents() {
    const res = await fetch(`${API}/events`);
    const events = await res.json();
    const container = document.getElementById('eventsList');
    if (container) {
        container.innerHTML = events.map(event => `
            <div class="event-card">
                <strong>${event.title}</strong><br>
                📅 ${new Date(event.datetime).toLocaleString()}<br>
                🔮 Прогнозы: Team A ${event.predictionTeamA} | Team B ${event.predictionTeamB}<br>
                <button onclick="predict(${event.id}, 'A')">Прогноз за команду A</button>
                <button onclick="predict(${event.id}, 'B')">Прогноз за команду B</button>
                <button onclick="loadStream('${event.url}')">🎥 Смотреть эфир</button>
            </div>
        `).join('');
    }
    // Админская таблица
    const adminContainer = document.getElementById('adminEventsList');
    if (adminContainer) {
        adminContainer.innerHTML = events.map(event => `
            <div class="event-card">
                <b>${event.title}</b> (${event.datetime})<br>
                URL: ${event.url}<br>
                <button onclick="editEvent(${event.id}, '${event.title}', '${event.datetime}', '${event.url}')">✏️ Редактировать</button>
                <button onclick="deleteEvent(${event.id})">❌ Удалить</button>
            </div>
        `).join('');
    }
}

async function predict(eventId, choice) {
    await fetchWithAuth(`${API}/events/${eventId}/predict`, {
        method: 'POST',
        body: JSON.stringify({ choice })
    });
    loadEvents();
}

function loadStream(url) {
    const container = document.getElementById('iframeContainer');
    if (container) {
        let embedUrl = url;
        if (url.includes('youtube.com/watch')) {
            embedUrl = url.replace('watch?v=', 'embed/');
        } else if (url.includes('youtu.be')) {
            const id = url.split('/').pop();
            embedUrl = `https://www.youtube.com/embed/${id}`;
        }
        container.innerHTML = `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`;
    }
}

// Админ-функции
document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const title = document.getElementById('title').value;
    const datetime = document.getElementById('datetime').value;
    const url = document.getElementById('url').value;

    if (id) {
        await fetchWithAuth(`${API}/admin/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, datetime, url })
        });
    } else {
        await fetchWithAuth(`${API}/admin/events`, {
            method: 'POST',
            body: JSON.stringify({ title, datetime, url })
        });
    }
    loadEvents();
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').style.display = 'none';
});

window.editEvent = (id, title, datetime, url) => {
    document.getElementById('eventId').value = id;
    document.getElementById('title').value = title;
    document.getElementById('datetime').value = datetime;
    document.getElementById('url').value = url;
    document.getElementById('eventId').style.display = 'block';
};

window.deleteEvent = async (id) => {
    if (confirm('Удалить событие?')) {
        await fetchWithAuth(`${API}/admin/events/${id}`, { method: 'DELETE' });
        loadEvents();
    }
};

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

if (window.location.pathname.includes('index.html') || window.location.pathname.includes('admin.html')) {
    if (!getToken()) window.location.href = 'login.html';
    loadEvents();
}