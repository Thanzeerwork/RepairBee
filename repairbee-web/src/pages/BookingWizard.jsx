import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { productsApi, repairsApi, usersApi, promosApi, referralsApi, paymentsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LocationPickerMap from '../components/LocationPickerMap';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  Laptop,
  Tablet,
  Tv,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Clock,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Calendar,
  AlertCircle,
  Truck,
  Check,
  Camera,
  UploadCloud,
  X,
  Phone,
  PhoneCall,
  Info,
  Tag,
  Gift,
  Wallet,
  Percent,
  Sparkles,
  Award,
  Crown,
  Activity,
  Home,
  Briefcase,
  Plus,
  Star
} from 'lucide-react';

const WARRANTY_PLANS = [
  {
    id: 'standard',
    name: '30-Day Platform Standard',
    days: 30,
    price: 0,
    badge: null,
    accent: '#10b981',
    bg: '#f0fdf4',
    border: '#10b981',
    perks: [
      '100% Genuine OEM components',
      'Cleanroom bench certified',
      'Complimentary doorstep re-pickup'
    ]
  },
  {
    id: 'gold',
    name: 'Gold Shield Protection',
    days: 90,
    price: 299,
    badge: 'MOST POPULAR',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    accent: '#d97706',
    bg: '#fffdfa',
    border: '#f59e0b',
    perks: [
      '3x Extended 90-day coverage',
      'Priority cleanroom rework queue',
      'Zero-deductible courier re-service',
      'Free thermal re-paste inspection'
    ]
  },
  {
    id: 'diamond',
    name: 'Diamond VIP Shield',
    days: 180,
    price: 599,
    badge: 'MAX PROTECTION',
    badgeColor: '#701a75',
    badgeBg: '#fdf4ff',
    accent: '#c026d3',
    bg: '#faf5ff',
    border: '#d946ef',
    perks: [
      '6-Month comprehensive hardware guarantee',
      'Accidental screen drop grace period (50% off parts)',
      'VIP 2-hour courier dispatch',
      'Instant wallet refund guarantee'
    ]
  }
];

