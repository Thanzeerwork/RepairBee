import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rewardsApi, paymentsApi } from '../api/client';
import HoneycombScratchCard from '../components/HoneycombScratchCard';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Gift,
  Coins,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Award,
  Crown,
  Zap,
  ArrowRight,
  ShieldCheck,
  Truck,
  Plus,
  RefreshCw,
  QrCode,
  Users,
  ChevronRight,
  Flame,
  Star
} from 'lucide-react';

export default function RewardsHub() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [scratchCards, setScratchCards] = useState([]);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [referralTree, setReferralTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [profRes, cardsRes, treeRes, walletRes] = await Promise.all([
        rewardsApi.getLoyaltyProfile().catch(() => null),
        rewardsApi.getScratchCards().catch(() => ({ data: { cards: [], unclaimedCount: 0 } })),
        rewardsApi.getReferralTree().catch(() => null),
        paymentsApi.getWallet().catch(() => null),
      ]);

      if (profRes?.data) setProfile(profRes.data);
      if (cardsRes?.data) {
        setScratchCards(cardsRes.data.cards || []);
        setUnclaimedCount(cardsRes.data.unclaimedCount || 0);
      }
      if (treeRes?.data) setReferralTree(treeRes.data);
      if (walletRes?.data) {
        setWalletBalance(parseFloat(walletRes.data.balance || 0));
      } else if (profRes?.data?.user?.walletBalance) {
        setWalletBalance(profRes.data.user.walletBalance);
      }
    } catch (err) {
      console.error('Failed to load rewards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [isAuthenticated]);

  const handleCardClaimed = async (cardId) => {
    try {
      const res = await rewardsApi.claimScratchCard(cardId);
      if (res.data?.newWalletBalance !== undefined) {
        setWalletBalance(res.data.newWalletBalance);
      }
      // Reload profile metrics
      const profRes = await rewardsApi.getLoyaltyProfile();
      if (profRes?.data) setProfile(profRes.data);
      setUnclaimedCount(prev => Math.max(0, prev - 1));
      return res.data;
    } catch (err) {
      console.error('Failed to claim card:', err);
      throw err;
    }
  };

  const handleGenerateDemo = async () => {
    setGeneratingDemo(true);
    try {
      await rewardsApi.generateDemoCard();
      const cardsRes = await rewardsApi.getScratchCards();
      if (cardsRes?.data) {
        setScratchCards(cardsRes.data.cards || []);
        setUnclaimedCount(cardsRes.data.unclaimedCount || 0);
      }
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.5 } });
    } catch (err) {
      alert('Failed to generate demo card: ' + (err.message || 'Error'));
    } finally {
      setGeneratingDemo(false);
    }
  };

  const handleCopyCode = () => {
    const code = profile?.user?.referralCode || 'REPAIRBEE';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = `Hey! Get ₹${profile?.currentTier?.refereeDiscount || 100} OFF your doorstep electronics repair + free ISO cleanroom diagnostics with RepairBee using my invite code: ${profile?.user?.referralCode || 'BEE100'}. Book here: ${profile?.user?.referralLink || 'http://localhost:5174/book'}`;

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const tier = profile?.currentTier || {
    name: 'Worker Bee',
    icon: '🐝',
    cashMultiplier: '1.0x',
    referralBonus: 50,
    refereeDiscount: 100,
    warrantyDays: 30,
    courierSpeed: 'Standard Express Courier'
  };

  return (
    <div style={{ background: '#090d16', minHeight: '100vh', color: '#f8fafc', padding: '2rem 1rem 5rem' }}>
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Navigation Breadcrumb & Wallet Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
              <Link to="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Dashboard</Link>
              <span>/</span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Honeycomb Rewards</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🍯 Honeycomb Loyalty & Referral Hub</span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '0.5rem 1rem', textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Escrow Wallet Balance</span>
              <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>₹{walletBalance.toLocaleString()}</strong>
            </div>
            <button
              onClick={loadAllData}
              disabled={loading}
              title="Refresh Stats"
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#cbd5e1', padding: '0.65rem', cursor: 'pointer', display: 'flex' }}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ─── SECTION 1: TIER SHOWCASE & HONEY XP HERO ─────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #111c33 0%, #171e2e 50%, #1f1b2e 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '2rem',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.6)',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Glow */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            {/* Left: Tier Emblem & Badges */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>
                <Sparkles size={14} /> Official Honeycomb Loyalty Tier
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)'
                }}>
                  {tier.icon}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
                    {tier.name}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Active Multiplier: <strong style={{ color: '#10b981' }}>{tier.cashMultiplier} Cashback</strong>
                  </div>
                </div>
              </div>

              <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {tier.perkSummary}
              </p>

              {/* Tier Perk Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#e2e8f0', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} color="#10b981" /> {tier.warrantyDays}-Day Escrow Warranty
                </span>
                <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#e2e8f0', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Truck size={13} color="#38bdf8" /> {tier.courierSpeed}
                </span>
                <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#e2e8f0', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Coins size={13} color="#fbbf24" /> ₹{tier.referralBonus} Per Friend Invited
                </span>
              </div>
            </div>

            {/* Right: XP Progress Bar & Stats Grid */}
            <div style={{ background: '#0b1120', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Honeycomb Experience (XP)
                </span>
                <strong style={{ fontSize: '1rem', color: '#f59e0b' }}>
                  {profile?.user?.honeycombXP || 475} XP
                </strong>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '10px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div style={{
                  width: `${profile?.progress?.percent || 75}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #d97706, #f59e0b, #10b981)',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                <span>{tier.name}</span>
                {profile?.progress?.pointsNeeded > 0 ? (
                  <span style={{ color: '#38bdf8' }}>
                    {profile.progress.pointsNeeded} XP to {profile.progress.nextTier?.name} 👑
                  </span>
                ) : (
                  <span style={{ color: '#10b981' }}>Max Tier Unlocked 👑</span>
                )}
              </div>

              {/* Quick 3-Metric Counter */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                    ₹{profile?.stats?.totalLifetimeHoney?.toLocaleString() || 1450}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px' }}>
                    Lifetime Honey Won
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
                    {profile?.stats?.completedOrders || 0}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px' }}>
                    Repairs Serviced
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b' }}>
                    {profile?.stats?.completedReferrals || 0}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px' }}>
                    Active Referees
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: INTERACTIVE SCRATCH CARDS STUDIO ──────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={20} color="#f59e0b" />
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                  Honeycomb Scratch-Off Loot Studio
                </h2>
                {unclaimedCount > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#d97706', color: '#ffffff', padding: '2px 8px', borderRadius: '12px' }}>
                    {unclaimedCount} Unclaimed
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Rub the interactive cards to reveal guaranteed escrow cashback directly deposited into your wallet!
              </p>
            </div>

            <button
              onClick={handleGenerateDemo}
              disabled={generatingDemo}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Plus size={15} />
              <span>{generatingDemo ? 'Minting Scratch Card...' : '+ Request Bonus Scratch Card'}</span>
            </button>
          </div>

          {scratchCards.length === 0 ? (
            <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px dashed #334155', padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍯</div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>No Unscratched Cards Right Now</h3>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: '0.5rem auto 1rem', maxWidth: '400px' }}>
                Completed repairs and successful referrals earn you instant scratch cards. Click below to generate a bonus demo card!
              </p>
              <button
                onClick={handleGenerateDemo}
                style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Claim Free Honeycomb Card
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '1rem' }}>
              {scratchCards.map((card) => (
                <div key={card.id} style={{ flexShrink: 0 }}>
                  <HoneycombScratchCard card={card} onClaimed={handleCardClaimed} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── SECTION 3: 1-CLICK VIRAL WHATSAPP & SOCIAL REFERRAL PASS ──── */}
        <div style={{
          background: 'linear-gradient(135deg, #0b1120 0%, #111c33 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '2rem',
          marginBottom: '2.5rem',
          boxShadow: '0 15px 35px -10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                <Share2 size={13} /> Give ₹{tier.refereeDiscount} • Earn ₹{tier.referralBonus}
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                Invite Friends to RepairBee Escrow
              </h2>
              <p style={{ margin: '0.5rem 0 1.25rem', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
                Your friends get <strong>₹{tier.refereeDiscount} OFF</strong> their first doorstep repair, and you instantly receive <strong>₹{tier.referralBonus} directly into your Escrow Wallet</strong> the moment their repair passes doorstep delivery!
              </p>

              {/* Code Box */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{
                  background: '#090d16',
                  border: '2px dashed #f59e0b',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Code:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '0.08em' }}>
                    {profile?.user?.referralCode || 'RB-SARAH-9842'}
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  style={{
                    background: copied ? '#10b981' : '#1e293b',
                    color: '#ffffff',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Social Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleShareWhatsApp}
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)'
                  }}
                >
                  <Share2 size={16} />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  style={{
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <QrCode size={16} />
                  <span>Show QR Pass</span>
                </button>
              </div>
            </div>

            {/* Right: Visual Referral Card Pass Graphic */}
            <div style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              boxShadow: '0 12px 30px rgba(217, 119, 6, 0.35)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
                    RepairBee VIP Pass
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900 }}>
                    ₹{tier.refereeDiscount} Doorstep Coupon
                  </div>
                </div>
                <span style={{ fontSize: '28px' }}>🐝</span>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem', backdropFilter: 'blur(4px)' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Authorized Invitee Code:</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.08em', marginTop: '2px' }}>
                  {profile?.user?.referralCode || 'RB-SARAH-9842'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.9 }}>
                <span>✓ Valid on all mobile & laptop repairs</span>
                <span>ISO Cleanroom Certified</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 4: REFERRAL TREE & MILESTONES TRACK ──────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Users size={20} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Referral Honey Network & Milestones
            </h2>
          </div>

          {/* Milestones Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {(referralTree?.milestones || [
              { id: '1', name: 'First Honeycomb Spark', targetCount: 1, unlocked: true, rewardText: '₹50 Instant Wallet Credit', badge: '🌱' },
              { id: '3', name: 'Hive Master (3 Friends)', targetCount: 3, unlocked: false, rewardText: 'Scout Bee Upgrade + 1.5x Multiplier', badge: '⚡' },
              { id: '5', name: 'Queen’s Ambassador (5 Friends)', targetCount: 5, unlocked: false, rewardText: '₹250 Mega Bonus + 90-Day VIP Warranty', badge: '👑' }
            ]).map((ms, idx) => (
              <div
                key={idx}
                style={{
                  background: ms.unlocked ? 'rgba(16, 185, 129, 0.12)' : '#111c33',
                  border: ms.unlocked ? '1px solid #10b981' : '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '28px' }}>{ms.badge}</div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: ms.unlocked ? '#34d399' : '#ffffff' }}>
                    {ms.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: ms.unlocked ? '#6ee7b7' : '#94a3b8', marginTop: '2px' }}>
                    {ms.rewardText}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, marginTop: '4px', color: ms.unlocked ? '#10b981' : '#64748b', textTransform: 'uppercase' }}>
                    {ms.unlocked ? '✓ Unlocked & Claimed' : `Goal: ${ms.targetCount} Referrals`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Referrals List Table */}
          <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>Your Referred Friends Network ({referralTree?.totalReferrals || 0})</strong>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Completed: <strong style={{ color: '#10b981' }}>{referralTree?.completedCount || 0}</strong> • Pending: <strong style={{ color: '#f59e0b' }}>{referralTree?.pendingCount || 0}</strong>
              </span>
            </div>

            {(!referralTree?.referrals || referralTree.referrals.length === 0) ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No referrals logged yet. Share your invite link above to get your first ₹{tier.referralBonus} reward!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#111c33', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      <th style={{ padding: '10px 16px' }}>Friend</th>
                      <th style={{ padding: '10px 16px' }}>Invited Date</th>
                      <th style={{ padding: '10px 16px' }}>Repair Status</th>
                      <th style={{ padding: '10px 16px' }}>Your Reward</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralTree.referrals.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: 600 }}>
                          {r.referee_name || 'Friend'}
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.referee_email_masked}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                          {r.recent_order_desc ? (
                            <span>{r.recent_order_desc.substring(0, 30)}...</span>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Booking Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700 }}>
                          ₹{r.referrer_reward_amount}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: r.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: r.status === 'completed' ? '#34d399' : '#fbbf24'
                          }}>
                            {r.status === 'completed' ? '✓ Credited' : 'Pending First Order'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ─── SECTION 5: TIER COMPARISON MATRIX ─────────────────────────── */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#f59e0b" /> Honeycomb Tier Privileges & Matrix
          </h2>

          <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#111c33', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    <th style={{ padding: '12px 16px' }}>Privilege</th>
                    <th style={{ padding: '12px 16px', color: '#d97706' }}>🐝 Worker Bee (0–249 XP)</th>
                    <th style={{ padding: '12px 16px', color: '#0ea5e9' }}>⚡ Scout Bee (250–599 XP)</th>
                    <th style={{ padding: '12px 16px', color: '#f59e0b' }}>👑 Queen Bee (600+ XP)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { perk: 'Cashback Multiplier', w: '1.0x Base', s: '1.5x Accelerated', q: '2.0x Double Honeycomb' },
                    { perk: 'Referral Cash Bonus', w: '₹50 / Friend', s: '₹75 / Friend', q: '₹120 / Friend' },
                    { perk: 'Friend Welcome Discount', w: '₹100 OFF', s: '₹125 OFF', q: '₹150 OFF' },
                    { perk: 'Escrow Backed Warranty', w: '30 Days', s: '45 Days Extended', q: '90 Days VIP Gold Shield' },
                    { perk: 'Courier Dispatch Speed', w: 'Standard Express', s: 'Priority Runner Allocation', q: '1-Hour VIP Ultra Courier' },
                    { perk: 'Free Cleanroom Diagnostic', w: 'Standard', s: 'Priority Bay Bench', q: 'VIP Dedicated Master Tech' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0' }}>{row.perk}</td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{row.w}</td>
                      <td style={{ padding: '12px 16px', color: '#7dd3fc', fontWeight: 600 }}>{row.s}</td>
                      <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: 800 }}>{row.q}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* QR Code Pass Modal */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #334155', padding: '2rem', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>In-Person Device Scan</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.4rem 0 1.25rem' }}>
              Have your friend scan this QR code to claim ₹{tier.refereeDiscount} OFF instantly!
            </p>

            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.25rem' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(profile?.user?.referralLink || 'http://localhost:5174/book')}`}
                alt="Referral QR Code"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b', marginBottom: '1.25rem' }}>
              {profile?.user?.referralCode || 'RB-SARAH-9842'}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#cbd5e1', padding: '0.6rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Close QR Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
