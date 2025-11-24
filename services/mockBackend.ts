import { TagData, TagStatus, ActivationPayload } from '../types';

const STORAGE_KEY = 'scan_to_return_db';
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwDvbsM6B3GoqqAsGCXR-vkhBhve5dT3ExSF0ukrWqQcZP0LKQRf_tguIcRkXZ5mLq5/exec';

// Safe LocalStorage Helper (Prevents crashes in Incognito/Private modes)
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('LocalStorage access denied or not available');
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('LocalStorage write failed');
    }
  }
};

// Initialize mock DB if empty
const initDB = () => {
  if (!safeLocalStorage.getItem(STORAGE_KEY)) {
    const initialData: Record<string, TagData> = {};
    // Create 10 mock tags
    for (let i = 1; i <= 10; i++) {
      const id = `ID_${i.toString().padStart(4, '0')}`;
      initialData[id] = { tagId: id, status: TagStatus.NEW };
    }
    // Set one as active for demo
    initialData['ID_0001'] = {
      tagId: 'ID_0001',
      status: TagStatus.ACTIVE,
      itemName: 'Vintage Leather Wallet',
      ownerPhone: '15551234567', // Demo phone
      redirectUrl: 'https://wa.me/15551234567'
    };
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
  }
};

export const getTagStatus = async (tagId: string, gasUrl?: string): Promise<TagData> => {
  const urlToUse = gasUrl || DEFAULT_URL;

  // If a real Google Apps Script URL is provided
  if (urlToUse && urlToUse.startsWith('http')) {
    try {
      // Setup AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      // CRITICAL FIX: Do NOT send headers with GET requests to GAS Web Apps.
      const response = await fetch(`${urlToUse}?tag=${tagId}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const text = await response.text();
      // GAS sometimes returns HTML error pages even with 200 OK
      if (text.trim().startsWith('<')) { 
          throw new Error("Received HTML instead of JSON (Google authentication or script error)"); 
      }

      const data = JSON.parse(text);
      
      // Map GAS response to App Types
      if (data.status === 'found') {
        return {
          tagId,
          status: TagStatus.ACTIVE,
          itemName: data.item,
          ownerPhone: data.phone, 
          redirectUrl: data.phone ? `https://wa.me/${data.phone}` : undefined
        };
      }
      // If status is 'new' or anything else
      return { tagId, status: TagStatus.NEW };
      
    } catch (e: any) {
      console.warn("Failed to fetch from real API, falling back to mock...", e);
      if (e.name === 'AbortError') {
         throw new Error("Connection timed out. Please check your internet.");
      }
      // We intentionally fall through to mock data so the UI doesn't break completely
      // UNLESS it was a specific connectivity error we want to show
    }
  }

  // Fallback to LocalStorage Mock
  initDB();
  await new Promise(resolve => setTimeout(resolve, 500)); 
  
  try {
    const db = JSON.parse(safeLocalStorage.getItem(STORAGE_KEY) || '{}');
    const tag = db[tagId];

    if (!tag) {
      return { tagId, status: TagStatus.NEW };
    }
    return tag;
  } catch (e) {
    // Extreme fallback if localStorage fails
    return { tagId, status: TagStatus.NEW };
  }
};

export const activateTag = async (payload: ActivationPayload, gasUrl?: string): Promise<boolean> => {
  const urlToUse = gasUrl || DEFAULT_URL;

  // Real API Call
  if (urlToUse && urlToUse.startsWith('http')) {
    try {
      const formData = new FormData();
      formData.append('tag_id', payload.tagId);
      formData.append('item_name', payload.itemName);
      formData.append('phone', payload.ownerPhone);
      
      // 'no-cors' allows the request to reach Google (Fire & Forget)
      await fetch(urlToUse, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' 
      });
      
      // We assume success if no network error occurs
      // We also optimistically update local cache so UI feels instant
      try {
         const db = JSON.parse(safeLocalStorage.getItem(STORAGE_KEY) || '{}');
         db[payload.tagId] = {
            tagId: payload.tagId,
            status: TagStatus.ACTIVE,
            itemName: payload.itemName,
            ownerPhone: payload.ownerPhone,
            redirectUrl: `https://wa.me/${payload.ownerPhone}`
         };
         safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      } catch(e) { /* ignore local save error */ }

      return true;
    } catch (e) {
      console.error("Activation failed", e);
      return false;
    }
  }

  // Mock Implementation
  await new Promise(resolve => setTimeout(resolve, 1000));
  const db = JSON.parse(safeLocalStorage.getItem(STORAGE_KEY) || '{}');
  
  db[payload.tagId] = {
    tagId: payload.tagId,
    status: TagStatus.ACTIVE,
    itemName: payload.itemName,
    ownerPhone: payload.ownerPhone,
    redirectUrl: `https://wa.me/${payload.ownerPhone}`
  };
  
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return true;
};

export const getAllTags = (): TagData[] => {
  initDB();
  const db = JSON.parse(safeLocalStorage.getItem(STORAGE_KEY) || '{}');
  return Object.values(db);
}