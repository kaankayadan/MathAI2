import os

class Config:
    SECRET_KEY = 'your_secret_key'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///students.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # OpenAI API anahtarı
    OPENAI_API_KEY = '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'
    
    # Diğer konfigürasyon ayarları
    DEBUG = True
    HOST = "0.0.0.0"
    PORT = 5000