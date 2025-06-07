# CRM WhatsApp AI - Backend

Backend server for the autonomous WhatsApp Business CRM system with AI integration.

## Features

- **Autonomous WhatsApp Management**: Multi-account WhatsApp Business integration
- **AI-Powered Responses**: Integration with OpenAI and Google Gemini
- **Real-time Communication**: WebSocket support for live updates
- **Database Management**: PostgreSQL with Drizzle ORM
- **Ticket System**: Automatic conversion of chats to leads and tickets
- **Voice Transcription**: Automatic audio to text conversion
- **Calendar Integration**: Local system calendar synchronization

## Installation

```bash
npm install
```

## Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Update the `.env` file with your credentials:
- Database connection details
- OpenAI API key
- Google Gemini API key
- Other service credentials

## Database Setup

Push the schema to your database:
```bash
npm run db:push
```

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### WhatsApp Management
- `GET /api/whatsapp-accounts` - List all WhatsApp accounts
- `POST /api/whatsapp-accounts` - Create new WhatsApp account
- `GET /api/whatsapp-accounts/:id/qrcode` - Get QR code for connection
- `POST /api/whatsapp/qr/:id/refresh` - Force refresh QR code

### AI Integration
- `GET /api/external-agents` - List AI agents
- `POST /api/whatsapp-accounts/:id/assign-external-agent` - Assign AI agent

### CRM Features
- `GET /api/dashboard-stats` - Dashboard metrics
- `GET /api/messages` - Message history
- `GET /api/activities` - Activity logs

## Architecture

```
backend/
├── server/
│   ├── index.ts           # Main server file
│   ├── services/          # Core services
│   ├── routes/            # API route handlers
│   ├── middleware/        # Custom middleware
│   └── utils/             # Utility functions
├── shared/
│   └── schema.ts          # Database schema definitions
└── temp/                  # Temporary files (WhatsApp sessions)
```

## Services

- **WhatsApp Multi-Account Manager**: Handles multiple WhatsApp connections
- **AI Response Service**: Manages automatic responses using external AI agents
- **Voice Note Storage**: Processes and transcribes voice messages
- **Calendar Reminder Service**: Handles calendar synchronization
- **Auto Response Manager**: Autonomous response system

## Environment Variables

See `.env.example` for all required configuration options.

## Production Deployment

The server is designed for autonomous operation and includes:
- Automatic reconnection handling
- Keep-alive mechanisms
- Error recovery systems
- Comprehensive logging