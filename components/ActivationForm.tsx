import React, { useState } from 'react';
import { TagData, ActivationPayload } from '../types';
import { ShieldCheck, Smartphone, Package, Sparkles } from 'lucide-react';
import { activateTag } from '../services/mockBackend';
import { suggestItemNames } from '../services/geminiService';

interface Props {
  tagId: string;
  gasUrl: string;
  onSuccess: () => void;
}

export const ActivationForm: React.FC<Props> = ({ tagId, gasUrl, onSuccess }) => {
  const [itemName, setItemName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !phone) return;

    setLoading(true);
    const payload: ActivationPayload = {
      tagId,
      itemName,
      ownerPhone: phone.replace(/\D/g, '') // Strip non-digits
    };

    const success = await activateTag(payload, gasUrl);
    setLoading(false);
    
    if (success) {
      onSuccess();
    } else {
      alert("Activation failed. Please check your connection.");
    }
  };

  const fetchSuggestions = async () => {
    if (itemName.length < 3) return;
    setLoadingSuggestions(true);
    const results = await suggestItemNames(itemName);
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  return (
    <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      <div className="bg-brand-600 px-6 py-6">
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Activate Protection</h2>
            <p className="text-brand-100 text-sm mt-1">Tag ID: {tagId}</p>
          </div>
          <ShieldCheck className="w-8 h-8 opacity-80" />
        </div>
      </div>

      <form onSubmit={handleActivation} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-500" />
            What are you protecting?
          </label>
          <div className="relative">
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onBlur={fetchSuggestions}
              className="block w-full rounded-lg border-gray-300 border bg-gray-50 p-3 focus:border-brand-500 focus:ring-brand-500 sm:text-sm transition-all"
              placeholder="e.g. Black Leather Wallet"
              required
            />
            {loadingSuggestions && (
                <div className="absolute right-3 top-3">
                    <Sparkles className="w-5 h-5 text-brand-400 animate-spin" />
                </div>
            )}
          </div>
          
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setItemName(s)}
                  className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full hover:bg-brand-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-500" />
            Your WhatsApp Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="block w-full rounded-lg border-gray-300 border bg-gray-50 p-3 focus:border-brand-500 focus:ring-brand-500 sm:text-sm transition-all"
            placeholder="e.g. 15551234567"
            required
          />
          <p className="mt-1 text-xs text-gray-400">Include country code, no + symbol.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
        >
          {loading ? 'Activating...' : 'Activate Tag'}
        </button>
      </form>
    </div>
  );
};
