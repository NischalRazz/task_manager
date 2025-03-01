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
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.task-card').forEach(card => {
                const title = card.querySelector('.task-title').textContent.toLowerCase();
                const description = card.querySelector('.task-description').textContent.toLowerCase();
                const isVisible = title.includes(searchTerm) || description.includes(searchTerm);
                card.style.display = isVisible ? 'block' : 'none';
            });
        });
    }

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