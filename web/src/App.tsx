import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Aish123Home } from './pages/Aish123Home';
import { AishPage } from './pages/AishPage';
import { TreeholeAuthorPage } from './pages/TreeholeAuthorPage';
import { TreeholePage } from './pages/TreeholePage';
import { TreeholeSearchPage } from './pages/TreeholeSearchPage';
import { TreeholeStatisticsPage } from './pages/TreeholeStatisticsPage';
import { FoldersPage } from './pages/FoldersPage';
import { GalleryPage } from './pages/GalleryPage';
import { NovelHome } from './pages/NovelHome';
import { NovelReader } from './pages/NovelReader';
import { TagsPage } from './pages/TagsPage';
import { EbooksPage } from './pages/EbooksPage';
import { VideosPage } from './pages/VideosPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
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
          <Route path="/treehole" element={<TreeholePage />} />
          <Route path="/treehole/search" element={<TreeholeSearchPage />} />
          <Route path="/treehole/statistics" element={<TreeholeStatisticsPage />} />
          <Route path="/treehole/aish" element={<AishPage />} />
          <Route path="/treehole/author/:author" element={<TreeholeAuthorPage />} />
          <Route path="*" element={<Navigate to="/novels" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
