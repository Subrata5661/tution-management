import React, { useEffect, useState } from 'react';
import { doc, db, getDoc, setDoc, auth, OperationType, handleFirestoreError } from '../firebase';
import { Settings } from '../types';
import { Save, Building, Image as ImageIcon, CheckCircle, Upload, PenTool, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ instituteName: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as Settings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'logo') {
          setSettings(prev => ({ ...prev, logoBase64: base64String }));
        } else {
          setSettings(prev => ({ ...prev, signatureBase64: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const path = 'settings/config';
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, path);
      } catch (formattedErr: any) {
        setError(formattedErr.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Institute Configuration</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Customize how your receipts look.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-red-800 dark:text-red-300">
                <p className="font-semibold mb-1">Error saving settings:</p>
                <p className="break-all">{error}</p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Building size={16} className="text-gray-400 dark:text-slate-500" />
                Institute Name
              </label>
              <input
                required
                type="text"
                value={settings.instituteName}
                onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                className="w-full px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter your tuition center name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <ImageIcon size={16} className="text-gray-400 dark:text-slate-500" />
                Institute Logo
              </label>
              <div className="flex items-center gap-4">
                {settings.logoBase64 && (
                  <div className="w-16 h-16 rounded-lg border dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                    <img src={settings.logoBase64} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                    <Upload size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">Upload Logo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logo')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <PenTool size={16} className="text-gray-400 dark:text-slate-500" />
                E-Signature
              </label>
              <div className="flex items-center gap-4">
                {settings.signatureBase64 && (
                  <div className="w-32 h-16 rounded-lg border dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                    <img src={settings.signatureBase64} alt="Signature Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                    <Upload size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">Upload Signature</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'signature')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t dark:border-slate-800 flex items-center justify-between">
            {saved ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <CheckCircle size={18} />
                Settings saved successfully!
              </div>
            ) : <div />}
            
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
        <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Receipt Preview</h4>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border dark:border-slate-800 shadow-sm text-center">
          {settings.logoBase64 && (
            <img src={settings.logoBase64} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
          )}
          <h5 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{settings.instituteName || 'Your Institute Name'}</h5>
          <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Fee Receipt</p>
          <div className="mt-4 h-2 w-3/4 bg-gray-100 dark:bg-slate-800 mx-auto rounded" />
          <div className="mt-2 h-2 w-1/2 bg-gray-100 dark:bg-slate-800 mx-auto rounded" />
        </div>
      </div>
    </div>
  );
}
