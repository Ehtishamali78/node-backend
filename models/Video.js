const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  hashtags: [String],
  videoUrl: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comments: [{ user: String, text: String }],
  ratings: [Number]
});

module.exports = mongoose.model('Video', VideoSchema);
