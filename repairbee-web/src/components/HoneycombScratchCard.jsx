import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Coins, CheckCircle2, Sparkles, Zap, Award } from 'lucide-react';

export default function HoneycombScratchCard({ card, onClaimed }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isScratched, setIsScratched] = useState(card.is_scratched);
  const [scratchPercent, setScratchPercent] = useState(card.is_scratched ? 100 : 0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [claimedData, setClaimedData] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    setIsScratched(card.is_scratched);
    setScratchPercent(card.is_scratched ? 100 : 0);
    if (!card.is_scratched) {
      initCanvas();
    }
  }, [card]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 300;
    const height = canvas.height = 170;

    // Golden Honeycomb metallic gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#d97706');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.7, '#fbbf24');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Hex pattern overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    const hexRadius = 14;
    for (let y = 0; y < height + hexRadius; y += hexRadius * 1.5) {
      for (let x = 0; x < width + hexRadius; x += hexRadius * Math.sqrt(3)) {
        drawHex(ctx, x, y, hexRadius);
      }
    }

    // Text instructions
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText('✨ SCRATCH HERE ✨', width / 2, height / 2 - 8);

    ctx.fillStyle = '#451a03';
    ctx.font = '600 11px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('Rub to reveal instant Honeycomb reward', width / 2, height / 2 + 14);

    // Decorative border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, width - 8, height - 8);
  };

  const drawHex = (ctx, x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + r * Math.cos(angle);
      const hy = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  };

  const scratch = (clientX, clientY) => {
    if (isScratched || claiming) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Check clear ratio every few strokes
    checkScratchProgress(ctx, canvas);
  };

  const checkScratchProgress = (ctx, canvas) => {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let transparentCount = 0;
      const step = 32; // sampling step
      for (let i = 3; i < pixels.length; i += step * 4) {
        if (pixels[i] === 0) transparentCount++;
      }
      const totalSampled = pixels.length / (step * 4);
      const percent = Math.round((transparentCount / totalSampled) * 100);
      setScratchPercent(percent);

      if (percent >= 40 && !isScratched && !claiming) {
        finishScratch();
      }
    } catch (e) {
      // fallback
    }
  };

  const finishScratch = async () => {
    setIsScratched(true);
    setClaiming(true);
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff']
      });

      if (onClaimed) {
        const res = await onClaimed(card.id);
        setClaimedData(res);
      }
    } catch (err) {
      console.error('Scratch claim failed:', err);
    } finally {
      setClaiming(false);
    }
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleTouchStart = (e) => {
    setIsDrawing(true);
    if (e.touches[0]) scratch(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDrawing) return;
    if (e.touches[0]) scratch(e.touches[0].clientX, e.touches[0].clientY);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '300px',
        height: '170px',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: isScratched
          ? '0 10px 25px -5px rgba(245, 158, 11, 0.3), 0 0 15px rgba(16, 185, 129, 0.2)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        border: isScratched ? '2px solid #f59e0b' : '2px solid rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
        userSelect: 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* UNDERNEATH LAYER: The Revealed Prize */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          textAlign: 'center',
          background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <Sparkles size={16} color="#f59e0b" />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b' }}>
            {card.title}
          </span>
        </div>

        {/* Revealed Prize Amount */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '4px 0' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>₹</span>
          <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {Number(card.reward_amount).toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>Cashback</span>
        </div>

        <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.2, maxWidth: '240px' }}>
          {card.subtitle}
        </p>

        {/* Claimed status badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(16, 185, 129, 0.18)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '0.7rem',
          fontWeight: 800
        }}>
          <CheckCircle2 size={13} />
          <span>{isScratched ? 'Deposited to Escrow Wallet' : 'Scratch to Deposit'}</span>
        </div>
      </div>

      {/* TOP LAYER: Interactive Scratch Canvas */}
      {!isScratched && (
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          style={{
            position: 'absolute',
            inset: 0,
            cursor: 'grab',
            zIndex: 10,
            width: '100%',
            height: '100%',
          }}
        />
      )}

      {/* Quick Reveal button for accessibility */}
      {!isScratched && (
        <button
          onClick={finishScratch}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            zIndex: 20,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#fbbf24',
            fontSize: '0.65rem',
            padding: '2px 8px',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)'
          }}
        >
          Instant Reveal
        </button>
      )}
    </div>
  );
}
