export type Tag = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VideoTag = { id: number; name: string };

export type Video = {
  id: number;
  filename: string;
  path: string;
  extension: string | null;
  size: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  videoKey: string | null;
  tags: VideoTag[];
};

export type VideoListResponse = {
  items: Video[];
  total: number;
  skip: number;
  take: number;
};

export type FolderListing = {
  parent: string;
  subfolders: { name: string; videoCount: number }[];
  files: { id: number; filename: string; path: string }[];
};

export type NovelListItem = {
  id: number;
  name: string;
  author: string;
  wordCount: number;
  starRating: number;
  readCount: number;
};

export type NovelPageResponse = NovelListItem & {
  content: string;
  pageSize: number;
};

export type Ebook = {
  id: number;
  title: string;
  author: string;
  filePath: string;
  format: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
};

export type EbookListResponse = {
  items: Ebook[];
  total: number;
  skip: number;
  take: number;
};
