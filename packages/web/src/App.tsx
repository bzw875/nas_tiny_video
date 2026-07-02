import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Aish123Home } from './pages/Aish123Home';
import { FoldersPage } from './pages/FoldersPage';
import { GalleryPage } from './pages/GalleryPage';
import { NovelHome } from './pages/NovelHome';
import { NovelReader } from './pages/NovelReader';
import { TagsPage } from './pages/TagsPage';
import { EbooksPage } from './pages/EbooksPage';
import { VideosPage } from './pages/VideosPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/videos" replace />} />
        <Route path="/novels" element={<NovelHome />} />
        <Route path="/novel/:id" element={<NovelReader />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/ebooks" element={<EbooksPage />} />
        <Route path="/aish123" element={<Aish123Home />} />
        <Route path="*" element={<Navigate to="/novels" replace />} />
      </Route>
    </Routes>
  );
}
