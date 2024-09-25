import sys
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import traceback

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Add the directory containing utils.py to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from pyscript.utils import init_connection, get_user_info, extract_file_content
import pandas as pd
from unit_agent import PlanningAgent
from chatbot import CourseRecommendationChatbot

load_dotenv()
app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# Initialize the planner agent
try:
    planner = PlanningAgent()
except Exception as e:
    logging.error(f"Error initializing PlanningAgent: {str(e)}")
    raise

# Initialize the connection to the database
try:
    _conn = init_connection()
except Exception as e:
    logging.error(f"Error initializing database connection: {str(e)}")
    raise

# Initialize the chatbot
try:
    chatbot = CourseRecommendationChatbot()
except Exception as e:
    logging.error(f"Error initializing CourseRecommendationChatbot: {str(e)}")
    raise



@app.route('/generate_plan', methods=['POST'])
def generate_plan():
    user_id = request.json.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    try:
        user_info = get_user_info(_conn, user_id)
        resume_content = extract_file_content(user_info['resume'])

        themes_df, tasks_df = planner.generate_plan(user_info, resume_content)

        print(themes_df)
        print(tasks_df)

        themes_data = themes_df.to_dict('records')[0]
        themes_data['user_id'] = user_id
        _conn.table('user_plan_theme').insert(themes_data).execute()

        #tasks_df.to_csv('tasks_sample.csv', index=False)
        tasks_data = tasks_df.to_dict('records')
        for task in tasks_data:
            task['user_id'] = user_id
            task['status']=0
            # Ensure task_number is float when inserting
            task['task_number'] = float(task['task_number'])
            _conn.table('user_plan_taskoutline').insert(task).execute()

        return jsonify({"message": "Plan generated and stored successfully"}), 200

    except Exception as e:
        logging.error(f"Error in generate_plan: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500



@app.route('/api/chat', methods=['POST'])
def chat():
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



if __name__ == '__main__':
    app.run(debug=True)