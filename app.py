import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

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