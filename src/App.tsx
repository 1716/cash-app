import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Home, 
  CreditCard, 
  DollarSign, 
  Search, 
  Clock, 
  User as UserIcon, 
  TrendingUp, 
  Bitcoin, 
  Plus, 
  ChevronRight,
  Building2,
  ShieldCheck,
  Lock,
  Check,
  Settings,
  Bell,
  X,
  ArrowRight,
  Trash2,
  LogOut,
  Eye,
  EyeOff,
  User,
  MessageSquare,
  Mail,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer 
} from 'recharts';
import { 
  auth, 
  db, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp, 
  runTransaction,
  handleFirestoreError,
  OperationType
} from './firebase';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';

// Types
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  cashtag: string;
  balance: number;
  stripeAccountId?: string;
  payoutDestinationId?: string;
  isVerified?: boolean;
  pin?: string;
  createdAt: any;
}

interface Transaction {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  note: string;
  timestamp: any;
  type: 'payment' | 'request';
  status: 'pending' | 'completed' | 'cancelled';
  senderName?: string;
  receiverName?: string;
}

interface Portfolio {
  btcBalance: number;
  stocks: Record<string, number>;
}

interface LinkedAccount {
  id: string;
  userId: string;
  type: 'bank' | 'card';
  institutionName: string;
  lastFour: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  accountNumber?: string;
  routingNumber?: string;
  isPrimary: boolean;
  status: 'pending' | 'verified' | 'failed';
  verificationDetails?: {
    amounts?: number[];
    cvv?: string;
  };
  createdAt: any;
}

type Tab = 'home' | 'card' | 'pay' | 'search' | 'activity' | 'investing';

const BITCOIN_DATA = [
  { time: 'Mon', price: 62000 },
  { time: 'Tue', price: 64000 },
  { time: 'Wed', price: 63500 },
  { time: 'Thu', price: 67000 },
  { time: 'Fri', price: 66000 },
  { time: 'Sat', price: 69000 },
  { time: 'Sun', price: 71000 },
];

const STOCK_PRICES: Record<string, number> = {
  'AAPL': 182.50,
  'TSLA': 175.20,
  'MSFT': 415.10,
  'GOOGL': 152.30,
  'AMZN': 178.40,
  'NVDA': 890.20,
};

const STOCK_DATA: Record<string, any[]> = {
  'AAPL': [
    { time: 'Mon', price: 180 }, { time: 'Tue', price: 182 }, { time: 'Wed', price: 181 },
    { time: 'Thu', price: 183 }, { time: 'Fri', price: 182.5 }
  ],
  'TSLA': [
    { time: 'Mon', price: 170 }, { time: 'Tue', price: 172 }, { time: 'Wed', price: 174 },
    { time: 'Thu', price: 173 }, { time: 'Fri', price: 175.2 }
  ],
  'BTC': BITCOIN_DATA
};

