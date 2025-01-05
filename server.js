const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

const PORT = process.env.PORT || 5000;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.get('/', (req, res) => {
    res.send('Node.js backend is running!');
  });
  
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
