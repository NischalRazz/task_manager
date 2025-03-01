import os
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from collections import defaultdict
import csv
from io import StringIO

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Use the DATABASE_URL provided by Replit
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

@app.route('/')
def index():
    tasks = Task.query.order_by(Task.due_date).all()
    categories = Category.query.all()
    return render_template('index.html', tasks=tasks, categories=categories)

@app.route('/task', methods=['POST'])
def create_task():
    try:
        data = request.form
        task = Task(
            title=data['title'],
            description=data.get('description', ''),
            category_id=data.get('category_id'),
            priority=data['priority'],
            due_date=datetime.strptime(data['due_date'], '%Y-%m-%d') if data['due_date'] else None,
            status='pending'
        )
        db.session.add(task)
        db.session.commit()
        flash('Task created successfully!', 'success')
    except Exception as e:
        flash(f'Error creating task: {str(e)}', 'error')
    return redirect(url_for('index'))

@app.route('/task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    if 'status' in data:
        task.status = data['status']
    if 'priority' in data:
        task.priority = data['priority']
    if 'due_date' in data:
        task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
    if 'category_id' in data:
        task.category_id = data['category_id']

    db.session.commit()
    return jsonify({'message': 'Task updated successfully'})

@app.route('/task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted successfully'})

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/api/analytics')
def get_analytics():
    # Get all tasks
    tasks = Task.query.all()

    # Status distribution
    completed_count = sum(1 for task in tasks if task.status == 'completed')
    pending_count = len(tasks) - completed_count

    # Priority distribution
    priority_counts = {
        'High': sum(1 for task in tasks if task.priority == 'High'),
        'Medium': sum(1 for task in tasks if task.priority == 'Medium'),
        'Low': sum(1 for task in tasks if task.priority == 'Low')
    }

    # Category distribution
    category_distribution = defaultdict(int)
    for task in tasks:
        if task.category:
            category_distribution[task.category.name] += 1

    # Task completion trend (last 7 days)
    today = datetime.utcnow().date()
    dates = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(6, -1, -1)]
    completed_trend = []

    for date_str in dates:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
        completed_count_day = sum(1 for task in tasks 
                            if task.status == 'completed' 
                            and task.created_at.date() == date)
        completed_trend.append(completed_count_day)

    return jsonify({
        'completed_count': completed_count,
        'pending_count': pending_count,
        'priority_high': priority_counts['High'],
        'priority_medium': priority_counts['Medium'],
        'priority_low': priority_counts['Low'],
        'category_distribution': dict(category_distribution),
        'trend_dates': dates,
        'trend_completed': completed_trend
    })

@app.route('/export/tasks')
def export_tasks():
    # Get all tasks with their categories
    tasks = Task.query.all()

    # Create a string buffer for CSV data
    si = StringIO()
    writer = csv.writer(si)

    # Write headers
    writer.writerow(['Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date', 'Created At'])

    # Write task data
    for task in tasks:
        writer.writerow([
            task.title,
            task.description,
            task.status,
            task.priority,
            task.category.name if task.category else 'No Category',
            task.due_date.strftime('%Y-%m-%d') if task.due_date else '',
            task.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])

    # Prepare the response
    output = si.getvalue()
    si.close()

    # Create the response with CSV data
    return send_file(
        StringIO(output),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'tasks_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )

with app.app_context():
    from models import Task, Category
    db.create_all()

    # Create default categories if they don't exist
    default_categories = ['Work', 'Personal', 'Shopping', 'Health']
    for category_name in default_categories:
        if not Category.query.filter_by(name=category_name).first():
            category = Category(name=category_name)
            db.session.add(category)
    db.session.commit()