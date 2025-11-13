# Vercel Deployment Setup

## Environment Variables

For production deployment on Vercel, you need to set the following environment variables in your Vercel project settings:

### Firebase Configuration

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
VITE_FIREBASE_API_KEY=AIzaSyA5t8FgYmng4lF3Fudcw0wSFn_PWOVWlXI
VITE_FIREBASE_AUTH_DOMAIN=piffdeals-staff-firebase.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=piffdeals-staff-firebase
VITE_FIREBASE_STORAGE_BUCKET=piffdeals-staff-firebase.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=588942510405
VITE_FIREBASE_APP_ID=1:588942510405:web:faccad1f583289d9a0d62c
VITE_FIREBASE_MEASUREMENT_ID=G-BRYZ6X57BL
```

### Local Development

For local development, create a `.env` file in the root directory with the same variables:

```env
VITE_FIREBASE_API_KEY=AIzaSyA5t8FgYmng4lF3Fudcw0wSFn_PWOVWlXI
VITE_FIREBASE_AUTH_DOMAIN=piffdeals-staff-firebase.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=piffdeals-staff-firebase
VITE_FIREBASE_STORAGE_BUCKET=piffdeals-staff-firebase.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=588942510405
VITE_FIREBASE_APP_ID=1:588942510405:web:faccad1f583289d9a0d62c
VITE_FIREBASE_MEASUREMENT_ID=G-BRYZ6X57BL
```

## Firebase Setup

1. Enable **Email/Password** authentication in Firebase Console
2. Add authorized domains in Firebase Console (Authentication → Settings → Authorized domains)
   - Add your Vercel domain (e.g., `your-app.vercel.app`)
   - Add your custom domain if applicable

## Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy!

The app will automatically use environment variables in production, and fallback to the default config in development.

