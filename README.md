# Athena AI

Athena AI (also known as Career Compass AI) is an innovative application that leverages Google's Gemini AI to create personalized, 12-month career roadmaps tailored to your unique goals and challenges. With an interactive dashboard and an AI assistant named Jake, it provides continuous support and guidance for your professional growth journey.

## Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- Personalized 12-month career development plans
- Monthly themes with specific, actionable tasks
- Progress tracking and visualization
- 24/7 AI-powered career assistant (Jake) for ongoing support
- Course recommendations
- User authentication and data security

## Technologies Used

- Frontend: React.js, Tailwind CSS
- Backend: Python, Flask
- AI: Google's Gemini AI
- Database: Supabase
- Authentication: Supabase Auth
- State Management: LangGraph
- APIs: Various for enhanced AI capabilities

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- Python (v3.8 or later)
- Supabase account
- Google Cloud account (for Gemini AI access)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/hazardscarn/athena.ai.git
   cd athena.ai
   ```

2. Install frontend dependencies:
   ```
   npm install
   ```

3. Install backend dependencies:
   ```
   cd pyscript
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env` file in the root directory and a `.env` file in the `pyscript` directory
   - Add the following variables (replace with your actual values):
     ```
     # Root .env
     REACT_APP_SUPABASE_URL=your_supabase_url
     REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SECRET_KEY='your supabase secret key'
     GOOGLE_API_KEY="google api key"
     REACT_APP_API_URL=http://127.0.0.1:5000
     ```

5. Start the backend server:
   ```
   cd pyscript
   python app.py
   ```

6. In a new terminal, start the frontend development server:
   ```
   npm start
   ```

7. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Sign up for an account or log in if you already have one.
2. Complete the initial questionnaire to provide information about your current career status and goals.
3. Review your personalized 12-month career plan.
4. Track your progress and complete tasks for each month.
5. Use the AI assistant Jake for any career-related questions or guidance.

## Contributing

We welcome contributions to Athena AI! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Support

For any suggestions, queries, or support needs, please contact: David

Email: davidacad10@gmail.com 
LinkedIn: https://www.linkedin.com/in/david-babu-15047096/

## License

This project is licensed under the Apache License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Google for providing the Gemini AI API
- Supabase for their excellent database and authentication services
- All contributors and supporters of the project