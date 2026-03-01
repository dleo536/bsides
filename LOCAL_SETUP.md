# Running with Local Environment Variables

## Quick Start

### Step 1: Create `.env` file

Create a `.env` file in the root directory (`/Users/dannyleo/Workspace/b-sides/.env`) with:

```env
REACT_NATIVE_API_URL=http://localhost:3000
```

**For physical devices (iPhone/Android phone):**
If you're testing on a physical device, you'll need to use your computer's IP address instead of `localhost`:

1. Find your computer's IP address:
   ```bash
   # On macOS/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or on macOS, you can use:
   ipconfig getifaddr en0
   ```

2. Update `.env` with your IP:
   ```env
   REACT_NATIVE_API_URL=http://192.168.1.XXX:3000
   ```
   (Replace `XXX` with your actual IP address)

### Step 2: Make sure your backend is running

In a separate terminal, start your backend server:

```bash
cd /Users/dannyleo/Workspace/bsides-backend/b-backend
npm run start:dev
```

The backend should be running on `http://localhost:3000`

### Step 3: Restart your Expo dev server

**Important:** After creating or modifying the `.env` file, you MUST restart your Expo server:

1. Stop the current Expo server (press `Ctrl+C` in the terminal)
2. Clear the cache and restart:
   ```bash
   cd /Users/dannyleo/Workspace/b-sides
   npm start -- --clear
   ```

   Or simply:
   ```bash
   npm start
   ```

### Step 4: Verify it's working

- Check the console logs when the app starts - you should see API calls going to `http://localhost:3000` (or your IP address)
- Test an API call in your app to confirm it's connecting to your local backend

## Switching Back to Production

To switch back to the production API:

1. Edit `.env`:
   ```env
   REACT_NATIVE_API_URL=https://test1.bsidesdatapath.xyz
   ```

2. Restart Expo server:
   ```bash
   npm start -- --clear
   ```

## Troubleshooting

### "Network request failed" or connection errors

**For iOS Simulator/Android Emulator:**
- Make sure you're using `http://localhost:3000` (not `https://`)
- Verify your backend is running on port 3000
- Check that the backend is accessible: open `http://localhost:3000` in your browser

**For Physical Devices:**
- Make sure you're using your computer's IP address (not `localhost`)
- Make sure your phone and computer are on the same WiFi network
- Check your firewall isn't blocking port 3000
- Try accessing `http://YOUR_IP:3000` from your phone's browser to test

### Environment variable not working

- Make sure `react-native-dotenv` is installed: `npm install --save-dev react-native-dotenv`
- Make sure you restarted the Expo server after creating/modifying `.env`
- Try clearing the cache: `npm start -- --clear`
- Check that `.env` is in the root directory (same level as `package.json`)

### Still using production URL

- Verify your `.env` file has the correct variable name: `REACT_NATIVE_API_URL`
- Make sure there are no extra spaces or quotes in the `.env` file
- Restart Expo with cache cleared: `npm start -- --clear`

## Notes

- The `.env` file should be in `.gitignore` (don't commit it to git)
- Different developers can have different `.env` files for their local setups
- The default fallback (if `.env` is missing) is the production URL: `https://test1.bsidesdatapath.xyz`




