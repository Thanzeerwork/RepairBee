import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi, shopsApi, ratingsApi } from '../api/client';
import {
  Smartphone,
  Laptop,
  Tablet,
  Tv,
  CheckCircle2,
  ShieldCheck,
  Lock,
  ArrowRight,
  Clock,
  Award,
  Star,
  Zap,
  Building,
  RefreshCw
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  // Instant Estimator State (Live from backend)
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [shops, setShops] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map icon dynamically based on product name or category
  const getProductIcon = (name = '', cat = '') => {
    const text = (name + ' ' + cat).toLowerCase();
    if (text.includes('laptop') || text.includes('mac') || text.includes('desktop')) return Laptop;
    if (text.includes('tablet') || text.includes('ipad')) return Tablet;
    if (text.includes('tv') || text.includes('appliance') || text.includes('ac') || text.includes('fridge')) return Tv;
    return Smartphone;
  };

  // Load live products & shops
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [prodRes, shopRes] = await Promise.all([
          productsApi.getProducts(),
          shopsApi.getShops()
        ]);

        let prodList = [];
        if (Array.isArray(prodRes?.data)) {
          prodList = prodRes.data;
        } else if (prodRes?.data && typeof prodRes.data === 'object') {
          prodList = Object.values(prodRes.data).flat();
        }
        setProducts(prodList);
        if (prodList.length > 0) {
          setSelectedProduct(prodList[0]);
        }

        const shopList = shopRes?.data || [];
        setShops(shopList);

        // Fetch live reviews for verified shop if available
        if (shopList.length > 0) {
          try {
            const revRes = await ratingsApi.getShopReviews(shopList[0].id);
            const rList = revRes?.data?.reviews || (Array.isArray(revRes?.data) ? revRes.data : []);
            setReviews(rList);
          } catch (e) {
            console.error('Failed to load shop reviews:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  // Fetch real issues whenever selectedProduct changes
  useEffect(() => {
    if (!selectedProduct) return;
    const loadIssues = async () => {
      try {
        const res = await productsApi.getIssues(selectedProduct.id);
        const list = Array.isArray(res?.data) ? res.data : [];
        setIssues(list);
        if (list.length > 0) {
          setSelectedIssue(list[0]);
        } else {
          setSelectedIssue(null);
        }
      } catch (err) {
        console.error('Failed to load issues for product:', err);
      }
    };
    loadIssues();
  }, [selectedProduct]);

  const handleStartBooking = () => {
    if (selectedProduct && selectedIssue) {
      navigate(`/book?productId=${selectedProduct.id}&issueId=${selectedIssue.id}`);
    } else if (selectedProduct) {
      navigate(`/book?productId=${selectedProduct.id}`);
    } else {
      navigate('/book');
    }
  };

  // Price estimate range calculation
  const getEstimatedRange = (prod, iss) => {
    if (!iss) return '₹999 – ₹2,499';
    const label = iss.issue_label?.toLowerCase() || '';
    if (label.includes('screen') || label.includes('display')) return '₹1,499 – ₹2,899';
    if (label.includes('battery')) return '₹899 – ₹1,699';
    if (label.includes('water') || label.includes('liquid')) return '₹1,200 – ₹2,400';
    if (label.includes('charging') || label.includes('port')) return '₹699 – ₹1,299';
    if (label.includes('speaker') || label.includes('mic')) return '₹599 – ₹1,199';
    return '₹999 – ₹2,200';
  };

  const primaryShop = shops.length > 0 ? shops[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
      {/* HERO SECTION WITH INSTANT ESTIMATOR */}
      <section style={{
        padding: '50px 0 30px',
        background: 'radial-gradient(circle at 50% 10%, rgba(217, 119, 6, 0.08) 0%, rgba(248, 250, 255, 1) 70%)',
        borderBottom: '1px solid var(--border-default)'
      }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '40px',
          alignItems: 'center'
        }}>
          {/* Left Hero Pitch */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: '#fef3c7',
              color: '#b45309',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              <Zap size={14} />
              <span>⚡ ZERO-RISK DOORSTEP TECH REPAIRS • ESCROW BACKED</span>
            </div>

            <h1 style={{
              fontSize: '44px',
              fontWeight: 800,
              color: 'var(--secondary)',
              letterSpacing: '-0.03em',
              lineHeight: '1.15',
              marginBottom: '18px'
            }}>
              Doorstep Electronics Repair With{' '}
              <span style={{
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Escrow Protection
              </span>
            </h1>

            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px', maxWidth: '520px' }}>
              Vetted technicians diagnose and fix your smartphones, laptops, and tablets with zero upfront payment risk. Your money is locked in our escrow vault and only released when you inspect and confirm delivery.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--secondary)', fontWeight: 500 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--emerald)' }} />
                <span>Free Doorstep Pickup & Bench Inspection in 30 minutes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--secondary)', fontWeight: 500 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--emerald)' }} />
                <span>100% Escrow Vault Guarantee: zero payment before signoff</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--secondary)', fontWeight: 500 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--emerald)' }} />
                <span>30-Day Platform Warranty with free rework or full refund</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button onClick={handleStartBooking} className="btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }}>
                <span>Book Free Doorstep Pickup</span>
                <ArrowRight size={16} />
              </button>
              <a href="#how-it-works" className="btn-outline" style={{ padding: '14px 22px', fontSize: '14px' }}>
                How Escrow Works
              </a>
            </div>
          </div>

          {/* Right Floating Interactive Estimator Card (Stitch Screen 1) */}
          <div className="card" style={{
            padding: '28px',
            boxShadow: 'var(--shadow-xl)',
            border: '1.5px solid var(--border-default)',
            background: '#ffffff',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-default)',
              paddingBottom: '14px',
              marginBottom: '18px'
            }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--secondary)' }}>
                  Instant Repair Price Estimator
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Live catalog from verified workshop network
                </div>
              </div>
              <span className="badge badge-amber">
                <Lock size={12} />
                <span>Escrow Backed</span>
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="live-pulse" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '12px' }}>Loading live workshop repair catalog...</div>
              </div>
            ) : (
              <>
                {/* Step 1: Device Category Selector */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    1. Select Device
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {products.slice(0, 4).map((d) => {
                      const Icon = getProductIcon(d.product_name, d.category);
                      const isSelected = selectedProduct?.id === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedProduct(d)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'var(--primary-light)' : '#ffffff',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Icon size={20} style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }} />
                          <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                            {d.product_name || d.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Issue Symptom Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    2. Select Reported Issue
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {issues.slice(0, 4).map((iss) => {
                      const isSelected = selectedIssue?.id === iss.id;
                      return (
                        <div
                          key={iss.id}
                          onClick={() => setSelectedIssue(iss)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? '#fffdfa' : '#ffffff',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-default)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid var(--primary)' : '2px solid #cbd5e1'
                            }}></div>
                            <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--secondary)' : 'var(--text-secondary)' }}>
                              {iss.issue_label}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ~30 mins bench triage
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Diagnostic & Escrow Info Box (No Estimated Price Range) */}
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  color: '#ffffff',
                  marginBottom: '18px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Cleanroom Bench Inspection
                    </span>
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                      100% Free Intake
                    </span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                    ₹0 Upfront • Free Doorstep Pickup
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: '1.4' }}>
                    Official quote provided after precision bench diagnosis. Payment held safely in escrow only after your approval.
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleStartBooking}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                >
                  <span>Schedule Free Doorstep Pickup →</span>
                </button>

                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  🔒 Payment held in bank escrow until you test and release with PIN.
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="container">
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '12px' }}>How RepairBee Works</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            Experience hassle-free electronics repair with complete financial escrow safety from start to finish.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }}>
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              marginBottom: '14px'
            }}>
              1
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Book Online & Select Fault</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Select your device fault from the live catalog and pick a convenient 2-hour doorstep pickup window.
            </p>
          </div>

          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--blue-light)',
              color: 'var(--blue)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              marginBottom: '14px'
            }}>
              2
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Tamper-Sealed Pickup</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Our vetted delivery runner secures your device in a barcoded tamper-evident security bag right at your doorstep.
            </p>
          </div>

          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--emerald-light)',
              color: 'var(--emerald)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              marginBottom: '14px'
            }}>
              3
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Bench Repair & Quote Approval</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Master technicians conduct precision diagnostics. You approve the final quote on your phone before any work starts.
            </p>
          </div>

          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#b45309',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              marginBottom: '14px'
            }}>
              4
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Delivery & Escrow Release</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Delivered back to your door. Test touch, screen, and battery. Once 100% satisfied, confirm delivery to release funds.
            </p>
          </div>
        </div>
      </section>

      {/* STATS BANNER */}
      <section style={{ background: '#0f172a', padding: '40px 0', color: '#ffffff' }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              100%
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Escrow Protection Guarantee
            </div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              Level 3
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Cleanroom Certified Workshop Hubs
            </div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {primaryShop?.avg_rating ? `${Number(primaryShop.avg_rating).toFixed(1)} / 5.0` : '5.0 / 5.0'}
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              {primaryShop?.shop_name || 'Verified Workshop'} Rating
            </div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
              30 Days
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Money-Back Platform Warranty
            </div>
          </div>
        </div>
      </section>

      {/* VERIFIED CUSTOMER TESTIMONIALS & WORKSHOP CREDENTIALS */}
      <section className="container">
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 36px' }}>
          <h2 style={{ fontSize: '30px', marginBottom: '10px' }}>Verified Workshop & Customer Feedback</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Real reviews and credentials from device owners and certified workshop partners.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {/* Live Review from PostgreSQL */}
          {reviews.map((rev, idx) => (
            <div key={idx} className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
                  {Array.from({ length: rev.stars || 5 }).map((_, sIdx) => (
                    <Star key={sIdx} size={16} fill="#f59e0b" />
                  ))}
                </div>
                <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                  ✓ Verified Escrow Release
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                "{rev.review_text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                  {(rev.reviewer_name || 'TC').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)' }}>
                    {rev.reviewer_name || 'Verified Customer'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Order #{rev.order_id ? rev.order_id.slice(0, 8).toUpperCase() : 'VERIFIED'} • {primaryShop?.shop_name || 'Fix It Electronics'} ({primaryShop?.city || 'Bangalore'})
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Verified Partner Workshop Showcase Card */}
          {primaryShop && (
            <div className="card" style={{ padding: '24px', border: '1.5px solid var(--border-default)', background: '#fffdfa' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={18} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                    Featured Hub Partner
                  </span>
                </div>
                <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                  Level 3 Cleanroom
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--secondary)', marginBottom: '4px' }}>
                {primaryShop.shop_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                {primaryShop.address}, {primaryShop.city} • Open: {primaryShop.opening_time?.slice(0, 5)} - {primaryShop.closing_time?.slice(0, 5)}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
                {primaryShop.description || 'Specialized in multi-layer board microsoldering, OLED lamination, and certified battery health restoration.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                <span>Verified Cleanroom Inspection Bay • Active Escrow Facility</span>
              </div>
            </div>
          )}

          {/* 30-Day Platform Warranty Assurance */}
          <div className="card" style={{ padding: '24px', border: '1.5px solid var(--emerald-border)', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--emerald)' }} />
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--secondary)' }}>
                30-Day Platform Warranty
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
              Every completed repair is covered by our automated 30-day warranty certificate. If any component shows touch latency or performance drops, request a 1-click free rework or refund with zero hassle.
            </p>
            <div style={{ fontSize: '12px', color: 'var(--emerald-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} />
              <span>Full escrow backstop & dispute arbitration panel</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BOTTOM BANNER */}
      <section className="container" style={{ marginBottom: '40px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #d97706, #f59e0b)',
          borderRadius: 'var(--radius-xl)',
          padding: '44px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          boxShadow: '0 20px 40px rgba(217, 119, 6, 0.25)'
        }}>
          <div>
            <h2 style={{ fontSize: '30px', color: '#ffffff', marginBottom: '10px' }}>
              Broken Screen or Dying Battery?
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)', maxWidth: '540px' }}>
              Book your certified doorstep diagnostic today. Free pickup, bank escrow protection, and 30-day warranty included.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/book')}
              style={{
                padding: '14px 28px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              Book Doorstep Repair Now →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
