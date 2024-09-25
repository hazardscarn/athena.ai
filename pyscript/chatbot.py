import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain_community.tools import DuckDuckGoSearchRun
from langgraph.graph import StateGraph, END
from typing import Dict, TypedDict, List
import json
from supabase import create_client, Client

load_dotenv()

class AgentState(TypedDict):
    query: str
    contexts: List[Dict]
    final_answer: str
    conversation_history: List[Dict]

class CourseRecommendationChatbot:
    def __init__(self):
        self.supabase_url = os.getenv("REACT_APP_SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SECRET_KEY")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        
        self.supabase = create_client(self.supabase_url, self.supabase_key)
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=self.google_api_key)
        self.search_tool = DuckDuckGoSearchRun()
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-001", google_api_key=self.google_api_key)

        self.agent = self.create_agent()

    def create_agent(self):
        workflow = StateGraph(AgentState)

        workflow.add_node("get_course_recommendations", self.get_course_recommendations)
        workflow.add_node("search_web", self.search_web)
        workflow.add_node("generate_answer", self.generate_answer)

        workflow.set_entry_point("get_course_recommendations")
        workflow.add_edge("get_course_recommendations", "search_web")
        workflow.add_edge("search_web", "generate_answer")
        workflow.add_edge("generate_answer", END)

        return workflow.compile()

    def get_course_recommendations(self, state: AgentState) -> AgentState:
        query_embedding = self.embeddings.embed_query(state["query"])
        
        response = self.supabase.rpc(
            'match_courses',
            {
                'query_embedding': query_embedding,
                'match_threshold': 0.5,
                'match_count': 3
            }
        ).execute()

        results = response.data
        courses = []
        for item in results:
            course = {
                'title': item['title'],
                'rating': item['rating'],
                'duration': item['duration'],
                'url': item['course_url'],
                'difficulty': item['difficulty']
            }
            courses.append(course)

        state["contexts"].append({"source": "course_recommendations", "content": courses})
        return state

    def search_web(self, state: AgentState) -> AgentState:
        search_results = self.search_tool.run(state["query"])
        state["contexts"].append({"source": "web_search", "content": search_results})
        return state

    def generate_answer(self, state: AgentState) -> AgentState:
        course_recommendations = next((ctx for ctx in state["contexts"] if ctx["source"] == "course_recommendations"), None)
        web_search_results = next((ctx for ctx in state["contexts"] if ctx["source"] == "web_search"), None)

        prompt_template = """You are a helpful assistant in career trajectory assistance. Use the following information to answer the user's query.

        Conversation History (Last 10 interactions):
        {conversation_history}

        Course Recommendations:
        {course_recommendations}

        Web Search Results:
        {web_search_results}

        User Query: {query}

        If course recommendations are available, format them as follows:
        1. [Course Title](URL)
           - Rating: X/5
           - Duration: X hours
           - Difficulty: Easy/Medium/Hard

        - If no course recommendations are available, use the web search results to provide a helpful answer.
        - Do not mention that the information is from a web search. Always maintain a friendly and helpful tone.
        - If the information is from a web search, mention it in a conversational way. Do not say "I found this on the web."
        - Consider the conversation history when formulating your response. Refer back to previous interactions if relevant.

        Always maintain a friendly and helpful tone. If you can't find a direct answer, provide related information or suggestions for further research.

        Your response:
        """

        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["conversation_history", "course_recommendations", "web_search_results", "query"]
        )

        chain = PROMPT | self.llm

        response = chain.invoke({
            "conversation_history": json.dumps(state["conversation_history"][-10:]),
            "course_recommendations": json.dumps(course_recommendations["content"] if course_recommendations else []),
            "web_search_results": web_search_results["content"] if web_search_results else "",
            "query": state["query"]
        })

        state["final_answer"] = response.content if hasattr(response, 'content') else str(response)
        return state

    def get_answer(self, query: str, conversation_history: List[Dict]) -> str:
        initial_state = AgentState(
            query=query, 
            contexts=[], 
            final_answer="", 
            conversation_history=conversation_history[-10:]  # Limit to last 10 interactions
        )
        result = self.agent.invoke(initial_state)
        return result["final_answer"]
