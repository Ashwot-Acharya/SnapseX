# backend/app.py
from flask import Flask
from components.htt_detector.api import htt_bp   # adjust the import path if needed

app = Flask(__name__)
app.register_blueprint(htt_bp, url_prefix="/api/htt")

if __name__ == '__main__':
    app.run(debug=True, port=5000)   # port 5000 is crucial for Vite proxy