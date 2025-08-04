import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// In-memory storage (in production, use a database)
const users = new Map();
const messages = new Map();
const onlineUsers = new Map();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Authentication middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !users.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = token;
  next();
};

// REST API Routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const userId = crypto.randomBytes(16).toString('hex');
  
  // Check if username exists
  for (const [id, user] of users) {
    if (user.username === username) {
      return res.status(400).json({ error: 'Username already exists' });
    }
  }
  
  users.set(userId, {
    id: userId,
    username,
    password: crypto.createHash('sha256').update(password).digest('hex'),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
    status: 'Hey there! I am using WhatsApp++',
    lastSeen: new Date()
  });
  
  res.json({ token: userId, user: { id: userId, username, avatar: users.get(userId).avatar } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  for (const [id, user] of users) {
    if (user.username === username && user.password === hashedPassword) {
      return res.json({ 
        token: id, 
        user: { 
          id, 
          username: user.username, 
          avatar: user.avatar,
          status: user.status 
        } 
      });
    }
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/contacts', authenticate, (req: any, res) => {
  const contacts = [];
  for (const [id, user] of users) {
    if (id !== req.userId) {
      contacts.push({
        id,
        username: user.username,
        avatar: user.avatar,
        status: user.status,
        isOnline: onlineUsers.has(id),
        lastSeen: user.lastSeen
      });
    }
  }
  res.json(contacts);
});

app.get('/api/messages/:contactId', authenticate, (req: any, res) => {
  const { contactId } = req.params;
  const conversationKey = [req.userId, contactId].sort().join(':');
  const conversation = messages.get(conversationKey) || [];
  res.json(conversation);
});

app.post('/api/upload', authenticate, upload.single('file'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`
  });
});

// WebSocket handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token || !users.has(token)) {
    return next(new Error('Authentication error'));
  }
  socket.userId = token;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  const user = users.get(userId);
  
  console.log(`User ${user.username} connected`);
  onlineUsers.set(userId, socket.id);
  
  // Notify others that user is online
  socket.broadcast.emit('userOnline', userId);
  
  // Send online users list
  socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
  
  socket.on('sendMessage', (data) => {
    const { to, message, type = 'text', content } = data;
    const conversationKey = [userId, to].sort().join(':');
    
    const messageData = {
      id: crypto.randomBytes(16).toString('hex'),
      from: userId,
      to,
      type,
      message,
      content,
      timestamp: new Date(),
      delivered: false,
      read: false
    };
    
    // Store message
    if (!messages.has(conversationKey)) {
      messages.set(conversationKey, []);
    }
    messages.get(conversationKey).push(messageData);
    
    // Send to recipient if online
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receiveMessage', messageData);
      messageData.delivered = true;
    }
    
    // Send confirmation back to sender
    socket.emit('messageSent', messageData);
  });
  
  socket.on('typing', ({ to, isTyping }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', { from: userId, isTyping });
    }
  });
  
  socket.on('markAsRead', ({ messageId, conversationWith }) => {
    const conversationKey = [userId, conversationWith].sort().join(':');
    const conversation = messages.get(conversationKey);
    
    if (conversation) {
      const message = conversation.find((m: any) => m.id === messageId);
      if (message) {
        message.read = true;
        
        // Notify sender
        const senderSocketId = onlineUsers.get(message.from);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messageRead', { messageId, by: userId });
        }
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${user.username} disconnected`);
    onlineUsers.delete(userId);
    users.get(userId).lastSeen = new Date();
    socket.broadcast.emit('userOffline', userId);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});