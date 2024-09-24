import os
from typing import TypedDict, Annotated, Sequence, Tuple, List, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, END
from langchain_core.pydantic_v1 import BaseModel, Field
import json
from dotenv import load_dotenv
import google.generativeai as genai
import re
import pandas as pd
import sys

# Define the state at module level
class State(TypedDict):
    user_info: dict
    resume_content: str
    current_month: int
    plan: dict

# Define the output schema for the planner at module level
class MonthPlan(BaseModel):
    theme: str = Field(description="The theme or focus for the month")
    tasks: list[str] = Field(description="List of 4-5 specific, actionable tasks for the month")

class PlanningAgent:
    def __init__(self):
        # Load environment variables
        load_dotenv()

        # Configure Gemini
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

        # Initialize the Gemini models
        self.content_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", temperature=0.7)
        self.json_model = genai.GenerativeModel('gemini-1.5-flash-001', generation_config={"response_mime_type": "application/json"})

        # Define the state
        class State(TypedDict):
            user_info: dict
            resume_content: str
            current_month: int
            plan: dict

        self.State = State

        # Define the output schema for the planner
        class MonthPlan(BaseModel):
            theme: str = Field(description="The theme or focus for the month")
            tasks: list[str] = Field(description="List of 4-5 specific, actionable tasks for the month")

        self.MonthPlan = MonthPlan

        # Create the planner chain
        self.planner_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a career development AI assistant. Create a personalized career development plan for the given month based on the user's information, resume, and previous months' plans if any. The plan should help the user progress from their current position to their 1-year goal, addressing their challenges and ultimate aspirations."),
            ("human", """
    User Information:
    Current Position: {current_position}
    Field of Work: {field_of_work}
    Age: {age}
    Gender: {gender}
    Marital Status: {marital_status}
    Education: {education}
    Work Experience: {work_experience}

    1-Year Goal: {one_year_goal}

    Challenges: {challenges}

    Ultimate Aspiration: {ultimate_aspiration}

    Resume Content: {resume_content}

    Current Month: {current_month}
    Previous Plans: {previous_plans}

    Create a plan for month {current_month} that helps the user progress towards their 1-year goal while addressing their 
    challenges and keeping their ultimate aspiration in mind. The plan should include a theme and 3-5 specific, actionable tasks.

    Guidelines that should be followed while creating the plan:
                 
        - Tasks must be relevant to the user's field of work, career goals, and the month's theme.
        - Tasks should be achievable within the month, specific, measurable, and time-bound.
        - Tasks must be actionable and help the user build skills, knowledge, or experience.
        - Ensure the theme and tasks follow the sequence/continuation of previous months' plans, if any.
        - Try to avoid repetitive themes and tasks.
        - It is mandatory to have a theme specified for the month. If no theme can be generated for month, generate a them summarizing the tasks.
        - It is mandatory that atleast one of the tasks in a month will be providing new learning or skill development for the user. It could be a course, a book, a project, a certification, etc.
        - Each task should have an expected time frame for completion (1-4 weeks max).
        - Do not add more than 1000 words in a single task. Make sure the tasks are under 1000 words each max.
        - Make sure all the tasks have an expected time frame for completion.
        - The total tasks for a month should be achievable and not overwhelming.
        - "No theme specified" is not a valid theme.

    Use the following format for plan output:

    Theme: [Month's theme]

    Tasks:
    1. **[Task 1 Title]**
    [Task 1 Description]
    (Expected time frame: X weeks)

    2. **[Task 2 Title]**
    [Task 2 Description]
    (Expected time frame: X weeks)

    3. **[Task 3 Title]**
    [Task 3 Description]
    (Expected time frame: X weeks)

    4. **[Task 4 Title]** (optional)
    [Task 4 Description]
    (Expected time frame: X weeks)
             
    Example output:

    Theme: Foundations of Data Science and Machine Learning

    Tasks:
    1. **Complete Python for Data Science Course**
    Enroll in and complete the "Python for Data Science" course on Coursera. Focus on data manipulation with Pandas, visualization with Matplotlib, and basic machine learning with Scikit-learn.
    (Expected time frame: 3 weeks)

    2. **Build a Predictive Model Project**
    Using a dataset from your current work or a public dataset, build a simple predictive model (e.g., linear regression) to forecast sales or energy consumption. Document your process and results in a Jupyter notebook.
    (Expected time frame: 2 weeks)

    3. **Read "The Data Science Handbook"**
    Start reading "The Data Science Handbook" to gain a broader understanding of data science applications in industry. Focus on chapters relevant to retail/utilities.
    (Expected time frame: 2 weeks)

    4. **Attend Local Data Science Meetup**
    Research and attend at least one local or virtual data science meetup. Network with professionals and learn about current trends in the field.
    (Expected time frame: 1 week)

    Ensure that your output follows this format and adheres to all the guidelines provided.
        """),
        ])

        self.planner_chain = self.planner_prompt | self.content_model

        # Define the graph
        self.workflow = StateGraph(self.State)

        # Add nodes
        self.workflow.add_node("planner", self.plan_month)
        self.workflow.add_node("checker", self.check_plan)

        # Add edges
        self.workflow.add_edge("planner", "checker")
        self.workflow.add_conditional_edges(
            "checker",
            self.router
        )

        # Set entry point
        self.workflow.set_entry_point("planner")

        # Compile the graph
        self.app = self.workflow.compile()


    # def extract_tasks(content: str) -> List[Dict[str, str]]:
    #     tasks = []
    #     task_pattern = re.compile(r'(\d+)\.\s*\*\*(.*?)\*\*\s*(.*?)(?=\n\d+\.\s*\*\*|\Z)', re.DOTALL)
    #     matches = task_pattern.findall(content)
        
    #     for number, title, description in matches:
    #         task = {
    #             'number': float(number),
    #             'content': f"**{title.strip()}** {description.strip()}"
    #         }
    #         tasks.append(task)
        
    #     return tasks
    
    def extract_tasks(self, content: str) -> List[Dict[str, str]]:
        tasks = []
        task_pattern = re.compile(r'(\d+)\.\s*\*\*(.*?)\*\*\s*(.*?)\(Expected time frame:\s*(.*?)\)', re.DOTALL)
        matches = task_pattern.findall(content)
        
        for number, title, description, time_frame in matches:
            task = {
                'number': float(number),
                'content': f"**{title.strip()}**\n{description.strip()}\n(Expected time frame: {time_frame.strip()})"
            }
            tasks.append(task)
        
        return tasks

    def plan_month(self, state: State) -> State:
        current_month = state['current_month']
        previous_plans = json.dumps(state['plan']) if state['plan'] else "No previous plans"
        user_info = state['user_info']
        
        result = self.planner_chain.invoke({
            "current_position": user_info['current_position'],
            "field_of_work": user_info['field_of_work'],
            "age": user_info['age'],
            "gender": user_info['gender'],
            "marital_status": user_info['marital_status'],
            "education": user_info['education'],
            "work_experience": user_info['work_experience'],
            "one_year_goal": user_info['q2'],
            "challenges": user_info['q3'],
            "ultimate_aspiration": user_info['q4'],
            "resume_content": state['resume_content'],
            "current_month": current_month,
            "previous_plans": previous_plans
        })
        
        content = result.content
        theme_match = re.search(r"Theme:\s*(.*)", content)
        theme = theme_match.group(1).strip() if theme_match else "No theme specified"
        
        tasks = self.extract_tasks(content)
        
        state['plan'][f"month_{current_month}"] = {"theme": theme, "tasks": tasks}
        return state

    def check_plan(self, state: State) -> State:
        current_month = state['current_month']
        current_plan = state['plan'][f"month_{current_month}"]
        user_info = state['user_info']
        
        prompt = f"""
        Assess if the given month's plan aligns with the user's needs, addresses their challenges, and builds towards their 1-year goal and ultimate aspiration.
        
        User Info:
        Current Position: {user_info['current_position']}
        1-Year Goal: {user_info['q2']}
        Challenges: {user_info['q3']}
        Ultimate Aspiration: {user_info['q4']}
        
        Current Month: {current_month}
        Current Plan: {json.dumps(current_plan)}
        All Plans: {json.dumps(state['plan'])}
        
        Does this plan align with the user's needs, address their challenges, and build towards their goals? 
        Respond with a JSON object in this format:
        {{
            "result": true or false,
            "explanation": "Brief explanation of your assessment, including suggestions for improvement if the result is false"
        }}
        """
        
        response = self.json_model.generate_content(prompt)
        
        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            print(f"Warning: Failed to parse JSON response. Raw response: {response.text}")
            result = {
                "result": True,
                "explanation": "Unable to parse AI response. Proceeding with the current plan."
            }
        
        state['check_result'] = result.get('result', True)
        state['check_explanation'] = result.get('explanation', 'No explanation provided.')
        state['current_month'] += 1
        return state

    def router(self, state: State) -> str:
        if state['current_month'] > 12:
            return END
        return "planner"

    

    def generate_plan(self, user_info: dict, resume_content: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
        initial_state = State(
            user_info=user_info,
            resume_content=resume_content,
            current_month=1,
            plan={}
        )

        print("Starting the career development plan generation...")
        final_state = None
        for output in self.app.stream(initial_state):
            if isinstance(output, dict):
                if 'planner' in output:
                    current_month = output['planner']['current_month']
                    new_month_plan = output['planner']['plan'].get(f'month_{current_month}')
                    if new_month_plan:
                        print(f"\nNew plan for Month {current_month}:")
                        print(f"Theme: {new_month_plan['theme']}")
                        print("Tasks:")
                        for task in new_month_plan['tasks']:
                            print(f"{task['number']}. {task['content'][:100]}...")  # Print first 100 characters of each task
                elif 'checker' in output:
                    print(f"\nPlan check result: {'Passed' if output['checker'].get('check_result') else 'Failed'}")
                    print(f"Explanation: {output['checker'].get('check_explanation', 'No explanation provided.')}")
            
            final_state = output

        print("\nPlan generation complete. Preparing final output...")

        themes_df = pd.DataFrame(columns=[f'month_{i}' for i in range(1, 13)])
        tasks_df = pd.DataFrame(columns=['month', 'task_number', 'task_outline'])

        if final_state and 'plan' in final_state:
            plan = final_state['plan']
        elif final_state and 'checker' in final_state and 'plan' in final_state['checker']:
            plan = final_state['checker']['plan']
        else:
            print("No complete plan was generated.")
            return pd.DataFrame(), pd.DataFrame()

        themes = {}
        tasks = []
        for month, month_plan in plan.items():
            month_num = int(month.split('_')[1])
            themes[f'month_{month_num}'] = month_plan['theme']
            for task in month_plan['tasks']:
                tasks.append({
                    'month': month_num,
                    'task_number': task['number'],
                    'task_outline': task['content']
                })

        themes_df = pd.DataFrame([themes])
        tasks_df = pd.DataFrame(tasks)

        tasks_df = tasks_df.sort_values('month')

        print("\nExecution complete.")
        return themes_df, tasks_df

# # Usage example:
# if __name__ == "__main__":
#     planner = CareerDevelopmentPlanner()
    
#     user_info = {
#         'id': 12,
#         'created_at': '2024-09-10T04:02:45.410853+00:00',
#         'user_id': '385d7c5e-0527-424c-8eca-607d73700a66',
#         'age': 29,
#         'field_of_work': 'Data Science - Retail Energy',
#         'current_position': 'Data Scientist',
#         'gender': 'male',
#         'marital_status': 'single',
#         'education': 'Bachelors in Electronics & Communication',
#         'work_experience': '7 Years',
#         'resume': 'https://hnksqbzuycvftkzxqmlr.supabase.co/storage/v1/object/public/resumes/0.9077755648550851.pdf',
#         'q2': 'I see myself in a Senior Data Scientist Role at my company. I also would like to see myself publishing a web app, mobile app that generates actual revenue. I also would like to publish a paper and have won multiple hackathons on devpost. I also would like to master and learn more on Gen AI and ML content UpToDate',
#         'q3': "I feel like I'm stuck at my job. Also I don't know how to generate consumers for an app and generate revenue and maintain and market it",
#         'q4': 'My ultimate goal is to create something of my own. I want my own app/idea that can be turned into a revenue generating business'
#     }

#     resume_content = """
#     DAVID BABU
#     Senior Data Scientist/Manager

#     EXPERIENCE:
#     - Manager at Exl analytics (03/2024 - Present)
#     - Lead assistant manager at Exl analytics (02/2020 - 02/2024)
#     - Consultant 1 at Exl analytics (01/2018 - 02/2020)
#     - Business analyst at Exl analytics (08/2017 - 12/2018)

#     SKILLS:
#     Generative AI, LLM, Data Science, Machine Learning, Computer Vision, Deep Learning, 
#     Natural Language Processing, Sentiment Analysis, Lead Generation, Vertex AI, Gemini, 
#     Ollama, Supabase, Streamlit, AWS, H2O, Databricks, PowerBI, PySpark, Python, R, SQL

#     EDUCATION:
#     Bachelors in Electronics & Communication from Sardar Vallabhbhai National Institute of Technology
#     """

#     themes_df, tasks_df = planner.generate_plan(user_info, resume_content)