-- Create database
CREATE DATABASE IF NOT EXISTS video_manager;
USE video_manager;

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(500) NOT NULL,
  path VARCHAR(1000) NOT NULL,
  extension VARCHAR(20),
  size BIGINT,
  created_time DATETIME,
  modified_time DATETIME,
  video_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_filename (filename),
  INDEX idx_created_time (created_time)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Video-Tags junction table
CREATE TABLE IF NOT EXISTS video_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_video_tag (video_id, tag_id),
  INDEX idx_video_id (video_id),
  INDEX idx_tag_id (tag_id)
);
