import random
import re
from flask import current_app
from curriculum_data import CURRICULUM
from openai import OpenAI

class QuestionTracker:
    def __init__(self):
        self.asked_questions = set()
        self.performance_tracker = {}

    def get_next_question(self, grade):
        grade_curriculum = CURRICULUM[grade]
        available_questions = [
            (topic, subtopic, objective)
            for topic in grade_curriculum
            for subtopic in grade_curriculum[topic]
            for objective in grade_curriculum[topic][subtopic]
        ]

        unasked_questions = [q for q in available_questions if q not in self.asked_questions]
        if unasked_questions:
            next_question = random.choice(unasked_questions)
        else:
            next_question = random.choice(available_questions)
            self.asked_questions.clear()

        self.asked_questions.add(next_question)
        return next_question

    def update_performance(self, topic, subtopic, is_correct):
        key = (topic, subtopic)
        if key not in self.performance_tracker:
            self.performance_tracker[key] = {"correct_count": 0, "difficulty_level": 1}

        if is_correct:
            self.performance_tracker[key]["correct_count"] += 1
            if self.performance_tracker[key]["correct_count"] >= 3:
                self.performance_tracker[key]["difficulty_level"] = min(3, self.performance_tracker[key]["difficulty_level"] + 1)
                self.performance_tracker[key]["correct_count"] = 0
        else:
            self.performance_tracker[key]["correct_count"] = 0

    def get_difficulty_level(self, topic, subtopic):
        return self.performance_tracker.get((topic, subtopic), {"difficulty_level": 1})["difficulty_level"]

question_tracker = QuestionTracker()

client = None

def init_openai(app):
    global client
    client = OpenAI(api_key=app.config['OPENAI_API_KEY'])

def generate_question_and_answers(grade):
    topic, subtopic, objective = question_tracker.get_next_question(grade)
    difficulty_level = question_tracker.get_difficulty_level(topic, subtopic)

    difficulty_desc = ["kolay", "orta", "zor"][difficulty_level - 1]

    prompt = f"""
    Tecrübeli bir matematik öğretmeni olarak, Türkiye Milli Eğitim Bakanlığı {grade}. sınıf müfredatına uygun,
    günlük yaşamdan esinlenilmiş {difficulty_desc} zorlukta tek bir {topic} konusunda {subtopic} ile ilgili problem oluştur.
    Öğrenme hedefi: {objective}

    Zorluk seviyesi {difficulty_level}/3'tür. Buna göre:
    Seviye 1 (Kolay): Temel kavramları anlamayı ve basit işlemler yapmayı gerektirir.
    Seviye 2 (Orta): Kavramları günlük hayat problemlerine uygulamayı ve birden fazla adım içeren çözümler gerektirir.
    Seviye 3 (Zor): Birden fazla kavramı birleştirmeyi, karmaşık problem çözme becerilerini ve yaratıcı düşünmeyi gerektirir.

    Problem açık ve net olmalı, gereksiz açıklamalar içermemeli ve Milli Eğitim Bakanlığı'nın onaylayabileceği düzeyde kaliteli ve özgün olmalıdır.
    Ayrıca, bu sorunun doğru cevabını ve 3 yanlış cevap seçeneğini de oluştur.
    Cevaplar, sorunun gerektirdiği formatta olmalıdır (örneğin, birden fazla sayı, para birimi, saat formatı vb.).

    Yanıtı şu formatta ver:
    Soru: [Soru metni]
    Doğru Cevap: [Doğru cevap]
    Yanlış Cevap 1: [Yanlış cevap 1]
    Yanlış Cevap 2: [Yanlış cevap 2]
    Yanlış Cevap 3: [Yanlış cevap 3]
    Açıklama: [Sorunun çözümü ve doğru cevabın açıklaması]
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates math problems for Turkish students."},
                {"role": "user", "content": prompt}
            ]
        )

        content = response.choices[0].message.content.strip()

        lines = content.split('\n')
        question = next((line.split(': ', 1)[1].strip() for line in lines if line.startswith('Soru:')), '')
        correct_answer = next((line.split(': ', 1)[1].strip() for line in lines if line.startswith('Doğru Cevap:')), '')
        wrong_answers = [line.split(': ', 1)[1].strip() for line in lines if line.startswith('Yanlış Cevap')]
        explanation = '\n'.join(line for line in lines if line.startswith('Açıklama:')).replace('Açıklama:', '').strip()

        if not all([question, correct_answer, len(wrong_answers) == 3, explanation]):
            raise ValueError("API response does not contain all required parts")

        choices = [correct_answer] + wrong_answers
        random.shuffle(choices)

        return {
            "question": question,
            "choices": choices,
            "correct_answer": correct_answer,
            "explanation": explanation,
            "problem_type": f"{topic} - {subtopic}",
            "difficulty_level": difficulty_level
        }
    except Exception as e:
        print(f"Error generating question: {str(e)}")
        return {
            "question": f"Bu bir örnek {topic} sorusudur. 2 + 2 kaçtır?",
            "choices": ["3", "4", "5", "6"],
            "correct_answer": "4",
            "explanation": "2 + 2 = 4 çünkü iki sayıyı topluyoruz.",
            "problem_type": f"{topic} - {subtopic}",
            "difficulty_level": 1
        }

def check_answer(user_answer: str, correct_answer: str) -> bool:
    user_answer = re.sub(r'\s+', '', user_answer).lower()
    correct_answer = re.sub(r'\s+', '', correct_answer).lower()

    if ',' in correct_answer:
        user_parts = user_answer.split(',')
        correct_parts = correct_answer.split(',')
        return all(up.strip() == cp.strip() for up, cp in zip(user_parts, correct_parts))

    return user_answer == correct_answer

def update_question_difficulty(problem_type: str, is_correct: bool):
    topic, subtopic = problem_type.split(' - ')
    question_tracker.update_performance(topic, subtopic, is_correct)