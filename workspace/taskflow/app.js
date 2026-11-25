// TaskFlow - Enterprise Kanban Application Logic
const STORAGE_KEY = 'taskflow_enterprise_tasks_v1';

// Initial preloaded tasks for instant live presentation
const DEFAULT_TASKS = [
  {
    id: 'task-1',
    title: 'Architect Local LLM Integration',
    desc: 'Connect Ollama backend using streaming WebSockets and dynamic VRAM detection.',
    priority: 'urgent',
    column: 'done',
    dueDate: '2026-11-20'
  },
  {
    id: 'task-2',
    title: 'Build Split-Pane Workspace UI',
    desc: 'Implement React Monaco editor and file explorer tree view matching Antigravity layout.',
    priority: 'high',
    column: 'done',
    dueDate: '2026-11-22'
  },
  {
    id: 'task-3',
    title: 'Optimize GPU Offload Pipeline',
    desc: 'Configure 100% GPU VRAM execution for GeForce MX150 with num_ctx=2048.',
    priority: 'urgent',
    column: 'in_progress',
    dueDate: '2026-11-24'
  },
  {
    id: 'task-4',
    title: 'Implement Kanban Drag & Drop Engine',
    desc: 'Add touch-friendly HTML5 drag and drop column sorting with real-time stats.',
    priority: 'high',
    column: 'in_progress',
    dueDate: '2026-11-25'
  },
  {
    id: 'task-5',
    title: 'Unit Test Coverage & Benchmarks',
    desc: 'Perform stress tests on token generation rates and SQLite transaction safety.',
    priority: 'medium',
    column: 'review',
    dueDate: '2026-11-26'
  },
  {
    id: 'task-6',
    title: 'Containerize & Package Standalone EXE',
    desc: 'Create one-click PyInstaller / Tauri binary executable for distribution.',
    priority: 'low',
    column: 'backlog',
    dueDate: '2026-11-30'
  }
];

class TaskFlowApp {
  constructor() {
    this.tasks = this.loadTasks();
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.initElements();
    this.initEventListeners();
    this.render();
  }

  loadTasks() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_TASKS;
  }

  saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
    this.updateMetrics();
  }

  initElements() {
    this.cardsContainers = document.querySelectorAll('.cards-container');
    this.searchInput = document.getElementById('searchInput');
    this.filterPills = document.querySelectorAll('.pill');
    this.modal = document.getElementById('taskModal');
    this.taskForm = document.getElementById('taskForm');
    this.openModalBtn = document.getElementById('openNewTaskModalBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.cancelModalBtn = document.getElementById('cancelModalBtn');
    this.exportBtn = document.getElementById('exportBtn');
  }

  initEventListeners() {
    // Search
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.render();
    });

    // Filters
    this.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.dataset.filter;
        this.render();
      });
    });

    // Modal
    this.openModalBtn.addEventListener('click', () => this.openModal());
    this.closeModalBtn.addEventListener('click', () => this.closeModal());
    this.cancelModalBtn.addEventListener('click', () => this.closeModal());
    this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Export
    this.exportBtn.addEventListener('click', () => this.exportData());

    // Drag and Drop
    this.cardsContainers.forEach(container => {
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('drag-over');
      });

      container.addEventListener('dragleave', () => {
        container.classList.remove('drag-over');
      });

      container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const targetColumn = container.id.replace('cards-', '');
        this.moveTask(taskId, targetColumn);
      });
    });
  }

  openModal(task = null) {
    document.getElementById('modalTitle').textContent = task ? 'Edit Task' : 'Create New Task';
    document.getElementById('taskId').value = task ? task.id : '';
    document.getElementById('taskTitle').value = task ? task.title : '';
    document.getElementById('taskDesc').value = task ? task.desc : '';
    document.getElementById('taskPriority').value = task ? task.priority : 'medium';
    document.getElementById('taskColumn').value = task ? task.column : 'backlog';
    document.getElementById('taskDueDate').value = task ? task.dueDate : '';
    this.modal.classList.add('active');
  }

  closeModal() {
    this.modal.classList.remove('active');
    this.taskForm.reset();
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const taskData = {
      title: document.getElementById('taskTitle').value.trim(),
      desc: document.getElementById('taskDesc').value.trim(),
      priority: document.getElementById('taskPriority').value,
      column: document.getElementById('taskColumn').value,
      dueDate: document.getElementById('taskDueDate').value
    };

    if (id) {
      // Edit
      const index = this.tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        this.tasks[index] = { ...this.tasks[index], ...taskData };
      }
    } else {
      // Create
      const newTask = {
        id: 'task-' + Date.now(),
        ...taskData
      };
      this.tasks.push(newTask);
    }

    this.saveTasks();
    this.closeModal();
    this.render();
  }

  moveTask(taskId, newColumn) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.column !== newColumn) {
      task.column = newColumn;
      this.saveTasks();
      this.render();
    }
  }

  deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.saveTasks();
      this.render();
    }
  }

  exportData() {
    const blob = new Blob([JSON.stringify(this.tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getFilteredTasks() {
    return this.tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(this.searchQuery) ||
                            t.desc.toLowerCase().includes(this.searchQuery);
      const matchesFilter = this.activeFilter === 'all' || t.priority === this.activeFilter;
      return matchesSearch && matchesFilter;
    });
  }

  updateMetrics() {
    const total = this.tasks.length;
    const inProgress = this.tasks.filter(t => t.column === 'in_progress').length;
    const completed = this.tasks.filter(t => t.column === 'done').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('totalTasksCount').textContent = total;
    document.getElementById('inProgressCount').textContent = inProgress;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('overallProgressBar').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${percent}%`;

    // Update column badge counters
    ['backlog', 'in_progress', 'review', 'done'].forEach(col => {
      const count = this.tasks.filter(t => t.column === col).length;
      document.getElementById(`count-${col}`).textContent = count;
    });
  }

  render() {
    // Clear all column containers
    ['backlog', 'in_progress', 'review', 'done'].forEach(col => {
      document.getElementById(`cards-${col}`).innerHTML = '';
    });

    const filtered = this.getFilteredTasks();

    filtered.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.draggable = true;
      card.dataset.id = task.id;

      card.innerHTML = `
        <div class="card-top">
          <span class="priority-tag priority-${task.priority}">${task.priority}</span>
          <div class="card-actions">
            <button class="card-action-btn edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="card-action-btn delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="card-title">${escapeHtml(task.title)}</div>
        <div class="card-desc">${escapeHtml(task.desc || '')}</div>
        <div class="card-footer">
          <span><i class="fa-regular fa-calendar"></i> ${task.dueDate || 'No due date'}</span>
        </div>
      `;

      // Drag event
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', task.id);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });

      // Actions
      card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(task);
      });
      card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTask(task.id);
      });

      const container = document.getElementById(`cards-${task.column}`);
      if (container) {
        container.appendChild(card);
      }
    });

    this.updateMetrics();
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Launch application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.taskFlowApp = new TaskFlowApp();
});
