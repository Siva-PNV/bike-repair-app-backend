/* global process */
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();


import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
// app.use(cors({
//   origin: true, // Allow all origins for development
//   credentials: true
// }));
// // Ensure CORS preflight (OPTIONS) always succeeds
// app.options('*', cors({
//   origin: true,
//   credentials: true
// }));
app.use(cors());
app.options('*', cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});
app.set('io', io); // Make io accessible in routes

const PORT = process.env.PORT || 5050;

app.get('/', (req, res) => {
  res.send('Bike Repair Backend API');
});


// Routes
import authRoutes from './routes/auth.js';
import mechanicsRoutes from './routes/mechanics.js';
import requestsRoutes from './routes/requests.js';
app.use('/api/auth', authRoutes);
app.use('/api/mechanics', mechanicsRoutes);
app.use('/api/requests', requestsRoutes);

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://root:root@cluster0.oxv3sgf.mongodb.net/bike_repair', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    // Optionally, handle join/leave rooms for mechanics
    socket.on('join', (mechanicId) => {
      socket.join(`mechanic_${mechanicId}`);
    });
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});
