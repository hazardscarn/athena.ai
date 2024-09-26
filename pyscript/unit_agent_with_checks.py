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
    check_result: bool
    check_explanation: str
    check_suggestions: List[str]

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
        self.State = State

        # Define the output schema for the planner
        self.MonthPlan = MonthPlan

        # Create the planner chain
        self.planner_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a career development AI assistant. Create a personalized career development plan for the given month based on the user's information, resume, previous months' plans, and any suggestions for improvement."),
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
    Suggestions for Improvement: {suggestions}

    Create a plan for month {current_month} that helps the user progress towards their 1-year goal while addressing their 
    challenges and keeping their ultimate aspiration in mind. The plan should include a theme and 3-5 specific, actionable tasks.

    Incorporate the suggestions for improvement in your plan. Ensure that the new plan addresses any issues raised in the suggestions.

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
             
    Ensure that your output follows this format and adheres to all the guidelines provided.
    """),
        ])

        self.planner_chain = self.planner_prompt | self.content_model

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
        
        # Include suggestions from the previous check, if any
        suggestions = state.get('check_suggestions', [])
        suggestions_str = "\n".join(suggestions) if suggestions else "No specific suggestions."
        
        print(f"\nPlanning month {current_month}")
        print(f"Suggestions being incorporated: {suggestions_str}")
        
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
            "previous_plans": previous_plans,
            "suggestions": suggestions_str
        })
        
        content = result.content
        theme_match = re.search(r"Theme:\s*(.*)", content)
        theme = theme_match.group(1).strip() if theme_match else "No theme specified"
        
        tasks = self.extract_tasks(content)
        
        state['plan'][f"month_{current_month}"] = {"theme": theme, "tasks": tasks}
        # Clear the suggestions after they've been used
        state['check_suggestions'] = []
        
        print(f"Plan created for month {current_month}")
        print(f"Theme: {theme}")
        print(f"Number of tasks: {len(tasks)}")
        
        return state

    def check_plan(self, state: State) -> State:
        current_month = state['current_month']
        current_plan = state['plan'][f"month_{current_month}"]
        user_info = state['user_info']
        
        # Collect all previous themes and tasks
        previous_themes = []
        previous_tasks = []
        for month, plan in state['plan'].items():
            if month != f"month_{current_month}":
                previous_themes.append(plan['theme'])
                previous_tasks.extend([task['content'] for task in plan['tasks']])

        prompt = f"""
        Assess if the given month's plan aligns with the user's needs, addresses their challenges, and builds towards their 1-year goal and ultimate aspiration. Also, check for repetition of themes and tasks.
        
        User Info:
        Current Position: {user_info['current_position']}
        1-Year Goal: {user_info['q2']}
        Challenges: {user_info['q3']}
        Ultimate Aspiration: {user_info['q4']}
        
        Current Month: {current_month}
        Current Plan: {json.dumps(current_plan)}
        Previous Themes: {json.dumps(previous_themes)}
        Previous Tasks: {json.dumps(previous_tasks)}
        
        Evaluation Criteria:
        1. Does the plan align with the user's needs, address their challenges, and build towards their goals?
        2. Is the theme unique compared to previous months?
        3. Are the tasks unique and not repetitive compared to previous months?
        4. Do the tasks provide a good mix of skill development, practical application, and career advancement?
        5. Is there a clear progression from previous months' plans?
        6. Is there atleast one task added for the months theme?
        
        Respond with a JSON object in this format:
        {{
            "result": true or false,
            "explanation": "Detailed explanation of your assessment, addressing each evaluation criterion",
            "suggestions": [
                "Specific suggestion for improvement if needed",
                "Another suggestion if needed"
            ]
        }}
        
        If the plan needs improvement, set "result" to false, provide a detailed explanation, and give specific, actionable suggestions for changes.
        """
        
        print(f"\nChecking plan for month {current_month}")
        
        response = self.json_model.generate_content(prompt)
        
        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            print(f"Warning: Failed to parse JSON response. Raw response: {response.text}")
            result = {
                "result": False,
                "explanation": "Unable to parse AI response. Plan needs revision.",
                "suggestions": ["Please generate a new plan addressing repetition and alignment issues."]
            }
        
        state['check_result'] = result.get('result', False)
        state['check_explanation'] = result.get('explanation', 'No explanation provided.')
        state['check_suggestions'] = result.get('suggestions', [])
        
        print(f"Check result: {'Passed' if state['check_result'] else 'Failed'}")
        print(f"Explanation: {state['check_explanation']}")
        if state['check_suggestions']:
            print("Suggestions for improvement:")
            for suggestion in state['check_suggestions']:
                print(f"- {suggestion}")
        
        return state

    def router(self, state: State) -> str:
        if state['current_month'] > 12:
            print("All 12 months planned. Ending process.")
            return END
        
        if not state['check_result']:
            print(f"Plan for month {state['current_month']} did not pass the check. It will be regenerated.")
            del state['plan'][f"month_{state['current_month']}"]
            return "planner"
        
        if state['current_month'] == 12:
            print("Final month (12) planned and passed check. Ending process.")
            return END

        state['current_month'] += 1
        print(f"Plan for month {state['current_month']-1} passed the check. Moving to month {state['current_month']}.")
        return "planner"

    def generate_plan(self, user_info: dict, resume_content: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
        initial_state = State(
            user_info=user_info,
            resume_content=resume_content,
            current_month=1,
            plan={},
            check_result=True,
            check_explanation="",
            check_suggestions=[]
        )

        print("Starting the career development plan generation...")
        final_state = initial_state
        while final_state['current_month'] <= 12:
            # Plan the month
            planned_state = self.plan_month(final_state)
            
            # Check the plan
            checked_state = self.check_plan(planned_state)
            
            # Route based on the check result
            next_step = self.router(checked_state)
            
            if next_step == END:
                break
            
            final_state = checked_state

        print("\nPlan generation complete. Preparing final output...")

        themes_df = pd.DataFrame(columns=[f'month_{i}' for i in range(1, 13)])
        tasks_df = pd.DataFrame(columns=['month', 'task_number', 'task_outline'])

        if final_state and 'plan' in final_state:
            plan = final_state['plan']
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

