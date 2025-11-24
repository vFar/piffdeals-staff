# Piffdeals Staff Portal

Internal staff management system for piffdeals.lv ecommerce shop.

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key
```

## Deployment

### Vercel Deployment

This project is configured for easy deployment to Vercel. See **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** for detailed deployment instructions.

**Quick Deploy:**
1. Push your code to a Git repository (GitHub/GitLab/Bitbucket)
2. Import the project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add environment variables in Vercel project settings
4. Deploy!

The `vercel.json` file is already configured with:
- ✅ SPA routing support
- ✅ Security headers
- ✅ Asset caching
- ✅ Vite build configuration

## Troubleshooting

### CORS Error in Development

If you encounter a CORS error like:
```
Access to fetch at 'https://your-project.supabase.co/auth/v1/token?grant_type=refresh_token' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution**: Add `http://localhost:5173` to your Supabase project's allowed origins:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs** or **Site URL**, add: `http://localhost:5173`
5. Save the changes

The Supabase client is configured with PKCE flow for better security and CORS handling.

## Project Documentation

For detailed project information, see **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**.

## Tech Stack

- **Frontend**: React 19 + Vite
- **UI Library**: Ant Design
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router v7
- **State Management**: React Context API

