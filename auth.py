from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Student

auth = Blueprint('auth', __name__)

@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        student = Student.query.filter_by(email=email).first()

        if student and check_password_hash(student.password, password):
            login_user(student)
            return redirect(url_for('main.dashboard', student_id=student.id))
        else:
            flash("Invalid email or password")
            return redirect(url_for('auth.login'))
    
    return render_template("login.html")

@auth.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

@auth.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        first_name = request.form.get("first_name")
        last_name = request.form.get("last_name")
        email = request.form.get("email")
        school = request.form.get("school")
        password = request.form.get("password")
        grade = request.form.get("grade")
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

        new_student = Student(first_name=first_name, last_name=last_name, email=email, school=school, password=hashed_password, grade=grade)
        db.session.add(new_student)
        db.session.commit()

        login_user(new_student)
        return redirect(url_for('main.dashboard', student_id=new_student.id))
    
    return render_template("register.html")

@auth.route("/verify_parent_password", methods=["POST"])
@login_required
def verify_parent_password():
    data = request.get_json()
    password = data.get('password')
    
    if not current_user.parent_password:
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        current_user.parent_password = hashed_password
        db.session.commit()
        return jsonify({"success": True, "message": "Parent password set successfully"}), 200
    elif check_password_hash(current_user.parent_password, password):
        return jsonify({"success": True}), 200
    else:
        return jsonify({"success": False, "message": "Incorrect password"}), 401


@auth.route("/change_student_password", methods=["POST"])
@login_required
def change_student_password():
    data = request.get_json()
    new_password = data.get('new_password')
    
    current_user.password = generate_password_hash(new_password, method='pbkdf2:sha256')
    db.session.commit()
    return jsonify({"success": True}), 200

@auth.route("/change_parent_password", methods=["POST"])
@login_required
def change_parent_password():
    data = request.get_json()
    new_password = data.get('new_password')
    
    current_user.parent_password = generate_password_hash(new_password, method='pbkdf2:sha256')
    db.session.commit()
    return jsonify({"success": True}), 200