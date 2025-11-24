import React, { useState, useEffect } from 'react';
import { TagData } from '../types';
import { MessageCircle, MapPin, Wand2, ArrowRight } from 'lucide-react';
import { generateFoundMessage } from '../services/geminiService';

interface Props {
  tagData: TagData;
}

export const FoundView: React.FC<Props> = ({ tagData }) => {
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  // Construct the base URL safely
  // If redirectUrl is provided by backend (secured), use it. Otherwise construct manually (mock mode).
  const getWhatsAppLink = (text: string) => {
    if (tagData.redirectUrl) {
      // In a real secure scenario, we'd append the text to a proxy URL, but for MVP:
      // If tagData.redirectUrl is a direct wa.me link:
      const separator = tagData.redirectUrl.includes('?') ? '&' : '?';
      return `${tagData.redirectUrl}${separator}text=${encodeURIComponent(text)}`;
    }
    // Fallback for mock mode where we have the raw phone (Phase 3 Scenario 2)
    return `https://wa.me/${tagData.ownerPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleGenerateMessage = async () => {
    setGenerating(true);
    // In a real app, we might get location from navigator.geolocation
    const generated = await generateFoundMessage(tagData.itemName || "Item");
    setMessage(generated);
    setGenerating(false);
  };

  useEffect(() => {
    // Set default message
    setMessage(`Hi, I found your ${tagData.itemName || 'item'}. How can I return it?`);
  }, [tagData]);

  const handleContact = () => {
    window.location.href = getWhatsAppLink(message);
  };

  return (
    <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100 animate-in slide-in-from-bottom-4 duration-700">
      <div className="bg-green-500 px-6 py-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MapPin className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Item Found!</h2>
          <p className="text-green-50 mt-2">
            This <strong className="text-white">{tagData.itemName}</strong> is protected.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Message to Owner
          </label>
          <textarea
            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-700 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button 
            onClick={handleGenerateMessage}
            disabled={generating}
            className="mt-2 text-xs flex items-center text-brand-600 hover:text-brand-800 transition-colors disabled:opacity-50"
          >
            <Wand2 className={`w-3 h-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'AI is writing...' : 'Rewrite nicely with AI'}
          </button>
        </div>

        <button
          onClick={handleContact}
          className="w-full flex items-center justify-center py-4 px-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:shadow-green-300 transition-all transform active:scale-[0.98] group"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Contact Owner on WhatsApp
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <p className="text-center text-xs text-gray-400">
          Your privacy is protected. We simply redirect you to WhatsApp.
        </p>
      </div>
    </div>
  );
};
