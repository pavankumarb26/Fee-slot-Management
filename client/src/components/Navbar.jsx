import React from 'react';
import { Button, Input, Card } from './UI';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Lock, User, LogOut } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <div className="p-2 bg-primary-500 rounded-lg text-white">
              <Lock size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Fee<span className="text-primary-500">Book</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user.name}
                </span>
              </div>
            )}
            <Button 
              variant={user ? 'ghost' : 'primary'} 
              className="flex items-center gap-2 text-sm"
              onClick={user ? logout : () => navigate('/login')}
            >
              {user ? (
                <><LogOut size={16} /> Logout</>
              ) : (
                'Login'
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};