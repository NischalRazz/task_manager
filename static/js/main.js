document.addEventListener('DOMContentLoaded', function() {
    // Theme toggling
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Task status toggle
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
                    taskCard.classList.toggle('task-complete', e.target.checked);
                    showToast('Task updated successfully', 'success');
                }
            } catch (error) {
                showToast('Error updating task', 'danger');
                e.target.checked = !e.target.checked;
            }
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.task-card').forEach(card => {
            const title = card.querySelector('.task-title').textContent.toLowerCase();
            const description = card.querySelector('.task-description').textContent.toLowerCase();
            const isVisible = title.includes(searchTerm) || description.includes(searchTerm);
            card.style.display = isVisible ? 'block' : 'none';
        });
    });

    // Filter by category
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.addEventListener('click', (e) => {
            const categoryId = e.target.dataset.categoryId;
            document.querySelectorAll('.task-card').forEach(card => {
                if (!categoryId || card.dataset.categoryId === categoryId) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
});

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
}

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
