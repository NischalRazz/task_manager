document.addEventListener('DOMContentLoaded', function() {
    // Theme toggling
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    function setTheme(theme) {
        htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Initialize theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Task status toggle with animation
    document.querySelectorAll('.task-status-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const taskId = e.target.dataset.taskId;
            const status = e.target.checked ? 'completed' : 'pending';

            try {
                const response = await fetch(`/task/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status }),
                });

                if (response.ok) {
                    const taskCard = document.querySelector(`#task-${taskId}`);
                    taskCard.querySelector('.card').classList.toggle('task-complete', e.target.checked);
                    showToast('Task updated successfully', 'success');
                    updateStatistics();
                }
            } catch (error) {
                showToast('Error updating task', 'danger');
                e.target.checked = !e.target.checked;
            }
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterTasks();
        });
    }

    // Sorting functionality
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            const sortBy = e.target.dataset.sort;
            sortTasks(sortBy);
        });
    });

    // Filter by category
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.addEventListener('click', (e) => {
            document.querySelectorAll('.category-filter').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            filterTasks();
        });
    });

    // Bulk actions
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = bulkActions.querySelector('.selected-count');
    let selectedTasks = new Set();

    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const taskId = e.target.dataset.taskId;
            if (e.target.checked) {
                selectedTasks.add(taskId);
            } else {
                selectedTasks.delete(taskId);
            }
            updateBulkActionsVisibility();
        });
    });

    document.querySelector('.bulk-delete').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete the selected tasks?')) {
            for (const taskId of selectedTasks) {
                try {
                    const response = await fetch(`/task/${taskId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        document.querySelector(`#task-${taskId}`).remove();
                    }
                } catch (error) {
                    showToast('Error deleting task', 'danger');
                }
            }
            selectedTasks.clear();
            updateBulkActionsVisibility();
            updateStatistics();
            showToast('Selected tasks deleted successfully', 'success');
        }
    });

    document.querySelector('.bulk-complete').addEventListener('click', async () => {
        for (const taskId of selectedTasks) {
            try {
                const response = await fetch(`/task/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'completed' }),
                });
                if (response.ok) {
                    const taskCard = document.querySelector(`#task-${taskId}`);
                    taskCard.querySelector('.card').classList.add('task-complete');
                    taskCard.querySelector('.task-status-toggle').checked = true;
                }
            } catch (error) {
                showToast('Error updating task', 'danger');
            }
        }
        selectedTasks.clear();
        updateBulkActionsVisibility();
        updateStatistics();
        showToast('Selected tasks marked as completed', 'success');
    });

    function updateBulkActionsVisibility() {
        const count = selectedTasks.size;
        selectedCount.textContent = `${count} task${count !== 1 ? 's' : ''} selected`;
        bulkActions.classList.toggle('show', count > 0);
    }

    function filterTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = document.querySelector('.category-filter.active')?.dataset.categoryId;

        document.querySelectorAll('.task-card').forEach(card => {
            const title = card.querySelector('.task-title').textContent.toLowerCase();
            const description = card.querySelector('.task-description').textContent.toLowerCase();
            const cardCategoryId = card.dataset.categoryId;

            const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
            const matchesCategory = !selectedCategory || cardCategoryId === selectedCategory;

            card.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
        });
    }

    function sortTasks(sortBy) {
        const taskList = document.querySelector('.task-list .row');
        const tasks = Array.from(document.querySelectorAll('.task-card'));

        tasks.sort((a, b) => {
            const aValue = a.dataset[sortBy];
            const bValue = b.dataset[sortBy];

            if (!aValue) return 1;
            if (!bValue) return -1;

            if (sortBy === 'priority') {
                const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
                return priorityOrder[aValue] - priorityOrder[bValue];
            }

            return aValue.localeCompare(bValue);
        });

        tasks.forEach(task => taskList.appendChild(task));
    }

    function updateStatistics() {
        const stats = {
            completed: document.querySelectorAll('.task-complete').length,
            pending: document.querySelectorAll('.task-card:not(.task-complete)').length,
            highPriority: document.querySelectorAll('.priority-high').length,
            scheduled: document.querySelectorAll('[data-due-date]:not([data-due-date=""])').length
        };

        // Update statistics cards
        document.querySelectorAll('.stats-card').forEach((card, index) => {
            const value = Object.values(stats)[index];
            card.querySelector('.display-4').textContent = value;
        });
    }

    // Export tasks functionality
    const exportButton = document.getElementById('exportTasks');
    if (exportButton) {
        exportButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                window.location.href = '/export/tasks';
                showToast('Downloading tasks export...', 'success');
            } catch (error) {
                showToast('Error exporting tasks', 'danger');
            }
        });
    }
});

function showToast(message, type) {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}