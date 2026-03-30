import React from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-800">
        <div className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck size={40} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Tuition Manager</h1>
            <p className="text-gray-500 dark:text-slate-400">Manage your students and fees efficiently.</p>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-slate-200 transition-all duration-200 group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
            <LogIn size={20} className="text-gray-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </button>

          <div className="pt-4 border-t dark:border-slate-800 text-xs text-gray-400 dark:text-slate-500">
            <p>Secure access for authorized administrators only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
