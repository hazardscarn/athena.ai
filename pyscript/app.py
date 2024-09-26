import sys
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import traceback
import time

# Configure logging
logging.basicConfig(level=logging.INFO)  # Set root logger to INFO level

# Disable debug logs for specific libraries
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)

# Add the directory containing utils.py to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from pyscript.utils import init_connection, get_user_info, extract_file_content
import pandas as pd
from unit_agent import PlanningAgent
from chatbot import CourseRecommendationChatbot

load_dotenv()
app = Flask(__name__)
# Update CORS configuration
CORS(app, resources={r"/*": {"origins": os.environ.get('ALLOWED_ORIGIN', '*')}})

# Initialize the planner agent
try:
    planner = PlanningAgent()
except Exception as e:
    app.logger.error(f"Error initializing PlanningAgent: {str(e)}")
    raise

# Initialize the connection to the database
try:
    _conn = init_connection()
except Exception as e:
    app.logger.error(f"Error initializing database connection: {str(e)}")
    raise

# Initialize the chatbot
try:
    chatbot = CourseRecommendationChatbot()
except Exception as e:
    app.logger.error(f"Error initializing CourseRecommendationChatbot: {str(e)}")
    raise

@app.route('/generate_plan', methods=['POST', 'OPTIONS'])
def generate_plan():
    if request.method == 'OPTIONS':
        return '', 204
    
    user_id = request.json.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    try:
        start_time = time.time()
        # Log the start of the process
        app.logger.info(f"Starting plan generation for user {user_id}")
        user_info = get_user_info(_conn, user_id)

        # Log after fetching user info
        app.logger.info(f"Fetched user info for {user_id} in {time.time() - start_time:.2f} seconds")

        resume_content = extract_file_content(user_info['resume'])
        
        # Log after extracting resume content
        app.logger.info(f"Extracted resume content for {user_id} in {time.time() - start_time:.2f} seconds")

        themes_df, tasks_df = planner.generate_plan(user_info, resume_content)

        # Log after generating plan
        app.logger.info(f"Generated plan for {user_id} in {time.time() - start_time:.2f} seconds")

        themes_data = themes_df.to_dict('records')[0]
        themes_data['user_id'] = user_id
        _conn.table('user_plan_theme').insert(themes_data).execute()

        tasks_data = tasks_df.to_dict('records')
        for task in tasks_data:
            task['user_id'] = user_id
            task['status'] = 0
            # Ensure task_number is float when inserting
            task['task_number'] = float(task['task_number'])
            _conn.table('user_plan_taskoutline').insert(task).execute()
        
        # Log completion
        app.logger.info(f"Completed plan generation and storage for {user_id} in {time.time() - start_time:.2f} seconds")

        return jsonify({"message": "Plan generated and stored successfully"}), 200

    except Exception as e:
        app.logger.error(f"Error in generate_plan: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return '', 204
    data = request.json
    query = data.get('message')
    conversation_history = data.get('conversation_history', [])
    
    if not query:
        return jsonify({"error": "No message provided"}), 400

    try:
        response = chatbot.get_answer(query, conversation_history)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', os.environ.get('ALLOWED_ORIGIN', '*'))
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)