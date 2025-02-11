import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { API_URL, SOCKET_URL } from '../config';
import Peer from 'simple-peer/simplepeer.min.js';

const Room = ({ user, onLogout }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [peers, setPeers] = useState({});
  const [stream, setStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const socketRef = useRef();
  const peersRef = useRef({});
  const localVideoRef = useRef();

  const checkMediaDevices = async () => {
    try {
      // Debug information
      console.log('Browser Info:', {
        userAgent: navigator.userAgent,
        mediaDevices: !!navigator?.mediaDevices,
        getUserMedia: !!navigator?.mediaDevices?.getUserMedia,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });

      // In development, allow non-secure context when using local IP
      const isDevelopment = import.meta.env.DEV;
      const isLocalNetwork = window.location.hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./);
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // More lenient check for development
      if (!window.isSecureContext && !isDevelopment) {
        throw new Error('For security reasons, video chat requires HTTPS. Please use a secure connection or localhost.');
      }

      // Check if navigator.mediaDevices exists and wait a bit if it doesn't
      if (!navigator?.mediaDevices) {
        // In development, try waiting a bit as sometimes the API takes time to initialize
        if (isDevelopment && (isLocalNetwork || isLocalhost)) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (!navigator?.mediaDevices) {
            throw new Error('Media devices API not available. Please check your browser settings and permissions.');
          }
        } else {
          throw new Error('Media devices API not available. Please check your browser settings and permissions.');
        }
      }

      // Request permissions first with constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      };

      try {
        await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaError) {
        console.error('Media access error:', mediaError);
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Please allow access to your camera and microphone in your browser settings.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No camera or microphone found. Please check your device connections.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('Cannot access your camera or microphone. Please make sure no other application is using them.');
        } else {
          throw new Error(`Camera/Microphone Error: ${mediaError.message}`);
        }
      }

      // After permission is granted, enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices.map(d => ({ kind: d.kind, label: d.label })));
      
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');

      if (!hasCamera && !hasMicrophone) {
        throw new Error('No camera or microphone found. Please check your device connections.');
      }

      return true;
    } catch (error) {
      console.error('Media devices check failed:', error);
      throw error;
    }
  };

  const createPeer = (userId, initiator, stream) => {
    try {
      console.log('Creating peer for:', userId, 'initiator:', initiator);
      
      // Destroy existing peer if it exists
      if (peersRef.current[userId]) {
        console.log('Destroying existing peer for:', userId);
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[userId];
          return newPeers;
        });
      }
      
      // Create a new peer instance
      const peer = new Peer({
        initiator,
        stream,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      // Track signaling state and last processed signal
      peer._signalingState = initiator ? 'new' : 'awaiting-offer';
      peer._lastProcessedSignal = null;

      // Add error logging
      peer.on('error', err => {
        console.error('Peer error for user:', userId, 'Error:', err);
        // Clean up on error
        if (peersRef.current[userId]) {
          delete peersRef.current[userId];
          setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[userId];
            return newPeers;
          });
        }
      });

      peer.on('signal', signal => {
        console.log('Local signal generated for:', userId, 'type:', signal.type, 'current state:', peer._signalingState);
        
        // Update state based on local signal
        if (signal.type === 'offer') {
          peer._signalingState = 'have-local-offer';
        } else if (signal.type === 'answer') {
          peer._signalingState = 'stable';
        }

        socketRef.current.emit('signal', {
          userId: user.userId,
          signal,
          to: userId
        });
      });

      peer.on('connect', () => {
        console.log('Peer connection established with:', userId);
        peer._signalingState = 'connected';
      });

      peer.on('stream', remoteStream => {
        console.log('Received stream from:', userId);
        const video = document.createElement('video');
        video.srcObject = remoteStream;
        video.id = `video-${userId}`;
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'w-full h-full object-cover rounded-lg';
        
        // Ensure video plays
        video.play().catch(error => {
          console.error('Error playing video:', error);
        });
        
        const container = document.getElementById('peers-grid');
        if (container) {
          // Remove any existing video for this peer
          const existingVideo = document.getElementById(`video-${userId}`);
          if (existingVideo) {
            existingVideo.remove();
          }
          container.appendChild(video);
        }
      });

      return peer;
    } catch (error) {
      console.error('Error creating peer:', error);
      throw error;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Check media devices support first
        await checkMediaDevices();

        // Initialize socket connection
        socketRef.current = io(SOCKET_URL, {
          transports: ['websocket'],
          secure: true
        });

        // Request media access with error handling
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        socketRef.current.emit('join-room', { roomId, userId: user.userId });

        socketRef.current.on('user-joined', ({ userId, socketId }) => {
          console.log('User joined:', userId, 'with socket:', socketId);
          try {
            // Only create a new peer if we don't have one for this user
            if (!peersRef.current[userId]) {
              console.log('Creating initiator peer for new user');
              const peer = createPeer(userId, true, mediaStream);
              if (peer) {
                peersRef.current[userId] = peer;
                setPeers(prev => ({ ...prev, [userId]: peer }));
              }
            }
          } catch (error) {
            console.error('Error on user joined:', error);
            toast({
              title: 'Connection Error',
              description: 'Failed to establish peer connection',
              variant: 'destructive'
            });
          }
        });

        socketRef.current.on('room-users', (users) => {
          console.log('Existing room users:', users);
          // Process existing users in sequence to avoid race conditions
          users.forEach(({ userId: peerId }) => {
            if (peerId !== user.userId && !peersRef.current[peerId]) {
              try {
                console.log('Creating non-initiator peer for existing user:', peerId);
                const peer = createPeer(peerId, false, mediaStream);
                if (peer) {
                  peersRef.current[peerId] = peer;
                  setPeers(prev => ({ ...prev, [peerId]: peer }));
                }
              } catch (error) {
                console.error('Error creating peer for user:', peerId, error);
              }
            }
          });
        });

        socketRef.current.on('signal', ({ userId, signal, from }) => {
          console.log('Received signal from:', userId, 'socket:', from, 'type:', signal.type);
          
          try {
            let peer = peersRef.current[userId];
            
            // Handle the case where we receive an offer
            if (signal.type === 'offer') {
              if (peer) {
                console.log('Destroying existing peer for new offer');
                peer.destroy();
              }
              console.log('Creating new peer for offer');
              peer = createPeer(userId, false, stream);
              peersRef.current[userId] = peer;
              setPeers(prev => ({ ...prev, [userId]: peer }));
            }
            
            // Only signal if we have a peer
            if (peer) {
              const currentState = peer._signalingState;
              console.log('Current signaling state:', currentState, 'for signal type:', signal.type);
              
              // Check for duplicate signals
              const signalKey = JSON.stringify(signal);
              if (signalKey === peer._lastProcessedSignal) {
                console.log('Ignoring duplicate signal');
                return;
              }
              
              // Validate state transitions
              const isValidTransition = (
                (signal.type === 'offer' && (currentState === 'new' || currentState === 'awaiting-offer')) ||
                (signal.type === 'answer' && currentState === 'have-local-offer') ||
                (signal.type === 'candidate' && ['new', 'have-local-offer', 'have-remote-offer', 'stable'].includes(currentState))
              );
              
              if (isValidTransition) {
                console.log('Processing signal:', signal.type, 'in state:', currentState);
                peer._lastProcessedSignal = signalKey;
                
                if (signal.type === 'offer') {
                  peer._signalingState = 'have-remote-offer';
                } else if (signal.type === 'answer') {
                  peer._signalingState = 'stable';
                }
                
                peer.signal(signal);
              } else {
                console.log('Ignoring signal due to invalid state transition:', currentState, '->', signal.type);
              }
            } else {
              console.error('No peer found for signal from:', userId);
            }
          } catch (error) {
            console.error('Error processing signal:', error);
          }
        });

        socketRef.current.on('user-left', ({ userId }) => {
          console.log('User left:', userId);
          if (peersRef.current[userId]) {
            peersRef.current[userId].destroy();
            delete peersRef.current[userId];
            setPeers(prev => {
              const newPeers = { ...prev };
              delete newPeers[userId];
              return newPeers;
            });
            // Remove the video element
            const video = document.getElementById(`video-${userId}`);
            if (video) {
              video.remove();
            }
          }
        });

        socketRef.current.on('room-full', () => {
          toast({
            title: 'Error',
            description: 'Room is full',
            variant: 'destructive'
          });
          navigate('/rooms');
        });
      } catch (error) {
        console.error('Initialization error:', error);
        setMediaError(error.message);
        toast({
          title: 'Error',
          description: error.message || 'Could not initialize video chat',
          variant: 'destructive'
        });
      }
    };

    init();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(peer => {
        if (peer) {
          peer.destroy();
        }
      });
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, user.userId]);

  const leaveRoom = async () => {
    try {
      await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      navigate('/rooms');
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  if (mediaError) {
    return (
      <div className="min-h-screen p-4">
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Error</CardTitle>
            <Button variant="ghost" onClick={() => navigate('/rooms')}>
              Back to Rooms
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-destructive mb-4">{mediaError}</p>
              <div className="text-muted-foreground">
                <p className="mb-2">Please make sure:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You are using a modern browser (Chrome, Firefox, Safari)</li>
                  <li>You have allowed camera and microphone access</li>
                  <li>Your camera and microphone are properly connected</li>
                  <li>No other application is using your camera/microphone</li>
                  <li>You are accessing the site via HTTPS or localhost</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Study Room</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={leaveRoom}>
              Leave Room
            </Button>
            <Button variant="ghost" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded">
                You
              </div>
            </div>
            <div id="peers-grid" className="grid gap-4 col-span-2">
              {/* Peer videos will be added here dynamically */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Room; 