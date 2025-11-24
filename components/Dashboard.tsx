
import React, { useState, useMemo, useEffect } from 'react';
import { TagData, TagStatus } from '../types';
import { 
  QrCode, CheckCircle2, AlertCircle, 
  Settings, BarChart3, Copy, Download, Save, Printer, RefreshCw, AlertTriangle, ExternalLink, Table
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import QRCode from 'qrcode';

interface Props {
  tags: TagData[];
  setGasUrl: (url: string) => void;
  gasUrl: string;
}

const GOOGLE_APPS_SCRIPT_CODE = `// --- COPY THIS INTO GOOGLE APPS SCRIPT ---

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tags");
    if (!sheet) return createJSONOutput({status: "error", message: "Sheet 'Tags' not found"});

    var tagId = e.parameter.tag;
    if (!tagId) return createJSONOutput({status: "error", message: "No tag ID provided"});

    var data = sheet.getDataRange().getValues();
    var result = { status: "new" }; // Default to new

    // Search for tag (skip header row)
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(tagId)) {
        if (data[i][1] === "Active") {
          result = {
            status: "found",
            item: data[i][2],
            phone: data[i][3] // In production, consider masking this
          };
        }
        break;
      }
    }
    
    return createJSONOutput(result);
    
  } catch (e) {
    return createJSONOutput({status: "error", error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tags");
    var tagId = e.parameter.tag_id;
    var item = e.parameter.item_name;
    var phone = e.parameter.phone;
    
    // Simple validation
    if (!tagId || !phone) {
       return createJSONOutput({status: "error", message: "Missing data"});
    }

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;

    // Check if tag exists
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(tagId)) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      // Create new row if ID doesn't exist (flexible manufacturing)
      sheet.appendRow([tagId, "Active", item, phone, new Date()]);
    } else {
      // Update existing row
      sheet.getRange(rowIndex, 2).setValue("Active");
      sheet.getRange(rowIndex, 3).setValue(item);
      sheet.getRange(rowIndex, 4).setValue(phone);
      sheet.getRange(rowIndex, 5).setValue(new Date());
    }

    return createJSONOutput({status: "success"});

  } catch (e) {
    return createJSONOutput({status: "error", error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- END OF CODE ---`;

export const Dashboard: React.FC<Props> = ({ tags, setGasUrl, gasUrl }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'setup' | 'qr'>('overview');
  const [tempUrl, setTempUrl] = useState(gasUrl);
  
  // Default base URL set to user's production URL
  const [baseUrl, setBaseUrl] = useState('https://therameshiam.github.io/soultag/');
  
  // QR Generation State
  const [qrMode, setQrMode] = useState<'single' | 'batch'>('single');
  const [singleId, setSingleId] = useState('ID_0001');
  const [singleQrData, setSingleQrData] = useState<string>('');
  const [batchStart, setBatchStart] = useState(1);
  const [batchCount, setBatchCount] = useState(20);
  const [batchData, setBatchData] = useState<{id: string, url: string, qr: string}[]>([]);

  // Validation for Dangerous URLs in QR Generator
  const isDangerousUrl = useMemo(() => baseUrl.includes('script.google.com'), [baseUrl]);
  const isLocalhost = useMemo(() => baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'), [baseUrl]);

  const stats = useMemo(() => {
    const active = tags.filter(t => t.status === TagStatus.ACTIVE).length;
    const inactive = tags.filter(t => t.status === TagStatus.NEW).length;
    return [
      { name: 'Active', value: active, color: '#22c55e' },
      { name: 'Inactive', value: inactive, color: '#94a3b8' }
    ];
  }, [tags]);

  const handleSaveUrl = () => {
    setGasUrl(tempUrl);
    alert("Backend URL Connected!");
  };

  // Generate Single QR
  useEffect(() => {
    const generateSingle = async () => {
        // Stop if dangerous URL to prevent user error
        if (isDangerousUrl) return;

        const separator = baseUrl.includes('?') ? '&' : '?';
        // Clean trailing slash
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const fullUrl = `${cleanBase}${separator}tag=${singleId}`;
        try {
            const dataUrl = await QRCode.toDataURL(fullUrl, { width: 400, margin: 2 });
            setSingleQrData(dataUrl);
        } catch (err) {
            console.error(err);
        }
    };
    generateSingle();
  }, [singleId, baseUrl, isDangerousUrl]);

  // Generate Batch QRs
  const generateBatch = async () => {
    if (isDangerousUrl) return;
    const newBatch = [];
    // Clean trailing slash
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    for(let i = 0; i < batchCount; i++) {
        const num = batchStart + i;
        const id = `ID_${num.toString().padStart(4, '0')}`;
        const separator = cleanBase.includes('?') ? '&' : '?';
        const fullUrl = `${cleanBase}${separator}tag=${id}`;
        try {
            const qr = await QRCode.toDataURL(fullUrl, { width: 200, margin: 1 });
            newBatch.push({ id, url: fullUrl, qr });
        } catch(e) { console.error(e); }
    }
    setBatchData(newBatch);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
    {/* No-Print Area: The Dashboard UI */}
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 no-print">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
            <p className="text-gray-500 mt-1">Manage your Serverless Lost & Found System</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Overview
            </button>
            <button 
                onClick={() => setActiveTab('setup')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'setup' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Settings className="w-4 h-4 inline mr-2" />
                Setup Backend
            </button>
            <button 
                onClick={() => setActiveTab('qr')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'qr' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <QrCode className="w-4 h-4 inline mr-2" />
                Manufacturing
            </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> System Status
                </h3>
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-3 h-3 rounded-full ${gasUrl ? 'bg-green-500' : 'bg-orange-400 animate-pulse'}`}></div>
                    <span className="text-sm font-medium text-gray-700">
                        {gasUrl ? 'Connected to Google Sheets' : 'Running in Mock Mode (Local Only)'}
                    </span>
                </div>
                {!gasUrl && (
                    <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-lg border border-orange-100 mb-4">
                        <AlertCircle className="w-4 h-4 inline mr-1 mb-0.5" />
                        You are currently using a fake local database. Data will disappear on refresh. Go to the <strong>Setup Backend</strong> tab to connect Google Sheets.
                    </div>
                )}
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {stats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-brand-500" /> Recent Activity (Demo Data)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                            { name: 'Jan', scans: 40 }, { name: 'Feb', scans: 30 }, { name: 'Mar', scans: 20 }, 
                            { name: 'Apr', scans: 50 }, { name: 'May', scans: 18 }, { name: 'Jun', scans: 23 },
                            { name: 'Jul', scans: 34 }
                        ]}>
                            <defs>
                                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis hide />
                            <Tooltip />
                            <Area type="monotone" dataKey="scans" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScans)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* SETUP TAB */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-bold text-gray-900">Step 1: Google Sheet Configuration</h3>
                   <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Correct Structure Detected
                   </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                    Ensure your Google Sheet has the following headers in the first row. 
                    The sheet tab at the bottom must be named <strong>"Tags"</strong>.
                </p>

                {/* Visual Sheet Representation */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg mb-6">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">A</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">B</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">C</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">D</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                                <td className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-200">1</td>
                                <td className="px-4 py-2 text-sm text-gray-900 font-mono border-r border-gray-200 bg-yellow-50">Tag ID</td>
                                <td className="px-4 py-2 text-sm text-gray-900 font-mono border-r border-gray-200 bg-yellow-50">Status</td>
                                <td className="px-4 py-2 text-sm text-gray-900 font-mono border-r border-gray-200 bg-yellow-50">Item Name</td>
                                <td className="px-4 py-2 text-sm text-gray-900 font-mono border-r border-gray-200 bg-yellow-50">Owner Phone</td>
                                <td className="px-4 py-2 text-sm text-gray-900 font-mono bg-yellow-50">Timestamp</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-200">2</td>
                                <td className="px-4 py-2 text-sm text-gray-400 italic border-r border-gray-200">ID_0001</td>
                                <td className="px-4 py-2 text-sm text-gray-400 italic border-r border-gray-200">Active</td>
                                <td className="px-4 py-2 text-sm text-gray-400 italic border-r border-gray-200">Wallet</td>
                                <td className="px-4 py-2 text-sm text-gray-400 italic border-r border-gray-200">1555...</td>
                                <td className="px-4 py-2 text-sm text-gray-400 italic">12/31/2025</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 className="text-sm font-bold text-gray-900 mb-2">Apps Script Code</h3>
                <p className="text-xs text-gray-500 mb-2">Paste this into Extensions &gt; Apps Script:</p>
                <div className="relative group">
                    <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto h-64 border border-slate-700">
                        {GOOGLE_APPS_SCRIPT_CODE}
                    </pre>
                    <button 
                        onClick={() => navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE)}
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded text-xs flex items-center transition-colors"
                    >
                        <Copy className="w-3 h-3 mr-1" /> Copy Code
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 2: Deploy & Connect</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600 mb-6">
                    <li>In the Apps Script editor, click <strong>Deploy &gt; New deployment</strong>.</li>
                    <li>Click the <strong>Select type</strong> gear icon and choose <strong>Web app</strong>.</li>
                    <li>Set <strong>Who has access</strong> to <strong>"Anyone"</strong> (Crucial!).</li>
                    <li>Click Deploy and copy the <strong>Web App URL</strong>.</li>
                    <li>Paste the URL below.</li>
                </ol>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
                  <strong>Note:</strong> This URL is for the system's internal use. 
                  <br/>Do NOT use this URL for your QR codes. Use your website link for QR codes.
                </div>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <DatabaseIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="https://script.google.com/macros/s/..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm"
                            value={tempUrl}
                            onChange={(e) => setTempUrl(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleSaveUrl}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Connect
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* QR GENERATOR TAB */}
      {activeTab === 'qr' && (
        <div className="space-y-6">
            
            <div className="flex gap-2 mb-4 bg-white p-2 rounded-lg border border-gray-200 w-fit">
                <button
                    onClick={() => setQrMode('single')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${qrMode === 'single' ? 'bg-gray-100 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Single Sticker
                </button>
                <button
                    onClick={() => setQrMode('batch')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${qrMode === 'batch' ? 'bg-gray-100 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Bulk Sticker Sheet
                </button>
            </div>

            {/* CRITICAL WARNINGS */}
            {isDangerousUrl && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-bold">
                      STOP! Do not use the 'script.google.com' URL here.
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      Your QR codes must point to <strong>this website</strong> (the frontend). 
                      The website will talk to Google in the background.
                    </p>
                    <button 
                      onClick={() => setBaseUrl('https://therameshiam.github.io/soultag/')}
                      className="mt-2 text-xs font-bold text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                    >
                      Reset to Website URL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!isDangerousUrl && isLocalhost && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 font-bold">
                      Warning: You are using 'localhost'.
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">
                      QR codes generated with 'localhost' will <strong>NOT work on your phone</strong>. 
                      Make sure the URL below matches your public website.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {qrMode === 'single' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Design Single Tag</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tag ID</label>
                            <input 
                                type="text" 
                                value={singleId}
                                onChange={(e) => setSingleId(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Website URL (Where the user lands)
                            </label>
                            <input 
                                type="text" 
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                className={`w-full p-3 border rounded-lg text-sm text-gray-500 ${isDangerousUrl ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                placeholder="https://therameshiam.github.io/soultag/"
                            />
                            <p className="text-xs text-gray-400 mt-1">The public address of your app.</p>
                        </div>
                        {!isDangerousUrl && (
                            <a 
                                href={singleQrData} 
                                download={`ScanToReturn_${singleId}.png`}
                                className="inline-flex items-center justify-center w-full bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download PNG
                            </a>
                        )}
                    </div>
                    <div className="w-full md:w-64 flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                        {singleQrData && !isDangerousUrl && <img src={singleQrData} alt="QR Code" className="w-48 h-48" />}
                        {isDangerousUrl && <div className="w-48 h-48 flex items-center justify-center text-red-500 text-center text-xs font-bold bg-red-50 rounded">Invalid URL</div>}
                        <p className="mt-4 font-mono text-lg font-bold text-gray-800">{singleId}</p>
                    </div>
                </div>
            )}

            {qrMode === 'batch' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="md:col-span-3">
                             <label className="block text-sm font-medium text-gray-700 mb-1">
                                Website URL (Where the user lands)
                            </label>
                            <input 
                                type="text" 
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                className={`w-full p-3 border rounded-lg text-sm text-gray-500 ${isDangerousUrl ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                placeholder="https://therameshiam.github.io/soultag/"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start ID Number</label>
                            <input 
                                type="number" 
                                min="1"
                                value={batchStart}
                                onChange={(e) => setBatchStart(parseInt(e.target.value) || 1)}
                                className="w-full p-3 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input 
                                type="number" 
                                min="1"
                                max="100"
                                value={batchCount}
                                onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                                className="w-full p-3 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={generateBatch}
                                disabled={isDangerousUrl}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Generate Sheet
                            </button>
                        </div>
                    </div>

                    {batchData.length > 0 && (
                        <div className="border-t border-gray-200 pt-6">
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-gray-800">Preview ({batchData.length} stickers)</h4>
                                <button 
                                    onClick={handlePrint}
                                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Sticker Sheet
                                </button>
                            </div>
                            <div className="bg-gray-100 p-8 rounded-xl overflow-y-auto max-h-96 border border-gray-200">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {batchData.map((item) => (
                                        <div key={item.id} className="bg-white p-2 rounded shadow-sm flex flex-col items-center">
                                            <img src={item.qr} alt={item.id} className="w-full aspect-square" />
                                            <span className="text-[10px] font-mono font-bold mt-1">{item.id}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}

    </div>

    {/* Print Only Area - This replaces the page body when printing */}
    <div className="hidden print-only grid-cols-5 gap-4 p-4">
        {qrMode === 'batch' && batchData.map((item) => (
            <div key={item.id} className="border border-gray-200 p-2 flex flex-col items-center justify-center text-center page-break-inside-avoid">
                <img src={item.qr} alt={item.id} className="w-24 h-24" />
                <p className="text-xs font-bold font-mono mt-1">Scan To Return</p>
                <p className="text-[10px] font-mono text-gray-500">{item.id}</p>
            </div>
        ))}
    </div>
    </>
  );
};

// Icon helper
const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s 9-1.34 9-3V5"/></svg>
);
