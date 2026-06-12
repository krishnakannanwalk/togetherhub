# TogetherHub Firebase Version

This version uses Firebase Authentication and Cloud Firestore so users can sign in from different devices and share the same family data.

## Firebase setup

1. Go to Firebase Console and create a project.
2. Add a Web app to the Firebase project.
3. Copy the Firebase config values.
4. In Firebase Authentication, enable Email/Password sign-in.
5. In Firestore Database, create a database.
6. In Firestore Rules, paste the contents of `firestore.rules` and publish.

Firebase's web SDK is initialized with `initializeApp`, and Firebase recommends enabling Email/Password in Authentication before using password-based login. Firestore is used for shared family documents.

## Netlify setup without running locally

1. Upload this project ZIP to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Select the GitHub repository.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Add these environment variables in Netlify **Site configuration → Environment variables**:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

7. Deploy the site.

## Sharing with partner/family

- The first user creates the family account and becomes Owner.
- The app shows an invite code in Family settings.
- Another user signs up using the same invite code.
- Both users can then see the shared calendar, meals, goals, movies, and expenses from different devices.
