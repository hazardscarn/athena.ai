import os
from supabase import create_client, Client
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import pandas as pd
from utils import init_connection
import time

# # Initialize Supabase client
# supabase_url = os.environ.get("SUPABASE_URL")
# supabase_key = os.environ.get("SUPABASE_KEY")
# supabase: Client = create_client(supabase_url, supabase_key)

_conn = init_connection()

# Initialize Google embeddings
google_api_key = os.environ.get("GOOGLE_API_KEY")
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=google_api_key)

# Load your course data
df = pd.read_csv("data//course_palette.csv")
df = df.dropna(subset=['course_description'])
df=df.drop(columns=['id'])
print(df.head())
# Create embeddings and insert data
for _, row in df.iterrows():
    description = row['course_description']
    
    # Create embedding
    embedding = embeddings.embed_query(description)
    
    # Prepare data for insertion
    data = row.to_dict()
    data['embedding'] = embedding
    
    print(f"Inserting data for course: {data['title']}")
    time.sleep(10)
    # Insert data into Supabase
    _conn.table("courses").insert(data).execute()

print("Data insertion complete.")

# # Initialize SupabaseVectorStore
# from langchain_community.vectorstores import SupabaseVectorStore

# vector_store = SupabaseVectorStore(
#     client=_conn,
#     embedding=embeddings,
#     table_name="courses",
#     query_name="match_courses"
# )

# # Function to retrieve similar courses
# def get_similar_courses(query: str, k: int = 5):
#     results = vector_store.similarity_search_with_score(query, k=k)
#     return results

# # Example usage
# query = "Machine learning for beginners"
# similar_courses = get_similar_courses(query)

# for doc, score in similar_courses:
#     print(f"Similarity: {score}")
#     print(f"Title: {doc.metadata['title']}")
#     print(f"Description: {doc.page_content}")
#     print(f"Source: {doc.metadata['source']}")
#     print(f"URL: {doc.metadata['course_url']}")
#     print(f"Difficulty: {doc.metadata['difficulty']}")
#     print(f"Rating: {doc.metadata['rating']}")
#     print(f"Duration: {doc.metadata['duration']}")
#     print(f"Type: {doc.metadata['type']}")
#     print("---")