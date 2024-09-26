from flask import Flask
from flask_migrate import Migrate
from flask_login import LoginManager
from sqlalchemy.orm import Session

from models import db, Student
from auth import auth as auth_blueprint
from routes import main as main_blueprint
from question_generation import init_openai
from utils import create_and_update_db

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    migrate = Migrate(app, db)

    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        with app.app_context():
            session = Session(db.engine)
            return session.get(Student, int(user_id))

    init_openai(app)

    app.register_blueprint(auth_blueprint)
    app.register_blueprint(main_blueprint)

    with app.app_context():
        create_and_update_db()

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5001)