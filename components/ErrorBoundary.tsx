
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
      let errorDetail = this.state.error?.message || '';

      // Try to parse JSON error from Firestore if applicable
      try {
        if (errorDetail.startsWith('{')) {
          const parsed = JSON.parse(errorDetail);
          if (parsed.error && parsed.error.includes('insufficient permissions')) {
            errorMessage = 'สิทธิ์การเข้าถึงไม่เพียงพอ';
            errorDetail = `ไม่สามารถดำเนินการ ${parsed.operationType} ที่พาธ ${parsed.path} ได้`;
          }
        }
      } catch (e) {
        // Not JSON, keep original
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{errorMessage}</h1>
            <p className="text-slate-600 mb-6">
              {errorDetail || 'โปรดลองรีเฟรชหน้าจออีกครั้ง หากยังพบปัญหาโปรดติดต่อผู้ดูแลระบบ'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              รีเฟรชหน้าจอ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
