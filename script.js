// DOM Elements
const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const filterButtons = document.querySelectorAll('.filter-btn');
const priorityButtons = document.querySelectorAll('.priority-btn');
const categoryButtons = document.querySelectorAll('.category-btn');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');
const clearAllBtn = document.getElementById('clearAllBtn');
const totalCount = document.getElementById('totalCount');
const completedCount = document.getElementById('completedCount');
const pendingCount = document.getElementById('pendingCount');
const progressCount = document.getElementById('progressCount');

// State
let tasks = [];
let currentStatusFilter = 'all';
let currentPriorityFilter = 'all';
let currentCategoryFilter = 'all';
let currentSort = 'date-desc';
let searchQuery = '';
let taskChart = null;
let priorityChart = null;
let categoryChart = null;

// Priority & Category Colors
const priorityColors = {
    high: { bg: 'rgba(255, 107, 107, 0.8)', border: '#ff6b6b' },
    medium: { bg: 'rgba(255, 165, 0, 0.8)', border: '#ffa500' },
    low: { bg: 'rgba(76, 175, 80, 0.8)', border: '#4caf50' }
};

const categoryColors = {
    work: 'rgba(52, 168, 224, 0.8)',
    personal: 'rgba(156, 39, 176, 0.8)',
    shopping: 'rgba(244, 67, 54, 0.8)',
    health: 'rgba(76, 175, 80, 0.8)',
    other: 'rgba(158, 158, 158, 0.8)'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
    initCharts();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentStatusFilter = e.target.dataset.filter;
            renderTasks();
        });
    });

    priorityButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            priorityButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPriorityFilter = e.target.dataset.priority;
            renderTasks();
        });
    });

    categoryButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategoryFilter = e.target.dataset.category;
            renderTasks();
        });
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTasks();
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTasks();
    });

    clearAllBtn.addEventListener('click', clearAllTasks);
}

// Add Task
function addTask() {
    const taskText = taskInput.value.trim();
    
    if (taskText === '') {
        alert('Please enter a task!');
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        category: categorySelect.value,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
    renderTasks();
    updateCharts();
    
    // Reset form
    taskInput.value = '';
    dueDateInput.value = '';
    categorySelect.value = 'work';
    prioritySelect.value = 'medium';
    taskInput.focus();
}

// Delete Task
function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
        updateCharts();
    }
}

// Toggle Task Completion
function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateCharts();
    }
}

// Clear All Tasks
function clearAllTasks() {
    if (tasks.length === 0) {
        alert('No tasks to clear!');
        return;
    }
    
    if (confirm('Are you sure you want to delete ALL tasks? This cannot be undone.')) {
        tasks = [];
        saveTasks();
        renderTasks();
        updateCharts();
    }
}