function AuthenticationScreen() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (authMode === 'signup') {
        if (!displayName) {
          toast.error("Please enter your full name.");
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        // The onAuthStateChanged listener in CashApp will handle the rest
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      const errorCode = error.code;
      let errorMessage = "An error occurred. Please try again.";
      if (errorCode === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorCode === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up.';
      } else if (errorCode === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (errorCode === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use. Please sign in.';
      } else if (errorCode === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please use at least 6 characters.';
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 transition-all duration-500">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-green-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-green-500/20 mx-auto">
            <DollarSign className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-4xl font-bold mb-2 tracking-tighter">
            {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-zinc-500">The simplest way to manage your money.</p>
        </div>

        <form onSubmit={handleAuthAction} className="space-y-6">
          <AnimatePresence>
            {authMode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="overflow-hidden"
              >
                <div className="relative">
                   <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                   <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full Name"
                    required={authMode === 'signup'}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 text-white py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 ring-green-500/50 transition-all placeholder:text-zinc-500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              required
              className="w-full bg-zinc-900 border-2 border-zinc-800 text-white py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 ring-green-500/50 transition-all placeholder:text-zinc-500"
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-zinc-900 border-2 border-zinc-800 text-white py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 ring-green-500/50 transition-all placeholder:text-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              authMode === 'signin' ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </form>

        <p className="text-center text-zinc-500 mt-8">
          {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            className="font-bold text-green-500 hover:underline ml-2"
          >
            {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <CashApp />
    </>
  );
}

function PinModal({ purpose, onVerify, onClose }: { purpose: string, onVerify: (pin: string) => void, onClose: () => void, key?: string }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNumberClick = async (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 4) {
      setIsLoading(true);
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/verify-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ pin: newPin })
        });

        if (response.ok) {
          onVerify(newPin);
          onClose();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 1000);
        }
      } catch (e) {
        toast.error("Verification failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-xs flex flex-col items-center">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Enter Cash PIN</h2>
          <p className="text-zinc-500 text-sm">{purpose}</p>
        </div>

        <div className="flex gap-4 mb-16">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-200",
                pin.length > i ? "bg-green-500 border-green-500 scale-110" : "border-zinc-800",
                error && "border-red-500 bg-red-500 animate-shake"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-x-12 gap-y-8 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((num, i) => (
            <button
              key={i}
              onClick={() => num !== '' && handleNumberClick(num.toString())}
              disabled={isLoading}
              className={cn(
                "text-3xl font-medium w-16 h-16 flex items-center justify-center rounded-full active:bg-zinc-900 transition-colors",
                num === '' && "invisible"
              )}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin(prev => prev.slice(0, -1))}
            disabled={isLoading}
            className="text-3xl font-medium w-16 h-16 flex items-center justify-center rounded-full active:bg-zinc-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <button 
          onClick={onClose}
          className="mt-12 text-zinc-500 font-bold hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function IdentityVerificationModal({ onClose, onVerified }: { onClose: () => void, onVerified: () => void, key?: string }) {
  const [step, setStep] = useState<'intro' | 'scan' | 'selfie' | 'processing' | 'success'>('intro');
  const [idType, setIdType] = useState<'driver_license' | 'passport' | 'state_id'>('driver_license');

  const handleVerify = async () => {
    setStep('processing');
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/verify-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          idType,
          idFrontBase64: 'simulated_front',
          selfieBase64: 'simulated_selfie'
        })
      });

      if (response.ok) {
        setStep('success');
        setTimeout(() => {
          onVerified();
          onClose();
        }, 2000);
      } else {
        toast.error("Verification failed. Please try again.");
        setStep('intro');
      }
    } catch (e) {
      toast.error("An error occurred");
      setStep('intro');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-zinc-900 rounded-[40px] p-8 border border-zinc-800">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <ShieldCheck className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Verify your identity</h2>
              <p className="text-zinc-500 mb-8">To keep your account secure and increase your limits, we need to verify your identity.</p>
              
              <div className="space-y-3 mb-8">
                {(['driver_license', 'passport', 'state_id'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setIdType(type)}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all",
                      idType === type ? "border-green-500 bg-green-500/5" : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <span className="font-bold text-white capitalize">{type.replace('_', ' ')}</span>
                    {idType === type && <Check className="w-5 h-5 text-green-500" />}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setStep('scan')}
                className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Start Verification
              </button>
            </motion.div>
          )}

          {step === 'scan' && (
            <motion.div 
              key="scan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Scan ID Front</h2>
              <p className="text-zinc-500 mb-8">Position the front of your {idType.replace('_', ' ')} within the frame.</p>
              
              <div className="aspect-[1.6/1] bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center mb-8 relative overflow-hidden">
                <div className="absolute inset-4 border-2 border-green-500/30 rounded-xl" />
                <Eye className="w-12 h-12 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Scanning...</p>
              </div>

              <button 
                onClick={() => setStep('selfie')}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Take Photo
              </button>
            </motion.div>
          )}

          {step === 'selfie' && (
            <motion.div 
              key="selfie"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Take a Selfie</h2>
              <p className="text-zinc-500 mb-8">Look directly at the camera and ensure your face is well-lit.</p>
              
              <div className="aspect-square bg-zinc-800 rounded-full border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center mb-8 relative overflow-hidden max-w-[240px] mx-auto">
                <div className="absolute inset-4 border-2 border-green-500/30 rounded-full" />
                <UserIcon className="w-16 h-16 text-zinc-600" />
              </div>

              <button 
                onClick={handleVerify}
                className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Verify Identity
              </button>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-white mb-2">Verifying...</h2>
              <p className="text-zinc-500">Our AI is checking your documents. This usually takes a few seconds.</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verified!</h2>
              <p className="text-zinc-500">Your identity has been successfully verified.</p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {step !== 'processing' && step !== 'success' && (
          <button 
            onClick={onClose}
            className="w-full mt-4 text-zinc-600 font-bold hover:text-zinc-400 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TradingModal({ 
  asset, 
  type, 
  balance, 
  portfolio, 
  onClose,
  onTrade
}: { 
  asset: { symbol: string, name: string, price: number } | null, 
  type: 'buy' | 'sell', 
  balance: number, 
  portfolio: Portfolio | null, 
  onClose: () => void,
  onTrade: (amount: number, assetAmount: number) => Promise<void>,
  key?: string
}) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!asset) return null;

  const maxAmount = type === 'buy' 
    ? balance 
    : (asset.symbol === 'BTC' ? (portfolio?.btcBalance || 0) * asset.price : (portfolio?.stocks?.[asset.symbol] || 0) * asset.price);

  const handleLocalTrade = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (numAmount > maxAmount) {
      toast.error("Insufficient funds");
      return;
    }

    setIsProcessing(true);
    try {
      const shares = numAmount / asset.price;
      await onTrade(numAmount, shares);
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Trade failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col max-w-md mx-auto"
    >
      <div className="p-6 flex justify-between items-center">
        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full"><X className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold">{type === 'buy' ? 'Buy' : 'Sell'} {asset.name}</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-12">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-4">
            {type === 'buy' ? 'Cash Balance' : `${asset.symbol} Balance`}
          </p>
          <h3 className="text-2xl font-bold text-zinc-400">
            ${maxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-1">
            <span className="text-4xl font-bold text-zinc-500">$</span>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-transparent text-7xl font-bold outline-none w-full text-center placeholder:text-zinc-800"
              autoFocus
            />
          </div>
          {amount && (
            <p className="text-zinc-500 mt-4 font-medium">
              ≈ {(parseFloat(amount) / asset.price).toFixed(8)} {asset.symbol}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-12">
          {['10', '50', '100'].map(val => (
            <button 
              key={val}
              onClick={() => setAmount(val)}
              className="bg-zinc-900 py-3 rounded-xl font-bold active:scale-95 transition-transform"
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <button 
          onClick={handleLocalTrade}
          disabled={isProcessing || !amount}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-lg active:scale-95 transition-all disabled:opacity-50",
            type === 'buy' ? "bg-green-500 text-black" : "bg-white text-black"
          )}
        >
          {isProcessing ? 'Processing...' : `${type === 'buy' ? 'Buy' : 'Sell'} ${asset.symbol}`}
        </button>
      </div>
    </motion.div>
  );
}

function SettingsModal({ profile, onClose }: { profile: UserProfile | null, onClose: () => void, key?: string }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [cashtag, setCashtag] = useState(profile?.cashtag || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          displayName,
          cashtag
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Update failed');
      }

      toast.success("Profile updated");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col max-w-md mx-auto"
    >
      <div className="p-6 flex justify-between items-center border-b border-zinc-900">
        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full"><X className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold">Settings</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="text-green-500 font-bold disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Done'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-zinc-800">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              profile?.displayName?.[0]
            )}
          </div>
          <button className="text-green-500 text-sm font-bold">Change Profile Photo</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2">Full Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-zinc-900 p-4 rounded-2xl outline-none focus:ring-2 ring-green-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2">Cashtag</label>
            <input 
              type="text" 
              value={cashtag}
              onChange={(e) => setCashtag(e.target.value)}
              className="w-full bg-zinc-900 p-4 rounded-2xl outline-none focus:ring-2 ring-green-500/50 transition-all"
            />
          </div>
        </div>

        <div className="space-y-4 pt-8">
          <button onClick={() => signOut(auth)} className="w-full flex items-center justify-between p-4 bg-zinc-900 rounded-2xl text-red-500 font-bold">
            <div className="flex items-center gap-4">
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}function TransactionDetailModal({ 
  tx, 
  onClose,
  onAccept,
  onCancel,
  currentUserId
}: { 
  tx: Transaction, 
  onClose: () => void, 
  onAccept?: (tx: Transaction) => void,
  onCancel?: (tx: Transaction) => void,
  currentUserId?: string,
  key?: string 
}) {
  const isPendingRequest = tx.type === 'request' && tx.status === 'pending';
  const isRecipientOfRequest = isPendingRequest && tx.senderId === currentUserId;
  const isRequester = isPendingRequest && tx.receiverId === currentUserId;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-zinc-900 rounded-[40px] p-8 border border-zinc-800 relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-zinc-800 rounded-full"><X className="w-4 h-4" /></button>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            {tx.type === 'payment' ? '💸' : '📩'}
          </div>
          <h2 className="text-3xl font-bold mb-1">${tx.amount.toFixed(2)}</h2>
          <p className={cn(
            "text-sm font-bold uppercase tracking-widest",
            tx.status === 'completed' ? 'text-green-500' : tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
          )}>
            {tx.status}
          </p>
        </div>

        <div className="space-y-6 border-t border-zinc-800 pt-6">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 text-sm">To</span>
            <span className="font-bold">{tx.receiverName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 text-sm">From</span>
            <span className="font-bold">{tx.senderName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 text-sm">Date</span>
            <span className="font-bold">{tx.timestamp?.toDate().toLocaleString()}</span>
          </div>
          {tx.note && (
            <div className="flex justify-between items-start">
              <span className="text-zinc-500 text-sm">Note</span>
              <span className="font-bold text-right max-w-[150px]">{tx.note}</span>
            </div>
          )}
        </div>

        <div className="mt-12 space-y-3">
          {isRecipientOfRequest && (
            <button 
              onClick={() => onAccept?.(tx)}
              className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              Pay ${tx.amount.toFixed(2)}
            </button>
          )}
          {(isRecipientOfRequest || isRequester) && (
            <button 
              onClick={() => onCancel?.(tx)}
              className="w-full bg-zinc-800 text-red-500 py-4 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              {isRequester ? 'Cancel Request' : 'Decline'}
            </button>
          )}
          <button 
            onClick={onClose}
            className="w-full bg-zinc-800 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CashApp() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio>({ btcBalance: 0, stocks: {} });
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isLinkAccountModalOpen, setIsLinkAccountModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState<LinkedAccount | null>(null);
  const [isTradingModalOpen, setIsTradingModalOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pinAction, setPinAction] = useState<(pin: string) => void>(() => {});
  const [pinPurpose, setPinPurpose] = useState('');
  const [tradingAsset, setTradingAsset] = useState<{ symbol: string, name: string, price: number } | null>(null);
  const [tradingType, setTradingType] = useState<'buy' | 'sell'>('buy');
  const [tradingAmount, setTradingAmount] = useState('0');
  const [cashModalType, setCashModalType] = useState<'add' | 'out'>('add');
  const [cashModalStep, setCashModalStep] = useState<1 | 2>(1);
  const [payAmount, setPayAmount] = useState('0');
  const [payMode, setPayMode] = useState<'pay' | 'request'>('pay');
  const [payNote, setPayNote] = useState('');
  const [cashAmount, setCashAmount] = useState('0');
  const [recipientCashtag, setRecipientCashtag] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [cashOutSpeed, setCashOutSpeed] = useState<'standard' | 'instant'>('standard');
  const [isReviewingPay, setIsReviewingPay] = useState(false);
  const [isReviewingRequest, setIsReviewingRequest] = useState(false);
  const [btcPrice, setBtcPrice] = useState(71240.50);
  const [stockPrices, setStockPrices] = useState<Record<string, number>>(STOCK_PRICES);
  const [isLoading, setIsLoading] = useState(true);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!user || !searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/search-users?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        const result = await response.json();
        if (response.ok) {
          setSearchResults(result.users || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(true); // Start loading when auth state changes
      if (!u) {
        setProfile(null);
        setTransactions([]);
        setLinkedAccounts([]);
        setPortfolio({ btcBalance: 0, stocks: {} });
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Profile and Data Listeners
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const portfolioRef = doc(db, 'portfolios', user.uid);
    const txQuery = query(
      collection(db, 'transactions'),
      where('senderId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const rxQuery = query(
      collection(db, 'transactions'),
      where('receiverId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubProfile = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
      } else {
        // New user, initialize profile via backend
        try {
          const idToken = await user.getIdToken();
          await fetch('/api/init-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL
            })
          });
          // The onSnapshot listener will then pick up the newly created profile
        } catch (e) {
          console.error("Error initializing user:", e);
          toast.error("Failed to initialize your profile.");
        }
      }
      setIsLoading(false);
    }, (e) => {
      handleFirestoreError(e, OperationType.GET, 'users');
      setIsLoading(false);
    });

    const unsubPortfolio = onSnapshot(portfolioRef, (snap) => {
      if (snap.exists()) setPortfolio(snap.data() as Portfolio);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'portfolios'));

    // Combine sent and received transactions
    let sentTx: Transaction[] = [];
    let receivedTx: Transaction[] = [];

    const updateTx = () => {
      const all = [...sentTx, ...receivedTx];
      const unique = Array.from(new Map(all.map(tx => [tx.id, tx])).values());
      const sorted = unique.sort((a, b) => 
        (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
      );
      setTransactions(sorted.slice(0, 50));
    };

    const unsubSent = onSnapshot(txQuery, (snap) => {
      sentTx = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      updateTx();
    }, (e) => handleFirestoreError(e, OperationType.GET, 'transactions_sent'));

    const unsubReceived = onSnapshot(rxQuery, (snap) => {
      receivedTx = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      updateTx();
    }, (e) => handleFirestoreError(e, OperationType.GET, 'transactions_received'));

    const linkedAccountsRef = collection(db, 'users', user.uid, 'linkedAccounts');
    const unsubLinkedAccounts = onSnapshot(linkedAccountsRef, (snap) => {
      const accounts = snap.docs.map(d => ({ id: d.id, ...d.data() } as LinkedAccount));
      setLinkedAccounts(accounts);
      if (accounts.length > 0 && !selectedAccountId) {
        const primary = accounts.find(a => a.isPrimary) || accounts[0];
        setSelectedAccountId(primary.id);
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, 'linked_accounts'));

    return () => {
      unsubProfile();
      unsubPortfolio();
      unsubSent();
      unsubReceived();
      unsubLinkedAccounts();
    };
  }, [user]);

  const [isAccountDetailsModalOpen, setIsAccountDetailsModalOpen] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<LinkedAccount | null>(null);

  const handleLinkAccount = async (
    type: 'bank' | 'card', 
    institution: string, 
    lastFour: string,
    details: {
      cardNumber?: string;
      expiryDate?: string;
      cvv?: string;
      accountNumber?: string;
      routingNumber?: string;
    }
  ) => {
    if (!user) return;
    
    const apiEndpoint = type === 'bank' ? '/api/link-bank' : '/api/link-card';
    const body = type === 'bank' ? {
      institutionName: institution,
      lastFour,
      accountNumber: details.accountNumber,
      routingNumber: details.routingNumber
    } : {
      institutionName: institution,
      lastFour,
      cardNumber: details.cardNumber,
      expiryDate: details.expiryDate,
      cvv: details.cvv
    };
    
    const executeLink = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to link ${type}`);
      return result;
    };

    toast.promise(executeLink(), {
      loading: `Linking ${type}...`,
      success: (result) => {
        setIsLinkAccountModalOpen(false);
        return result.message || `Successfully linked ${institution}. Please verify.`;
      },
      error: (err: any) => `Failed to link ${type}: ${err?.message || 'Unknown error'}`
    });
  };

  const handleVerifyAccount = async (accountId: string, data: any) => {
    if (!user || !verifyingAccount) return;
    
    const isBank = verifyingAccount.type === 'bank';
    const apiEndpoint = isBank ? '/api/verify-bank' : '/api/verify-card';
    const body = isBank ? {
      accountId,
      amount1: data.amounts[0],
      amount2: data.amounts[1]
    } : {
      accountId
    };

    const executeVerify = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verification failed');
      return result;
    };

    toast.promise(executeVerify(), {
      loading: 'Verifying account...',
      success: () => {
        setIsVerifyModalOpen(false);
        setVerifyingAccount(null);
        return 'Account verified successfully!';
      },
      error: (err) => err.message || 'Verification failed'
    });
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user) return;
    
    const executeDelete = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/delete-linked-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ accountId })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to remove account');
      }
      return response.json();
    };

    toast.promise(executeDelete(), {
      loading: 'Removing account...',
      success: () => {
        if (selectedAccountId === accountId) {
          setSelectedAccountId(null);
        }
        return 'Account removed successfully';
      },
      error: (err) => err.message || 'Failed to remove account'
    });
  };

  const handlePay = async () => {
    if (!user || !profile || parseFloat(payAmount) <= 0 || !recipientCashtag) return;
    setIsReviewingPay(true);
  };

  const confirmPay = async () => {
    setIsReviewingPay(false);
    
    if (profile?.pin) {
      setPinPurpose(`Pay $${payAmount} to ${recipientCashtag}`);
      setPinAction(() => (pin: string) => executePayOrRequest(pin));
      setIsPinModalOpen(true);
      return;
    }

    executePayOrRequest();
  };

  const handleRequest = async () => {
    if (!user || !profile || parseFloat(payAmount) <= 0 || !recipientCashtag) return;
    setIsReviewingRequest(true);
  };

  const confirmRequest = async () => {
    setIsReviewingRequest(false);
    executePayOrRequest();
  };

  const executePayOrRequest = async (pin?: string) => {
    if (!user || !profile || parseFloat(payAmount) <= 0 || !recipientCashtag) return;
    
    const isPaying = payMode === 'pay';
    const amount = parseFloat(payAmount);

    if (isPaying && amount > profile.balance) {
      toast.error("Insufficient balance");
      return;
    }

    const endpoint = isPaying ? '/api/send-money' : '/api/request-money';
    const body: any = {
      recipientCashtag,
      amount,
      note: payNote,
    };
    if (isPaying) {
      body.pin = pin;
    }

    const execute = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Action failed');
      return result;
    };

    toast.promise(execute(), {
      loading: `Sending ${isPaying ? 'payment' : 'request'}...`,
      success: () => {
        setIsPayModalOpen(false);
        setPayAmount('0');
        setRecipientCashtag('');
        setPayNote('');
        return `${isPaying ? 'Sent' : 'Requested'} $${amount} ${isPaying ? 'to' : 'from'} ${recipientCashtag}`;
      },
      error: (err) => err.message || "Action failed. Please try again."
    });
  };

  const handleAcceptRequest = async (tx: Transaction) => {
    if (!user || !profile) return;
    
    if (profile.pin) {
      setPinPurpose(`Pay request of $${tx.amount} from ${tx.receiverName}`);
      setPinAction(() => (pin: string) => executeAcceptRequestAfterPin(tx, pin));
      setIsPinModalOpen(true);
      return;
    }

    executeAcceptRequestAfterPin(tx);
  };

  const executeAcceptRequestAfterPin = async (tx: Transaction, pin?: string) => {
    if (!user || !profile) return;

    if (tx.amount > profile.balance) {
      toast.error("Insufficient balance");
      return;
    }

    const executeAccept = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/accept-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ transactionId: tx.id, pin })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to pay request');
      return result;
    };

    toast.promise(executeAccept(), {
      loading: 'Paying request...',
      success: () => {
        setSelectedTx(null);
        return `Successfully paid $${tx.amount} to ${tx.receiverName}`;
      },
      error: (err) => err.message || "Failed to pay request. Please try again."
    });
  };

  const handleCancelRequest = async (tx: Transaction) => {
    if (!user) return;

    const executeCancel = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/cancel-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ transactionId: tx.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to cancel request');
      return result;
    };

    toast.promise(executeCancel(), {
      loading: 'Cancelling request...',
      success: () => {
        setSelectedTx(null);
        return 'Request cancelled';
      },
      error: (err) => err.message || "Failed to cancel request."
    });
  };

  const handleNumberClick = (num: string) => {
    if (payAmount === '0' && num !== '.') {
      setPayAmount(num);
    } else {
      if (num === '.' && payAmount.includes('.')) return;
      if (payAmount.split('.')[1]?.length >= 2) return;
      setPayAmount(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPayAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const handleCashAction = async () => {
    if (!user || !profile || parseFloat(cashAmount) <= 0) return;
    
    if (profile.pin) {
      setPinPurpose(`${cashModalType === 'add' ? 'Add' : 'Cash out'} $${cashAmount}`);
      setPinAction(() => (pin: string) => executeCashActionAfterPin(pin));
      setIsPinModalOpen(true);
      return;
    }
    executeCashActionAfterPin();
  };

  const executeCashActionAfterPin = async (pin?: string) => {
    if (!user || !profile || parseFloat(cashAmount) <= 0) return;
    const amount = parseFloat(cashAmount);

    if (cashModalType === 'out' && amount > profile.balance) {
      toast.error("Insufficient balance");
      return;
    }

    const selectedAccount = linkedAccounts.find(a => a.id === selectedAccountId);
    if (!selectedAccount) {
      toast.error("Please select a linked account");
      return;
    }

    if (selectedAccount.status !== 'verified') {
      toast.error("Please verify your account before using it");
      setVerifyingAccount(selectedAccount);
      setIsVerifyModalOpen(true);
      return;
    }

    const endpoint = cashModalType === 'add' ? '/api/add-cash' : '/api/withdraw';
    const body: any = {
      amount,
      accountId: selectedAccountId,
      pin
    };
    if (cashModalType === 'out') {
      body.amountCents = Math.round(amount * 100);
      body.method = cashOutSpeed;
      delete body.amount;
      delete body.accountId;
    }
    
    const execute = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Action failed');
      return result;
    };
    
    const accountName = `${selectedAccount.institutionName} •••• ${selectedAccount.lastFour}`;
    toast.promise(execute(), {
      loading: 'Processing...',
      success: () => {
        setIsCashModalOpen(false);
        setCashAmount('0');
        setCashModalStep(1);
        return `Successfully ${cashModalType === 'add' ? 'added' : 'cashed out'} $${amount}`;
      },
      error: (err) => err.message || "Action failed."
    });
  };

  const handleTrade = async (tradeAmount: number, assetAmount: number) => {
    if (!user || !profile || !tradingAsset) return;

    const executeTrade = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/execute-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          tradingType,
          tradingAsset,
          amount: tradeAmount,
          assetAmount
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Trade failed');
      return result;
    };

    toast.promise(executeTrade(), {
      loading: `${tradingType === 'buy' ? 'Buying' : 'Selling'} ${tradingAsset.symbol}...`,
      success: () => {
        setTradingAmount('0');
        return `Successfully ${tradingType === 'buy' ? 'bought' : 'sold'} ${tradingAsset.symbol}`;
      },
      error: (err) => err.message || "Trade failed."
    });
  };

  const handleCashNumberClick = (num: string) => {
    if (cashAmount === '0' && num !== '.') {
      setCashAmount(num);
    } else {
      if (num === '.' && cashAmount.includes('.')) return;
      if (cashAmount.split('.')[1]?.length >= 2) return;
      setCashAmount(prev => prev + num);
    }
  };

  const handleCashBackspace = () => {
    setCashAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center"
        >
          <DollarSign className="w-8 h-8 text-black" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <AuthenticationScreen />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-green-500/30">
      <main className="pb-24 max-w-md mx-auto min-h-screen relative overflow-hidden">
        
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-6 pt-12"
            >
              <div className="flex justify-between items-center mb-12">
                <button 
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-800"
                >
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
                <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold tracking-widest uppercase">{profile?.cashtag}</span>
                </div>
                <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <Bell className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="text-center mb-12">
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mb-2">Cash Balance</p>
                <h1 className="text-6xl font-bold tracking-tighter">
                  ${profile?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-12">
                <button 
                  onClick={() => {
                    setCashModalType('add');
                    setCashModalStep(1);
                    setCashAmount('0');
                    setIsCashModalOpen(true);
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 py-4 rounded-2xl font-semibold transition-all active:scale-95"
                >
                  Add Cash
                </button>
                <button 
                  onClick={() => {
                    setCashModalType('out');
                    setCashModalStep(1);
                    setCashAmount('0');
                    setIsCashModalOpen(true);
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 py-4 rounded-2xl font-semibold transition-all active:scale-95"
                >
                  Cash Out
                </button>
              </div>

              <div className="mb-12">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Linked Accounts</h3>
                  <button 
                    onClick={() => setIsLinkAccountModalOpen(true)}
                    className="text-green-500 text-xs font-bold hover:underline"
                  >
                    Link New
                  </button>
                </div>
                <div className="space-y-3">
                  {linkedAccounts.length > 0 ? (
                    linkedAccounts.map((account) => (
                      <div 
                        key={account.id}
                        onClick={() => {
                          setSelectedAccountForDetails(account);
                          setIsAccountDetailsModalOpen(true);
                        }}
                        className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                            account.type === 'bank' ? "bg-blue-600/20 text-blue-500" : "bg-zinc-800 text-zinc-400"
                          )}>
                            {account.type === 'bank' ? <Building2 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{account.institutionName}</p>
                            <p className="text-xs text-zinc-500">•••• {account.lastFour} • {account.type === 'bank' ? 'Bank' : 'Card'}</p>
                            {account.status === 'pending' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVerifyingAccount(account);
                                    setIsVerifyModalOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-green-500 hover:underline block mt-1"
                                >
                                  Verify Now
                                </button>
                              )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {account.isPrimary && (
                            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full uppercase tracking-tighter">Primary</span>
                          )}
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter",
                            account.status === 'verified' ? "text-blue-500 bg-blue-500/10" : "text-zinc-500 bg-zinc-500/10"
                          )}>
                            {account.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                      <p className="text-xs text-zinc-600 mb-3">No bank accounts or cards linked</p>
                      <button 
                        onClick={() => setIsLinkAccountModalOpen(true)}
                        className="text-green-500 text-xs font-bold px-4 py-2 bg-green-500/10 rounded-full active:scale-95 transition-transform"
                      >
                        Link a Bank or Card
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-12">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Security & Verification</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Identity Verification</p>
                        <p className="text-xs text-zinc-500">{profile?.isVerified ? 'Verified' : 'Not verified'}</p>
                      </div>
                    </div>
                    {!profile?.isVerified && (
                      <button 
                        onClick={() => setIsIdentityModalOpen(true)}
                        className="px-4 py-2 bg-green-500 text-black rounded-full text-xs font-bold active:scale-95 transition-transform"
                      >
                        Verify
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Security PIN</p>
                        <p className="text-xs text-zinc-500">{profile?.pin ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        const pin = prompt("Enter new 4-digit PIN:");
                        if (pin && /^\d{4}$/.test(pin)) {
                          try {
                            const idToken = await auth.currentUser?.getIdToken();
                            await fetch('/api/set-pin', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`},
                              body: JSON.stringify({ pin })
                            });
                            toast.success("PIN updated!");
                          } catch (e) {
                            toast.error("Failed to set PIN.")
                          }
                        } else if (pin) {
                          toast.error("PIN must be 4 digits");
                        }
                      }}
                      className="px-4 py-2 bg-zinc-800 text-white rounded-full text-xs font-bold active:scale-95 transition-transform"
                    >
                      {profile?.pin ? 'Change' : 'Set'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Recent Activity</h3>
                  <button onClick={() => setActiveTab('activity')} className="text-green-500 text-xs font-bold">View All</button>
                </div>
                <div className="space-y-4">
                  {transactions.slice(0, 3).map(tx => (
                    <div 
                      key={tx.id} 
                      onClick={() => setSelectedTx(tx)}
                      className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 cursor-pointer active:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">
                          {tx.type === 'cash_in' ? '🏦' : tx.type === 'cash_out' ? '💸' : tx.senderId === user.uid ? '📤' : '📥'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{tx.senderId === user.uid ? `To ${tx.receiverName}` : `From ${tx.senderName}`}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{tx.status}</p>
                        </div>
                      </div>
                      <p className={cn("font-bold", tx.senderId === user.uid ? "text-white" : "text-green-500")}>
                        {tx.senderId === user.uid ? '-' : '+'}${tx.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-zinc-600 text-sm py-4">No recent activity</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="px-6 pt-12 pb-32"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Cash Card</h2>
                <button 
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-800"
                >
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
              </div>

              <div className="relative aspect-[1.58/1] w-full bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-green-500/20 transition-all duration-500" />
                <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-8 bg-zinc-800 rounded-md" />
                      <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">Debit</span>
                    </div>
                    <DollarSign className="w-8 h-8 text-zinc-700" />
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs tracking-widest uppercase mb-1">{profile?.displayName}</p>
                    <p className="text-xl font-mono tracking-wider">•••• •••• •••• {user.uid.slice(-4)}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 space-y-6">
                 {/* ... other card options ... */}
              </div>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div /* ... search tab ... */ />
          )}

          {activeTab === 'investing' && (
            <motion.div /* ... investing tab ... */ />
          )}

          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pt-12"
            >
              <h2 className="text-3xl font-bold mb-8">Activity</h2>
              <div className="space-y-6">
                {transactions.length > 0 ? transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center justify-between group cursor-pointer active:bg-zinc-900 p-2 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-xl">
                         {tx.type === 'cash_in' ? '🏦' : tx.type === 'cash_out' ? '💸' : tx.senderId === user.uid ? '📤' : '📥'}
                      </div>
                      <div>
                        <h4 className="font-bold">
                          {tx.senderId === user.uid ? `Paid ${tx.receiverName || 'User'}` : `Received from ${tx.senderName || 'User'}`}
                        </h4>
                        <p className="text-xs text-zinc-500">
                          {tx.note || (tx.timestamp?.toDate().toLocaleDateString())} • <span className="capitalize">{tx.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "font-bold",
                      tx.senderId === user.uid ? "text-white" : "text-green-500"
                    )}>
                      {tx.senderId === user.uid ? '-' : '+'}${tx.amount.toFixed(2)}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-zinc-600">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No activity yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-black/80 backdrop-blur-xl border-t border-zinc-900 px-6 py-4 flex justify-between items-center z-40">
          <NavButton icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton icon={CreditCard} active={activeTab === 'card'} onClick={() => setActiveTab('card')} />
          <button 
            onClick={() => setIsPayModalOpen(true)}
            className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 active:scale-90 transition-transform"
          >
            <DollarSign className="w-7 h-7 text-black" />
          </button>
          <NavButton icon={TrendingUp} active={activeTab === 'investing'} onClick={() => setActiveTab('investing')} />
          <NavButton icon={Clock} active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
        </nav>

        <AnimatePresence>
          {isCashModalOpen && (
            <motion.div /* ... cash modal ... */ />
          )}

          {isPayModalOpen && (
            <motion.div /* ... pay modal ... */ />
          )}
          
          {/* ... other modals ... */}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ icon: Icon, active, onClick }: { icon: React.ElementType, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 transition-all relative",
        active ? "text-green-500" : "text-zinc-600 hover:text-zinc-400"
      )}
    >
      <Icon className="w-7 h-7" />
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"
        />
      )}
    </button>
  );
}

// All other modals (LinkAccountModal, VerifyAccountModal, etc.) remain the same
// ...
