import os
from dotenv import load_dotenv
from supabase import create_client, Client
import requests
from docx import Document
import fitz  # PyMuPDF
import io
import re
from pdfminer.high_level import extract_text as extract_text_pdf
from docx import Document
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes

def init_connection() -> Client:
    # Load environment variables from .env file
    load_dotenv()

    url = os.getenv("REACT_APP_SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY")

    if not url or not key:
        raise ValueError("Supabase URL or anon key is missing. Please check your .env file.")

    return create_client(url, key)

def get_user_info(_conn,user_id): 
    user_info = _conn.table('user_info').select('*').eq("user_id", user_id).execute()
    return user_info.data[0]


def extract_file_content(file_url: str) -> str:
    url: str = os.environ.get("REACT_APP_SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SECRET_KEY")
    supabase: Client = create_client(url, key)

    try:
        # Extract bucket name and file path from the URL using regex
        match = re.search(r'/storage/v1/object/public/([^/]+)/(.+)$', file_url)
        if not match:
            raise ValueError("Invalid URL format. Unable to extract bucket name and file path.")
        
        bucket_name, file_path = match.groups()

        # Download the file using Supabase client
        file_content = supabase.storage.from_(bucket_name).download(file_path)

        # Determine file type and extract content
        file_extension = os.path.splitext(file_path)[1].lower()
        if file_extension == '.pdf':
            return extract_pdf_content(file_content)
        elif file_extension == '.docx':
            return extract_docx_content(file_content)
        elif file_extension in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
            return extract_image_content(file_content)
        elif file_extension == '.txt':
            return file_content.decode('utf-8')
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

    except Exception as e:
        return f"Error processing file: {str(e)}"

def extract_pdf_content(file_content: bytes) -> str:
    try:
        # First, try pdfminer for text extraction
        text = extract_text_pdf(io.BytesIO(file_content))
        if text.strip():
            return text
        
        # If pdfminer doesn't extract text (e.g., scanned PDF), use OCR
        images = convert_from_bytes(file_content)
        text = ""
        for image in images:
            text += pytesseract.image_to_string(image) + "\n"
        return text
    except Exception as e:
        return f"Error extracting PDF content: {str(e)}"

def extract_docx_content(file_content: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_content))
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    full_text.append(cell.text)
        return "\n".join(full_text)
    except Exception as e:
        return f"Error extracting DOCX content: {str(e)}"

def extract_image_content(file_content: bytes) -> str:
    try:
        image = Image.open(io.BytesIO(file_content))
        return pytesseract.image_to_string(image)
    except Exception as e:
        return f"Error extracting image content: {str(e)}"