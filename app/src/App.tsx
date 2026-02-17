import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Home from './pages/Home';
import Category from './pages/Category';
import Study from './pages/Study';
import Dictation from './pages/Dictation';
import Request from './pages/Request';
import Vocabulary from './pages/Vocabulary';
import About from './pages/About';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/category/:categoryId" element={<Category />} />
            <Route path="/study/:videoId" element={<Study />} />
            <Route path="/dictation/:videoId" element={<Dictation />} />
            <Route path="/request" element={<Request />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
