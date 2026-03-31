/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  FileText, 
  Settings, 
  Bell, 
  HelpCircle, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Link as LinkIcon,
  Lock,
  ArrowRight,
  ShieldCheck,
  Verified,
  Download,
  ArrowLeft,
  RefreshCw,
  Search,
  History,
  MapPin,
  Info,
  Terminal,
  Store,
  Wallet,
  Cpu,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

type Screen = 'DASHBOARD' | 'CHECKOUT' | 'PROCESSING' | 'BANK_SIMULATION' | 'SUCCESS' | 'FAILURE' | 'REPORTS' | 'SETTINGS' | 'CUSTOMER_WALLET';

type FlowStep = 'USER' | 'MERCHANT' | 'GATEWAY' | 'ISSUING_BANK' | 'MERCHANT_BANK';

type Transaction = {
  id: string;
  date: string;
  customer: string;
  maskedCard: string;
  amount: number;
  status: 'Success' | 'Failed';
  initials: string;
  color: string;
};

type ValidationErrors = {
  name?: string;
  number?: string;
  expiry?: string;
  cvv?: string;
  amount?: string;
};

const MAX_AMOUNT = 100000;
const SESSION_TIMEOUT_MS = 60_000;
const BLOCKED_CARDS = new Set(['4000000000000002', '4444333322221111']);
const LOW_BALANCE_CARDS = new Set(['4000000000009995']);

const normalizeCardNumber = (value: string) => value.replace(/\D/g, '');

const formatCardNumber = (value: string) =>
  normalizeCardNumber(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

const maskCardNumber = (value: string) => {
  const digits = normalizeCardNumber(value);
  if (!digits) return '**** **** **** ****';
  const visible = digits.slice(-4).padStart(4, '*');
  return `**** **** **** ${visible}`;
};

const isValidLuhn = (cardNumber: string) => {
  const digits = normalizeCardNumber(cardNumber);
  if (digits.length !== 16) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const isExpiryValid = (expiry: string) => {
  const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const year = Number(`20${match[2]}`);
  const now = new Date();
  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);

  return expiryDate >= now;
};

const getAutoDeclineReason = (cardNumber: string, amount: number) => {
  const normalized = normalizeCardNumber(cardNumber);
  if (BLOCKED_CARDS.has(normalized)) {
    return 'Card is blocked by the issuing bank.';
  }

  if (LOW_BALANCE_CARDS.has(normalized) && amount > 1000) {
    return 'Insufficient funds in the issuing bank account.';
  }

  return null;
};

// --- Mock Data ---

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '#TXN-98231', date: 'Oct 24, 2024', customer: 'Arjun Sharma', maskedCard: '**** **** **** 1111', amount: 24000, status: 'Success', initials: 'AS', color: 'bg-blue-100 text-blue-600' },
  { id: '#TXN-98230', date: 'Oct 23, 2024', customer: 'Priya Patel', maskedCard: '**** **** **** 5544', amount: 4500, status: 'Failed', initials: 'PP', color: 'bg-purple-100 text-purple-600' },
  { id: '#TXN-98229', date: 'Oct 23, 2024', customer: 'Vikram Singh', maskedCard: '**** **** **** 4477', amount: 102000, status: 'Success', initials: 'VS', color: 'bg-emerald-100 text-emerald-600' },
];

// --- Components ---

