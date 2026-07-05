
import React, { useState, useEffect } from 'react';
import { Lock, User, Activity, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
  users: UserType[];
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error('Google Login Error:', e);
      if (e.code === 'auth/unauthorized-domain') {
        setError(`ข้อผิดพลาด: โดเมนไม่ได้รับอนุญาต (Unauthorized Domain)
        
โปรดเพิ่มโดเมน "${window.location.hostname}" ใน Firebase Console -> Authentication -> Settings -> Authorized domains เพื่ออนุญาตให้เข้าสู่ระบบจากที่นี่`);
      } else {
        setError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้: ' + e.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (users.length === 0) {
        setShowRetry(true);
      }
    }, 8000); // Wait 8 seconds before showing retry
    return () => clearTimeout(timer);
  }, [users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.length === 0) {
      setError('กำลังโหลดข้อมูลผู้ใช้งาน... โปรดรอสักครู่ หรือลองรีเฟรชหน้าเว็บ');
      return;
    }
    
    setIsLoggingIn(true);
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
       onLogin(user);
    } else {
       setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
       setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-emerald-600 p-8 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm">
            <Activity className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold">OmniClinic Pro</h1>
          <p className="text-emerald-100 text-sm mt-1 opacity-80">ระบบบริหารจัดการคลินิกอัจฉริยะแบบครบวงจร</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 text-center whitespace-pre-wrap">{error}</div>}
          
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="ชื่อผู้ใช้งาน"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                disabled={isLoggingIn}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                placeholder="รหัสผ่าน"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                disabled={isLoggingIn}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
              <input type="checkbox" className="rounded text-emerald-600" />
              จดจำฉัน
            </label>
            <a href="#" className="text-emerald-600 font-semibold hover:underline">ลืมรหัสผ่าน?</a>
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn || (users.length === 0 && username === 'admin')}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังตรวจสอบ...
              </>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">หรือ</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            เข้าสู่ระบบด้วย Google (สำหรับผู้ดูแลระบบ)
          </button>

          {users.length === 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>กำลังเชื่อมต่อฐานข้อมูล...</span>
              </div>
              
              {showRetry && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      หากรอนานเกินไป อาจเกิดจากปัญหาการเชื่อมต่อ หรือยังไม่มีข้อมูลในระบบ
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => window.location.reload()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    รีเฟรชหน้าเว็บ
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-4">
            OmniClinic Pro v2.6.0 &copy; 2024
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