// Render Tasks
function renderTasks() {
    taskList.innerHTML = '';

    let filteredTasks = tasks.filter(task => {
        // Status filter
        if (currentStatusFilter === 'completed' && !task.completed) return false;
        if (currentStatusFilter === 'pending' && task.completed) return false;

        // Priority filter
        if (currentPriorityFilter !== 'all' && task.priority !== currentPriorityFilter) return false;

        // Category filter
        if (currentCategoryFilter !== 'all' && task.category !== currentCategoryFilter) return false;

        // Search filter
        if (searchQuery && !task.text.toLowerCase().includes(searchQuery)) return false;

        return true;
    });

    // Sort tasks
    filteredTasks = sortTasks(filteredTasks);

    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <p>📭 No tasks found</p>
            </div>
        `;
        updateStats();
        return;
    }

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority}`;
        
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let dueDateStr = '';
        let isOverdue = false;

        if (dueDate) {
            dueDateStr = dueDate.toLocaleDateString();
            if (!task.completed && dueDate < today) {
                isOverdue = true;
            }
        }

        li.innerHTML = `
            <input 
                type="checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="toggleTask(${task.id})"
            >
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="task-badge category-badge">${getCategoryEmoji(task.category)} ${task.category}</span>
                    <span class="task-badge priority-badge">${getPriorityEmoji(task.priority)} ${task.priority}</span>
                    ${dueDateStr ? `<span class="due-date ${isOverdue ? 'passed' : ''}">📅 ${dueDateStr}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        `;
        taskList.appendChild(li);
    });

    updateStats();
}

// Sort Tasks
function sortTasks(tasksToSort) {
    const sorted = [...tasksToSort];

    switch (currentSort) {
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'priority':
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'alphabetical':
            sorted.sort((a, b) => a.text.localeCompare(b.text));
            break;
    }

    return sorted;
}

// Update Statistics
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    totalCount.textContent = total;
    completedCount.textContent = completed;
    pendingCount.textContent = pending;
    progressCount.textContent = progress + '%';
}

// Initialize Charts
function initCharts() {
    // Status Chart
    const ctxStatus = document.getElementById('taskChart').getContext('2d');
    taskChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Completed'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['rgba(255, 193, 7, 0.8)', 'rgba(76, 175, 80, 0.8)'],
                borderColor: ['rgba(255, 193, 7, 1)', 'rgba(76, 175, 80, 1)'],
                borderWidth: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 13, weight: 'bold' }, color: '#333' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Priority Chart
    const ctxPriority = document.getElementById('priorityChart').getContext('2d');
    priorityChart = new Chart(ctxPriority, {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                label: 'Tasks',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(255, 165, 0, 0.8)',
                    'rgba(76, 175, 80, 0.8)'
                ],
                borderColor: ['#ff6b6b', '#ffa500', '#4caf50'],
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });

    // Category Chart
    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctxCategory, {
        type: 'pie',
        data: {
            labels: ['Work', 'Personal', 'Shopping', 'Health', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(52, 168, 224, 0.8)',
                    'rgba(156, 39, 176, 0.8)',
                    'rgba(244, 67, 54, 0.8)',
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(158, 158, 158, 0.8)'
                ],
                borderColor: ['#34a8e0', '#9c27b0', '#f44336', '#4caf50', '#9e9e9e'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 12, weight: 'bold' }, color: '#333' }
                }
            }
        }
    });

    updateCharts();
}

// Update Charts
function updateCharts() {
    if (!taskChart || !priorityChart || !categoryChart) return;

    // Status Chart
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.length - completed;
    taskChart.data.datasets[0].data = [pending, completed];
    taskChart.update();

    // Priority Chart
    const highTasks = tasks.filter(t => t.priority === 'high').length;
    const mediumTasks = tasks.filter(t => t.priority === 'medium').length;
    const lowTasks = tasks.filter(t => t.priority === 'low').length;
    priorityChart.data.datasets[0].data = [highTasks, mediumTasks, lowTasks];
    priorityChart.update();

    // Category Chart
    const workTasks = tasks.filter(t => t.category === 'work').length;
    const personalTasks = tasks.filter(t => t.category === 'personal').length;
    const shoppingTasks = tasks.filter(t => t.category === 'shopping').length;
    const healthTasks = tasks.filter(t => t.category === 'health').length;
    const otherTasks = tasks.filter(t => t.category === 'other').length;
    categoryChart.data.datasets[0].data = [workTasks, personalTasks, shoppingTasks, healthTasks, otherTasks];
    categoryChart.update();
}

// Local Storage Functions
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const saved = localStorage.getItem('tasks');
    tasks = saved ? JSON.parse(saved) : [];
}

// Utility Functions
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

function getCategoryEmoji(category) {
    const emojis = {
        work: '💼',
        personal: '👤',
        shopping: '🛒',
        health: '❤️',
        other: '📌'
    };
    return emojis[category] || '📌';
}

function getPriorityEmoji(priority) {
    const emojis = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
    };
    return emojis[priority] || '⚪';
}