export default function BookingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, quickLoginCustomer } = useAuth();

  // Wizard Step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Backend Products & Issues
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [issues, setIssues] = useState([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [brandModel, setBrandModel] = useState('');
  const [description, setDescription] = useState('');

  // Customer Device Image Uploads (Issue Checklist - Step 2)
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileInputRef = useRef(null);

  // Scheduling (Express Doorstep Pickup only)
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState('02:00 PM – 04:00 PM');

  // Customer Contact & Address
  const [contactName, setContactName] = useState(user?.name || '');
  const [primaryPhone, setContactPhone] = useState(user?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('home');
  const [pickupCoords, setPickupCoords] = useState({ lat: 12.9716, lng: 77.5946 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Promo Code, Referral & Wallet Integration
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [walletBalance, setWalletBalance] = useState(null);
  const [selectedWarrantyTier, setSelectedWarrantyTier] = useState('standard');

  const currentWarrantyPlan = WARRANTY_PLANS.find(p => p.id === selectedWarrantyTier) || WARRANTY_PLANS[0];

  // Diagnostic Report Integration
  const [attachedDiagnostic, setAttachedDiagnostic] = useState(null);

  useEffect(() => {
    const diagIdParam = searchParams.get('diagId');
    if (diagIdParam) {
      try {
        const cached = localStorage.getItem('repairbee_diagnostic_report');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.certificateId === diagIdParam) {
            setAttachedDiagnostic(parsed);
            return;
          }
        }
      } catch {}
      setAttachedDiagnostic({
        certificateId: diagIdParam,
        healthScore: parseInt(searchParams.get('score') || '75', 10),
        recommendedService: searchParams.get('faults') === 'sound' ? 'Acoustic Speaker / Mic Service' : 'Screen & Digitizer Overhaul'
      });
    }
  }, [searchParams]);

  useEffect(() => {
    paymentsApi.getWallet()
      .then(res => {
        const bal = res?.data?.balance !== undefined ? res.data.balance : res?.balance;
        if (bal !== undefined) setWalletBalance(Number(bal));
      })
      .catch(() => {});
  }, [user]);

  // Fetch customer saved addresses
  useEffect(() => {
    usersApi.getAddresses()
      .then(res => {
        const list = res?.data || res || [];
        if (Array.isArray(list) && list.length > 0) {
          setSavedAddresses(list);
          // If no address selected yet, default to user's primary address
          const defaultAddr = list.find(a => a.is_default) || list[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            setAddressLine(defaultAddr.address_line);
            if (defaultAddr.city) setCity(defaultAddr.city);
            if (defaultAddr.pincode) setPincode(defaultAddr.pincode);
            if (defaultAddr.lat && defaultAddr.lng) {
              setPickupCoords({
                lat: parseFloat(Number(defaultAddr.lat).toFixed(6)),
                lng: parseFloat(Number(defaultAddr.lng).toFixed(6))
              });
            }
          }
        }
      })
      .catch(() => {
        // Unauthenticated or guest mode, ignore silently
      });
  }, [user]);

  const handleApplyPromo = async (codeToApply) => {
    const targetCode = (typeof codeToApply === 'string' ? codeToApply : promoCodeInput || '').trim().toUpperCase();
    if (!targetCode) {
      setPromoError('Please enter a coupon or referral code.');
      return;
    }
    setPromoLoading(true);
    setPromoError('');
    try {
      // 1. Try promo codes (FIRSTFIX, SAVE20 etc)
      try {
        const res = await promosApi.validatePromo(targetCode, 500);
        const data = res.data || res;
        const promoObj = data.promo || {};
        const isPercent = promoObj.discount_type === 'percent';
        const displayDiscount = isPercent
          ? `${promoObj.discount_value}% OFF`
          : `₹${Number(data.discount_amount || promoObj.discount_value || 100).toLocaleString()}`;

        setAppliedPromo({
          code: promoObj.code || targetCode,
          type: 'promo',
          discount: data.discount_amount || 100,
          label: isPercent ? `${promoObj.discount_value}% OFF (up to ₹${promoObj.max_discount_amount || 200})` : `Flat ₹${promoObj.discount_value} OFF`,
          note: `Coupon verified! ${displayDiscount} will be deducted from your final bench repair quote.`
        });
        setPromoCodeInput(promoObj.code || targetCode);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        return;
      } catch (promoErr) {
        // 2. If promo fails, try referral code
        try {
          const refRes = await referralsApi.applyCode(targetCode);
          const data = refRes.data || refRes;
          setAppliedPromo({
            code: targetCode,
            type: 'referral',
            discount: data.discount_amount || 100,
            label: `₹${data.discount_amount || 100} Referral Discount`,
            note: `Referral code applied! ₹${data.discount_amount || 100} friend discount will apply to your bench quote.`
          });
          setPromoCodeInput(targetCode);
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          return;
        } catch {
          throw promoErr;
        }
      }
    } catch (err) {
      setPromoError(err?.message || 'Invalid promo or referral code');
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError('');
  };

  // Fetch real backend products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productsApi.getProducts();
        let list = [];
        if (Array.isArray(res?.data)) {
          list = res.data;
        } else if (res?.data && typeof res.data === 'object') {
          list = Object.values(res.data).flat();
        }
        setProducts(list);
        if (list.length > 0) {
          const deviceQuery = searchParams.get('device');
          const productIdQuery = searchParams.get('productId');
          const matched = list.find(p => 
            (productIdQuery && p.id === productIdQuery) ||
            (deviceQuery && p.category?.toLowerCase() === deviceQuery?.toLowerCase()) || 
            (deviceQuery && (p.product_name || p.name)?.toLowerCase() === deviceQuery?.toLowerCase())
          ) || list[0];
          setSelectedProduct(matched);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    fetchProducts();
  }, [searchParams]);

  // Fetch real issues for selected product
  useEffect(() => {
    if (!selectedProduct) return;
    const fetchIssues = async () => {
      try {
        const res = await productsApi.getIssues(selectedProduct.id);
        const list = Array.isArray(res?.data) ? res.data : [];
        setIssues(list);
        const issueIdQuery = searchParams.get('issueId');
        if (issueIdQuery && list.some(i => i.id === issueIdQuery)) {
          setSelectedIssueIds([issueIdQuery]);
        } else if (list.length > 0) {
          setSelectedIssueIds([list[0].id]);
        }
      } catch (err) {
        console.error('Failed to load issues for product:', err);
      }
    };
    fetchIssues();
  }, [selectedProduct, searchParams]);

  // Sync user info if available
  useEffect(() => {
    if (user) {
      if (user.name) setContactName(user.name);
      if (user.phone) setContactPhone(user.phone);
    }
  }, [user]);

  // Load real saved addresses if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      usersApi.getAddresses().then(res => {
        const list = res?.data || [];
        setSavedAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find(a => a.is_default) || list[0];
          if (defaultAddr.address_line) setAddressLine(defaultAddr.address_line);
          if (defaultAddr.city) setCity(defaultAddr.city);
          if (defaultAddr.pincode) setPincode(defaultAddr.pincode);
          if (defaultAddr.lat && defaultAddr.lng) {
            setPickupCoords({ lat: parseFloat(defaultAddr.lat), lng: parseFloat(defaultAddr.lng) });
          }
        }
      }).catch(err => console.error('Failed to load user addresses:', err));
    }
  }, [isAuthenticated]);

  const toggleIssue = (issueId) => {
    if (selectedIssueIds.includes(issueId)) {
      if (selectedIssueIds.length > 1) {
        setSelectedIssueIds(selectedIssueIds.filter(id => id !== issueId));
      }
    } else {
      setSelectedIssueIds([...selectedIssueIds, issueId]);
    }
  };

  // Image Upload Handlers
  const handleImageUpload = (e) => {
    setError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - uploadedImages.length;
    if (remainingSlots <= 0) {
      setError('Maximum 5 device fault photos allowed.');
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    for (const file of filesToAdd) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (JPG, PNG, WEBP) are supported.');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be under 5MB.');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        setUploadedImages((prev) => {
          if (prev.length >= 5) return prev;
          return [
            ...prev,
            {
              file,
              dataUrl: uploadEvt.target.result,
              name: file.name,
              size: (file.size / 1024).toFixed(0) + ' KB',
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Step 1 Next: Brand & Model is strictly REQUIRED!
  const handleStep1Next = () => {
    setError('');
    if (!brandModel || brandModel.trim().length < 2) {
      setError('Brand name and exact model is required. Please specify your device model before continuing.');
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Next: At least one issue selected
  const handleStep2Next = () => {
    setError('');
    if (!selectedIssueIds || selectedIssueIds.length === 0) {
      setError('Please select at least one issue or diagnostic symptom to proceed.');
      return;
    }
    setCurrentStep(3);
  };

  // Step 3 Next: Service & Slot
  const handleStep3Next = () => {
    setError('');
    setCurrentStep(4);
  };

  // Step 4 Next: Name, Primary Phone (required 10 digits), Address & PIN
  const handleStep4Next = () => {
    setError('');
    if (!contactName || contactName.trim().length < 2) {
      setError('Please enter your full contact name.');
      return;
    }
    const cleanPrimary = primaryPhone.replace(/\D/g, '');
    if (!cleanPrimary || cleanPrimary.length < 10) {
      setError('Please enter a valid 10-digit primary phone number.');
      return;
    }
    if (secondaryPhone) {
      const cleanSecondary = secondaryPhone.replace(/\D/g, '');
      if (cleanSecondary.length > 0 && cleanSecondary.length < 10) {
        setError('Secondary phone number must be a valid 10-digit number (or left empty).');
        return;
      }
    }
    if (!addressLine || addressLine.trim().length < 5) {
      setError('Please enter your complete street address and apartment / building details.');
      return;
    }
    if (!pincode || pincode.trim().length < 6) {
      setError('Please enter a valid 6-digit PIN code.');
      return;
    }
    setCurrentStep(5);
  };

  // Submit booking to backend
  const handleSubmitBooking = async () => {
    setError('');
    setLoading(true);

    try {
      if (!brandModel || brandModel.trim().length < 2) {
        throw new Error('Device brand and exact model is strictly required.');
      }
      const cleanPrimary = primaryPhone.replace(/\D/g, '');
      if (!cleanPrimary || cleanPrimary.length < 10) {
        throw new Error('Please enter a valid 10-digit primary phone number.');
      }
      if (!addressLine || addressLine.trim().length < 5) {
        throw new Error('Please enter a complete street address.');
      }

      // If not logged in, perform quick demo customer login to ensure auth token exists
      if (!isAuthenticated) {
        const loginRes = await quickLoginCustomer();
        if (!loginRes.success) {
          throw new Error('Please sign in or use demo login to complete booking.');
        }
      }

      // If user requested to save this new address to their profile, save it now
      let resolvedAddressId = selectedAddressId;
      if (!resolvedAddressId && saveToProfile && addressLine && pincode) {
        try {
          const addrRes = await usersApi.addAddress({
            address_line: addressLine.trim(),
            city: city.trim() || 'Bangalore',
            pincode: pincode.trim(),
            state: 'Karnataka',
            label: newAddressLabel || 'home',
            lat: pickupCoords?.lat ? parseFloat(pickupCoords.lat) : undefined,
            lng: pickupCoords?.lng ? parseFloat(pickupCoords.lng) : undefined,
            is_default: savedAddresses.length === 0
          });
          const savedObj = addrRes?.data || addrRes;
          if (savedObj?.id) resolvedAddressId = savedObj.id;
        } catch (saveErr) {
          console.warn('Address profile save skipped:', saveErr);
        }
      }

      // 1. Submit repair request to backend with valid scheduled_at timestamp
      const scheduledTime = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const mediaUrls = uploadedImages.map((img) => img.dataUrl);

      const contactMeta = `[Primary: ${primaryPhone}${secondaryPhone ? `, Secondary: ${secondaryPhone}` : ''} | GPS: ${pickupCoords.lat}, ${pickupCoords.lng}]`;
      const diagMeta = attachedDiagnostic ? ` [Diagnostic Cert: ${attachedDiagnostic.certificateId} | Health Score: ${attachedDiagnostic.healthScore}/100]` : '';
      const fullDescription = `${brandModel}: ${description || 'Hardware inspection requested'} ${contactMeta}${diagMeta} (${instructions || 'Doorstep handover'})`;

      const repairPayload = {
        product_id: selectedProduct?.id,
        issue_ids: selectedIssueIds,
        description: fullDescription,
        order_type: 'scheduled',
        scheduled_at: scheduledTime,
        media_urls: mediaUrls,
        promo_code: appliedPromo?.code || undefined,
        warranty_tier: selectedWarrantyTier,
        warranty_days: currentWarrantyPlan.days,
        warranty_amount: currentWarrantyPlan.price,
        diagnostic_report: attachedDiagnostic || undefined,
        pickup_address_id: resolvedAddressId || undefined,
        delivery_address_id: resolvedAddressId || undefined,
      };

      const res = await repairsApi.createRepair(repairPayload);
      const createdOrder = res?.data || res;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Navigate to order tracking page
      setTimeout(() => {
        navigate(`/track/${createdOrder.id || 'new'}`);
      }, 1200);

    } catch (err) {
      console.error('Booking submission failed:', err);
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          const scheduledTime = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
          const mediaUrls = uploadedImages.map((img) => img.dataUrl);
          const contactMeta = `[Primary: ${primaryPhone}${secondaryPhone ? `, Secondary: ${secondaryPhone}` : ''} | GPS: ${pickupCoords.lat}, ${pickupCoords.lng}]`;
          const diagMeta = attachedDiagnostic ? ` [Diagnostic Cert: ${attachedDiagnostic.certificateId} | Health Score: ${attachedDiagnostic.healthScore}/100]` : '';
          const fullDescription = `${brandModel}: ${description || 'Hardware inspection requested'} ${contactMeta}${diagMeta} (${instructions || 'Doorstep handover'})`;

          const retryRes = await repairsApi.createRepair({
            product_id: selectedProduct?.id,
            issue_ids: selectedIssueIds,
            description: fullDescription,
            order_type: 'scheduled',
            scheduled_at: scheduledTime,
            media_urls: mediaUrls,
            promo_code: appliedPromo?.code || undefined,
            warranty_tier: selectedWarrantyTier,
            warranty_days: currentWarrantyPlan.days,
            warranty_amount: currentWarrantyPlan.price,
            diagnostic_report: attachedDiagnostic || undefined,
            pickup_address_id: selectedAddressId || undefined,
            delivery_address_id: selectedAddressId || undefined,
          });
          const createdOrder = retryRes?.data || retryRes;
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => { navigate(`/track/${createdOrder.id || 'new'}`); }, 1200);
          return;
        } catch (retryErr) {
          setError(retryErr?.message || 'Failed to submit repair booking. Please try again.');
          return;
        }
      }
      setError(err?.message || 'Failed to submit repair booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Device & Model' },
    { num: 2, title: 'Issue Checklist' },
    { num: 3, title: 'Service & Slot' },
    { num: 4, title: 'Address & Contact' },
    { num: 5, title: 'Review & Guarantee' },
  ];

  return (
    <div className="container" style={{ padding: '36px 20px 60px' }}>
      {/* Wizard Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', color: 'var(--secondary)' }}>
              Step-by-Step Diagnostic & Booking Wizard
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Certified doorstep handover with bank-grade escrow vault guarantee
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-emerald">
              <ShieldCheck size={14} />
              <span>100% Escrow Protected</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Hotline: 1800-REPAIR-BEE
            </span>
          </div>
        </div>

        {/* 5-Step Stepper Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          padding: '12px',
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {steps.map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                onClick={() => isDone && setCurrentStep(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: isCurrent ? 'var(--primary-light)' : '#ffffff',
                  border: isCurrent ? '1.5px solid var(--primary)' : '1px solid transparent',
                  cursor: isDone ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isDone ? 'var(--emerald)' : isCurrent ? 'var(--primary)' : '#e2e8f0',
                  color: isDone || isCurrent ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {isDone ? <Check size={14} /> : s.num}
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--primary)' : isDone ? 'var(--secondary)' : 'var(--text-muted)'
                }}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--rose-light)',
          border: '1px solid var(--rose-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--rose)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2-COLUMN WORKSPACE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '28px', alignItems: 'flex-start' }}>
        {/* LEFT COLUMN: WIZARD STAGES */}
        <div className="card" style={{ padding: '32px' }}>
          {/* STEP 1: DEVICE & MODEL */}
          {currentStep === 1 && (
            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--secondary)', marginBottom: '8px' }}>
                1. Select Device Category & Model
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Choose the hardware device requiring professional cleanroom diagnosis or repair.
              </p>

              {/* Diagnostic Certificate or Tester Launcher Banner */}
              {attachedDiagnostic ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={22} style={{ color: '#0891b2', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0e7490' }}>
                        🔬 Hardware Diagnostic Certificate Attached: {attachedDiagnostic.certificateId}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Health Score: <strong>{attachedDiagnostic.healthScore}/100</strong> • Service: {attachedDiagnostic.recommendedService || 'Hardware Inspection'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedDiagnostic(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Detach Certificate
                  </button>
                </div>
              ) : (
                <div style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={20} style={{ color: '#0284c7' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        Don't know what's broken on your device?
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Run our free 90-second hardware tester for dead pixels, touch digitizers & acoustic mics
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/diagnose"
                    style={{
                      padding: '7px 14px',
                      background: '#0284c7',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Run Free Diagnostic</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {products.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  const pName = p.product_name || p.name || 'Device';
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      style={{
                        padding: '16px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--primary-light)' : '#ffffff',
                        border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border-default)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: isSelected ? 'rgba(217, 119, 6, 0.2)' : '#f1f5f9',
                        color: isSelected ? 'var(--primary)' : 'var(--secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        {pName.toLowerCase().includes('phone') ? <Smartphone size={20} /> :
                         pName.toLowerCase().includes('laptop') ? <Laptop size={20} /> :
                         pName.toLowerCase().includes('tablet') ? <Tablet size={20} /> : <Tv size={20} />}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                        {pName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>
                        {p.category}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Specify Exact Brand & Model</span>
                  <span style={{ color: 'var(--rose)', fontWeight: 800 }}>* (Required)</span>
                </label>
                <input
                  id="brand-model-input"
                  type="text"
                  value={brandModel}
                  onChange={(e) => {
                    setBrandModel(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field"
                  style={{
                    border: !brandModel && error ? '1.5px solid var(--rose)' : undefined,
                    background: !brandModel && error ? 'rgba(239, 68, 68, 0.04)' : undefined
                  }}
                  placeholder="Enter brand & exact model name (e.g. Apple iPhone 14 Pro Max, Dell XPS 15, Samsung S23)..."
                  required
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Accurate model details ensure our cleanroom technicians prepare certified OEM components and testing jigs in advance.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button
                  id="wizard-step1-next-btn"
                  type="button"
                  onClick={handleStep1Next}
                  className="btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  <span>Continue to Issue Checklist</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DIAGNOSIS & ISSUE CHECKLIST */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--secondary)', marginBottom: '8px' }}>
                2. Select Reported Issues & Attach Photos
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Select all experienced symptoms. Master technicians conduct a multi-point bench diagnostic upon intake.
              </p>

              {/* Issue Checklist Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {issues.length === 0 ? (
                  <div style={{ padding: '16px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Loading diagnostic issue types...
                  </div>
                ) : (
                  issues.map((iss) => {
                    const isSelected = selectedIssueIds.includes(iss.id);
                    const issTitle = iss.issue_label || iss.name || 'Hardware Repair';
                    return (
                      <div
                        key={iss.id}
                        onClick={() => toggleIssue(iss.id)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'var(--primary-light)' : '#ffffff',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: isSelected ? 'none' : '2px solid #cbd5e1',
                            background: isSelected ? 'var(--primary)' : '#ffffff',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isSelected && <Check size={14} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--secondary)' }}>
                              {issTitle}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {iss.description || 'Inspection & replacement with OEM-grade parts'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-amber" style={{ fontSize: '11px', fontWeight: 600 }}>
                            ✓ Diagnostic Included
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Customer Device Image Upload */}
              <div style={{
                marginTop: '10px',
                marginBottom: '24px',
                padding: '18px',
                borderRadius: 'var(--radius-lg)',
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} style={{ color: 'var(--primary)' }} />
                    <span>Upload Device Photos / Fault Evidence (Optional, max 5)</span>
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: uploadedImages.length >= 5 ? 'var(--rose)' : 'var(--text-muted)' }}>
                    {uploadedImages.length} / 5 Photos Attached
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                  Upload photos of damaged glass, display glitches, ports, or errors. Helps the cleanroom bench team prepare exact components.
                </p>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  id="customer-fault-images-input"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />

                {/* Upload Trigger Dropzone */}
                {uploadedImages.length < 5 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-md)',
                      background: '#ffffff',
                      border: '1.5px dashed var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginBottom: uploadedImages.length > 0 ? '16px' : '0'
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) {
                        handleImageUpload({ target: { files: e.dataTransfer.files } });
                      }
                    }}
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'rgba(217, 119, 6, 0.1)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px'
                    }}>
                      <UploadCloud size={22} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)' }}>
                      Click to Browse or Drag & Drop Device Photos
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      PNG, JPG, or WEBP (Max 5MB each)
                    </div>
                  </div>
                )}

                {/* Uploaded Thumbnails Grid */}
                {uploadedImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                    {uploadedImages.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1.5px solid var(--border-default)',
                          background: '#ffffff',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          style={{
                            width: '100%',
                            height: '84px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          title="Remove photo"
                        >
                          <X size={12} />
                        </button>
                        <div style={{ padding: '4px 6px', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {img.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'block' }}>
                  Additional Notes or Symptoms (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  style={{ height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                  placeholder="e.g. dropped on concrete, touch works partially, headphone jack loose..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                <button type="button" onClick={() => setCurrentStep(1)} className="btn-outline">
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  id="wizard-step2-next-btn"
                  type="button"
                  onClick={handleStep2Next}
                  className="btn-primary"
                >
                  <span>Continue to Scheduling</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SERVICE METHOD & SCHEDULING (DOORSTEP PICKUP ONLY) */}
          {currentStep === 3 && (
            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--secondary)', marginBottom: '8px' }}>
                3. Doorstep Pickup Window
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Our assigned runner will arrive at your address with an RFID tamper-proof sealed bag.
              </p>

              {/* Express Doorstep Pickup Banner (Sole Service Option) */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  border: '2px solid var(--primary)',
                  marginBottom: '24px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Truck size={22} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--secondary)' }}>
                    Express Doorstep Pickup & Tamper-Sealed Transit
                  </span>
                  <span className="badge badge-emerald" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                    100% Free Service
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  A vetted RepairBee runner arrives directly at your doorstep with an RFID tamper-proof security pouch. Your device is securely sealed in your presence before transit to our certified cleanroom bench.
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--emerald-dark)', flexWrap: 'wrap' }}>
                  <span>✓ GPS Tracked Transit</span>
                  <span>✓ 100% Hardware Loss Insurance</span>
                  <span>✓ Zero Upfront Fee</span>
                </div>
              </div>

              {/* Date Selection */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px', display: 'block' }}>
                  Select Pickup Date
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Today', 'Tomorrow', 'Day After'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        background: selectedDate === d ? 'var(--secondary)' : '#ffffff',
                        color: selectedDate === d ? '#ffffff' : 'var(--secondary)',
                        border: '1px solid var(--border-default)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-Hour Time Slot */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px', display: 'block' }}>
                  Select 2-Hour Time Window
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['10:00 AM – 12:00 PM', '02:00 PM – 04:00 PM', '05:00 PM – 07:00 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: selectedSlot === slot ? 'var(--primary-light)' : '#ffffff',
                        border: selectedSlot === slot ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                        color: selectedSlot === slot ? 'var(--primary)' : 'var(--secondary)',
                        fontSize: '12px',
                        fontWeight: selectedSlot === slot ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                <button type="button" onClick={() => setCurrentStep(2)} className="btn-outline">
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  id="wizard-step3-next-btn"
                  type="button"
                  onClick={handleStep3Next}
                  className="btn-primary"
                >
                  <span>Continue to Address</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ADDRESS & CONTACT WITH PRIMARY / SECONDARY PHONE & MAP PIN */}
          {currentStep === 4 && (
            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--secondary)', marginBottom: '8px' }}>
                4. Doorstep Address, Contacts & Map Pin
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Specify your primary and alternate contact numbers and pin your building entrance on the map.
              </p>

              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Full Name</span>
                  <span style={{ color: 'var(--rose)', fontWeight: 800 }}>*</span>
                </label>
                <input
                  id="contact-name-input"
                  type="text"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field"
                  placeholder="Enter your full name..."
                  required
                />
              </div>

              {/* Primary & Secondary Phone Numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Primary Phone Number</span>
                    <span style={{ color: 'var(--rose)', fontWeight: 800 }}>* (Required)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="primary-phone-input"
                      type="tel"
                      value={primaryPhone}
                      onChange={(e) => {
                        setContactPhone(e.target.value);
                        if (error) setError('');
                      }}
                      className="input-field"
                      placeholder="Enter 10-digit mobile number..."
                      style={{ paddingLeft: '34px' }}
                      required
                    />
                    <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Used for runner arrival call & secure delivery release OTP.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Secondary Phone Number</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(Optional / WhatsApp)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="secondary-phone-input"
                      type="tel"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      className="input-field"
                      placeholder="Alternate contact / WhatsApp number..."
                      style={{ paddingLeft: '34px' }}
                    />
                    <PhoneCall size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Backup contact if primary line is busy.
                  </span>
                </div>
              </div>

              {/* Saved Address Quick-Select Cards (if customer has saved addresses) */}
              {savedAddresses.length > 0 && (
                <div style={{
                  marginBottom: '22px',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--border-default)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)' }} />
                      <span>Choose from Saved Doorstep Addresses ({savedAddresses.length})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (useCustomAddress) {
                          const first = savedAddresses.find(a => a.is_default) || savedAddresses[0];
                          setSelectedAddressId(first.id);
                          setUseCustomAddress(false);
                          setAddressLine(first.address_line);
                          if (first.city) setCity(first.city);
                          if (first.pincode) setPincode(first.pincode);
                          if (first.lat && first.lng) {
                            setPickupCoords({
                              lat: parseFloat(Number(first.lat).toFixed(6)),
                              lng: parseFloat(Number(first.lng).toFixed(6))
                            });
                          }
                        } else {
                          setSelectedAddressId(null);
                          setUseCustomAddress(true);
                          setAddressLine('');
                          setPincode('');
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {useCustomAddress ? (
                        <span>← Back to Saved Addresses</span>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>+ Enter Different Address</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!useCustomAddress && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        const isDefault = !!addr.is_default;
                        const labelIcon = addr.label === 'office' ? Briefcase : addr.label === 'other' ? MapPin : Home;
                        const LabelIconComponent = labelIcon;
                        const displayLabel = addr.label === 'office' ? 'Work / Office' : addr.label === 'other' ? 'Other' : 'Home';

                        return (
                          <div
                            key={addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr.id);
                              setUseCustomAddress(false);
                              setAddressLine(addr.address_line);
                              if (addr.city) setCity(addr.city);
                              if (addr.pincode) setPincode(addr.pincode);
                              if (addr.lat && addr.lng) {
                                setPickupCoords({
                                  lat: parseFloat(Number(addr.lat).toFixed(6)),
                                  lng: parseFloat(Number(addr.lng).toFixed(6))
                                });
                              }
                              if (error) setError('');
                            }}
                            style={{
                              padding: '14px',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'var(--primary-light)' : '#ffffff',
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                              boxShadow: isSelected ? '0 2px 8px rgba(245, 158, 11, 0.2)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: isSelected ? 'var(--primary)' : 'var(--secondary)'
                              }}>
                                <LabelIconComponent size={12} />
                                <span>{displayLabel}</span>
                                {isDefault && (
                                  <span style={{ fontSize: '10px', color: '#d97706', marginLeft: '4px', fontWeight: 600 }}>
                                    ★ Default
                                  </span>
                                )}
                              </div>

                              {isSelected ? (
                                <span style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: 'var(--primary)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Check size={12} />
                                </span>
                              ) : (
                                <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />
                              )}
                            </div>

                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', lineHeight: '1.3' }}>
                              {addr.address_line}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {addr.city}, PIN: {addr.pincode}
                            </div>

                            {addr.lat && addr.lng && (
                              <div style={{
                                marginTop: '8px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono)',
                                color: '#047857',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600
                              }}>
                                <CheckCircle2 size={10} />
                                <span>GPS: {Number(addr.lat).toFixed(4)}, {Number(addr.lng).toFixed(4)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Street Address & City / PIN */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Street Address & Apartment / Floor</span>
                  <span style={{ color: 'var(--rose)', fontWeight: 800 }}>*</span>
                </label>
                <input
                  id="address-line-input"
                  type="text"
                  value={addressLine}
                  onChange={(e) => {
                    setAddressLine(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-field"
                  placeholder="Flat / House No, Building, Street..."
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'block' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>PIN Code</span>
                    <span style={{ color: 'var(--rose)', fontWeight: 800 }}>*</span>
                  </label>
                  <input
                    id="pincode-input"
                    type="text"
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value);
                      if (error) setError('');
                    }}
                    className="input-field"
                    placeholder="e.g. 560001"
                    required
                  />
                </div>
              </div>

              {/* Save Address to Profile Checkbox (shown when entering custom address) */}
              {(!selectedAddressId || useCustomAddress) && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#f8fafc',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id="save-profile-addr-chk"
                      type="checkbox"
                      checked={saveToProfile}
                      onChange={(e) => setSaveToProfile(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <label htmlFor="save-profile-addr-chk" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--secondary)', cursor: 'pointer' }}>
                      💾 Save this address to my profile for 1-click future bookings
                    </label>
                  </div>

                  {saveToProfile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Save As:</span>
                      {[
                        { id: 'home', label: '🏠 Home' },
                        { id: 'office', label: '🏢 Work' },
                        { id: 'other', label: '📍 Other' },
                      ].map((lbl) => (
                        <button
                          key={lbl.id}
                          type="button"
                          onClick={() => setNewAddressLabel(lbl.id)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: newAddressLabel === lbl.id ? 700 : 500,
                            background: newAddressLabel === lbl.id ? 'var(--secondary)' : '#ffffff',
                            color: newAddressLabel === lbl.id ? '#ffffff' : 'var(--secondary)',
                            border: '1px solid var(--border-default)',
                            cursor: 'pointer'
                          }}
                        >
                          {lbl.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'block' }}>
                  Nearby Landmark / Special Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Opposite metro pillar 42, ring doorbell twice..."
                />
              </div>

              {/* Exact Pickup Pin on Map */}
              <div style={{ marginTop: '20px' }}>
                <LocationPickerMap
                  coordinates={pickupCoords}
                  onChange={setPickupCoords}
                  onAddressHint={(hint) => {
                    if (!instructions) setInstructions(`Near ${hint}`);
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                <button type="button" onClick={() => setCurrentStep(3)} className="btn-outline">
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  id="wizard-step4-next-btn"
                  type="button"
                  onClick={handleStep4Next}
                  className="btn-primary"
                >
                  <span>Review Booking & Guarantees</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & ESCROW GUARANTEE (NO ESTIMATED PRICE RANGE) */}
          {currentStep === 5 && (
            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--secondary)', marginBottom: '8px' }}>
                5. Booking Review & Escrow Vault Protection
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Review your pickup handover details. No payment is charged today.
              </p>

              {/* Escrow Guarantee Highlight Callout */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1.5px solid var(--emerald)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                marginBottom: '24px'
              }}>
                <ShieldCheck size={24} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '4px' }}>
                    Zero Upfront Charge • 100% Escrow Protection
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Our runner collects your hardware for cleanroom bench diagnostic inspection. Once evaluated by master technicians, a clear quote with photo evidence is sent directly to your portal for approval. You only fund escrow after reviewing the quote, and money is released only when you test the repaired device at delivery.
                  </div>
                </div>
              </div>

              {/* Booking Snapshot */}
              <div style={{ background: 'var(--bg-canvas)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Device & Model:</span>
                    <div style={{ fontWeight: 700, color: 'var(--secondary)', marginTop: '2px' }}>{brandModel}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Doorstep Pickup Window:</span>
                    <div style={{ fontWeight: 700, color: 'var(--secondary)', marginTop: '2px' }}>{selectedDate} ({selectedSlot})</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Pickup Address:</span>
                    <div style={{ fontWeight: 600, color: 'var(--secondary)', marginTop: '2px' }}>{addressLine}, {city} - {pincode}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Customer Contacts:</span>
                    <div style={{ fontWeight: 600, color: 'var(--secondary)', marginTop: '2px' }}>
                      {contactName} (Primary: {primaryPhone})
                      {secondaryPhone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Alt/WhatsApp: {secondaryPhone}</div>}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Exact Map Pin:</span>
                    <div style={{ fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <MapPin size={14} style={{ color: 'var(--primary)' }} />
                      <span>Latitude: {pickupCoords.lat}, Longitude: {pickupCoords.lng}</span>
                    </div>
                  </div>

                  {/* Uploaded Photos Preview */}
                  {uploadedImages.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-default)', paddingTop: '12px', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                        Attached Device Photos ({uploadedImages.length}):
                      </span>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {uploadedImages.map((img, idx) => (
                          <div key={idx} style={{ textAlign: 'center' }}>
                            <img
                              src={img.dataUrl}
                              alt="Fault photo"
                              style={{ width: '64px', height: '64px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-default)' }}
                            />
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {img.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Code & Referral Savings Block */}
              <div style={{
                background: appliedPromo ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-canvas)',
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                border: appliedPromo ? '1.5px solid var(--emerald)' : '1px solid var(--border-default)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={18} style={{ color: appliedPromo ? 'var(--emerald)' : 'var(--primary)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                      Have a Promo Code or Friend's Referral?
                    </span>
                  </div>
                  {appliedPromo && (
                    <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={12} />
                      Applied
                    </span>
                  )}
                </div>

                {appliedPromo ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--emerald)', fontSize: '15px' }}>
                          {appliedPromo.code}
                        </span>
                        <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                          {appliedPromo.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {appliedPromo.note}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--rose)',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      <X size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="promo-code-input"
                        type="text"
                        placeholder="Enter code (e.g. FIRSTFIX, SAVE20)"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-default)',
                          fontSize: '13px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          letterSpacing: '0.5px'
                        }}
                      />
                      <button
                        id="apply-promo-btn"
                        type="button"
                        disabled={promoLoading || !promoCodeInput.trim()}
                        onClick={() => handleApplyPromo()}
                        className="btn-primary"
                        style={{ padding: '10px 18px', fontSize: '13px' }}
                      >
                        {promoLoading ? 'Checking...' : 'Apply Code'}
                      </button>
                    </div>

                    {promoError && (
                      <div style={{ fontSize: '12px', color: 'var(--rose)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={13} />
                        <span>{promoError}</span>
                      </div>
                    )}

                    {/* Quick Suggestions Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Popular codes:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo('FIRSTFIX')}
                        style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px dashed var(--amber)',
                          borderRadius: '20px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#b45309',
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ FIRSTFIX (₹100 OFF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo('SAVE20')}
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px dashed #6366f1',
                          borderRadius: '20px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#4f46e5',
                          cursor: 'pointer'
                        }}
                      >
                        🏷️ SAVE20 (20% OFF)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Wallet Status Pill */}
              {walletBalance !== null && walletBalance > 0 && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wallet size={18} style={{ color: '#6366f1' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)' }}>
                        RepairBee Wallet: ₹{Number(walletBalance).toLocaleString('en-IN')} Available
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Can be applied to deduct directly from your repair quote escrow deposit.
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                    Ready for Checkout
                  </span>
                </div>
              )}

              {/* Extended Device Protection Plan Picker */}
              <div style={{
                marginBottom: '28px',
                background: '#ffffff',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} style={{ color: currentWarrantyPlan.accent }} />
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--secondary)' }}>
                      Select Platform Protection & Warranty Shield
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Backed by RepairBee Escrow Guarantee
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {WARRANTY_PLANS.map((plan) => {
                    const isSelected = selectedWarrantyTier === plan.id;
                    return (
                      <div
                        key={plan.id}
                        id={`warranty-plan-${plan.id}`}
                        onClick={() => setSelectedWarrantyTier(plan.id)}
                        style={{
                          borderRadius: '12px',
                          border: isSelected ? `2px solid ${plan.border}` : '1.5px solid var(--border-default)',
                          background: isSelected ? plan.bg : '#ffffff',
                          padding: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: isSelected ? `0 6px 16px ${plan.border}30` : 'none'
                        }}
                      >
                        {plan.badge && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '12px',
                            background: plan.badgeBg,
                            color: plan.badgeColor,
                            fontSize: '9px',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            border: `1px solid ${plan.border}`,
                            letterSpacing: '0.5px'
                          }}>
                            {plan.badge}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--secondary)' }}>
                              {plan.name}
                            </div>
                            <div style={{ fontSize: '11px', color: plan.accent, fontWeight: 700, marginTop: '2px' }}>
                              {plan.days} Days Platform Coverage
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: isSelected ? plan.accent : 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                              {plan.price === 0 ? 'FREE' : `+₹${plan.price}`}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          {plan.perks.map((perk, pIdx) => (
                            <div key={pIdx} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.3' }}>
                              <Check size={12} style={{ color: plan.accent, marginTop: '2px', flexShrink: 0 }} />
                              <span>{perk}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
                <button type="button" onClick={() => setCurrentStep(4)} className="btn-outline">
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  id="wizard-submit-btn"
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitBooking}
                  className="btn-primary"
                  style={{ padding: '14px 28px', fontSize: '15px' }}
                >
                  <Lock size={16} />
                  <span>{loading ? 'Scheduling Doorstep Runner...' : 'Confirm & Schedule Doorstep Pickup'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STICKY ESCROW SUMMARY CARD (NO ESTIMATED PRICE RANGE) */}
        <div style={{ position: 'sticky', top: '90px' }}>
          <div className="card" style={{ padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--secondary)' }}>
                Live Booking Summary
              </div>
              <span className="badge badge-amber">
                Escrow Protected
              </span>
            </div>

            {/* Selected Device */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Smartphone size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                  {brandModel || (selectedProduct?.product_name || selectedProduct?.name || 'Selected Device')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Category: {selectedProduct?.category || selectedProduct?.product_name || 'Hardware'}
                </div>
              </div>
            </div>

            {/* Transparent Zero-Upfront Line items (No Estimated Range) */}
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Bench Multi-point Check:</span>
                <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>FREE (₹0)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Doorstep Runner Transit:</span>
                <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>FREE (₹0)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tamper RFID Pouch:</span>
                <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>INCLUDED</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Workshop Repair Quote:</span>
                <span className="badge badge-blue" style={{ fontSize: '10px' }}>
                  Sent after diagnostic
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Protection Plan:</span>
                <span style={{ fontWeight: 700, color: currentWarrantyPlan.price > 0 ? currentWarrantyPlan.accent : 'var(--emerald)', fontSize: '12px' }}>
                  {currentWarrantyPlan.price > 0 ? `${currentWarrantyPlan.name} (+₹${currentWarrantyPlan.price})` : '30-Day Standard (FREE)'}
                </span>
              </div>
              {appliedPromo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={12} />
                    <span>Promo ({appliedPromo.code}):</span>
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--emerald)' }}>
                    -{appliedPromo.label}
                  </span>
                </div>
              )}
            </div>

            <div style={{
              borderTop: '1.5px dashed var(--border-default)',
              marginTop: '14px',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)' }}>Due Today at Handover:</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Zero upfront risk</div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                ₹0.00
              </div>
            </div>

            {/* Guarantees Box */}
            <div style={{
              marginTop: '18px',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} style={{ color: currentWarrantyPlan.accent }} />
                <span>{currentWarrantyPlan.name} ({currentWarrantyPlan.days} Days) Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} style={{ color: 'var(--primary)' }} />
                <span>Free cancellation anytime before courier pickup</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} style={{ color: '#6366f1' }} />
                <span>Escrow locked only upon your quote approval</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
