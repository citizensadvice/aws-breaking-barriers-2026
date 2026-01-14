# Document Upload UI

A React-based web application for document upload with AWS Cognito authentication.

## Features

- AWS Cognito User Pool integration for authentication
- Protected routes with authentication guards
- Responsive design for desktop and mobile
- TypeScript support for type safety
- Comprehensive testing with Jest and React Testing Library

## Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── upload/         # Upload interface components
│   ├── metadata/       # Metadata form components
│   ├── progress/       # Progress tracking components
│   └── common/         # Shared UI components
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your AWS Cognito configuration:
   ```
   REACT_APP_USER_POOL_ID=your-user-pool-id
   REACT_APP_USER_POOL_CLIENT_ID=your-client-id
   REACT_APP_AWS_REGION=your-region
   ```

### Development

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

### Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage --watchAll=false
```

### Building

Build for production:
```bash
npm run build
```

## Authentication

The application uses AWS Cognito User Pools for authentication. Users must sign in before accessing the upload functionality.

### Authentication Flow

1. Unauthenticated users are redirected to the login page
2. Users enter their credentials
3. AWS Cognito validates the credentials
4. Successful authentication grants access to protected routes
5. Authentication tokens are securely stored and managed

## Components

### AuthProvider
Manages authentication state and provides authentication methods throughout the application.

### AuthGuard
Higher-order component that protects routes from unauthenticated access.

### LoginPage
User interface for authentication with email/username and password fields.

### UploadPage
Main upload interface (placeholder for future implementation).

## Technology Stack

- **React 18** with TypeScript
- **React Router 6** for routing
- **AWS Amplify** for Cognito integration
- **Jest** and **React Testing Library** for testing
- **CSS3** for styling

## Next Steps

This is the foundation setup. Subsequent tasks will implement:
- File upload interface with drag-and-drop
- File validation and metadata forms
- Progress tracking and status management
- Google Docs integration
- Responsive design enhancements
- Performance optimizations

## Contributing

1. Follow the existing code structure and naming conventions
2. Write tests for new components and functionality
3. Ensure all tests pass before submitting changes
4. Use TypeScript for type safety