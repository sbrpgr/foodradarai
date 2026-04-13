const STORAGE_KEY = 'simple_schedule_items_v1';

const scheduleForm = document.getElementById('schedule-form');
const titleInput = document.getElementById('title');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');
const scheduleList = document.getElementById('schedule-list');
const emptyState = document.getElementById('empty-state');
const summary = document.getElementById('summary');
const clearCompletedButton = document.getElementById('clear-completed');

let schedules = loadSchedules();

render();

scheduleForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const date = dateInput.value;
    const note = noteInput.value.trim();

    if (!title || !date) {
        return;
    }

    schedules.push({
        id: crypto.randomUUID(),
        title,
        date,
        note,
        done: false,
        createdAt: Date.now()
    });

    persist();
    scheduleForm.reset();
    titleInput.focus();
    render();
});

clearCompletedButton.addEventListener('click', () => {
    schedules = schedules.filter((item) => !item.done);
    persist();
    render();
});

function loadSchedules() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function render() {
    const sorted = [...schedules].sort((a, b) => {
        if (a.done !== b.done) {
            return Number(a.done) - Number(b.done);
        }

        if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
        }

        return b.createdAt - a.createdAt;
    });

    scheduleList.innerHTML = sorted
        .map((item) => {
            const dateLabel = new Date(item.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });

            return `
                <li class="schedule-item ${item.done ? 'done' : ''}">
                    <div>
                        <p class="title text-lg font-semibold text-slate-800">${escapeHtml(item.title)}</p>
                        <p class="text-sm text-slate-500">${dateLabel}</p>
                        ${item.note ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(item.note)}</p>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button class="btn-secondary" data-action="toggle" data-id="${item.id}">
                            ${item.done ? '미완료' : '완료'}
                        </button>
                        <button class="btn-secondary" data-action="delete" data-id="${item.id}">
                            삭제
                        </button>
                    </div>
                </li>
            `;
        })
        .join('');

    const total = schedules.length;
    const done = schedules.filter((item) => item.done).length;
    summary.textContent = `전체 ${total}개 / 완료 ${done}개 / 진행중 ${total - done}개`;

    emptyState.classList.toggle('hidden', total > 0);
}

scheduleList.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action]');

    if (!target) {
        return;
    }

    const { action, id } = target.dataset;
    const index = schedules.findIndex((item) => item.id === id);

    if (index === -1) {
        return;
    }

    if (action === 'toggle') {
        schedules[index].done = !schedules[index].done;
    }

    if (action === 'delete') {
        schedules.splice(index, 1);
    }

    persist();
    render();
});

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
