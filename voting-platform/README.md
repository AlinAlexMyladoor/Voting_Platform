# Voting Platform

A full-stack voting application with OAuth authentication (Google & LinkedIn), one-time voting system, and real-time voter activity tracking.

## Features

- 🔐 OAuth2 Authentication (Google & LinkedIn)
- 🗳️ One-time voting per user
- 👥 Real-time voter activity display
- 🎨 Modern, responsive UI
- 🔒 Secure session management
- 📊 Vote tracking and statistics

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB & Mongoose
- Passport.js (OAuth authentication)
- Express Session
- Helmet (Security)
- CORS

### Frontend
- React 19
- React Router DOM
- Axios
- Create React App

## Project Structure

```
voting-platform/
├── server/
│   ├── models/
│   │   ├── User.js          # User schema
│   │   └── Candidate.js     # Candidate schema
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   └── voting.js        # Voting API routes
│   ├── index.js             # Server entry point
│   ├── passport.js          # Passport OAuth strategies
│   ├── seed.js              # Database seeding script
│   ├── .env                 # Environment variables
│   └── package.json
└── client/
    ├── src/
    │   ├── App.js           # Main app component
    │   ├── Login.js         # Login page
    │   ├── Dashboard.js     # Voting dashboard
    │   └── index.js         # React entry point
    ├── public/
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB
- Google OAuth credentials
- LinkedIn OAuth credentials

### 1. Clone the Repository
```bash
cd voting-platform
```

### 2. Server Setup

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Edit `server/.env` with your credentials:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
SESSION_SECRET=your_secret_session_key_change_this_in_production
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

### 4. Seed the Database

```bash
cd server
node seed.js
```

This will create 2 sample candidates in your database.

### 5. Start the Backend Server

```bash
cd server
npm start
# Or for development with auto-reload:
npm run dev
```

Server will run on http://localhost:5000

### 6. Client Setup

Open a new terminal:

```bash
cd client
npm install
npm start
```

Client will run on http://localhost:3000

## OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/auth/google/callback`
6. Add authorized JavaScript origins: `http://localhost:3000` and `http://localhost:5000`

### LinkedIn OAuth
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Add redirect URL: `http://localhost:5000/auth/linkedin/callback`
4. Request access to Sign In with LinkedIn using OpenID Connect
5. Add scopes: `openid`, `profile`, `email`

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/linkedin` - Initiate LinkedIn OAuth
- `GET /auth/linkedin/callback` - LinkedIn OAuth callback
- `GET /auth/login/success` - Check authentication status
- `GET /auth/logout` - Logout user

### Voting
- `GET /api/candidates` - Get all candidates
- `GET /api/voters` - Get all users who voted
- `POST /api/vote/:id` - Cast vote for candidate (authenticated)
- `GET /api/stats` - Get voting statistics

## How It Works

1. **Login**: User authenticates via Google or LinkedIn OAuth
2. **Session**: Server creates a session and stores user data
3. **Dashboard**: User is redirected to dashboard with candidate list
4. **Vote**: User can vote once; `hasVoted` flag prevents multiple votes
5. **Activity**: Recent voter activity is displayed in real-time
6. **Logout**: Session is destroyed and user is redirected to login

## Security Features

- Helmet.js for HTTP security headers
- CORS configuration for cross-origin requests
- Session-based authentication
- OAuth2 for secure third-party authentication
- One-time voting enforcement at database level
- Content Security Policy (CSP)

## Development

### Running in Development Mode

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm start
```

### Testing the Application

1. Navigate to http://localhost:3000
2. Click "Login with Google" or "Login with LinkedIn"
3. Authorize the application
4. You'll be redirected to the dashboard
5. Cast your vote for a candidate
6. See the vote recorded and your name in recent activity

## Common Issues & Troubleshooting

### Issue: "Login required" error
- Solution: Clear browser cookies and restart both servers

### Issue: OAuth redirect not working
- Solution: Verify callback URLs match in OAuth provider settings and code

### Issue: MongoDB connection failed
- Solution: Check MONGO_URI in .env file and ensure MongoDB is running

### Issue: Session not persisting
- Solution: Ensure SESSION_SECRET is set in .env file

### Issue: CORS errors
- Solution: Verify client proxy in package.json points to http://localhost:5000

## Database Models

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  provider: String,
  providerId: String,
  hasVoted: Boolean,
  votedFor: String,
  profilePicture: String
}
```

### Candidate Schema
```javascript
{
  name: String,
  linkedinUrl: String,
  party: String,
  team: String,
  img: String,
  voteCount: Number
}
```

## Future Enhancements

- [ ] Admin panel for managing candidates
- [ ] Real-time vote count updates with WebSocket
- [ ] Vote analytics and charts
- [ ] Email notifications
- [ ] Multi-factor authentication
- [ ] Vote result visualization
- [ ] Candidate profiles with detailed information
- [ ] Voting deadline management
- [ ] Export voting results

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions, please open an issue in the repository.
