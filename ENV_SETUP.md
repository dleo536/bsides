# Environment Variables Setup Guide

This project now supports environment variables for switching between local and production API endpoints.

## Installation

First, install the required package:

```bash
npm install --save-dev react-native-dotenv
```

## Configuration

### 1. Create a `.env` file

Create a `.env` file in the root directory of your project (`/Users/dannyleo/Workspace/b/b-sides/.env`) with the following content:

**For Production (default):**
```env
REACT_NATIVE_API_URL=https://test1.bsidesdatapath.xyz
```

**For Local Development:**
```env
REACT_NATIVE_API_URL=http://localhost:3000
```
(Replace `3000` with your local backend port if different)

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
- All API calls now use `API_BASE_URL` from this config file
- The config file reads from the `REACT_NATIVE_API_URL` environment variable
- If the environment variable is not set, it defaults to the production URL: `https://test1.bsidesdatapath.xyz`

## Files Updated

The following files have been updated to use the environment variable:

- `app/api/ListAPI.js`
- `app/api/UserAPI.js`
- `app/api/ReviewAPI.js`
- `app/screens/SignUpScreen.js`
- `app/logic/User.js`

## Quick Switch Between Environments

### To use localhost:
1. Edit `.env` file and set: `REACT_NATIVE_API_URL=http://localhost:YOUR_PORT`
2. Restart Expo dev server

### To use production:
1. Edit `.env` file and set: `REACT_NATIVE_API_URL=https://test1.bsidesdatapath.xyz`
2. Restart Expo dev server

## Alternative: Manual Configuration

If you prefer not to use environment variables, you can directly edit `app/config/api.js` and change the default value:

```javascript
let API_BASE_URL = 'http://localhost:3000'; // Change this line
```

## Notes

- The `.env` file should be added to `.gitignore` to avoid committing sensitive information
- Different team members can have different `.env` files for their local setups
- The babel configuration has been updated to support `react-native-dotenv`



