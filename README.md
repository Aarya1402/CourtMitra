# CourtMitra

CourtMitra is a full-stack application. This repository is a monorepo containing both the frontend client and the backend server. The application features an AI-integrated backend (via Google Generative AI & Sarvam AI) and a modern React frontend.

## Project Structure

This monorepo is split into two main directories:

- **[`client/`](./client)**: The frontend application built with React, Vite, and TypeScript.
- **[`server/`](./server)**: The backend API built with Express, Node.js, and TypeScript.

---

## Technologies Used

### Frontend (`client/`)
- **Framework**: React 19, Vite
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Styling / Animations**: GSAP, Lucide React
- **Utilities**: React PDF Renderer, Axios, Sentry (for error tracking)

### Backend (`server/`)
- **Framework**: Express.js
- **Language**: TypeScript (running via `tsx`)
- **AI Integrations**: Google Generative AI, Sarvam AI
- **Utilities**: Multer, Form-data, WebSocket (`ws`), Sentry (for error tracking)

---

## Prerequisites

Before getting started, make sure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

---

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:Aarya1402/CourtMitra.git
cd CourtMitra
```

### 2. Backend Setup (`server/`)

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   Copy the example file to create your own `.env`:
   ```bash
   cp .env.example .env
   ```
   *Make sure to fill in your API keys in the `.env` file (e.g., `SARVAM_API_KEY`, `PORT`, `SENTRY_DSN`, etc.).*
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup (`client/`)

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   Copy the example file to create your own `.env`:
   ```bash
   cp .env.example .env
   ```
   *Make sure to configure the API base URLs and other variables in `.env`.*
4. Start the frontend development server:
   ```bash
   npm run dev
   ```

---

## Scripts Overview

### Server Scripts
- `npm run dev`: Starts the backend server in watch mode using `tsx`.
- `npm run build`: Compiles the TypeScript code to JavaScript.
- `npm run start`: Runs the compiled server code.
- `npm run test`: Runs Jest tests.
- `npm run lint`: Lints the backend code.

### Client Scripts
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the app for production.
- `npm run test`: Runs Vitest tests.
- `npm run lint`: Lints the frontend code.

---

## Testing & Quality Assurance

Both `client` and `server` folders have their own testing setups (Vitest for client, Jest for server). You can also run SonarQube analysis or check code coverage using the built-in commands within each respective folder.

---

## License

This project is licensed under standard terms. Please see the individual directories for specific details if applicable.
