document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'studyPlanner.tasks.v1';

  // Elements
  const taskInput = document.getElementById('taskInput');
  const dueDateInput = document.getElementById('dueDateInput');
  const addBtn = document.getElementById('push');
  const totalTasksEl = document.getElementById('totalTasks');
  const doneTasksEl = document.getElementById('doneTasks');
  const progressBar = document.getElementById('progressBar');
  const taskList = document.getElementById('taskList');

  // Load tasks safely
  let tasks = loadTasks();

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(t => ({
        id: t.id ?? (Date.now() + Math.floor(Math.random()*1000)),
        name: String(t.name ?? ''),
        completed: !!t.completed,
        dueDate: t.dueDate ?? null,
        reminded: !!t.reminded
      }));
    } catch (err) {
      console.error('Error loading tasks:', err);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('Error saving tasks:', err);
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  function formatDateLocal(dStr) {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d)) return dStr;
    return d.toLocaleString();
  }

  function renderTasks() {
    taskList.innerHTML = '';
    if (tasks.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No tasks yet ✨';
      taskList.appendChild(li);
      updateStats();
      return;
    }

    tasks.sort((a,b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return String(a.id).localeCompare(String(b.id));
    });

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task' + (task.completed ? ' completed' : '');
      li.dataset.id = String(task.id);

      const isOverdue = task.dueDate && !task.completed && (new Date(task.dueDate).getTime() < Date.now());
      if (isOverdue) li.classList.add('overdue');

      const left = document.createElement('div');
      left.className = 'left';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'complete-checkbox';
      checkbox.checked = !!task.completed;
      checkbox.setAttribute('aria-label', 'Mark completed');

      const titleWrap = document.createElement('div');
      titleWrap.style.minWidth = '0';
      const title = document.createElement('div');
      title.className = 'title';
      title.innerHTML = escapeHtml(task.name);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = task.dueDate ? `Due: ${formatDateLocal(task.dueDate)}` : '';

      titleWrap.appendChild(title);
      titleWrap.appendChild(meta);

      left.appendChild(checkbox);
      left.appendChild(titleWrap);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const editBtn = document.createElement('button');
      editBtn.className = 'edit';
      editBtn.title = 'Edit';
      editBtn.innerHTML = '✏️';
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete';
      deleteBtn.title = 'Delete';
      deleteBtn.innerHTML = '🗑️';

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(left);
      li.appendChild(actions);
      taskList.appendChild(li);
    });

    updateStats();
  }

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    totalTasksEl.textContent = total;
    doneTasksEl.textContent = done;
    const pct = total ? Math.round((done / total) * 100) : 0;
    progressBar.style.width = pct + '%';
  }

  function addTask() {
    const name = taskInput.value.trim();
    const due = dueDateInput.value || null;

    if (!name) {
      alert('Please enter a task name.');
      return;
    }

    if (due) {
      const d = new Date(due);
      if (isNaN(d)) {
        alert('Invalid due date/time.');
        return;
      }
    }

    const newTask = {
      id: Date.now() + Math.floor(Math.random()*1000),
      name,
      completed: false,
      dueDate: due,
      reminded: false
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    taskInput.value = '';
    dueDateInput.value = '';
    taskInput.focus();
  }

  function editTask(id) {
    const task = tasks.find(t => String(t.id) === String(id));
    if (!task) return;
    const newName = prompt('Edit task title', task.name);
    if (newName === null) return;
    task.name = newName.trim() || task.name;

    const currentDue = task.dueDate || '';
    const newDue = prompt('Edit due date/time (leave empty to remove)\nFormat example: 2025-10-01T14:30', currentDue);
    if (newDue !== null) {
      const trimmed = String(newDue).trim();
      if (trimmed === '') {
        task.dueDate = null;
        task.reminded = false;
      } else {
        const parsed = new Date(trimmed);
        if (isNaN(parsed)) alert('Invalid date format — keeping previous due date.');
        else {
          task.dueDate = trimmed;
          task.reminded = false;
        }
      }
    }
    saveTasks();
    renderTasks();
  }

  function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(t => String(t.id) !== String(id));
    saveTasks();
    renderTasks();
  }

  function toggleComplete(id, value) {
    const t = tasks.find(x => String(x.id) === String(id));
    if (!t) return;
    t.completed = !!value;
    if (t.completed) t.reminded = true;
    saveTasks();
    renderTasks();
  }

  taskList.addEventListener('click', (e) => {
    const li = e.target.closest('li.task');
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.closest('.delete')) {
      deleteTask(id);
      return;
    }
    if (e.target.closest('.edit')) {
      editTask(id);
      return;
    }
  });

  taskList.addEventListener('change', (e) => {
    if (e.target.classList.contains('complete-checkbox')) {
      const li = e.target.closest('li.task');
      const id = li.dataset.id;
      toggleComplete(id, e.target.checked);
    }
  });

  function checkReminders() {
    const now = Date.now();
    let changed = false;
    tasks.forEach(t => {
      if (!t.dueDate || t.completed || t.reminded) return;
      const due = new Date(t.dueDate).getTime();
      if (isNaN(due)) return;
      if (due <= now) {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('⏰ Task Reminder', { body: t.name });
          } catch (err) {
            alert(`Reminder: "${t.name}" is due!`);
          }
        } else {
          alert(`Reminder: "${t.name}" is due!`);
        }
        t.reminded = true;
        changed = true;
      }
    });
    if (changed) {
      saveTasks();
      renderTasks();
    }
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  setInterval(checkReminders, 30000);

  addBtn.addEventListener('click', (e) => { e.preventDefault(); addTask(); });
  taskInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') addTask(); });

  renderTasks();
  checkReminders();
});
