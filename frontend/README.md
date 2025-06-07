# CRM WhatsApp AI - Frontend

React-based dashboard for managing the autonomous WhatsApp Business CRM system.

## Features

- **Real-time Dashboard**: Live metrics and monitoring
- **WhatsApp Account Management**: Multi-account setup and QR code generation
- **AI Agent Configuration**: External agent assignment and management
- **Message History**: Complete conversation tracking
- **Activity Monitoring**: System activity and user behavior tracking
- **Responsive Design**: Mobile, tablet, and desktop support

## Installation

```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

## Build for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── client/
│   └── src/
│       ├── components/        # Reusable UI components
│       │   ├── ui/           # Base UI components (shadcn/ui)
│       │   ├── messaging/    # WhatsApp-specific components
│       │   └── charts/       # Data visualization components
│       ├── pages/            # Page components
│       ├── lib/              # Utility functions and configurations
│       ├── hooks/            # Custom React hooks
│       └── assets/           # Static assets
├── public/                   # Public static files
└── dist/                     # Built application (after build)
```

## Key Components

### WhatsApp Integration
- **WhatsAppAccounts**: Account management interface
- **QRCodeDisplay**: QR code generation and display
- **WhatsAppPhoneConnect**: Phone-based connection method

### Dashboard
- **Dashboard**: Main overview with metrics
- **ActivityFeed**: Real-time activity monitoring
- **MessageHistory**: Conversation tracking

### AI Management
- **ExternalAgents**: AI agent configuration
- **AutoResponseConfig**: Response automation settings

## Technologies Used

- **React 18** with TypeScript
- **Vite** for build tooling
- **TanStack Query** for server state management
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Wouter** for routing
- **Framer Motion** for animations

## Configuration

The frontend automatically connects to the backend API running on port 5000.

## Environment Variables

Frontend environment variables should be prefixed with `VITE_`:

```bash
# API Configuration (optional - defaults to current host)
VITE_API_BASE_URL=http://localhost:5000

# Feature Flags (optional)
VITE_ENABLE_DEBUG_LOGS=false
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Key Features

### Real-time Updates
The dashboard receives live updates via WebSocket connections for:
- WhatsApp connection status
- New messages and conversations
- System activity and heartbeat monitoring
- AI response activities

### Responsive Design
Optimized for all device sizes with:
- Mobile-first approach
- Adaptive layouts
- Touch-friendly interfaces
- Progressive enhancement

### Accessibility
Built with accessibility in mind:
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast support