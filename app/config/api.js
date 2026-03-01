/**
 * API Configuration
 * 
 * This file exports the API base URL based on environment variables.
 * 
 * To use localhost:
 * - Create a .env file in the root directory with:
 *   REACT_NATIVE_API_URL=http://localhost:PORT
 *   (Replace PORT with your local backend port, e.g., 3000, 8000, etc.)
 * 
 * To use production:
 * - Create a .env file with:
 *   REACT_NATIVE_API_URL=https://test1.bsidesdatapath.xyz
 * - Or leave REACT_NATIVE_API_URL unset to use the default production URL
 * 
 * Note: After installing react-native-dotenv, restart your Expo dev server
 * for environment variable changes to take effect.
 */

// Try to import from @env (react-native-dotenv), fallback to default
// let API_BASE_URL = 'https://test1.bsidesdatapath.xyz';
let API_BASE_URL = 'http://localhost:3000';

try {
  // This will work after installing react-native-dotenv
  const env = require('@env');
  if (env.REACT_NATIVE_API_URL) {
    API_BASE_URL = env.REACT_NATIVE_API_URL;
  }
} catch (error) {
  // If @env is not available, use default
  // You can also manually set the URL here for quick testing:
  // API_BASE_URL = 'http://localhost:3000';
  console.log('Using default API URL. Install react-native-dotenv and create .env file for environment variables.');
}

export default API_BASE_URL;

