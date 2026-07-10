import React from 'react';
import { Button, Input, Card } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Lock, User, LogIn } from 'lucide-react';

export const Login = () => {
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({ registrationNumber: '', password: '' });

  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === 'staff') {
        navigate('/staff/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login('/auth/student/login', formData);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md space-y-8 animate-in">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-500 rounded-2xl text-white shadow-lg shadow-primary-500/30">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Student Login</h1>
          <p className="text-slate-500 dark:text-slate-400">Access your fee appointment portal</p>
        </div>

        <Card className="p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Registration Number" 
              name="registrationNumber"
              placeholder="e.g. 2023CS101"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              required
            />
            <Input 
              label="Password" 
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Button 
              type="submit" 
              className="w-full py-3 text-lg shadow-lg shadow-primary-500/20"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Login to Portal'}
            </Button>
          </form>
        </Card>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Having trouble logging in? Contact the college admin office.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Are you a staff member?{' '}
            <button 
              type="button"
              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-semibold underline focus:outline-none"
              onClick={() => navigate('/staff/login')}
            >
              Go to Staff Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};