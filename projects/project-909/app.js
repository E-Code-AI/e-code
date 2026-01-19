// E-Code Todo App - Complete E2E Test Application
console.log('[TodoApp] Application loaded successfully');

let todos = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[TodoApp] DOM ready, initializing...');
    loadTodos();
    setupEventListeners();
    renderTodos();
    console.log('[TodoApp] Initialization complete');
});

function setupEventListeners() {
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (!text) {
        console.warn('[TodoApp] Cannot add empty todo');
        return;
    }
    
    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    todos.push(todo);
    saveTodos();
    renderTodos();
    input.value = '';
    
    console.log('[TodoApp] Added todo:', todo.text);
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
        console.log('[TodoApp] Toggled todo:', id);
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
    console.log('[TodoApp] Deleted todo:', id);
}

function renderTodos() {
    const list = document.getElementById('todoList');
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        list.innerHTML = '<li style="text-align:center;color:#888;padding:20px;">No tasks found</li>';
    } else {
        list.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <input type="checkbox" class="todo-checkbox" 
                       ${todo.completed ? 'checked' : ''} 
                       onchange="toggleTodo(${todo.id})">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" onclick="deleteTodo(${todo.id})">×</button>
            </li>
        `).join('');
    }
    
    updateStats();
}

function getFilteredTodos() {
    switch (currentFilter) {
        case 'active': return todos.filter(t => !t.completed);
        case 'completed': return todos.filter(t => t.completed);
        default: return todos;
    }
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    
    document.getElementById('totalCount').textContent = `${total} task${total !== 1 ? 's' : ''}`;
    document.getElementById('completedCount').textContent = `${completed} completed`;
}

function saveTodos() {
    try {
        localStorage.setItem('e-code-todos', JSON.stringify(todos));
        console.log('[TodoApp] Saved', todos.length, 'todos');
    } catch (e) {
        console.error('[TodoApp] Failed to save:', e);
    }
}

function loadTodos() {
    try {
        const saved = localStorage.getItem('e-code-todos');
        if (saved) {
            todos = JSON.parse(saved);
            console.log('[TodoApp] Loaded', todos.length, 'todos');
        }
    } catch (e) {
        console.error('[TodoApp] Failed to load:', e);
        todos = [];
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('[TodoApp] Script loaded, waiting for DOM...');