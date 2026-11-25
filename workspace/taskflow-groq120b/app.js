// app.js - TaskFlow Kanban Board Logic
// Author: Autonomous Assistant
// Description: Implements state management, persistence, rendering, drag-and-drop, modal handling, search & priority filters.

(() => {
    const STORAGE_KEY = 'taskflow_tasks';
    const STATUS = ['Backlog', 'In Progress', 'Review', 'Done'];
    const PRIORITY_COLORS = {
        High: 'high',
        Medium: 'medium',
        Low: 'low'
    };

    // ----- State -----
    let tasks = [];
    let filters = {
        search: '',
        priority: null // 'High' | 'Medium' | 'Low' | null
    };

    // ----- DOM References -----
    const columnEls = {
        Backlog: document.getElementById('backlog-column'),
        'In Progress': document.getElementById('inprogress-column'),
        Review: document.getElementById('review-column'),
        Done: document.getElementById('done-column')
    };
    const statsEls = {
        total: document.getElementById('total-count'),
        Backlog: document.getElementById('backlog-count'),
        'In Progress': document.getElementById('inprogress-count'),
        Review: document.getElementById('review-count'),
        Done: document.getElementById('done-count')
    };
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const taskForm = document.getElementById('task-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const newTaskBtn = document.getElementById('new-task-btn');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // ----- Utility Functions -----
    const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

    const saveToStorage = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    };

    const loadFromStorage = () => {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            try {
                tasks = JSON.parse(data);
            } catch (e) {
                console.error('Failed to parse tasks from storage', e);
                tasks = [];
            }
        }
        if (!tasks.length) {
            // Default sample tasks
            tasks = [
                {
                    id: generateId(),
                    title: 'Design landing page',
                    description: 'Create mockups for the new landing page.',
                    priority: 'High',
                    dueDate: '',
                    status: 'Backlog'
                },
                {
                    id: generateId(),
                    title: 'Set up CI/CD',
                    description: 'Integrate GitHub Actions for automated testing.',
                    priority: 'Medium',
                    dueDate: '',
                    status: 'In Progress'
                },
                {
                    id: generateId(),
                    title: 'User feedback review',
                    description: 'Collect and analyze user feedback from beta.',
                    priority: 'Low',
                    dueDate: '',
                    status: 'Review'
                },
                {
                    id: generateId(),
                    title: 'Release v1.0',
                    description: 'Deploy the first stable version.',
                    priority: 'High',
                    dueDate: '',
                    status: 'Done'
                }
            ];
            saveToStorage();
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // ----- Rendering -----
    const clearColumns = () => {
        Object.values(columnEls).forEach(col => col.innerHTML = '');
    };

    const renderStats = () => {
        const counts = { Backlog: 0, 'In Progress': 0, Review: 0, Done: 0 };
        tasks.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1);
        statsEls.total.textContent = tasks.length;
        Object.entries(counts).forEach(([status, cnt]) => {
            if (statsEls[status]) statsEls[status].textContent = cnt;
        });
    };

    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true;
        card.dataset.id = task.id;

        // Drag events
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            e.currentTarget.classList.add('dragging');
        });
        card.addEventListener('dragend', (e) => {
            e.currentTarget.classList.remove('dragging');
        });

        const titleEl = document.createElement('div');
        titleEl.className = 'task-title';
        titleEl.textContent = task.title;
        card.appendChild(titleEl);

        const metaEl = document.createElement('div');
        metaEl.className = 'task-meta';

        const priorityBadge = document.createElement('span');
        priorityBadge.className = `priority-badge ${PRIORITY_COLORS[task.priority]}`;
        priorityBadge.textContent = task.priority;
        metaEl.appendChild(priorityBadge);

        if (task.dueDate) {
            const dueEl = document.createElement('span');
            dueEl.textContent = formatDate(task.dueDate);
            metaEl.appendChild(dueEl);
        }
        card.appendChild(metaEl);

        // Double click to edit
        card.addEventListener('dblclick', () => openModal(task));

        return card;
    };

    const renderTasks = () => {
        clearColumns();
        const filtered = tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                (t.description && t.description.toLowerCase().includes(filters.search.toLowerCase()));
            const matchesPriority = filters.priority ? t.priority === filters.priority : true;
            return matchesSearch && matchesPriority;
        });
        filtered.forEach(task => {
            const card = createTaskCard(task);
            const container = columnEls[task.status];
            if (container) container.appendChild(card);
        });
        renderStats();
    };

    // ----- Drag & Drop for Columns -----
    const addColumnDnD = (colEl, status) => {
        colEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            colEl.classList.add('drag-over');
        });
        colEl.addEventListener('dragleave', () => {
            colEl.classList.remove('drag-over');
        });
        colEl.addEventListener('drop', (e) => {
            e.preventDefault();
            colEl.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== status) {
                task.status = status;
                saveToStorage();
                renderTasks();
            }
        });
    };

    // ----- Modal Handling -----
    const openModal = (task = null) => {
        modal.classList.remove('hidden');
        if (task) {
            modalTitle.textContent = 'Edit Task';
            taskForm.dataset.editing = task.id;
            taskForm.title.value = task.title;
            taskForm.description.value = task.description;
            taskForm.priority.value = task.priority;
            taskForm.dueDate.value = task.dueDate;
        } else {
            modalTitle.textContent = 'New Task';
            delete taskForm.dataset.editing;
            taskForm.reset();
            taskForm.priority.value = 'Medium';
        }
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form.dataset.editing;
        const newTask = {
            id: id || generateId(),
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            priority: form.priority.value,
            dueDate: form.dueDate.value,
            status: id ? tasks.find(t => t.id === id).status : 'Backlog'
        };
        if (id) {
            // Update existing
            const idx = tasks.findIndex(t => t.id === id);
            if (idx !== -1) tasks[idx] = newTask;
        } else {
            // New task defaults to Backlog
            tasks.push(newTask);
        }
        saveToStorage();
        renderTasks();
        closeModal();
    };

    // ----- Search & Priority Filters -----
    const applyFilters = () => {
        renderTasks();
    };

    // ----- Event Listeners -----
    newTaskBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    taskForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value;
        applyFilters();
    });
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const priority = btn.dataset.priority;
            if (filters.priority === priority) {
                filters.priority = null; // toggle off
                btn.classList.remove('active');
            } else {
                filters.priority = priority;
                filterButtons.forEach(b => b.classList.toggle('active', b === btn));
            }
            applyFilters();
        });
    });

    // Initialize column drag‑and‑drop
    STATUS.forEach(status => {
        const colEl = columnEls[status];
        if (colEl) addColumnDnD(colEl, status);
    });

    // ----- Init -----
    loadFromStorage();
    renderTasks();
})();
