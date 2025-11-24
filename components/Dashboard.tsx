import React, { useState, useMemo } from 'react';
import { TagData, TagStatus } from '../types';
import { 
  QrCode, Database, CheckCircle2, AlertCircle, 
  Settings, BarChart3, Copy, Download, ExternalLink, Save
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

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
  const [baseUrl, setBaseUrl] = useState(window.location.origin + window.location.pathname);
  const [qrCount, setQrCount] = useState(10);

  const stats = useMemo(() => {
    const active = tags.filter(t => t.status === TagStatus.ACTIVE).length;
    const inactive = tags.filter(t => t.status === TagStatus.NEW).length;
    return [
      { name: 'Active', value: active, color: '#22c55e' },
      { name: 'Inactive', value: inactive, color: '#94a3b8' }
    ];
  }, [tags]);

  // Handle URL saving
  const handleSaveUrl = () => {
    setGasUrl(tempUrl);
    alert("Backend URL Connected!");
  };

  // Generate CSV logic
  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Tag ID,Full URL\n";
    for(let i=1; i<=qrCount; i++) {
        const id = `ID_${i.toString().padStart(4, '0')}`;
        // Ensure clean URL construction
        const separator = baseUrl.includes('?') ? '&' : '?';
        const fullUrl = `${baseUrl}${separator}tag=${id}`;
        csvContent += `${id},${fullUrl}\n`;
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tag_links.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
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
                QR Generator
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
                <h3 className="text-lg font-bold text-gray-900 mb-4">Step 1: Get the Brain (Google Sheets)</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600 mb-6">
                    <li>Create a new <strong>Google Sheet</strong>.</li>
                    <li>Rename the active tab at the bottom to <strong>"Tags"</strong>.</li>
                    <li>Go to <strong>Extensions &gt; Apps Script</strong> in the top menu.</li>
                    <li>Copy the code below and paste it into the script editor (replace everything).</li>
                </ol>
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
                    <li>Set <strong>Who has access</strong> to <strong>"Anyone"</strong> (Important!).</li>
                    <li>Click Deploy and copy the <strong>Web App URL</strong>.</li>
                    <li>Paste the URL below.</li>
                </ol>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Database className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
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
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Bulk QR Generator</h3>
                        <p className="text-sm text-gray-500">Generate a CSV of links to print on your stickers.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Base URL (Hosting Address)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">If hosting on GitHub Pages, this will be https://username.github.io/repo-name</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Number of Tags</label>
                        <input 
                            type="number" 
                            min="1"
                            max="1000"
                            value={qrCount}
                            onChange={(e) => setQrCount(parseInt(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>

                    <button 
                        onClick={downloadCSV}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-lg flex items-center justify-center transition-all active:scale-[0.98]"
                    >
                        <Download className="w-5 h-5 mr-2" />
                        Download CSV (IDs {`1 to ${qrCount}`})
                    </button>
                </div>

                <div className="w-full md:w-64 bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-center">
                    <QrCode className="w-24 h-24 text-gray-800 mb-4" />
                    <p className="text-xs font-mono text-gray-500 mb-2 break-all">
                        {baseUrl}{baseUrl.includes('?') ? '&' : '?'}tag=ID_0001
                    </p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Preview
                    </span>
                    <p className="text-xs text-gray-400 mt-4">
                        Send the CSV to a printer or use a bulk QR tool like 'Bulk QR Code Generator' for Chrome.
                    </p>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};