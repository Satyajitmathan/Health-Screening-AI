# Health Screening AI

A voice-based AI health screening application that conducts a short conversational health screening call and generates a structured report after the call ends.

The application uses a turn-based voice interaction flow where the user speaks, the speech is converted to text, the AI processes the response, and the AI response is spoken back to the user.

## Features

- Start and End Call functionality
- AI greeting and guided health screening
- One question at a time
- Adaptive follow-up questions
- Conversation context maintained across turns
- English and Hindi/Hinglish support
- Browser-based Speech-to-Text
- AI-generated Text-to-Speech responses
- Real-time-oriented communication using Socket.IO
- Structured health screening report
- Partial report for incomplete calls
- Conversation transcript after the call
- Error handling for speech and API failures

## Health Screening Questions

The AI collects the following information:

1. Name
2. Main concern or symptom
3. Duration
4. Severity
5. Related symptoms

The AI can ask clarification or follow-up questions when the user's response is unclear or incomplete.

The assistant is designed only for basic health screening. It does not diagnose medical conditions or prescribe medication.

## Tech Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- Web Speech API
- Browser SpeechSynthesis API
- Socket.IO Client

### Backend

- Node.js
- Express.js
- Socket.IO
- Google Gemini API

### Session Management

- In-memory JavaScript Map
- No database is required

## Architecture

The application follows this pipeline:

```text
User speaks
    ↓
Browser Speech Recognition (STT)
    ↓
Socket.IO
    ↓
Node.js / Express Backend
    ↓
Google Gemini (LLM)
    ↓
AI response
    ↓
Socket.IO
    ↓
Browser SpeechSynthesis (TTS)
    ↓
User hears AI response 
```

## How to Run the Project

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Google Gemini API key
- Google Chrome or Microsoft Edge
- Microphone

Microphone permission must be allowed in the browser.

### 1. Clone the Repository

```bash
git clone https://github.com/Satyajitmathan/Health-Screening-AI.git
cd Health-Screening-AI
```

Backend Setup:
```bash
cd backend
npm install
```
Create a .env file inside the backend folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Start the backend:
npm run dev

Frontend Setup:
Open a new terminal:

cd frontend
npm install
npm run dev


## Future Improvements

- Add a database to persist screening reports and conversation history.
- Add user authentication with Login and Signup functionality.
- Allow users to view their previous health screening reports and conversation history.
- Add a user dashboard for managing and reviewing past screening sessions.


👤 Author
Satyajit Mathan

GitHub: github.com/Satyajitmathan