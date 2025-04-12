# Educational Gaming Platform

A modern web application for educational gaming and tutoring services, built with React, TypeScript, and Firebase.

## Features

- Free educational games with high score tracking
- Teacher dashboard for game management
- Google SSO authentication
- Assignment management system
- Responsive design with Chakra UI

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account and project
- Google Cloud Platform account (for SSO)
- Vercel account (for deployment)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/verse-react.git
cd verse-react
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
# Using npm
npm run dev

# Using the development script
./scripts/dev.sh
```

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── contexts/      # React contexts (auth, etc.)
  ├── pages/         # Page components
  ├── config/        # Configuration files
  └── types/         # TypeScript type definitions
scripts/
  ├── dev.sh         # Development script
  └── deploy.sh      # Deployment script
```

## Development

The project uses several tools to ensure code quality and consistency:

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Chakra UI for component library
- Vite for fast development and building

To run the development server with all checks:
```bash
./scripts/dev.sh
```

## Deployment

The application is configured for deployment on Vercel. You can deploy using either:

1. Automatic deployment through Vercel:
   - Connect your GitHub repository to Vercel
   - Configure your environment variables in the Vercel dashboard
   - Vercel will automatically deploy your application

2. Manual deployment using the deployment script:
```bash
./scripts/deploy.sh
```

The deployment script will:
- Check for required environment variables
- Install Vercel CLI if needed
- Build the project
- Deploy to Vercel

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
