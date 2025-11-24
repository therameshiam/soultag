import React, { useState, useEffect } from 'react';
import { StatusSpinner } from './components/StatusSpinner';
import { ActivationForm } from './components/ActivationForm';
import { FoundView } from './components/FoundView';
import { Dashboard } from './components/Dashboard';
import { getTagStatus, getAllTags } from './services/mockBackend';
import { TagData, TagStatus } from './types';
import { QrCode, Shield } from 'lucide-react';

// Your Google Apps Script Web App URL
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwDvbsM6B3GoqqAsGCXR-vkhBhve5dT3ExSF0ukrWqQcZP0LKQRf_tguIcRkXZ5mLq5/exec';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentTag, setCurrentTag] = useState<TagData | null>(null);
  const [gasUrl, setGasUrl] = useState<string>(DEFAULT_GAS_URL);
  const [view, setView] = useState<'landing' | 'activating' | 'found' | 'success'>('landing');

  // Load backend config from local storage, or stick with default
  useEffect(() => {
    const savedUrl = localStorage.getItem('gas_api_url');
    if (savedUrl) {
      setGasUrl(savedUrl);
    } else {
      // Ensure default is saved if nothing exists
      localStorage.setItem('gas_api_url', DEFAULT_GAS_URL);
    }
  }, []);

  // Parse URL Parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagId = params.get('tag');

    if (tagId) {
      checkTag(tagId);
    } else {
      setLoading(false);
      setView('landing');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gasUrl]);

  const checkTag = async (id: string) => {
    setLoading(true);
    try {
      const data = await getTagStatus(id, gasUrl);
      setCurrentTag(data);
      if (data.status === TagStatus.ACTIVE) {
        setView('found');
      } else {
        setView('activating');
      }
    } catch (error) {
      console.error(error);
      // Fallback/Error state could go here
    } finally {
      setLoading(false);
    }
  };

  const handleGasUrlChange = (url: string) => {
    setGasUrl(url);
    localStorage.setItem('gas_api_url', url);
  };

  const handleActivationSuccess = () => {
    setView('success');
    // Reload tag status after brief delay
    setTimeout(() => {
       if (currentTag) checkTag(currentTag.tagId);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <StatusSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header / Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => {
                window.history.pushState({}, '', window.location.pathname);
                setView('landing');
            }}>
              <QrCode className="h-8 w-8 text-brand-600" />
              <span className="ml-2 text-xl font-bold tracking-tight text-gray-900">
                ScanTo<span className="text-brand-600">Return</span>
              </span>
            </div>
            {view !== 'landing' && (
                <div className="flex items-center">
                   <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
                     {currentTag?.tagId}
                   </div>
                </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'landing' && (
          <Dashboard 
            tags={getAllTags()} 
            setGasUrl={handleGasUrlChange} 
            gasUrl={gasUrl} 
          />
        )}

        {view === 'activating' && currentTag && (
          <div className="animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">New Tag Detected</h1>
              <p className="text-gray-500 mt-2">Activate this tag to protect your property.</p>
            </div>
            <ActivationForm 
              tagId={currentTag.tagId} 
              gasUrl={gasUrl} 
              onSuccess={handleActivationSuccess}
            />
          </div>
        )}

        {view === 'found' && currentTag && (
          <FoundView tagData={currentTag} />
        )}

        {view === 'success' && (
           <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-300">
             <div className="rounded-full bg-green-100 p-6 mb-6">
                <Shield className="w-16 h-16 text-green-600" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900">Protection Activated!</h2>
             <p className="text-gray-500 mt-2 max-w-xs mx-auto">
               Your tag is now live. If this item is lost, the finder can scan it to contact you.
             </p>
           </div>
        )}

      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 text-center">
              <p className="text-sm text-gray-400">© 2025 ScanToReturn. Built with Serverless Tech.</p>
          </div>
      </footer>
    </div>
  );
};

export default App;