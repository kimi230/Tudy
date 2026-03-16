import { HashRouter, Routes, Route } from 'react-router-dom';
import {
  AuthProvider, XPToastProvider, Header, ScrollToTop, LoginPage,
  HomePage, DashboardPage, CategoryPage, StudyPage, DictationPage,
  DailyLearningPage, LibraryPage, VocabularyPage,
  ErrorNotePage, ProfilePage, RequestPage, AboutPage, UpdatesPage, SubscribePage,
  useAuth,
} from '@stdylang/shared';

function HomeOrDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" /></div>;
  return user ? <DashboardPage /> : <HomePage />;
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <AuthProvider>
        <XPToastProvider>
        <Routes>
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="*" element={
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                  <Route path="/" element={<HomeOrDashboard />} />
                  <Route path="/category/:categoryId" element={<CategoryPage />} />
                  <Route path="/study/:videoId" element={<StudyPage />} />
                  <Route path="/dictation/:videoId" element={<DictationPage />} />
                  <Route path="/daily" element={<DailyLearningPage />} />
                  <Route path="/request" element={<RequestPage />} />
                  <Route path="/vocabulary" element={<VocabularyPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/updates" element={<UpdatesPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/error-notes" element={<ErrorNotePage />} />
                </Routes>
              </main>
            </div>
          } />
        </Routes>
        </XPToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
