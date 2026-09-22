import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

// Initialize Firebase Admin
// In production, GOOGLE_APPLICATION_CREDENTIALS env var should point to service account JSON
export const initFirebaseAdmin = () => {
  if (!getApps().length) {
    try {
      initializeApp({
        credential: applicationDefault(), 
        projectId: 'machinichi-6759c',
      });
      console.log('Firebase Admin initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
    }
  }
};
