import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FoldersPage } from './pages/FoldersPage';
import { TagsPage } from './pages/TagsPage';
import { VideosPage } from './pages/VideosPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/videos" replace />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="*" element={<Navigate to="/videos" replace />} />
      </Route>
    </Routes>
  );
}
