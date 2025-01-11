const express = require('express');
const multer = require('multer');
const { getCosmosContainer } = require('../config/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });


const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.BLOB_CONN_STRING);
const containerName = 'videos';

// Upload Video
router.post('/upload', upload.single('video'), async (req, res) => {
  const { title, hashtags } = req.body;
  const videoUrl = `/uploads/${req.file.filename}`;
  try {
    const container = await getCosmosContainer();
    const video = {
      id: `video-${Date.now()}`,
      title,
      hashtags: hashtags.split(','),
      videoUrl,
      comments: [],
      ratings: []
    };

    await container.items.create(video);
    res.status(201).send('Video uploaded successfully');
  } catch (err) {
    res.status(500).send('Error uploading video');
  }
});

// Get Latest Videos
router.get('/latest', async (req, res) => {
  try {
    const container = await getCosmosContainer();
    const { resources: videos } = await container.items
      .query('SELECT * FROM c ORDER BY c._ts DESC')
      .fetchAll();

    // Filter only objects with id starting with "video"
    const filteredVideos = videos.filter(item => item.id.startsWith('video'));

    res.json(filteredVideos);
  } catch (err) {
    console.error('Error fetching videos:', err);
    res.status(500).send('Error fetching videos');
  }
});

// Search Videos
router.get('/search', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).send('Query parameter is required');
  }

  try {
    const container = await getCosmosContainer();
    const { resources: videos } = await container.items
      .query(
        `SELECT * FROM c WHERE CONTAINS(LOWER(c.title), LOWER("${query}")) OR ARRAY_CONTAINS(c.hashtags, "${query}")`
      )
      .fetchAll();

    res.json(videos);
  } catch (err) {
    console.error('Error searching videos:', err.message);
    res.status(500).send('Error searching videos');
  }
});

//Get Single Video
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const container = await getCosmosContainer();
    const { resources: videos } = await container.items
      .query(`SELECT * FROM c WHERE c.id = "${id}"`)
      .fetchAll();

    if (videos.length === 0) {
      return res.status(404).send('Video not found');
    }

    const video = videos[0];
    res.json({ video, comments: video.comments || [] });
  } catch (err) {
    console.error('Error fetching video:', err.message);
    res.status(500).send('Error fetching video');
  }
});

//Add Comments for Video
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).send('Comment text is required');
  }

  try {
    const container = await getCosmosContainer();
    const { resources: videos } = await container.items
      .query(`SELECT * FROM c WHERE c.id = "${id}"`)
      .fetchAll();

    if (videos.length === 0) {
      return res.status(404).send('Video not found');
    }

    const video = videos[0];
    video.comments = video.comments || [];
    const newComment = { id: `comment-${Date.now()}`, text };
    video.comments.push(newComment);

    await container.items.upsert(video);
    res.status(201).json(newComment);
  } catch (err) {
    console.error('Error adding comment:', err.message);
    res.status(500).send('Error adding comment');
  }
});

//Upload Video to Blob Storage
router.post('/uploadBlob', upload.single('video'), async (req, res) => {
  const { title, hashtags } = req.body;
  const file = req.file;

  try {
    // Check if container exists, if not create it
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      await containerClient.create();
      console.log(`Container "${containerName}" created.`);
    }

    // Upload the video to Blob Storage
    const blobName = `video-${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadFile(file.path);
    console.log(`Video uploaded to Blob Storage with blob name: ${blobName}`);

    // Generate the Blob URL
    const videoUrl = blockBlobClient.url;

    // Save video details to Cosmos DB
    const container = await getCosmosContainer();
    const video = {
      id: `video-${Date.now()}`,
      title,
      hashtags: hashtags.split(','),
      videoUrl,
      comments: [],
      ratings: []
    };

    await container.items.create(video);

    // Send response
    res.status(201).send('Video uploaded successfully');
  } catch (err) {
    console.error('Error uploading video:', err);
    res.status(500).send('Error uploading video');
  }
});


module.exports = router;
