// Get the local IP address for the server
const getServerUrl = () => {
  if (import.meta.env.DEV) {
    // Always use HTTPS in development when using network IP
    return 'https://192.168.18.81:5000';
  }
  // In production, use the production server URL
  return 'https://your-production-server.com';
};

export const API_URL = getServerUrl();
export const SOCKET_URL = getServerUrl(); 