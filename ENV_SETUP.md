# Environment Variables Setup Guide

This project supports environment variables for switching between local and production API endpoints, plus optional overrides for the public privacy-policy and support links shown in-app.

## Installation

First, install the required package:

```bash
npm install --save-dev react-native-dotenv
```

## Configuration

### 1. Create a `.env` file

Create a `.env` file in the root directory of your project (`/Users/dannyleo/Workspace/b/b-sides/.env`) with the following content:

**For Production (safe default):**
```env
REACT_NATIVE_API_TARGET=production
REACT_NATIVE_PRODUCTION_API_URL=https://b-backend-50184648070.us-central1.run.app
REACT_NATIVE_PRIVACY_POLICY_URL=https://bsides.pro/privacy/
REACT_NATIVE_SUPPORT_URL=https://bsides.pro/
REACT_NATIVE_SUPPORT_EMAIL=support@bsides.pro
```

**For Local Development:**
```env
REACT_NATIVE_API_TARGET=local
REACT_NATIVE_LOCAL_API_URL=http://localhost:3000
REACT_NATIVE_PRIVACY_POLICY_URL=https://bsides.pro/privacy/
REACT_NATIVE_SUPPORT_URL=https://bsides.pro/
REACT_NATIVE_SUPPORT_EMAIL=support@bsides.pro
```
(Replace `3000` with your local backend port if different)

**Optional direct override:**
```env
REACT_NATIVE_API_URL=https://example.com
```
This bypasses the target-specific URL selection and is most useful for one-off testing.

### 2. Restart Your Development Server

After creating or modifying the `.env` file, you must restart your Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
# or
expo start
```

## How It Works

- The API base URL is configured in `app/config/api.js`
- The privacy/support links are configured in `app/config/legal.js`
- All API calls now use `API_BASE_URL` from this config file
- The config file can read `REACT_NATIVE_API_TARGET`, `REACT_NATIVE_API_URL`, `REACT_NATIVE_LOCAL_API_URL`, `REACT_NATIVE_STAGING_API_URL`, and `REACT_NATIVE_PRODUCTION_API_URL`
- The legal config can also read `REACT_NATIVE_PRIVACY_POLICY_URL`, `REACT_NATIVE_SUPPORT_URL`, and `REACT_NATIVE_SUPPORT_EMAIL`
- If API env vars are missing, the app now defaults to the baked-in production URL instead of localhost
- If you explicitly choose `REACT_NATIVE_API_TARGET=local` without a local URL, the app throws on startup instead of guessing
- Non-dev builds fail fast if they resolve to a local/private API URL

## Files Updated

The following files have been updated to use the environment variable:

- `app/api/ListAPI.js`
- `app/api/UserAPI.js`
- `app/api/ReviewAPI.js`
- `app/screens/SignUpScreen.js`
- `app/logic/User.js`

## Quick Switch Between Environments

### To use localhost:
1. Edit `.env` file and set:
   - `REACT_NATIVE_API_TARGET=local`
   - `REACT_NATIVE_LOCAL_API_URL=http://localhost:YOUR_PORT`
2. Restart Expo dev server

### To use production:
1. Edit `.env` file and set:
   - `REACT_NATIVE_API_TARGET=production`
   - `REACT_NATIVE_PRODUCTION_API_URL=https://b-backend-50184648070.us-central1.run.app`
2. Restart Expo dev server

## Notes

- The `.env` file should be added to `.gitignore` to avoid committing sensitive information
- Different team members can have different `.env` files for their local setups
- Restart Expo after changing API env vars, or Metro may keep the old config cached
