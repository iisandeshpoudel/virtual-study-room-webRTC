import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';
import { API_URL } from '../config';

const RoomList = ({ user, onLogout }) => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Fetch rooms error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: newRoomName })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const room = await response.json();
      setRooms([...rooms, room]);
      setNewRoomName('');
    } catch (error) {
      console.error('Create room error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const joinRoom = async (roomId) => {
    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Join room error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Study Rooms</CardTitle>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={createRoom} className="flex gap-2 mb-6">
            <Input
              type="text"
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              required
            />
            <Button type="submit">Create Room</Button>
          </form>

          <div className="grid gap-4">
            {rooms.map((room) => (
              <Card key={room._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{room.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {room.participants.length}/5 participants
                    </p>
                  </div>
                  <Button
                    onClick={() => joinRoom(room._id)}
                    disabled={room.participants.length >= 5}
                  >
                    Join Room
                  </Button>
                </div>
              </Card>
            ))}
            {rooms.length === 0 && (
              <p className="text-center text-muted-foreground">
                No study rooms available. Create one to get started!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomList; 