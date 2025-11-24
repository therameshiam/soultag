import { TagData, TagStatus, ActivationPayload } from '../types';

const STORAGE_KEY = 'scan_to_return_db';

// Initialize mock DB if empty
const initDB = () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
  }
};

export const getTagStatus = async (tagId: string, gasUrl?: string): Promise<TagData> => {
  // If a real Google Apps Script URL is provided
  if (gasUrl && gasUrl.startsWith('http')) {
    try {
      // GAS requires redirect following.
      const response = await fetch(`${gasUrl}?tag=${tagId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      const data = await response.json();
      
      // Map GAS response to App Types
      if (data.status === 'found') {
        return {
          tagId,
          status: TagStatus.ACTIVE,
          itemName: data.item,
          ownerPhone: data.phone, // In production, this might be hidden/masked
          redirectUrl: data.phone ? `https://wa.me/${data.phone}` : undefined
        };
      }
      return { tagId, status: TagStatus.NEW };
      
    } catch (e) {
      console.warn("Failed to fetch from real API, checking network...", e);
      // In a real app, we might throw error, but for hybrid demo, we might fallback
      // throw new Error("Connection failed"); 
      // Fallback allowed for demo purposes if GAS fails (e.g. CORS strictness)
    }
  }

  // Fallback to LocalStorage Mock
  initDB();
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency
  const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const tag = db[tagId];

  if (!tag) {
    // If tag doesn't exist in DB, treat as new for this system
    return { tagId, status: TagStatus.NEW };
  }
  return tag;
};

export const activateTag = async (payload: ActivationPayload, gasUrl?: string): Promise<boolean> => {
  // Real API Call
  if (gasUrl && gasUrl.startsWith('http')) {
    try {
      // Google Apps Script Web App POST requests usually have CORS issues in browser
      // because of the 302 redirect. 
      // 'no-cors' allows the request to reach Google, but we won't get a readable response.
      // We assume success if no network error occurs.
      
      const formData = new FormData();
      formData.append('tag_id', payload.tagId);
      formData.append('item_name', payload.itemName);
      formData.append('phone', payload.ownerPhone);
      
      await fetch(gasUrl, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' 
      });
      return true;
    } catch (e) {
      console.error("Activation failed", e);
      return false;
    }
  }

  // Mock Implementation
  await new Promise(resolve => setTimeout(resolve, 1000));
  const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  
  db[payload.tagId] = {
    tagId: payload.tagId,
    status: TagStatus.ACTIVE,
    itemName: payload.itemName,
    ownerPhone: payload.ownerPhone,
    redirectUrl: `https://wa.me/${payload.ownerPhone}`
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return true;
};

export const getAllTags = (): TagData[] => {
  initDB();
  const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return Object.values(db);
}