from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Student, StudentPerformance
from question_generation import generate_question_and_answers, check_answer, update_question_difficulty
from datetime import datetime, timedelta
from openai import OpenAI

main = Blueprint('main', __name__)

client = None

def init_openai():
    global client
    client = OpenAI(api_key=current_app.config['OPENAI_API_KEY'])

@main.before_app_request
def before_request():
    global client
    if client is None:
        init_openai()

@main.route("/", methods=["GET", "POST"])
@login_required
def index():
    result = None
    show_answer = False
    question_data = None
    start_time = datetime.now()
    student_id = current_user.id
    grade = current_user.grade

    if request.method == "POST":
        user_answer = request.form.get("answer")
        question = request.form.get("question")
        correct_answer = request.form.get("correct_answer")
        explanation = request.form.get("explanation")
        problem_type = request.form.get("problem_type")
        difficulty_level = request.form.get("difficulty_level")

        if user_answer:
            is_correct = check_answer(user_answer, correct_answer)
            response_time = (datetime.now() - start_time).total_seconds()

            performance = StudentPerformance(
                student_id=student_id,
                question=question,
                user_answer=user_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                response_time=response_time,
                problem_type=problem_type
            )
            db.session.add(performance)
            db.session.commit()

            update_question_difficulty(problem_type, is_correct)

            if is_correct:
                result = "Doğru! Yeni bir soru:"
                show_answer = False
                question_data = generate_question_and_answers(grade)
            else:
                result = "Yanlış, doğru cevap ve çözüm yolu gösteriliyor."
                show_answer = True
                question_data = {
                    "question": question,
                    "correct_answer": correct_answer,
                    "explanation": explanation,
                    "problem_type": problem_type,
                    "difficulty_level": difficulty_level
                }
        elif request.form.get("next_question") == "next":
            question_data = generate_question_and_answers(grade)
            result = None
            show_answer = False
        else:
            result = "Lütfen geçerli bir cevap girin."
            show_answer = False
    else:
        question_data = generate_question_and_answers(grade)

    if question_data:
        topic, subtopic = question_data["problem_type"].split(" - ")
        question_data["topic"] = topic
        question_data["subtopic"] = subtopic

    return render_template("index.html", question_data=question_data, result=result, show_answer=show_answer, student_id=student_id)

@main.route("/dashboard/<int:student_id>")
@login_required
def dashboard(student_id):
    student = Student.query.get_or_404(student_id)
    performances = StudentPerformance.query.filter_by(student_id=student_id).order_by(StudentPerformance.timestamp.desc()).all()

    correct_count = sum(1 for p in performances if p.is_correct)
    incorrect_count = sum(1 for p in performances if not p.is_correct)

    category_correct = {}
    category_incorrect = {}

    for p in performances:
        category = p.problem_type.split(' - ')[0]
        if p.is_correct:
            category_correct[category] = category_correct.get(category, 0) + 1
        else:
            category_incorrect[category] = category_incorrect.get(category, 0) + 1

    now = datetime.utcnow()
    daily_progress = {'doğru': 0, 'yanlış': 0}
    weekly_progress = {'doğru': 0, 'yanlış': 0}
    monthly_progress = {'doğru': 0, 'yanlış': 0}

    for p in performances:
        if p.timestamp > now - timedelta(days=1):
            if p.is_correct:
                daily_progress['doğru'] += 1
            else:
                daily_progress['yanlış'] += 1
        if p.timestamp > now - timedelta(weeks=1):
            if p.is_correct:
                weekly_progress['doğru'] += 1
            else:
                weekly_progress['yanlış'] += 1
        if p.timestamp > now - timedelta(days=30):
            if p.is_correct:
                monthly_progress['doğru'] += 1
            else:
                monthly_progress['yanlış'] += 1

    daily_total = daily_progress['doğru'] + daily_progress['yanlış']
    weekly_total = weekly_progress['doğru'] + weekly_progress['yanlış']
    monthly_total = monthly_progress['doğru'] + monthly_progress['yanlış']

    daily_progress_percent = round((daily_total / student.daily_target) * 100, 2) if student.daily_target > 0 else 0
    weekly_progress_percent = round((weekly_total / student.weekly_target) * 100, 2) if student.weekly_target > 0 else 0
    monthly_progress_percent = round((monthly_total / student.monthly_target) * 100, 2) if student.monthly_target > 0 else 0

    return render_template("dashboard.html", student=student, performances=performances,
                           correct_count=correct_count, incorrect_count=incorrect_count,
                           category_correct=category_correct, category_incorrect=category_incorrect,
                           daily_progress=daily_progress_percent, weekly_progress=weekly_progress_percent,
                           monthly_progress=monthly_progress_percent, daily_target=student.daily_target,
                           weekly_target=student.weekly_target, monthly_target=student.monthly_target)

@main.route("/update_goals", methods=["POST"])
@login_required
def update_goals():
    data = request.get_json()
    current_user.daily_target = int(data.get('daily_target'))
    current_user.weekly_target = int(data.get('weekly_target'))
    current_user.monthly_target = int(data.get('monthly_target'))

    db.session.commit()
    return jsonify({"success": True}), 200

@main.route("/start_test/<int:student_id>", methods=["GET", "POST"])
@login_required
def start_test(student_id):
    return redirect(url_for('main.index'))

@main.route("/stop_test", methods=["POST"])
@login_required
def stop_test():
    student_id = request.form.get("student_id")
    if student_id is None:
        return "Student ID not provided", 400

    try:
        student_id = int(student_id)
    except ValueError:
        return "Invalid Student ID", 400

    return redirect(url_for('main.dashboard', student_id=student_id))

@main.route("/performances")
@login_required
def show_performances():
    performances = StudentPerformance.query.all()
    return render_template("performances.html", performances=performances)

@main.route("/api/chat_completion", methods=["POST"])
@login_required
def chat_completion():
    data = request.json
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=data['messages']
        )
        return jsonify(response.choices[0].message.content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route("/api/text_to_speech", methods=["POST"])
@login_required
def text_to_speech():
    data = request.json
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice=data['voice'],
            input=data['input']
        )
        return response.content, 200, {'Content-Type': 'audio/mpeg'}
    except Exception as e:
        return jsonify({"error": str(e)}), 500