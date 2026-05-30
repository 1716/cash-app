import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
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
  ChevronLeft,
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
  AlertCircle,
  Eye,
  EyeOff,
  User,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
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
              <p className="text-zinc-500 mb-8">To keep your account secure and increase your limits, we need to verify your identity using Persona.</p>
              
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
  const [pinAction, setPinAction] = useState<() => void>(() => {});
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

  // Gemini for real-time prices
  const fetchPrices = useCallback(async () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is missing");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `What are the current prices of Bitcoin (BTC), Apple (AAPL), Tesla (TSLA), and Microsoft (MSFT) in USD? 
        Return the data as a JSON object with keys: BTC, AAPL, TSLA, MSFT. 
        Example: {"BTC": 71000, "AAPL": 170, "TSLA": 180, "MSFT": 400}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text);
      if (data.BTC) setBtcPrice(data.BTC);
      if (data.AAPL || data.TSLA || data.MSFT) {
        setStockPrices(prev => ({
          ...prev,
          ...(data.AAPL && { AAPL: data.AAPL }),
          ...(data.TSLA && { TSLA: data.TSLA }),
          ...(data.MSFT && { MSFT: data.MSFT }),
        }));
      }
    } catch (error) {
      console.warn("Gemini price fetch failed, falling back to public API:", error);
      
      // Fallback to a public API if Gemini fails
      try {
        const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
        const data = await response.json();
        const price = data.bpi.USD.rate_float;
        if (price) setBtcPrice(price);
      } catch (fallbackError) {
        console.error("All price fetch methods failed:", fallbackError);
      }
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
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
  }, [searchQuery, user?.uid]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setTransactions([]);
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
        // Initialize profile via backend
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
        } catch (e) {
          console.error("Error initializing user:", e);
        }
      }
      setIsLoading(false);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'users'));

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
      setTransactions(sorted.slice(0, 20));
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

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Login failed:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

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
    
    if (type === 'bank') {
      const executeLink = async () => {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/link-bank', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            institutionName: institution,
            lastFour,
            accountNumber: details.accountNumber,
            routingNumber: details.routingNumber
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to link bank');
        return result;
      };

      toast.promise(executeLink(), {
        loading: 'Initiating bank link...',
        success: (result) => {
          setIsLinkAccountModalOpen(false);
          // The account will be added to Firestore by the backend, 
          // and our onSnapshot listener will pick it up.
          // We need to wait for it to appear to set it as verifyingAccount.
          return result.message || "Micro-deposits initiated. Please verify when they appear.";
        },
        error: (err) => err.message || "Failed to link bank"
      });
    } else {
      const executeLink = async () => {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/link-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            institutionName: institution,
            lastFour,
            cardNumber: details.cardNumber,
            expiryDate: details.expiryDate,
            cvv: details.cvv
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to link card');
        return result;
      };

      toast.promise(executeLink(), {
        loading: `Linking ${type}...`,
        success: (result) => {
          setIsLinkAccountModalOpen(false);
          // Account will appear via onSnapshot
          return result.message || `Successfully linked ${institution} •••• ${lastFour}. Please verify to continue.`;
        },
        error: (err: any) => `Failed to link ${type}: ${err?.message || 'Unknown error'}`
      });
    }
  };

  const handleVerifyAccount = async (accountId: string, data: any) => {
    if (!user || !verifyingAccount) return;
    
    if (verifyingAccount.type === 'bank') {
      const executeVerify = async () => {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/verify-bank', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            accountId,
            amount1: data.amounts[0],
            amount2: data.amounts[1]
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Verification failed');
        return result;
      };

      toast.promise(executeVerify(), {
        loading: 'Verifying bank account...',
        success: () => {
          setIsVerifyModalOpen(false);
          setVerifyingAccount(null);
          return 'Bank account verified successfully!';
        },
        error: (err) => err.message || 'Verification failed'
      });
    } else {
      const executeVerify = async () => {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/verify-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ accountId })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Verification failed');
        return result;
      };

      toast.promise(executeVerify(), {
        loading: 'Verifying card...',
        success: () => {
          setIsVerifyModalOpen(false);
          setVerifyingAccount(null);
          return 'Card verified successfully!';
        },
        error: (err) => err.message || 'Verification failed'
      });
    }
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
    
    // Require PIN for payments
    if (profile?.pin) {
      setPinPurpose(`Pay $${payAmount} to ${recipientCashtag}`);
      setPinAction(() => (pin: string) => executePayAfterPin(pin));
      setIsPinModalOpen(true);
      return;
    }

    executePayAfterPin();
  };

  const executePayAfterPin = async (pin?: string) => {
    if (!user || !profile || parseFloat(payAmount) <= 0 || !recipientCashtag) return;
    const amount = parseFloat(payAmount);

    if (amount > profile.balance) {
      toast.error("Insufficient balance");
      return;
    }

    const executePay = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/send-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          recipientCashtag,
          amount,
          note: payNote,
          pin
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }
      return result;
    };

    toast.promise(executePay(), {
      loading: 'Sending payment...',
      success: () => {
        setIsPayModalOpen(false);
        setPayAmount('0');
        setRecipientCashtag('');
        setPayNote('');
        return `Sent $${amount} to ${recipientCashtag}`;
      },
      error: (err) => {
        console.error(err);
        return err.message || "Payment failed. Please try again.";
      }
    });
  };

  const executeRequestAfterConfirm = async () => {
    if (!user || !profile || parseFloat(payAmount) <= 0 || !recipientCashtag) return;
    const amount = parseFloat(payAmount);

    const executeRequest = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/request-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          recipientCashtag,
          amount,
          note: payNote
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }
      return result;
    };

    toast.promise(executeRequest(), {
      loading: 'Sending request...',
      success: () => {
        setIsPayModalOpen(false);
        setPayAmount('0');
        setRecipientCashtag('');
        setPayNote('');
        return `Requested $${amount} from ${recipientCashtag}`;
      },
      error: (err) => {
        console.error(err);
        return err.message || "Request failed. Please try again.";
      }
    });
  };

  const handleRequest = async () => {
    if (!user || !profile || parseFloat(payAmount) <= 0 || !recipientCashtag) return;
    setIsReviewingRequest(true);
  };

  const confirmRequest = async () => {
    setIsReviewingRequest(false);
    executeRequestAfterConfirm();
  };

  const handleAcceptRequest = async (tx: Transaction) => {
    if (!user || !profile) return;
    
    // Require PIN for paying requests
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
      if (!response.ok) {
        throw new Error(result.error || 'Failed to pay request');
      }
      return result;
    };

    toast.promise(executeAccept(), {
      loading: 'Paying request...',
      success: () => {
        setSelectedTx(null);
        return `Successfully paid $${tx.amount} to ${tx.receiverName}`;
      },
      error: (err) => {
        console.error(err);
        return err.message || "Failed to pay request. Please try again.";
      }
    });
  };

  const handleCancelRequest = async (tx: Transaction) => {
    if (!user) return;

    const executeCancel = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/cancel-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ transactionId: tx.id })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel request');
      }
      return result;
    };

    toast.promise(executeCancel(), {
      loading: 'Cancelling request...',
      success: () => {
        setSelectedTx(null);
        return 'Request cancelled';
      },
      error: (err) => {
        console.error(err);
        return err.message || "Failed to cancel request. Please try again.";
      }
    });
  };

  const handleNumberClick = (num: string) => {
    if (payAmount === '0' && num !== '.') {
      setPayAmount(num);
    } else {
      if (num === '.' && payAmount.includes('.')) return;
      setPayAmount(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPayAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const handleCashAction = async () => {
    if (!user || !profile || parseFloat(cashAmount) <= 0) return;
    
    // Require PIN for Cash Out and Add Cash if user has one
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

    const accountName = `${selectedAccount.institutionName} •••• ${selectedAccount.lastFour}`;

    // If it's a withdrawal, use the backend API
    if (cashModalType === 'out') {
      const executeWithdrawal = async () => {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            amountCents: Math.round(amount * 100),
            method: cashOutSpeed,
            pin
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Withdrawal failed');
        }
        return result;
      };

      toast.promise(executeWithdrawal(), {
        loading: 'Processing instant payout...',
        success: () => {
          setIsCashModalOpen(false);
          setCashAmount('0');
          setCashModalStep(1);
          return `Successfully cashed out $${amount} to ${accountName}`;
        },
        error: (err) => {
          console.error(err);
          return err.message || "Withdrawal failed. Please try again.";
        }
      });
      return;
    }

    // For 'add' cash, we use the backend API
    const executeAddCash = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/add-cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          amount,
          accountId: selectedAccountId,
          pin
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add cash');
      }
      return result;
    };

    toast.promise(executeAddCash(), {
      loading: 'Adding cash...',
      success: () => {
        setIsCashModalOpen(false);
        setCashAmount('0');
        setCashModalStep(1);
        return `Successfully added $${amount} from ${accountName}`;
      },
      error: (err) => {
        console.error(err);
        return err.message || "Failed to add cash. Please try again.";
      }
    });
  };

  const handleTrade = async () => {
    if (!user || !profile || !tradingAsset || parseFloat(tradingAmount) <= 0) return;
    const amount = parseFloat(tradingAmount);
    const assetPrice = tradingAsset.price;
    const assetAmount = amount / assetPrice;

    if (tradingType === 'buy' && amount > profile.balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (tradingType === 'sell') {
      const currentAssetBalance = tradingAsset.symbol === 'BTC' 
        ? portfolio?.btcBalance || 0 
        : portfolio?.stocks[tradingAsset.symbol] || 0;
      
      if (assetAmount > currentAssetBalance) {
        toast.error(`Insufficient ${tradingAsset.symbol} balance`);
        return;
      }
    }

    const executeTrade = async () => {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/execute-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          tradingType,
          tradingAsset,
          amount,
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
        setIsTradingModalOpen(false);
        setTradingAmount('0');
        return `Successfully ${tradingType === 'buy' ? 'bought' : 'sold'} ${tradingAsset.symbol}`;
      },
      error: (err) => {
        console.error(err);
        return err.message || "Trade failed. Please try again.";
      }
    });
  };

  const handleCashNumberClick = (num: string) => {
    if (cashAmount === '0' && num !== '.') {
      setCashAmount(num);
    } else {
      if (num === '.' && cashAmount.includes('.')) return;
      setCashAmount(prev => prev + num);
    }
  };

  const handleCashBackspace = () => {
    setCashAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  if (isLoading) {
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
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-green-500 rounded-3xl flex items-center justify-center mb-12 shadow-2xl shadow-green-500/20">
          <DollarSign className="w-12 h-12 text-black" />
        </div>
        <h1 className="text-4xl font-bold mb-4 tracking-tighter">Cash App</h1>
        <p className="text-zinc-500 mb-12 text-center max-w-xs">The simplest way to send, spend, bank, and invest.</p>
        <button 
          onClick={handleLogin}
          className="w-full max-w-xs bg-white text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>
      </div>
    );
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
                <p className="text-green-500 text-sm font-bold mt-2">{profile?.cashtag}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-12">
                <button 
                  onClick={() => {
                    setCashModalType('add');
                    setCashModalStep(1);
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
                    setIsCashModalOpen(true);
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 py-4 rounded-2xl font-semibold transition-all active:scale-95"
                >
                  Cash Out
                </button>
              </div>

              {/* Linked Accounts Section */}
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
                        className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50"
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
                            <div className="flex gap-2 mt-1">
                              {account.status === 'pending' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVerifyingAccount(account);
                                    setIsVerifyModalOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-green-500 hover:underline block"
                                >
                                  Verify Now
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAccountForDetails(account);
                                  setIsAccountDetailsModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-200 hover:underline block"
                              >
                                View Details
                              </button>
                            </div>
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
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(account.id);
                            }}
                            className="p-1 hover:bg-red-500/10 rounded-full transition-colors group/del"
                          >
                            <Trash2 className="w-3 h-3 text-zinc-600 group-hover/del:text-red-500" />
                          </button>
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

              {/* Security & Verification Section */}
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
                        if (pin && pin.length === 4) {
                          const idToken = await auth.currentUser?.getIdToken();
                          await fetch('/api/set-pin', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify({ pin })
                          });
                          toast.success("PIN updated!");
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

              {/* Recent Activity Section */}
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
                          <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{tx.type}</p>
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
                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-800 rounded-xl">
                      <Lock className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-bold">Lock Card</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Temporarily disable card</p>
                    </div>
                  </div>
                  <button className="w-12 h-6 bg-zinc-800 rounded-full relative p-1 transition-colors hover:bg-zinc-700">
                    <div className="w-4 h-4 bg-zinc-500 rounded-full" />
                  </button>
                </div>

                <div>
                  <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Boosts</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Coffee', boost: '10% off', color: 'bg-amber-500/10 text-amber-500' },
                      { name: 'Grocery', boost: '5% off', color: 'bg-green-500/10 text-green-500' },
                      { name: 'Lyft', boost: '15% off', color: 'bg-pink-500/10 text-pink-500' },
                      { name: 'DoorDash', boost: '10% off', color: 'bg-red-500/10 text-red-500' }
                    ].map(boost => (
                      <div key={boost.name} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 active:scale-95 transition-transform cursor-pointer">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", boost.color)}>
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold">{boost.name}</p>
                        <p className="text-[10px] text-zinc-500">{boost.boost}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-zinc-800 rounded-xl">
                        <Plus className="w-5 h-5 text-zinc-400" />
                      </div>
                      <span className="font-bold">Add to Apple Wallet</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-zinc-800 rounded-xl">
                        <CreditCard className="w-5 h-5 text-zinc-400" />
                      </div>
                      <span className="font-bold">Card Design</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pt-12"
            >
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people, $Cashtags" 
                  className="w-full bg-zinc-900 py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 ring-green-500/50 transition-all"
                />
              </div>
              
              <div className="space-y-6">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                  {searchQuery ? 'Search Results' : 'Suggested'}
                </h3>
                
                {isSearching ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : searchQuery && searchResults.length === 0 ? (
                  <p className="text-center text-zinc-500 py-8">No users found</p>
                ) : (searchQuery ? searchResults : [
                  { cashtag: '$jack', displayName: 'Jack Dorsey', photoURL: '' },
                  { cashtag: '$elon', displayName: 'Elon Musk', photoURL: '' },
                  { cashtag: '$vitalik', displayName: 'Vitalik Buterin', photoURL: '' }
                ]).map((result: any) => (
                  <div key={result.cashtag} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center font-bold overflow-hidden">
                        {result.photoURL ? (
                          <img src={result.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          result.displayName?.[0] || result.cashtag[1].toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold">{result.displayName || result.cashtag.slice(1)}</h4>
                        <p className="text-xs text-zinc-500">{result.cashtag}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setRecipientCashtag(result.cashtag);
                        setIsPayModalOpen(true);
                      }}
                      className="bg-zinc-900 px-6 py-2 rounded-full text-xs font-bold hover:bg-green-500 hover:text-black transition-colors"
                    >
                      Pay
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'investing' && (
            <motion.div
              key="investing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pt-12 pb-32"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Investing</h2>
                <div className="flex gap-2">
                  <button className="p-2 bg-zinc-900 rounded-full"><TrendingUp className="w-5 h-5" /></button>
                  <button className="p-2 bg-zinc-900 rounded-full"><Search className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="space-y-8">
                {/* Bitcoin Section */}
                <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <Bitcoin className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-bold">Bitcoin</h3>
                        <p className="text-xs text-zinc-500">BTC</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${btcPrice.toLocaleString()}</p>
                      <p className="text-xs text-green-500">+2.45%</p>
                    </div>
                  </div>
                  
                  <div className="h-32 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={STOCK_DATA.BTC}>
                        <defs>
                          <linearGradient id="colorBtc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="price" stroke="#f97316" fillOpacity={1} fill="url(#colorBtc)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setTradingType('buy');
                        setTradingAsset({ symbol: 'BTC', name: 'Bitcoin', price: btcPrice });
                        setIsTradingModalOpen(true);
                      }}
                      className="flex-1 bg-white text-black py-3 rounded-xl font-bold active:scale-95 transition-transform"
                    >
                      Buy
                    </button>
                    <button 
                      onClick={() => {
                        setTradingType('sell');
                        setTradingAsset({ symbol: 'BTC', name: 'Bitcoin', price: btcPrice });
                        setIsTradingModalOpen(true);
                      }}
                      className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold active:scale-95 transition-transform"
                    >
                      Sell
                    </button>
                  </div>
                </div>

                {/* Stocks Section */}
                <div>
                  <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Stocks</h3>
                  <div className="space-y-4">
                    {Object.entries(stockPrices).map(([symbol, price]) => (
                      <div 
                        key={symbol}
                        onClick={() => {
                          setTradingAsset({ symbol, name: symbol, price });
                          setTradingType('buy');
                          setIsTradingModalOpen(true);
                        }}
                        className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl cursor-pointer active:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-bold">
                            {symbol[0]}
                          </div>
                          <div>
                            <h4 className="font-bold">{symbol}</h4>
                            <p className="text-xs text-zinc-500">{portfolio.stocks[symbol] || 0} Shares</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${price.toLocaleString()}</p>
                          <p className="text-xs text-green-500">+1.2%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
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
                          {tx.type === 'cash_in' ? 'Added Cash' : 
                           tx.type === 'cash_out' ? 'Cashed Out' : 
                           tx.senderId === user.uid ? `Paid ${tx.receiverName || 'User'}` : `Received from ${tx.senderName || 'User'}`}
                        </h4>
                        <p className="text-xs text-zinc-500">
                          {tx.note || (tx.timestamp?.toDate().toLocaleDateString() + ' • ' + tx.type)}
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
          <NavButton key="nav-home" icon={Home} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton key="nav-card" icon={CreditCard} active={activeTab === 'card'} onClick={() => setActiveTab('card')} />
          <button 
            key="nav-pay"
            onClick={() => setIsPayModalOpen(true)}
            className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 active:scale-90 transition-transform"
          >
            <DollarSign className="w-7 h-7 text-black" />
          </button>
          <NavButton key="nav-investing" icon={TrendingUp} active={activeTab === 'investing'} onClick={() => setActiveTab('investing')} />
          <NavButton key="nav-activity" icon={Clock} active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
        </nav>

        <AnimatePresence>
          {isCashModalOpen && (
            <motion.div
              key="cash-modal"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 bg-black max-w-md mx-auto flex flex-col"
            >
              <div className="p-6 flex justify-between items-center">
                <button 
                  onClick={() => {
                    setIsCashModalOpen(false);
                    setCashAmount('0');
                    setCashModalStep(1);
                  }}
                  className="p-2 bg-zinc-900 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold">
                  {cashModalStep === 1 
                    ? (cashModalType === 'add' ? 'Add Cash' : 'Cash Out')
                    : 'Review'
                  }
                </h2>
                <div className="w-10" /> {/* Spacer */}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-6">
                {cashModalStep === 1 ? (
                  <>
                    <div className="text-7xl font-bold tracking-tighter mb-12 flex items-start">
                      <span className="text-4xl mt-2 mr-1 text-zinc-500">$</span>
                      {cashAmount}
                    </div>

                    <div className="grid grid-cols-3 gap-x-12 gap-y-8 w-full max-w-[280px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleCashNumberClick(num.toString())}
                          className="text-3xl font-medium w-16 h-16 flex items-center justify-center rounded-full active:bg-zinc-900 transition-colors"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        onClick={handleCashBackspace}
                        className="text-3xl font-medium w-16 h-16 flex items-center justify-center rounded-full active:bg-zinc-900 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full space-y-8">
                    <div className="text-center">
                      <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mb-2">
                        {cashModalType === 'add' ? 'Adding' : 'Cashing Out'}
                      </p>
                      <h1 className="text-6xl font-bold tracking-tighter">${parseFloat(cashAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h1>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] space-y-6">
                        {/* Transaction Flow Visual */}
                        <div className="flex items-center justify-between px-4">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center shadow-inner">
                              {cashModalType === 'add' ? (
                                linkedAccounts.find(a => a.id === selectedAccountId)?.type === 'bank' ? <Building2 className="w-7 h-7 text-blue-500" /> : <CreditCard className="w-7 h-7 text-zinc-400" />
                              ) : (
                                <DollarSign className="w-7 h-7 text-green-500" />
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                              {cashModalType === 'add' ? 'From' : 'Source'}
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col items-center justify-center px-4">
                            <div className="w-full h-px bg-zinc-800 relative">
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 p-1 rounded-full border border-zinc-800">
                                <ArrowRight className="w-4 h-4 text-zinc-600" />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center shadow-inner">
                              {cashModalType === 'out' ? (
                                linkedAccounts.find(a => a.id === selectedAccountId)?.type === 'bank' ? <Building2 className="w-7 h-7 text-blue-500" /> : <CreditCard className="w-7 h-7 text-zinc-400" />
                              ) : (
                                <DollarSign className="w-7 h-7 text-green-500" />
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                              {cashModalType === 'out' ? 'To' : 'Destination'}
                            </span>
                          </div>
                        </div>

                        <div className="h-px bg-zinc-800/50 w-full" />

                        {/* Detailed Receipt */}
                        <div className="space-y-5">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-zinc-500" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Account</span>
                                <span className="text-sm font-bold">
                                  {linkedAccounts.find(a => a.id === selectedAccountId)?.institutionName} •••• {linkedAccounts.find(a => a.id === selectedAccountId)?.lastFour}
                                </span>
                              </div>
                            </div>
                          </div>

                          {cashModalType === 'out' && (
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                                  <TrendingUp className="w-5 h-5 text-zinc-500" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Speed</span>
                                  <span className="text-sm font-bold capitalize">{cashOutSpeed}</span>
                                </div>
                              </div>
                              <span className="text-xs text-zinc-500 font-medium">
                                {cashOutSpeed === 'instant' ? 'Minutes' : '1-3 Days'}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-zinc-500" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Fee</span>
                                <span className="text-sm font-bold">
                                  {cashModalType === 'out' && cashOutSpeed === 'instant' ? '$0.25' : 'Free'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 space-y-4">
                {cashModalStep === 1 ? (
                  <>
                    {/* Bank Selection */}
                    <div 
                      onClick={() => {
                        if (linkedAccounts.length === 0) {
                          setIsLinkAccountModalOpen(true);
                        } else {
                          const currentIndex = linkedAccounts.findIndex(a => a.id === selectedAccountId);
                          const nextIndex = (currentIndex + 1) % linkedAccounts.length;
                          setSelectedAccountId(linkedAccounts[nextIndex].id);
                        }
                      }}
                      className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl cursor-pointer active:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {linkedAccounts.length > 0 ? (
                          <>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                              linkedAccounts.find(a => a.id === selectedAccountId)?.type === 'bank' ? "bg-blue-600" : "bg-zinc-700"
                            )}>
                              {linkedAccounts.find(a => a.id === selectedAccountId)?.institutionName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {linkedAccounts.find(a => a.id === selectedAccountId)?.institutionName} •••• {linkedAccounts.find(a => a.id === selectedAccountId)?.lastFour}
                              </p>
                              <p className="text-xs text-zinc-500">Linked {linkedAccounts.find(a => a.id === selectedAccountId)?.type === 'bank' ? 'Account' : 'Card'}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                              <Plus className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Link a Bank or Card</p>
                              <p className="text-xs text-zinc-500">Required to {cashModalType === 'add' ? 'add cash' : 'cash out'}</p>
                            </div>
                          </>
                        )}
                      </div>
                      {linkedAccounts.length > 0 ? (
                        <div className="flex items-center gap-2">
                           <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsLinkAccountModalOpen(true);
                            }}
                            className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
                          >
                            <Plus className="w-4 h-4 text-zinc-400" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-zinc-600" />
                        </div>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>

                    {/* Speed Selection (only for Cash Out) */}
                    {cashModalType === 'out' && (
                      <div className="flex gap-2 p-1 bg-zinc-900 rounded-2xl">
                        <button 
                          onClick={() => setCashOutSpeed('standard')}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                            cashOutSpeed === 'standard' ? "bg-zinc-800 text-white" : "text-zinc-500"
                          )}
                        >
                          Standard
                          <span className="block text-[10px] font-normal opacity-60">1-3 Days • Free</span>
                        </button>
                        <button 
                          onClick={() => setCashOutSpeed('instant')}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                            cashOutSpeed === 'instant' ? "bg-zinc-800 text-white" : "text-zinc-500"
                          )}
                        >
                          Instant
                          <span className="block text-[10px] font-normal opacity-60">Minutes • $0.25 Fee</span>
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={() => setCashModalStep(2)}
                      disabled={cashAmount === '0' || linkedAccounts.length === 0}
                      className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                    >
                      Next
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={handleCashAction}
                      className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      Confirm {cashModalType === 'add' ? 'Add' : 'Cash Out'}
                    </button>
                    <button 
                      onClick={() => setCashModalStep(1)}
                      className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {isPayModalOpen && (
            <motion.div
              key="pay-modal"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 bg-black max-w-md mx-auto flex flex-col"
            >
              <div className="p-6 flex justify-between items-center">
                <button 
                  onClick={() => {
                    setIsPayModalOpen(false);
                    setPayAmount('0');
                    setIsReviewingPay(false);
                    setIsReviewingRequest(false);
                  }}
                  className="p-2 bg-zinc-900 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
                {!isReviewingPay && !isReviewingRequest && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPayMode('request')}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all",
                        payMode === 'request' ? "bg-white text-black" : "bg-zinc-900 text-white"
                      )}
                    >
                      Request
                    </button>
                    <button 
                      onClick={() => setPayMode('pay')}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all",
                        payMode === 'pay' ? "bg-green-500 text-black" : "bg-zinc-900 text-white"
                      )}
                    >
                      Pay
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-6">
                {isReviewingPay || isReviewingRequest ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm space-y-8"
                  >
                    <div className="text-center">
                      <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mb-2">
                        {isReviewingPay ? 'Paying' : 'Requesting'}
                      </p>
                      <h1 className="text-6xl font-bold tracking-tighter">${parseFloat(payAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h1>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] space-y-6">
                      {/* Transaction Flow Visual */}
                      <div className="flex items-center justify-between px-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center shadow-inner text-xl">
                            {isReviewingPay ? '👤' : '💰'}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                            {isReviewingPay ? 'From You' : 'To You'}
                          </span>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center px-4">
                          <div className="w-full h-px bg-zinc-800 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 p-1 rounded-full border border-zinc-800">
                              <ArrowRight className="w-4 h-4 text-zinc-600" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center shadow-inner text-xl">
                            {isReviewingPay ? '💰' : '👤'}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                            {isReviewingPay ? 'To Recipient' : 'From Recipient'}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-zinc-800/50 w-full" />

                      {/* Detailed Summary */}
                      <div className="space-y-5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                              <User className="w-5 h-5 text-zinc-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{isReviewingPay ? 'Recipient' : 'From'}</span>
                              <span className="text-sm font-bold">{recipientCashtag}</span>
                            </div>
                          </div>
                        </div>

                        {payNote && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-zinc-500" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Note</span>
                                <span className="text-sm font-bold">"{payNote}"</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                              <ShieldCheck className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Security</span>
                              <span className="text-sm font-bold">Encrypted Transfer</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <div className="text-7xl font-bold tracking-tighter mb-12 flex items-start">
                      <span className="text-4xl mt-2 mr-1 text-zinc-500">$</span>
                      {payAmount}
                    </div>

                    <div className="grid grid-cols-3 gap-x-12 gap-y-8 w-full max-w-[280px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleNumberClick(num.toString())}
                          className="text-3xl font-medium w-16 h-16 flex items-center justify-center rounded-full active:bg-zinc-900 transition-colors"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        onClick={handleBackspace}
                        className="text-3xl font-medium w-16 h-16 flex items-center justify-center rounded-full active:bg-zinc-900 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="p-8">
                {isReviewingPay || isReviewingRequest ? (
                  <div className="space-y-4">
                    <button 
                      onClick={isReviewingPay ? confirmPay : confirmRequest}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform",
                        isReviewingPay ? "bg-green-500 text-black" : "bg-white text-black"
                      )}
                    >
                      Confirm {isReviewingPay ? 'Pay' : 'Request'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsReviewingPay(false);
                        setIsReviewingRequest(false);
                      }}
                      className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform"
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl mb-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-zinc-500" />
                      </div>
                      <input 
                        type="text" 
                        value={recipientCashtag}
                        onChange={(e) => setRecipientCashtag(e.target.value)}
                        placeholder="To: Name, $Cashtag, Phone, Email" 
                        className="bg-transparent border-none outline-none flex-1 text-sm font-medium placeholder:text-zinc-600 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl mb-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-zinc-500" />
                      </div>
                      <input 
                        type="text" 
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="For: Dinner, Rent, etc." 
                        className="bg-transparent border-none outline-none flex-1 text-sm font-medium placeholder:text-zinc-600 text-white"
                      />
                    </div>
                    <button 
                      onClick={payMode === 'pay' ? handlePay : handleRequest}
                      disabled={payAmount === '0' || !recipientCashtag}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100",
                        payMode === 'pay' ? "bg-green-500 text-black" : "bg-white text-black"
                      )}
                    >
                      {payMode === 'pay' ? 'Pay' : 'Request'} ${payAmount} <ArrowRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {isTradingModalOpen && (
            <TradingModal 
              key="trading-modal"
              asset={tradingAsset}
              type={tradingType}
              balance={profile?.balance || 0}
              portfolio={portfolio}
              onClose={() => setIsTradingModalOpen(false)}
              onTrade={handleTrade}
            />
          )}

          {isSettingsModalOpen && (
            <SettingsModal 
              key="settings-modal"
              profile={profile} 
              onClose={() => setIsSettingsModalOpen(false)} 
            />
          )}

          {selectedTx && (
            <TransactionDetailModal 
              key="tx-detail-modal"
              tx={selectedTx} 
              onClose={() => setSelectedTx(null)} 
              onAccept={handleAcceptRequest}
              onCancel={handleCancelRequest}
              currentUserId={user?.uid}
            />
          )}

          {isLinkAccountModalOpen && (
            <LinkAccountModal 
              key="link-account-modal"
              onClose={() => setIsLinkAccountModalOpen(false)} 
              onLink={handleLinkAccount} 
            />
          )}

          {isAccountDetailsModalOpen && selectedAccountForDetails && (
            <AccountDetailsModal 
              key="account-details-modal"
              account={selectedAccountForDetails} 
              onClose={() => {
                setIsAccountDetailsModalOpen(false);
                setSelectedAccountForDetails(null);
              }} 
            />
          )}

          {isVerifyModalOpen && verifyingAccount && (
            <VerifyAccountModal 
              key="verify-modal"
              account={verifyingAccount}
              onClose={() => {
                setIsVerifyModalOpen(false);
                setVerifyingAccount(null);
              }}
              onVerify={(data) => handleVerifyAccount(verifyingAccount.id, data)}
            />
          )}

          {isIdentityModalOpen && (
            <IdentityVerificationModal 
              key="identity-modal"
              onClose={() => setIsIdentityModalOpen(false)}
              onVerified={() => {
                toast.success("Identity verified!");
              }}
            />
          )}

          {isPinModalOpen && (
            <PinModal 
              key="pin-modal"
              purpose={pinPurpose}
              onVerify={pinAction}
              onClose={() => setIsPinModalOpen(false)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AccountDetailsModal({ account, onClose }: { account: LinkedAccount, onClose: () => void, key?: string }) {
  const [showSensitive, setShowSensitive] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-zinc-800"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Lock className="w-3 h-3" /> Account Details
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold",
                account.type === 'bank' ? "bg-blue-600/20 text-blue-500" : "bg-zinc-800 text-zinc-400"
              )}>
                {account.type === 'bank' ? <Building2 className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{account.institutionName}</h3>
                <p className="text-sm text-zinc-500 capitalize">{account.type} Account</p>
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-2xl p-6 space-y-4 border border-zinc-800">
              {account.type === 'card' ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Card Number</p>
                    <p className="text-sm font-mono text-white tracking-wider">
                      {showSensitive ? account.cardNumber : `•••• •••• •••• ${account.lastFour}`}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Expiry</p>
                      <p className="text-sm font-mono text-white">{account.expiryDate || 'MM/YY'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CVV</p>
                      <p className="text-sm font-mono text-white">{showSensitive ? account.cvv : '•••'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Account Number</p>
                    <p className="text-sm font-mono text-white tracking-wider">
                      {showSensitive ? account.accountNumber : `•••• •••• •••• ${account.lastFour}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Routing Number</p>
                    <p className="text-sm font-mono text-white">{account.routingNumber || '•••••••••'}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowSensitive(!showSensitive)}
                className="w-full bg-zinc-800 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {showSensitive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {showSensitive ? 'Hide Details' : 'Show Details'}
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NavButton({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void, key?: string }) {
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

function VerifyAccountModal({ account, onClose, onVerify }: { account: LinkedAccount, onClose: () => void, onVerify: (data: any) => void, key?: string }) {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const isBank = account.type === 'bank';

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      if (isBank) {
        // For bank, we send the amounts to the parent handler which calls the backend
        onVerify({ amounts: [parseFloat(input1), parseFloat(input2)] });
      } else {
        const expected = account.verificationDetails?.cvv || '123';
        if (input1 === expected) {
          onVerify({ cvv: input1 });
        } else {
          toast.error("Incorrect security code. Please try again.");
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" /> Verification
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {isBank ? <Building2 className="w-8 h-8 text-green-500" /> : <CreditCard className="w-8 h-8 text-green-500" />}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Verify {account.institutionName}</h3>
          <p className="text-sm text-zinc-500">
            {isBank 
              ? "Check your bank statement for two small deposits from 'CASH APP'. Enter those exact amounts below to verify your account." 
              : "Enter the security code (CVV) on your card."}
          </p>
          <button 
            onClick={() => {
              if (isBank) {
                const [a1, a2] = account.verificationDetails?.amounts || [0.12, 0.15];
                toast.info(`Hint: Deposits were $${a1} and $${a2}`);
              } else {
                const cvv = account.verificationDetails?.cvv || '123';
                toast.info(`Hint: CVV is ${cvv}`);
              }
            }}
            className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 mt-2 uppercase tracking-widest"
          >
            Show Hint
          </button>
        </div>

        <div className="space-y-4 mb-8">
          {isBank ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Amount 1</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input 
                    type="number"
                    value={input1}
                    onChange={(e) => setInput1(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border-none rounded-xl p-4 pl-8 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Amount 2</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input 
                    type="number"
                    value={input2}
                    onChange={(e) => setInput2(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border-none rounded-xl p-4 pl-8 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Security Code (CVV)</label>
              <input 
                type="password"
                maxLength={4}
                value={input1}
                onChange={(e) => setInput1(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-zinc-800 border-none rounded-xl p-4 text-center text-2xl tracking-[1em] text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={handleVerify}
            disabled={isVerifying || (isBank ? (!input1 || !input2) : (input1.length < 3 || input1.length > 4))}
            className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            {isVerifying ? 'Verifying...' : 'Verify Account'}
          </button>
          
          <button 
            onClick={() => {
              const hint = isBank 
                ? `Hint: ${account.verificationDetails?.amounts?.join(', ')}` 
                : `Hint: ${account.verificationDetails?.cvv}`;
              toast.success(hint, { duration: 5000 });
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
          >
            Show Hint
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LinkAccountModal({ onClose, onLink }: { onClose: () => void, onLink: (type: 'bank' | 'card', institution: string, lastFour: string, details: any) => void, key?: string }) {
  const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'success'>('type');
  const [type, setType] = useState<'bank' | 'card'>('bank');
  const [institution, setInstitution] = useState('');
  const [number, setNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  const handleNext = () => {
    if (step === 'type') setStep('details');
    else if (step === 'details') setStep('confirm');
    else if (step === 'confirm') {
      const lastFour = number.slice(-4) || '1234';
      const details = type === 'card' ? {
        cardNumber: number,
        expiryDate,
        cvv
      } : {
        accountNumber: number,
        routingNumber
      };
      onLink(type, institution || (type === 'bank' ? 'Chase Bank' : 'Visa Debit'), lastFour, details);
      setStep('success');
    }
  };

  const isDetailsValid = type === 'card' 
    ? institution && number && expiryDate && cvv 
    : institution && number && routingNumber;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-zinc-800"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Lock className="w-3 h-3" /> Secure Link
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'type' && (
              <motion.div 
                key="type"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Link a Bank Account</h3>
                  <p className="text-sm text-zinc-500">We'll send two small deposits (under $1.00) to your account to verify ownership. This usually takes 1-2 business days (simulated).</p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => setType('bank')}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4",
                      type === 'bank' ? "border-green-500 bg-green-500/5" : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Bank Account</p>
                      <p className="text-xs text-zinc-500">Link using Plaid</p>
                    </div>
                    {type === 'bank' && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                  </button>

                  <button 
                    onClick={() => setType('card')}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4",
                      type === 'card' ? "border-green-500 bg-green-500/5" : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Debit Card</p>
                      <p className="text-xs text-zinc-500">Instant transfers</p>
                    </div>
                    {type === 'card' && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                  </button>
                </div>

                <button 
                  onClick={handleNext}
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {step === 'details' && (
              <motion.div 
                key="details"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Enter {type === 'bank' ? 'Bank' : 'Card'} Details</h3>
                  <p className="text-sm text-zinc-500">Your information is encrypted and never shared.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Institution Name</label>
                    <input 
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder={type === 'bank' ? "e.g. Chase Bank" : "e.g. Visa Debit"}
                      className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">{type === 'bank' ? 'Account Number' : 'Card Number'}</label>
                    <input 
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder={type === 'bank' ? "Account Number" : "Card Number"}
                      className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                  </div>

                  {type === 'card' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Expiry (MM/YY)</label>
                        <input 
                          type="text"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">CVV</label>
                        <input 
                          type="password"
                          maxLength={4}
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="•••"
                          className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Routing Number</label>
                      <input 
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Routing Number"
                        className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('type')}
                    className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleNext}
                    disabled={!isDetailsValid}
                    className="flex-[2] bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                  >
                    Review Details
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div 
                key="confirm"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Confirm Details</h3>
                  <p className="text-sm text-zinc-500">Please review the information before linking.</p>
                </div>

                <div className="bg-zinc-800/50 rounded-2xl p-6 space-y-4 border border-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Type</span>
                    <span className="text-sm font-bold text-white capitalize">{type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Institution</span>
                    <span className="text-sm font-bold text-white">{institution || (type === 'bank' ? 'Chase Bank' : 'Visa Debit')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{type === 'bank' ? 'Account' : 'Card'}</span>
                    <span className="text-sm font-bold text-white">•••• {number.slice(-4) || '1234'}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('details')}
                    className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={handleNext}
                    className="flex-[2] bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                  >
                    Confirm & Link
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Account Linked</h3>
                  <p className="text-sm text-zinc-500 px-4">You can now use your {institution} account to add cash or cash out.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}


