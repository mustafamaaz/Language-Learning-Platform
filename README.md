# Language-Learning-Platform
This is a Generatic Language Learning platfrom. It will support major languages learning for bigneer, intermediate and professional. For now it only ingest with json file for content like language resources


### Maaz




**Project Title:** PolyGlot Dynamic – A JSON-Driven Gamified Language Learning Engine.

**Objective:** Build a web-based language learning platform where the entire curriculum (English, German, Arabic, etc.) is dynamically generated based on a structured JSON configuration file. The platform must feel like a game, rewarding progression and consistency.

### 1\. Core Architecture & Dynamic Loading

*   **Data-Driven Design:** The UI and content must not be hardcoded. The system should ingest a JSON file that defines the language, categories, levels, and specific questions.
    
*   **Scaling:** Support 3 proficiency categories: **Beginner, Intermediate, and Advanced.**
    
*   **Level Progression:** Each category contains **20 levels**. Levels are locked by default; a user must pass Level N to unlock Level N+1.
    

### 2\. Content & Question Engine

Each level must support a mix of the following exercise types:

*   **Grammar:** Rule-based multiple choice or correction.
    
*   **Vocabulary:** Matching words to meanings or images.
    
*   **Sentence Completion:** Drag-and-drop or typing the missing word.
    
*   **Fill in the Blanks:** Contextual paragraph completion.
    
*   **Pronunciation:** (Conceptual) Integration with Speech-to-Text APIs for verbal verification.
    

**Content Topics include:** Regular Conversation, Office/Professional, Politics, Ethics, Social/Parties, and Academic (University/School).

### 3\. Gamification & Retention Logic

*   **Streaks:** Track daily consecutive logins.
    
*   **Achievements:** Issue badges for milestones (e.g., "7-Day Streak," "Grammar Guru," "Category Completion").
    
*   **Leaderboard Logic:** Implement a "Fair Points" system.
    
    *   _Formula:_ $Total Points = (Level Completion Points \\times Difficulty Multiplier) + (Streak Bonus)$.
        
    *   _Goal:_ Ensure long-term consistency is rewarded as much as raw speed.
        

### 4\. Technical Specifications Required

Please provide:

1.  **JSON Schema:** A sample structure for a single level containing multiple question types.
    
2.  **Frontend Logic:** How to handle state management for level locking and progress tracking.
    
3.  **Database Schema:** To store user profiles, earned badges, current streaks, and leaderboard rankings.
    
4.  **UI/UX Suggestions:** A clean, "Duolingo-style" interface that works on mobile and desktop.
    

**Deliverable:** Start by outlining the JSON structure and the Database schema to ensure the data foundation is solid.

## Local Development (Separate Client/Server)
1. In `server`, install and run:
`npm install`
`npm run dev`
2. In `client`, install and run:
`npm install`
`npm run dev`

The client proxies API requests to `http://localhost:3001` via `/api`.

## Database (Postgres via Docker)
1. From the repo root:
`docker compose up -d`
2. Copy `server/.env.example` to `server/.env` and update if needed.

The API initializes the `content` table on startup.

**If you see "password authentication failed for user learning_user"**:
- If `docker exec learning-platform-postgres psql -U learning_user -d learning_platform -c "SELECT 1"` works, a local Postgres may be conflicting. Docker uses port **5433** to avoid this; ensure `PGPORT=5433` in `server/.env`.
- If the container was first created with different credentials, reset the volume: `docker compose down -v` then `docker compose up -d`.
