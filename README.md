# Virtual Study Room
## WebRTC Video Conferencing Application - Peer to Peer
A real-time video conferencing application designed for study groups, allowing up to 5 participants per room with video and audio capabilities.

## Features

- User authentication (login/register)
- Create and join study rooms
- Real-time video/audio communication
- Dark mode support
- Modern, responsive UI
- Network-accessible deployment
- Toast notifications for user feedback
- HTTPS support for secure connections

## Technology Stack

### Frontend (Client)
- **React**: UI library for building the user interface
- **Vite**: Modern build tool for faster development
- **TailwindCSS**: Utility-first CSS framework for styling
  - Used for responsive design and dark mode
  - Custom theme configuration in `tailwind.config.js`
- **Shadcn/ui Components**: 
  - Pre-built components like Card, Button, Input
  - Toast notifications for user feedback
  - Customizable with TailwindCSS
- **Socket.io-client**: Real-time communication with the server
- **Simple-peer**: WebRTC peer-to-peer video/audio streaming
- **React Router**: Client-side routing
- **mkcert**: Local SSL certificate generation for HTTPS development

### Backend (Server)
- **Node.js & Express**: Server framework
- **MongoDB**: Database for storing user and room data
- **Socket.io**: Real-time bi-directional communication
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing
- **CORS**: Cross-Origin Resource Sharing support

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB installed locally or a MongoDB Atlas account
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd virtual-study-room
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the server directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/virtual-study-room
   JWT_SECRET=your-secret-key-change-this-in-production
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   ```
   Update the `src/config.js` file with your local IP address:
   ```javascript
   const getServerUrl = () => {
     if (import.meta.env.DEV) {
       return 'https://YOUR_LOCAL_IP:5000'; // Note: Using HTTPS
     }
     return 'https://your-production-server.com';
   };
   ```

4. **Generate SSL Certificates**
   ```bash
   cd client
   npm run generate-cert
   ```
   This will create SSL certificates in the `.cert` directory for HTTPS development.
   
   Note: Update the domains in `scripts/generate-cert.js` to include your local IP address:
   ```javascript
   domains: ['127.0.0.1', 'localhost', 'YOUR_LOCAL_IP']
   ```

### Running the Application

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start the Backend Server**
   
   Regular HTTP:
   ```bash
   cd server
   npm run dev
   ```
   
   With HTTPS:
   ```bash
   cd server
   npm run dev:https
   ```

3. **Start the Frontend Development Server**

   Regular HTTP (local only):
   ```bash
   cd client
   npm run dev
   ```
   
   With HTTPS (local only):
   ```bash
   cd client
   npm run dev:https
   ```
   
   With HTTPS (network accessible):
   ```bash
   cd client
   npm run dev:network
   ```

### Development Modes Explained

- `npm run dev`: Regular HTTP development server (localhost only)
- `npm run dev:https`: HTTPS development server with SSL (localhost only)
- `npm run dev:network`: HTTPS development server accessible from other devices on your network
  - Required for testing WebRTC features across different devices
  - Uses the SSL certificates generated with `generate-cert`
  - Accessible via your local IP address

### Accessing on Other Devices

1. Find your computer's local IP address:
   - Windows: `ipconfig` in CMD
   - Mac/Linux: `ifconfig` in terminal

2. Update the frontend configuration:
   - In `client/src/config.js`, replace `YOUR_LOCAL_IP` with your actual local IP
   - In `client/scripts/generate-cert.js`, add your IP to the domains array
   - Run `npm run generate-cert` again after updating the domains

3. Update the backend CORS settings:
   - The server is already configured to accept connections from any origin

4. Start servers in HTTPS mode:
   - Backend: `npm run dev:https`
   - Frontend: `npm run dev:network`

5. Access the application:
   - Frontend: `https://YOUR_LOCAL_IP:5173`
   - Backend: `https://YOUR_LOCAL_IP:5000`
   
   Note: You may need to accept the self-signed certificate warning in your browser.

## Component Usage

### Toast Notifications
Toast notifications are implemented using Shadcn/ui's toast component. They provide feedback for:
- Login/Register success/failure
- Room creation/joining
- Error messages

Example usage:
```javascript
const { toast } = useToast();
toast({
  title: "Success",
  description: "Room created successfully",
  variant: "default"
});
```

### Tailwind CSS
The project uses Tailwind CSS for styling with a custom theme configuration:
- Dark mode support using the `dark` class
- Custom color schemes defined in `index.css`
- Responsive design utilities
- Component-specific styles

Example class usage:
```jsx
<div className="min-h-screen bg-background text-foreground">
  <Card className="w-full max-w-md">
    {/* Component content */}
  </Card>
</div>
```

## Security Considerations

1. JWT tokens are used for authentication
2. Passwords are hashed using bcrypt
3. CORS is configured for security
4. Environment variables for sensitive data
5. WebRTC connections use STUN servers for NAT traversal
