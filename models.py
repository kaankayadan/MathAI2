from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from sqlalchemy.orm import Session

db = SQLAlchemy()

class Student(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    school = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(200), nullable=False)
    parent_password = db.Column(db.String(200), nullable=True)
    daily_target = db.Column(db.Integer, default=20)
    weekly_target = db.Column(db.Integer, default=140)
    monthly_target = db.Column(db.Integer, default=600)
    grade = db.Column(db.Integer, nullable=False)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    @classmethod
    def get(cls, id):
        session = Session(db.engine)
        return session.get(cls, id)

class StudentPerformance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    question = db.Column(db.String(500), nullable=False)
    user_answer = db.Column(db.String(200), nullable=False)
    correct_answer = db.Column(db.String(200), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    response_time = db.Column(db.Float, nullable=False)
    problem_type = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship('Student', backref=db.backref('performances', lazy=True))