const Navbar = ({ currentScreen, onNavigate }: { currentScreen: Screen, onNavigate: (s: Screen) => void }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <nav className="w-full sticky top-0 bg-[#e9f1ff] z-50 border-b border-blue-100/50">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-12">
          <span className="text-xl font-bold tracking-tight text-[#0c314e] cursor-pointer" onClick={() => onNavigate('DASHBOARD')}>SkyPay</span>
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => onNavigate('DASHBOARD')}
              className={cn(
                "pb-1 font-semibold transition-all duration-200 border-b-2",
                currentScreen === 'DASHBOARD' ? "text-[#00628c] border-[#00628c]" : "text-[#3f5e7d] border-transparent hover:text-[#00628c]"
              )}
            >
              Dashboard
            </button>
            <button 
              onClick={() => onNavigate('CHECKOUT')}
              className={cn(
                "pb-1 font-semibold transition-all duration-200 border-b-2",
                currentScreen === 'CHECKOUT' ? "text-[#00628c] border-[#00628c]" : "text-[#3f5e7d] border-transparent hover:text-[#00628c]"
              )}
            >
              Payments
            </button>
            <button 
              onClick={() => onNavigate('REPORTS')}
              className={cn(
                "pb-1 font-semibold transition-all duration-200 border-b-2",
                currentScreen === 'REPORTS' ? "text-[#00628c] border-[#00628c]" : "text-[#3f5e7d] border-transparent hover:text-[#00628c]"
              )}
            >
              Reports
            </button>
            <button 
              onClick={() => onNavigate('SETTINGS')}
              className={cn(
                "pb-1 font-semibold transition-all duration-200 border-b-2",
                currentScreen === 'SETTINGS' ? "text-[#00628c] border-[#00628c]" : "text-[#3f5e7d] border-transparent hover:text-[#00628c]"
              )}
            >
              Settings
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 relative">
          <div className="relative">
            <button 
              aria-label="View notifications"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowHelp(false);
                setShowProfile(false);
              }}
              className="p-2 text-[#00628c] hover:bg-blue-50 rounded-full transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 z-[60]"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-[#0c314e]">Notifications</h3>
                    <button className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Mark all as read</button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: 'Payment Successful', desc: 'Transaction #TXN-98229 completed.', time: '2m ago', icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
                      { title: 'Security Alert', desc: 'New login from Mumbai, India.', time: '1h ago', icon: <ShieldCheck size={14} className="text-amber-500" /> },
                      { title: 'System Update', desc: 'Gateway maintenance scheduled.', time: '5h ago', icon: <RefreshCw size={14} className="text-blue-500" /> }
                    ].map((n, i) => (
                      <div key={i} className="flex gap-3 p-2 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer group">
                        <div className="w-8 h-8 rounded-full bg-white border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                          {n.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0c314e] group-hover:text-blue-700">{n.title}</p>
                          <p className="text-[10px] text-[#3f5e7d] line-clamp-1">{n.desc}</p>
                          <p className="text-[9px] text-blue-400 mt-1">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              aria-label="Help and support"
              onClick={() => {
                setShowHelp(!showHelp);
                setShowNotifications(false);
                setShowProfile(false);
              }}
              className="p-2 text-[#00628c] hover:bg-blue-50 rounded-full transition-colors"
            >
              <HelpCircle size={20} />
            </button>

            <AnimatePresence>
              {showHelp && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 z-[60]"
                >
                  <h3 className="font-bold text-[#0c314e] mb-3">Help & Support</h3>
                  <div className="space-y-1">
                    {['Documentation', 'API Reference', 'Status Page', 'Contact Support'].map((item) => (
                      <button key={item} className="w-full text-left px-3 py-2 text-xs font-medium text-[#3f5e7d] hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all">
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-50">
                    <div className="bg-blue-50 p-3 rounded-xl">
                      <p className="text-[10px] text-[#00628c] font-bold mb-1 italic">Need immediate help?</p>
                      <button className="w-full bg-[#00628c] text-white py-2 rounded-lg text-[10px] font-bold hover:opacity-90 transition-opacity">
                        Chat with Support
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <div 
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
                setShowHelp(false);
              }}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-200 shadow-sm bg-blue-50 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              <User size={24} className="text-[#00628c]" />
            </div>

            <AnimatePresence>
              {showProfile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden z-[60]"
                >
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-white border-b border-blue-50">
                    <p className="text-xs font-bold text-[#0c314e]">Venkat Padimi (Merchant)</p>
                    <p className="text-[10px] text-[#3f5e7d]">skypay.merchant.v1@gmail.com</p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-bold uppercase tracking-wider">
                      <Verified size={8} /> Verified Merchant Node
                    </div>
                  </div>
                  <div className="p-2">
                    {[
                      { label: 'My Profile', icon: <User size={14} /> },
                      { label: 'Account Settings', icon: <Settings size={14} /> },
                      { label: 'Billing Details', icon: <CreditCard size={14} /> },
                      { label: 'API Keys', icon: <Lock size={14} /> },
                    ].map((item) => (
                      <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-[#3f5e7d] hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all">
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                    <div className="my-2 border-t border-blue-50"></div>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <XCircle size={14} />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer className="w-full border-t border-blue-100 bg-[#f3f7ff] mt-auto">
    <div className="flex flex-col md:flex-row justify-between items-center px-8 py-6 max-w-7xl mx-auto gap-4">
      <span className="text-[11px] font-medium tracking-wide uppercase text-[#3f5e7d]">
        © 2024 SkyPay Gateway. PCI-DSS Level 1 Certified.
      </span>
      <div className="flex gap-6">
        <a href="#" className="text-[11px] font-medium tracking-wide uppercase text-[#3f5e7d] hover:text-[#00628c]">Security</a>
        <a href="#" className="text-[11px] font-medium tracking-wide uppercase text-[#3f5e7d] hover:text-[#00628c]">Terms</a>
        <a href="#" className="text-[11px] font-medium tracking-wide uppercase text-[#3f5e7d] hover:text-[#00628c]">Privacy</a>
        <a href="#" className="text-[11px] font-medium tracking-wide uppercase text-[#3f5e7d] hover:text-[#00628c]">Contact</a>
      </div>
    </div>
  </footer>
);

// --- Transaction Flow Visualizer ---

const TransactionFlow = ({ currentStep }: { currentStep: FlowStep }) => {
  const steps: { key: FlowStep; label: string; icon: React.ReactNode }[] = [
    { key: 'USER', label: 'Customer', icon: <User size={20} /> },
    { key: 'MERCHANT', label: 'Website (Client)', icon: <Store size={20} /> },
    { key: 'GATEWAY', label: 'SkyPay Gateway', icon: <Cpu size={20} /> },
    { key: 'ISSUING_BANK', label: 'Issuing Bank (Issuer)', icon: <Wallet size={20} /> },
    { key: 'MERCHANT_BANK', label: 'Acquiring Bank', icon: <LayoutDashboard size={20} /> },
  ];

  const currentIdx = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 mb-8 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[600px]">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-3 relative z-10 w-24">
              <motion.div 
                animate={{ 
                  scale: currentStep === step.key ? 1.2 : 1,
                  backgroundColor: currentStep === step.key ? '#00628c' : '#ffffff',
                  color: currentStep === step.key ? '#ffffff' : '#3f5e7d'
                }}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2",
                  currentStep === step.key ? "border-[#00628c]" : "border-blue-100"
                )}
              >
                {step.icon}
                {currentStep === step.key && (
                  <motion.div 
                    layoutId="active-glow"
                    className="absolute inset-0 bg-[#00628c] blur-xl opacity-20 -z-10 rounded-full"
                  />
                )}
              </motion.div>
              <span className={cn(
                "text-[10px] font-bold text-center uppercase tracking-wider",
                currentStep === step.key ? "text-[#00628c]" : "text-[#3f5e7d]"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-[2px] bg-blue-100 mx-1 relative overflow-hidden">
                {currentIdx > index && (
                   <div className="absolute inset-0 bg-[#00628c]" />
                )}
                {currentIdx === index && (
                  <motion.div 
                    animate={{ left: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00628c] to-transparent w-1/2"
                  />
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('DASHBOARD');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [amount, setAmount] = useState(9900);
  const [amountInput, setAmountInput] = useState('9900');
  const [cardDetails, setCardDetails] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: ''
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [simulateSlowNetwork, setSimulateSlowNetwork] = useState(false);
  const [simulateGatewayTimeout, setSimulateGatewayTimeout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failureReason, setFailureReason] = useState('Insufficient funds in the issuing bank account.');
  const [showBackWarning, setShowBackWarning] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());
  const [userBalance, setUserBalance] = useState(85000); // Initial customer balance
  const [currentFlowStep, setCurrentFlowStep] = useState<FlowStep>('USER');
  const [bankProcessingStep, setBankProcessingStep] = useState(0); // 0: Idle, 1: Validation, 2: Balance Check, 3: Debit, 4: Done

  const maskedCard = maskCardNumber(cardDetails.number);
  const autoDeclineReason = getAutoDeclineReason(cardDetails.number, amount);

  // Handle simulated processing
  useEffect(() => {
    if (screen === 'PROCESSING') {
      setCurrentFlowStep('GATEWAY');
      const processingDelay = simulateSlowNetwork ? 6000 : 3000;
      if (simulateGatewayTimeout) {
        const timeoutTimer = setTimeout(() => {
          setFailureReason('Gateway timeout: no response received from issuing bank.');
          setScreen('FAILURE');
          setIsSubmitting(false);
          setCurrentFlowStep('USER');
        }, 5000);

        return () => clearTimeout(timeoutTimer);
      }

      const timer = setTimeout(() => {
        setScreen('BANK_SIMULATION');
        setCurrentFlowStep('ISSUING_BANK');
        setBankProcessingStep(1); // Start bank validation
      }, processingDelay);

      return () => clearTimeout(timer);
    }
  }, [screen, simulateSlowNetwork, simulateGatewayTimeout]);

  // Bank Processing Steps
  useEffect(() => {
    if (screen === 'BANK_SIMULATION' && bankProcessingStep > 0 && bankProcessingStep < 4) {
      const stepDelay = simulateSlowNetwork ? 2000 : 1200;
      const timer = setTimeout(() => {
        if (bankProcessingStep === 2 && autoDeclineReason) {
            // Stop at balance check if it's going to fail
            handleBankDecision(false, autoDeclineReason);
            return;
        }
        setBankProcessingStep(prev => prev + 1);
      }, stepDelay);
      return () => clearTimeout(timer);
    }
  }, [screen, bankProcessingStep, autoDeclineReason, simulateSlowNetwork]);

  // Removed autoDeclineTimer logic as it's now handled in the bankProcessingStep sequence

  useEffect(() => {
    const activityHandler = () => setLastActivityAt(Date.now());

    window.addEventListener('mousemove', activityHandler);
    window.addEventListener('keydown', activityHandler);
    window.addEventListener('click', activityHandler);

    return () => {
      window.removeEventListener('mousemove', activityHandler);
      window.removeEventListener('keydown', activityHandler);
      window.removeEventListener('click', activityHandler);
    };
  }, []);

  useEffect(() => {
    const timeoutTargets: Screen[] = ['CHECKOUT', 'PROCESSING', 'BANK_SIMULATION'];
    if (!timeoutTargets.includes(screen)) return;

    const interval = setInterval(() => {
      if (Date.now() - lastActivityAt > SESSION_TIMEOUT_MS) {
        setSessionMessage('Session expired due to inactivity. Please enter payment details again.');
        setScreen('CHECKOUT');
        setIsSubmitting(false);
        setShowBackWarning(false);
        setValidationErrors({});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, lastActivityAt]);

  useEffect(() => {
    const guardedScreens: Screen[] = ['PROCESSING', 'BANK_SIMULATION'];
    if (!guardedScreens.includes(screen)) return;

    window.history.pushState({ guard: true }, '', window.location.href);

    const popStateHandler = () => {
      setShowBackWarning(true);
      window.history.pushState({ guard: true }, '', window.location.href);
    };

    window.addEventListener('popstate', popStateHandler);
    return () => window.removeEventListener('popstate', popStateHandler);
  }, [screen]);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors: ValidationErrors = {};
    const normalizedCard = normalizeCardNumber(cardDetails.number);

    if (!cardDetails.name.trim()) {
      errors.name = 'Cardholder name is required.';
    }

    if (!isValidLuhn(normalizedCard)) {
      errors.number = 'Please enter a valid 16-digit card number.';
    }

    if (!isExpiryValid(cardDetails.expiry)) {
      errors.expiry = 'Please enter a valid, non-expired date (MM/YY).';
    }

    if (!/^\d{3,4}$/.test(cardDetails.cvv)) {
      errors.cvv = 'CVV must be 3 or 4 digits.';
    }

    if (!/^\d+$/.test(amountInput.trim())) {
      errors.amount = 'Amount must be numeric only (no symbols or special characters).';
    } else {
      const parsed = Number(amountInput);
      if (parsed === 0) {
        errors.amount = 'Amount must be greater than zero.';
      } else if (parsed > MAX_AMOUNT) {
        errors.amount = `Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString()}.`;
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormMessage('Please fix the highlighted fields and try again.');
      return;
    }

    setFormMessage(null);
    setSessionMessage(null);
    setAmount(Number(amountInput));
    setIsSubmitting(true);
    setScreen('PROCESSING');
    setCurrentFlowStep('MERCHANT');
  };

  const handleBankDecision = (approved: boolean, reason?: string) => {
    const newTxn: Transaction = {
      id: `#TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      customer: cardDetails.name || 'Anonymous Customer',
      maskedCard,
      amount: amount,
      status: approved ? 'Success' : 'Failed',
      initials: (cardDetails.name || 'AC').split(' ').map(n => n[0]).join('').toUpperCase(),
      color: approved ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
    };

    setTransactions([newTxn, ...transactions]);
    if (!approved) {
      setFailureReason(reason || 'Insufficient funds in the issuing bank account.');
      setCurrentFlowStep('USER');
    } else {
      setUserBalance(prev => prev - amount);
      setCurrentFlowStep('MERCHANT_BANK');
    }
    setIsSubmitting(false);
    setScreen(approved ? 'SUCCESS' : 'FAILURE');
    setBankProcessingStep(0);
  };

  const handleCancelFromBackWarning = () => {
    setShowBackWarning(false);
    setFailureReason('Transaction canceled by user via back navigation during processing.');
    setIsSubmitting(false);
    setScreen('FAILURE');
    setCurrentFlowStep('USER');
    setBankProcessingStep(0);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'DASHBOARD':
        return (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-8 py-10 space-y-10 w-full"
          >
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#0c314e] tracking-tight">Merchant Overview</h1>
                <p className="text-[#3f5e7d] mt-1">Monitor your business performance and revenue.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setScreen('CHECKOUT')}
                  className="px-5 py-2.5 bg-blue-50 text-[#00628c] rounded-xl font-medium hover:bg-blue-100 transition-colors active:scale-95"
                >
                  Go to Checkout
                </button>
                <button 
                  onClick={() => setScreen('CHECKOUT')}
                  className="px-6 py-2.5 bg-gradient-to-br from-[#00628c] to-[#34b5fa] text-white rounded-xl font-semibold shadow-lg shadow-blue-200 hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
                >
                  <LinkIcon size={18} />
                  Create Payment Link
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 relative overflow-hidden bg-[#00628c] text-white rounded-2xl p-8 flex flex-col justify-between min-h-[220px] shadow-xl shadow-blue-900/10">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 -mr-10 -mt-10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <span className="text-blue-200 font-medium text-sm tracking-widest uppercase">Total Revenue</span>
                  <h2 className="text-5xl font-bold mt-2">₹{transactions.filter(t => t.status === 'Success').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}</h2>
                </div>
                <div className="relative z-10 flex items-center gap-2 mt-4">
                  <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp size={16} />
                    <span className="text-sm font-semibold">12%</span>
                  </div>
                  <span className="text-blue-100/80 text-sm">vs last month</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 flex flex-col justify-between shadow-sm border border-blue-50">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">Success</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-[#0c314e]">{transactions.filter(t => t.status === 'Success').length}</h3>
                  <p className="text-[#3f5e7d] text-sm mt-1">Settled payments</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 flex flex-col justify-between shadow-sm border border-blue-50">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                    <XCircle size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">Failed</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-[#0c314e]">{transactions.filter(t => t.status === 'Failed').length}</h3>
                  <p className="text-[#3f5e7d] text-sm mt-1">Declined transactions</p>
                </div>
              </div>
            </div>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0c314e] tracking-tight">Recent Activity</h2>
                <button className="text-[#00628c] font-semibold text-sm hover:underline">View all</button>
              </div>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8fbff]">
                        <th className="px-6 py-4 text-[10px] font-bold text-[#3f5e7d] uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#3f5e7d] uppercase tracking-widest">Transaction ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#3f5e7d] uppercase tracking-widest">Customer</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#3f5e7d] uppercase tracking-widest">Card</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#3f5e7d] uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#3f5e7d] uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50/50">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-[#0c314e]">{txn.date}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-[#3f5e7d]">{txn.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold", txn.color)}>
                                {txn.initials}
                              </div>
                              <span className="text-sm font-medium text-[#0c314e]">{txn.customer}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-[#3f5e7d]">{txn.maskedCard}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold",
                              txn.status === 'Success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", txn.status === 'Success' ? "bg-emerald-700" : "bg-red-700")}></span>
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-[#0c314e]">₹{txn.amount.toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </motion.div>
        );

      case 'CHECKOUT':
        return (
          <motion.div 
            key="checkout"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-7xl w-full flex flex-col items-center px-8 py-12"
          >
            <div className="w-full mb-12 bg-white/50 border border-blue-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#00628c] flex items-center justify-center text-white shadow-lg">
                  <User size={32} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#00628c] uppercase tracking-widest">Simulating Actor: Customer</p>
                   <h2 className="text-xl font-bold text-[#0c314e]">Arjun Sharma (Cardholder)</h2>
                </div>
              </div>
              <div className="flex items-center gap-8 px-8 py-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-blue-50 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-1 bg-blue-100/50 rounded-bl-xl text-[8px] font-bold text-[#00628c] opacity-0 group-hover:opacity-100 transition-opacity">ISSUER VIEW</div>
                 <div className="text-center">
                    <p className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider mb-1">Available Balance</p>
                    <p className="text-2xl font-bold text-[#0c314e]">₹{userBalance.toLocaleString()}</p>
                 </div>
                 <div className="h-10 w-[1px] bg-blue-50"></div>
                 <div className="text-center">
                    <p className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider mb-1">Linked Card</p>
                    <p className="text-sm font-mono font-bold text-[#0c314e]">XXXX 9995</p>
                 </div>
              </div>
            </div>

            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-2">
                <p className="text-[#00628c] font-semibold tracking-wider text-sm uppercase">Secure Checkout</p>
                <h1 className="text-4xl lg:text-5xl font-extrabold text-[#0c314e] tracking-tight leading-tight">Complete your payment</h1>
              </div>
              <div className="bg-white rounded-2xl p-8 space-y-6 shadow-sm border border-blue-50">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[#3f5e7d] text-sm font-medium">Order Summary</span>
                    <h2 className="text-[#0c314e] font-bold text-lg">Premium Subscription</h2>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-[#0c314e]">₹{amount.toLocaleString()}</span>
                    <p className="text-[10px] text-[#3f5e7d]">One-time payment</p>
                  </div>
                </div>
                <div className="border-t border-blue-50 pt-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3f5e7d]">Invoice ID</span>
                    <span className="text-[#0c314e] font-semibold">INV-2024-8842</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3f5e7d]">Customer</span>
                    <span className="text-[#0c314e] font-semibold">alex.design@example.com</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3f5e7d]">Date</span>
                    <span className="text-[#0c314e] font-semibold">October 24, 2024</span>
                  </div>
                </div>
                <div className="bg-blue-50/50 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="text-[#00628c] shrink-0" size={18} />
                  <p className="text-[11px] leading-relaxed text-[#3f5e7d]">
                    Your transaction is protected by 256-bit SSL encryption. Payment data is never stored on our servers.
                  </p>
                </div>
              </div>
              <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#00628c] to-[#34b5fa] shadow-lg shadow-blue-200/50">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold tracking-[0.2em] opacity-40 text-xs">ATMOSPHERIC PRECISION</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/5 p-10 lg:p-12 relative overflow-hidden border border-blue-50">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00628c] to-[#34b5fa]"></div>
                <form onSubmit={handlePayment} className="space-y-8">
                  {(formMessage || sessionMessage) && (
                    <div className="space-y-2">
                      {sessionMessage && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm font-medium">
                          {sessionMessage}
                        </div>
                      )}
                      {formMessage && (
                        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
                          {formMessage}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#3f5e7d]">Amount (INR)</label>
                      <input
                        required
                        value={amountInput}
                        onChange={e => {
                          setAmountInput(e.target.value);
                          setValidationErrors(prev => ({ ...prev, amount: undefined }));
                          setSessionMessage(null);
                        }}
                        className={cn(
                          "w-full px-5 py-4 bg-[#f8fbff] border rounded-xl focus:ring-2 focus:ring-[#00628c] transition-all text-[#0c314e] placeholder:text-blue-200 font-medium",
                          validationErrors.amount ? "border-red-300" : "border-transparent"
                        )}
                        placeholder="9900"
                        type="text"
                        inputMode="numeric"
                      />
                      {validationErrors.amount && <p className="text-xs text-red-600 font-medium">{validationErrors.amount}</p>}
                      <p className="text-[11px] text-[#3f5e7d]">Allowed range: ₹1 to ₹{MAX_AMOUNT.toLocaleString()}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#3f5e7d]">Cardholder Name</label>
                      <input 
                        required
                        value={cardDetails.name}
                        onChange={e => {
                          setCardDetails({...cardDetails, name: e.target.value});
                          setValidationErrors(prev => ({ ...prev, name: undefined }));
                          setSessionMessage(null);
                        }}
                        className={cn(
                          "w-full px-5 py-4 bg-[#f8fbff] border rounded-xl focus:ring-2 focus:ring-[#00628c] transition-all text-[#0c314e] placeholder:text-blue-200 font-medium",
                          validationErrors.name ? "border-red-300" : "border-transparent"
                        )}
                        placeholder="Arjun Sharma" 
                        type="text"
                      />
                      {validationErrors.name && <p className="text-xs text-red-600 font-medium">{validationErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#3f5e7d]">Card Number</label>
                      <div className="relative">
                        <input 
                          required
                          value={cardDetails.number}
                          onChange={e => {
                            setCardDetails({...cardDetails, number: formatCardNumber(e.target.value)});
                            setValidationErrors(prev => ({ ...prev, number: undefined }));
                            setSessionMessage(null);
                          }}
                          className={cn(
                            "w-full px-5 py-4 bg-[#f8fbff] border rounded-xl focus:ring-2 focus:ring-[#00628c] transition-all text-[#0c314e] placeholder:text-blue-200 font-medium pr-14",
                            validationErrors.number ? "border-red-300" : "border-transparent"
                          )}
                          placeholder="0000 0000 0000 0000" 
                          type="text"
                          inputMode="numeric"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <CreditCard className="text-[#3f5e7d]" size={20} />
                        </div>
                      </div>
                      {validationErrors.number && <p className="text-xs text-red-600 font-medium">{validationErrors.number}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#3f5e7d]">Expiry Date</label>
                        <input 
                          required
                          value={cardDetails.expiry}
                          onChange={e => {
                            setCardDetails({...cardDetails, expiry: e.target.value});
                            setValidationErrors(prev => ({ ...prev, expiry: undefined }));
                            setSessionMessage(null);
                          }}
                          className={cn(
                            "w-full px-5 py-4 bg-[#f8fbff] border rounded-xl focus:ring-2 focus:ring-[#00628c] transition-all text-[#0c314e] placeholder:text-blue-200 font-medium text-center",
                            validationErrors.expiry ? "border-red-300" : "border-transparent"
                          )}
                          placeholder="MM/YY" 
                          type="text"
                        />
                        {validationErrors.expiry && <p className="text-xs text-red-600 font-medium">{validationErrors.expiry}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#3f5e7d] flex items-center justify-between">
                          CVV
                          <HelpCircle size={14} className="text-blue-200 cursor-help" />
                        </label>
                        <input 
                          required
                          value={cardDetails.cvv}
                          onChange={e => {
                            setCardDetails({...cardDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)});
                            setValidationErrors(prev => ({ ...prev, cvv: undefined }));
                            setSessionMessage(null);
                          }}
                          className={cn(
                            "w-full px-5 py-4 bg-[#f8fbff] border rounded-xl focus:ring-2 focus:ring-[#00628c] transition-all text-[#0c314e] placeholder:text-blue-200 font-medium text-center",
                            validationErrors.cvv ? "border-red-300" : "border-transparent"
                          )}
                          placeholder="***" 
                          type="password"
                          inputMode="numeric"
                        />
                        {validationErrors.cvv && <p className="text-xs text-red-600 font-medium">{validationErrors.cvv}</p>}
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-[#0c314e] uppercase tracking-wider">Test Simulation Controls</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 text-xs text-[#3f5e7d] font-medium">
                          <input
                            type="checkbox"
                            checked={simulateSlowNetwork}
                            onChange={e => setSimulateSlowNetwork(e.target.checked)}
                          />
                          Simulate slow network (TC015)
                        </label>
                        <label className="flex items-center gap-2 text-xs text-[#3f5e7d] font-medium">
                          <input
                            type="checkbox"
                            checked={simulateGatewayTimeout}
                            onChange={e => setSimulateGatewayTimeout(e.target.checked)}
                          />
                          Simulate gateway timeout (TC016)
                        </label>
                      </div>
                      <p className="text-[11px] text-[#3f5e7d] leading-relaxed">
                        Use test card 4000 0000 0000 0002 for blocked card (TC010), and 4000 0000 0000 9995 for low-balance decline (TC009).
                      </p>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-5 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3",
                      isSubmitting
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-br from-[#00628c] to-[#34b5fa] hover:shadow-blue-300 active:scale-[0.98]"
                    )}
                  >
                    <span>{isSubmitting ? 'Processing...' : `Pay ₹${amountInput || amount.toLocaleString()} Now`}</span>
                    <ArrowRight size={20} />
                  </button>
                  <div className="pt-8 border-t border-blue-50">
                    <div className="flex flex-wrap justify-center items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-bold tracking-wider uppercase">PCI-DSS Level 1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock size={16} />
                        <span className="text-[10px] font-bold tracking-wider uppercase">SSL Secure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Verified size={16} />
                        <span className="text-[10px] font-bold tracking-wider uppercase">Certified Trust</span>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </motion.div>
        );

      case 'PROCESSING':
        return (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 w-full px-8"
          >
            <TransactionFlow currentStep={currentFlowStep} />
            
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 mb-12">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-blue-100 rounded-full border-t-[#00628c]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="text-[#00628c]" size={32} />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-[#0c314e] mb-3 tracking-tight text-center">In-Flight Transaction: Routing to Issuing Bank...</h1>
              <p className="text-[#3f5e7d] text-lg text-center">Secure tunnel established. DO NOT refresh the page.</p>
              
              <div className="mt-12 w-full max-w-md bg-white rounded-2xl shadow-sm border border-blue-50 overflow-hidden">
                <div className="bg-blue-50 px-6 py-2 border-b border-blue-100 flex items-center justify-between">
                   <span className="text-[10px] font-bold text-[#00628c] uppercase tracking-widest">Gateway Mode</span>
                   <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00628c] animate-pulse" />
                      <span className="text-[10px] font-bold text-[#00628c]">SECURE_HANDSHAKE_IN_PROGRESS</span>
                   </div>
                </div>
                <div className="h-1.5 w-full bg-blue-50 relative overflow-hidden">
                  <motion.div 
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-[#00628c] to-[#34b5fa] w-1/2"
                  />
                </div>
                <div className="p-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#3f5e7d] uppercase tracking-wider">Merchant End</span>
                    <span className="font-semibold text-[#0c314e]">SkyPay Solutions</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-blue-50">
                    <span className="text-xs font-bold text-[#3f5e7d] uppercase tracking-wider">Reference ID</span>
                    <code className="text-sm font-mono text-[#00628c] bg-blue-50 px-2 py-0.5 rounded">SKY-9921-X8B</code>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-blue-50">
                    <span className="text-xs font-bold text-[#3f5e7d] uppercase tracking-wider">Masked Card</span>
                    <code className="text-sm font-mono text-[#00628c] bg-blue-50 px-2 py-0.5 rounded">{maskedCard}</code>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-blue-50">
                    <span className="text-xs font-bold text-[#3f5e7d] uppercase tracking-wider">Amount Authorized</span>
                    <span className="text-2xl font-bold text-[#0c314e]">₹{amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'BANK_SIMULATION':
        return (
          <motion.div 
            key="bank"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-8 py-8 w-full"
          >
            <div className="mb-12 flex flex-col items-center">
               <TransactionFlow currentStep={currentFlowStep} />
               <div className="text-center mt-4">
                  <p className="text-[10px] font-bold text-[#00628c] uppercase tracking-widest px-4 py-1 bg-blue-50 rounded-full inline-block">Issuing Bank Side Simulation</p>
                  <h1 className="text-4xl font-bold tracking-tight text-[#0c314e] mt-2">Architectural Clearing House</h1>
                  <p className="text-lg text-[#3f5e7d] font-medium">Core Banking Ledger (India Cluster)</p>
               </div>
            </div>

            <div className="grid grid-cols-12 gap-8 items-start">
              <div className="col-span-12 lg:col-span-8 space-y-8">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-blue-900/5 border border-white/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00628c]/5 rounded-bl-full flex items-center justify-center">
                    <Verified className="text-[#00628c]/20" size={64} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-10">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-[#3f5e7d] font-bold">Auth Request ID</span>
                      <h2 className="text-xl font-bold text-[#0c314e]">TXN-992-ALPHA-84-IN</h2>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-full flex items-center gap-2">
                        {bankProcessingStep > 0 && bankProcessingStep < 4 && <RefreshCw size={14} className="text-[#00628c] animate-spin" />}
                        <span className="text-xs font-bold text-[#00628c]">
                          {bankProcessingStep === 1 && 'VALIDATING ACCOUNT...'}
                          {bankProcessingStep === 2 && 'CHECKING BALANCE...'}
                          {bankProcessingStep === 3 && 'DEBITING CUSTOMER ACCOUNT...'}
                          {bankProcessingStep === 4 && (autoDeclineReason ? 'DECISION: DECLINE' : 'DECISION: READY FOR APPROVAL')}
                          {bankProcessingStep === 0 && 'PENDING REQUEST'}
                        </span>
                    </div>
                  </div>

                  <div className="mb-10 space-y-4">
                    <h3 className="text-xs font-bold text-[#3f5e7d] uppercase tracking-wider">Internal Workflow Progress</h3>
                    <div className="grid grid-cols-3 gap-2">
                       {[
                         { id: 1, label: 'Account Validation' },
                         { id: 2, label: 'Balance Check' },
                         { id: 3, label: 'Debit Ledger' }
                       ].map(s => (
                         <div key={s.id} className="space-y-2">
                           <div className={cn(
                             "h-1.5 rounded-full transition-all duration-500",
                             bankProcessingStep > s.id ? "bg-emerald-500" : bankProcessingStep === s.id ? "bg-[#00628c] animate-pulse" : "bg-blue-50"
                           )} />
                           <p className={cn(
                             "text-[9px] font-bold uppercase",
                             bankProcessingStep >= s.id ? "text-[#0c314e]" : "text-blue-200"
                           )}>{s.label}</p>
                         </div>
                       ))}
                    </div>
                  </div>

                  {autoDeclineReason && bankProcessingStep >= 2 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-8 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm font-medium flex items-center gap-3"
                    >
                      <XCircle size={18} className="shrink-0" />
                      <span>Security Flag: {autoDeclineReason}</span>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                     <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-widest mb-4">Customer Ledger Details</p>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-[#3f5e7d]">Customer Name</span>
                              <span className="text-sm font-bold text-[#0c314e]">Venkat Padimi</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-[#3f5e7d]">Old Balance</span>
                              <span className="text-sm font-bold text-[#0c314e]">₹{userBalance.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-[#3f5e7d]">Debit Amount</span>
                              <span className="text-sm font-bold text-red-600">- ₹{amount.toLocaleString()}</span>
                           </div>
                           <div className="pt-3 border-t border-blue-100 flex justify-between items-center">
                              <span className="text-xs font-bold text-[#3f5e7d]">Net Balance Preview</span>
                              <span className="text-lg font-bold text-[#00628c]">₹{(userBalance - amount).toLocaleString()}</span>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#3f5e7d] uppercase">Merchant Destination</span>
                          <div className="flex items-center gap-2">
                            <Store size={14} className="text-[#00628c]" />
                            <p className="font-bold text-[#0c314e] text-sm">SkyPay India (Node_99B)</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#3f5e7d] uppercase">VPA / Terminal</span>
                          <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-[#00628c]" />
                            <p className="font-bold text-[#0c314e] text-sm">skypay@axis</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#3f5e7d] uppercase">Payment Mode</span>
                          <div className="flex items-center gap-2">
                            <CreditCard size={14} className="text-[#00628c]" />
                            <p className="font-bold text-[#0c314e] text-sm">Credit (MasterCard)</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#3f5e7d] uppercase">Fraud Score (AI-04)</span>
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className={cn(autoDeclineReason ? "text-red-500" : "text-emerald-500")} />
                            <p className={cn("font-bold text-sm", autoDeclineReason ? "text-red-600" : "text-emerald-600")}>
                               {autoDeclineReason ? 'High Risk' : 'Low (0.02)'}
                            </p>
                          </div>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleBankDecision(true)}
                      disabled={Boolean(autoDeclineReason) || bankProcessingStep < 3}
                      className={cn(
                        "py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                        (autoDeclineReason || bankProcessingStep < 3)
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                          : "bg-gradient-to-br from-[#00628c] to-[#34b5fa] text-white shadow-xl shadow-blue-200 active:scale-[0.98]"
                      )}
                    >
                      {bankProcessingStep < 3 ? <RefreshCw size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                      {bankProcessingStep < 3 ? 'Preparing Settlement...' : 'Approve & Settle'}
                    </button>
                    <button 
                      onClick={() => handleBankDecision(false, autoDeclineReason || 'Transaction declined by bank authorization node.')}
                      className="bg-blue-50 text-[#00628c] py-5 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:bg-blue-100"
                    >
                      <XCircle size={24} />
                      Decline Settlement
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-blue-50 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#0c314e]">
                      <TrendingUp size={20} className="text-[#00628c]" />
                      Protocol Integrity
                    </h3>
                    <div className="space-y-4">
                      <div className="h-2 bg-blue-50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00628c] w-[99%] rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">
                        <span>Compliance Check</span>
                        <span className="text-[#00628c]">99.4% Secure</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-blue-50 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#0c314e]">
                      <MapPin size={20} className="text-[#00628c]" />
                      Geospatial Origin
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <MapPin className="text-[#00628c]" size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-[#0c314e]">Mumbai, MH</p>
                        <p className="text-[10px] text-[#3f5e7d] font-bold uppercase">IP: 103.1.2.10 (Verified)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl p-8 border border-blue-50 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 text-[#0c314e]">Settlement Rules</h3>
                  <div className="space-y-8">
                    <div className="flex gap-4">
                      <div className="mt-1 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-[#0c314e] text-sm">Customer Debit</p>
                        <p className="text-xs text-[#3f5e7d] leading-relaxed mt-1">Funds will be immediately locked in customer account pending gateway ack.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="mt-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <RefreshCw size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-[#0c314e] text-sm">Merchant Settlement</p>
                        <p className="text-xs text-[#3f5e7d] leading-relaxed mt-1">T+2 settlement initiated to Architectural Ledger nodal account.</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                      <div className="flex items-center gap-3 mb-2">
                        <Info size={16} className="text-[#00628c]" />
                        <p className="font-bold text-[#0c314e] text-xs">UML Sync Notice</p>
                      </div>
                      <p className="text-[10px] text-[#3f5e7d] leading-relaxed italic">This flow simulates the Activity Diagram and State Machine for 'Authorized' state transitions.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl overflow-hidden aspect-square relative group shadow-xl">
                  <img 
                    className="w-full h-full object-cover" 
                    src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                    alt="System Visual"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c314e]/90 to-transparent flex items-end p-8">
                    <div className="text-white">
                      <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mb-1">Architecture Trace</p>
                      <p className="text-xl font-bold">Encrypted Handshake Node (IN)</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        );

      case 'SUCCESS':
        return (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center py-12 px-6 w-full max-w-5xl"
          >
            <TransactionFlow currentStep={currentFlowStep} />

            <div className="relative mb-8 mt-4">
              <div className="absolute inset-0 bg-emerald-500 opacity-10 blur-3xl rounded-full scale-150"></div>
              <div className="relative h-24 w-24 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-100">
                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-600" size={48} />
                </div>
              </div>
            </div>

            <div className="text-center mb-10">
              <h1 className="text-5xl font-extrabold text-[#0c314e] tracking-tight mb-2">Payment Confirmed</h1>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                 Settlement Successful
              </div>
              <p className="text-[#3f5e7d] text-lg max-w-md mx-auto">Amount has been debited from your account and credited to SkyPay merchant pool.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-blue-50 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                   <LayoutDashboard size={120} />
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-12">
                   <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#3f5e7d] mb-2 block">Customer Account</span>
                      <p className="text-xs font-bold text-[#0c314e] mb-1">Debited Successfully</p>
                      <p className="text-2xl font-bold text-[#00628c]">₹{amount.toLocaleString()}</p>
                      <div className="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 inline-block">
                         <p className="text-[9px] font-bold text-[#3f5e7d] uppercase tracking-wider">New Balance</p>
                         <p className="text-sm font-bold text-[#0c314e]">₹{userBalance.toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#3f5e7d] mb-2 block">Merchant Side</span>
                      <p className="text-xs font-bold text-emerald-600 mb-1">Credited / Settlement Initiated</p>
                      <p className="text-2xl font-bold text-emerald-700">₹{amount.toLocaleString()}</p>
                      <div className="mt-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 inline-block">
                         <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Node Status</p>
                         <p className="text-sm font-bold text-emerald-800">SYNCED_OK</p>
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100">
                  <div className="h-10 w-10 rounded-xl bg-[#00628c] flex items-center justify-center shrink-0">
                    <Verified className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0c314e]">PCI-DSS Compliant Transaction</p>
                    <p className="text-[10px] text-[#3f5e7d]">Blockchain-verified receipt generated for TXN-123456</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-1 flex flex-col gap-6">
                <div className="bg-blue-50/30 p-8 rounded-[2.5rem] border border-blue-50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3f5e7d] mb-6">Execution Log</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">Reference ID</p>
                      <p className="font-bold text-[#0c314e] text-base">SKY-{(Math.random() * 1000).toFixed(0)}-TX-001</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Auth Code</p>
                            <p className="font-bold text-[#0c314e] text-xs">882941</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">RRN</p>
                            <p className="font-bold text-[#0c314e] text-xs">4288129990</p>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-blue-100">
                      <p className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">Time Stamp</p>
                      <p className="font-bold text-[#0c314e] text-sm">{new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-600 p-6 rounded-[2.5rem] shadow-lg shadow-emerald-200 flex items-center gap-4">
                  <ShieldCheck className="text-white shrink-0" size={24} />
                  <p className="text-xs font-bold text-white leading-tight">Funds successfully arrived at Merchant Gateway destination.</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
              <button 
                onClick={() => setScreen('DASHBOARD')}
                className="w-full sm:w-auto px-12 py-5 bg-[#0c314e] text-white font-bold rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-center"
              >
                Back to Merchant Dashboard
              </button>
              <button 
                onClick={() => setScreen('CUSTOMER_WALLET')}
                className="w-full sm:w-auto px-12 py-5 bg-gradient-to-br from-[#00628c] to-[#34b5fa] text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <Wallet size={20} />
                View Customer Wallet
              </button>
            </div>
          </motion.div>
        );

      case 'FAILURE':
        return (
          <motion.div 
            key="failure"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-3xl w-full space-y-8 px-4 py-12 flex flex-col items-center"
          >
            <TransactionFlow currentStep={currentFlowStep} />

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 mb-2 mt-4">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center shadow-xl shadow-red-200/50">
                  <XCircle className="text-red-600" size={40} />
                </div>
              </div>
              <h1 className="text-4xl font-extrabold text-[#0c314e] tracking-tight leading-tight">Payment Declined</h1>
              <p className="text-[#3f5e7d] text-lg">Transaction could not be authorized by the issuing bank.</p>
            </div>

            <div className="relative w-full max-w-lg">
              <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-blue-900/5 border border-blue-50">
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold tracking-wide uppercase text-[#3f5e7d] block mb-1">Reason for Failure</span>
                      <p className="text-red-600 font-bold text-xl">{failureReason}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold tracking-wide uppercase text-[#3f5e7d] block mb-1">Amount Refunded</span>
                      <p className="text-[#0c314e] font-bold text-2xl">₹0.00</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                     <ShieldCheck className="text-emerald-600" size={20} />
                     <p className="text-xs font-bold text-emerald-800">No debit performed. Your balance remains safe at ₹{userBalance.toLocaleString()}.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-blue-50">
                    <div>
                      <span className="text-[10px] font-bold tracking-wide uppercase text-[#3f5e7d] block mb-1">Transaction ID</span>
                      <p className="text-[#0c314e] font-bold text-sm font-mono">SKY-FAIL-XC99</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold tracking-wide uppercase text-[#3f5e7d] block mb-1">Trace Status</span>
                      <p className="text-red-600 font-bold text-sm tracking-widest uppercase">AUTH_REVOKED</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 -top-6 -right-6 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute -z-10 -bottom-6 -left-6 w-40 h-40 bg-red-50 rounded-full blur-3xl opacity-30"></div>
            </div>

            <div className="w-full max-w-lg space-y-4">
              <button 
                onClick={() => setScreen('CHECKOUT')}
                className="w-full bg-gradient-to-br from-[#00628c] to-[#34b5fa] text-white py-5 px-6 rounded-2xl font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
              >
                <RefreshCw size={20} />
                Try Another Method
              </button>
              <button 
                onClick={() => setScreen('CUSTOMER_WALLET')}
                className="w-full bg-white text-[#0c314e] py-5 px-6 rounded-2xl font-bold text-lg border border-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-sm hover:bg-blue-50"
              >
                <Wallet size={20} />
                Verify Wallet Balance
              </button>
            </div>
          </motion.div>
        );

      case 'CUSTOMER_WALLET':
        return (
          <motion.div 
            key="customer_wallet"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center py-12 px-6 w-full"
          >
            {/* Persona Label for Presentation */}
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-[#0c314e] text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-xl">
               <User size={14} /> Actor: Customer Side (Banking App Interface)
            </div>

            <div className="max-w-md w-full bg-slate-50 rounded-[3.5rem] shadow-2xl overflow-hidden border-[8px] border-[#0c314e] relative box-content">
              {/* Mobile Status Bar Mockup */}
              <div className="h-10 bg-[#0c314e] flex justify-between items-center px-8 text-white/50 text-[10px] font-bold">
                <span>9:41</span>
                <div className="flex gap-1.5 items-center">
                    <RefreshCw size={10} />
                    <div className="w-4 h-2 bg-white/30 rounded-sm"></div>
                </div>
              </div>

              {/* App Content */}
              <div className="bg-gradient-to-br from-[#0c314e] to-[#00628c] p-8 text-white">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <p className="text-blue-200 text-xs font-medium mb-1">Welcome back,</p>
                    <h2 className="text-2xl font-bold">Arjun Sharma</h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                    <User size={24} />
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 mb-4">
                  <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Personal Account Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tabular-nums">₹{userBalance.toLocaleString()}</span>
                    <span className="text-xs text-emerald-400 font-bold tracking-tight">PROTECTED</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                   <div className="flex-1 bg-white/5 py-4 rounded-2xl border border-white/10 flex flex-col items-center gap-1 group cursor-pointer hover:bg-white/10 transition-all">
                      <ArrowRight size={16} className="-rotate-45" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Pay</span>
                   </div>
                   <div className="flex-1 bg-white/5 py-4 rounded-2xl border border-white/10 flex flex-col items-center gap-1 group cursor-pointer hover:bg-white/10 transition-all">
                      <Download size={16} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Add</span>
                   </div>
                   <div className="flex-1 bg-white/5 py-4 rounded-2xl border border-white/10 flex flex-col items-center gap-1 group cursor-pointer hover:bg-white/10 transition-all">
                      <LayoutDashboard size={16} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">More</span>
                   </div>
                </div>
              </div>

              <div className="bg-white px-8 py-10 rounded-t-[3rem] -mt-8 min-h-[400px]">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-extrabold text-[#0c314e]">Recent Transactions</h3>
                  <button className="text-[10px] font-bold text-blue-600 uppercase">View All</button>
                </div>

                <div className="space-y-6">
                  {/* The Payment deduction entry */}
                  {amount > 0 && transactions[0]?.status === 'Success' && (
                    <motion.div 
                      key="latest_tx"
                      initial={{ background: 'rgba(255, 230, 230, 0)' }}
                      animate={{ background: 'rgba(255, 230, 230, 0.4)' }}
                      className="flex items-center justify-between p-4 -mx-4 rounded-2xl border border-red-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-red-100 text-red-600 flex items-center justify-center shadow-sm">
                          <Store size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0c314e]">SkyPay Online Merchant</p>
                          <p className="text-[9px] font-bold text-red-400 uppercase">Debit (Case Study Ref: TXN-44)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">-₹{amount.toLocaleString()}</p>
                        <p className="text-[9px] text-[#3f5e7d]">Just Now</p>
                      </div>
                    </motion.div>
                  )}

                  {[
                    { title: 'Local Mart Purchase', price: '₹2,100', date: 'Yesterday', icon: <Store size={18} />, color: 'bg-slate-50 text-slate-400' },
                    { title: 'Cloud Subscription', price: '₹499', date: 'Oct 23', icon: <Cpu size={18} />, color: 'bg-slate-50 text-slate-400' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between opacity-50 px-2">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.color)}>
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0c314e]">{item.title}</p>
                          <p className="text-[9px] text-[#3f5e7d] font-bold uppercase">{item.date}</p>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-[#0c314e]">-{item.price}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-12 bg-[#0c314e]/5 p-6 rounded-3xl border border-[#0c314e]/10">
                   <p className="text-[10px] text-[#0c314e] leading-relaxed font-bold italic">
                      SYSTEM NOTE: This screen confirms that the money has been successfully deducted from the customer's personal banking ledger.
                   </p>
                </div>
              </div>
              
              <div className="h-4 bg-white"></div>
            </div>

            <button 
              onClick={() => setScreen('DASHBOARD')}
              className="mt-10 px-10 py-5 bg-[#0c314e] text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
            >
              Back to Merchant View
            </button>
          </motion.div>
        );
      
      case 'REPORTS':
        return (
          <motion.div 
            key="reports"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl px-8 py-12"
          >
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[#0c314e] mb-2">Financial Reports</h1>
                <p className="text-[#3f5e7d]">Detailed analysis of your gateway performance.</p>
              </div>
              <button className="flex items-center gap-2 bg-white border border-blue-100 px-4 py-2 rounded-xl text-xs font-bold text-[#00628c] hover:bg-blue-50 transition-colors shadow-sm">
                <Download size={16} /> Export CSV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Gross Volume', value: '₹12,45,000', trend: '+12.5%', color: 'text-emerald-600' },
                { label: 'Net Revenue', value: '₹11,82,750', trend: '+10.2%', color: 'text-blue-600' },
                { label: 'Avg. Ticket Size', value: '₹2,450', trend: '-2.1%', color: 'text-amber-600' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                  <p className="text-xs font-bold text-[#3f5e7d] uppercase tracking-wider mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#0c314e] mb-1">{stat.value}</p>
                  <p className={stat.trend.startsWith('+') ? "text-[10px] font-bold text-emerald-500" : "text-[10px] font-bold text-amber-500"}>
                    {stat.trend} <span className="text-[#3f5e7d] font-normal">vs last month</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-blue-50 flex justify-between items-center">
                <h2 className="font-bold text-[#0c314e]">Volume Over Time</h2>
                <div className="flex gap-2">
                  {['1D', '1W', '1M', '1Y'].map(t => (
                    <button key={t} className={cn("px-3 py-1 rounded-lg text-[10px] font-bold transition-all", t === '1M' ? "bg-blue-600 text-white" : "text-[#3f5e7d] hover:bg-blue-50")}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="h-64 bg-gradient-to-b from-blue-50/30 to-white flex items-end justify-between px-8 pb-8 gap-2">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg relative group"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0c314e] text-white text-[8px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ₹{(h * 1000).toLocaleString()}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 'SETTINGS':
        return (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl px-8 py-12"
          >
            <h1 className="text-3xl font-bold text-[#0c314e] mb-8">Gateway Settings</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1 space-y-2">
                {['General', 'Security', 'API Keys', 'Webhooks', 'Team', 'Billing'].map((item, i) => (
                  <button 
                    key={item} 
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all",
                      i === 0 ? "bg-[#00628c] text-white shadow-lg shadow-blue-100" : "text-[#3f5e7d] hover:bg-blue-50"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="md:col-span-3 space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm">
                  <h2 className="text-lg font-bold text-[#0c314e] mb-6">General Information</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="business-name" className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">Business Name</label>
                        <input id="business-name" type="text" defaultValue="SkyPay Solutions" className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="support-email" className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">Support Email</label>
                        <input id="support-email" type="email" defaultValue="support@skypay.io" className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="business-description" className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider">Business Description</label>
                      <textarea id="business-description" rows={3} defaultValue="Next-generation payment gateway for modern enterprises." className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-[#0c314e]">API Configuration</h2>
                    <button className="text-xs font-bold text-blue-600 hover:underline">Regenerate Keys</button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider mb-1">Public Key</p>
                        <code className="text-xs font-mono text-[#00628c]">pk_live_51N...8x2z</code>
                      </div>
                      <button aria-label="Rotate public API key" className="p-2 hover:bg-white rounded-lg transition-colors text-[#00628c]"><RefreshCw size={14} /></button>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-[#3f5e7d] uppercase tracking-wider mb-1">Secret Key</p>
                        <code className="text-xs font-mono text-[#00628c]">sk_live_••••••••••••••••</code>
                      </div>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors text-[#00628c]"><Lock size={14} /></button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button className="px-6 py-3 rounded-xl text-sm font-bold text-[#3f5e7d] hover:bg-blue-50 transition-all">Discard Changes</button>
                  <button className="px-8 py-3 rounded-xl text-sm font-bold bg-[#00628c] text-white shadow-lg shadow-blue-100 hover:opacity-90 transition-all">Save Settings</button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f7ff] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar currentScreen={screen} onNavigate={setScreen} />
      
      <main className="flex-grow flex flex-col items-center">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showBackWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-[#0c314e]/40 backdrop-blur-sm flex items-center justify-center px-6"
          >
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-[#0c314e] mb-2">Leave Payment Flow?</h3>
              <p className="text-sm text-[#3f5e7d] mb-6">
                Going back now can cancel the in-flight payment and prevent duplicate transactions.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowBackWarning(false)}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-[#00628c] font-semibold"
                >
                  Continue Payment
                </button>
                <button
                  onClick={handleCancelFromBackWarning}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold"
                >
                  Cancel Payment
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
