'use client';

import { useState } from 'react';

interface ShareDonateButtonsProps {
  eventId: string;
  headline: string;
  upiId: string;
  upiName: string;
  upiNote: string;
  baseUrl: string;
}

export default function ShareDonateButtons({ 
  eventId, 
  headline, 
  upiId, 
  upiName, 
  upiNote,
  baseUrl 
}: ShareDonateButtonsProps) {
  const [showQR, setShowQR] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  const eventUrl = `${baseUrl}/event/${eventId}`;
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&tn=${encodeURIComponent(upiNote)}`;

  const handleDonate = () => {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      window.location.href = upiLink;
    } else {
      setQrLoaded(false);
      setShowQR(true);
    }
  };

  const handleShare = () => {
    setShowShareMenu(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      const btn = document.getElementById('copy-btn');
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, '_blank');
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(eventUrl)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`, '_blank');
  };

  const shareViaEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(headline)}&body=${encodeURIComponent(eventUrl)}`;
  };

  return (
    <>
      <div className="flex items-center space-x-3">
        <button
          onClick={handleShare}
          className="text-white hover:opacity-70 transition-opacity"
          aria-label="Share"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>

        <button
          onClick={handleDonate}
          className="text-white hover:opacity-70 transition-opacity"
          aria-label="Donate"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {showShareMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] animate-fadeIn"
          onClick={() => setShowShareMenu(false)}
        >
          <div 
            className="bg-white border border-black p-6 max-w-sm w-full mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-black">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider font-mono">Share</h3>
              <button 
                onClick={() => setShowShareMenu(false)} 
                className="text-black hover:opacity-70"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <button 
                onClick={shareOnWhatsApp}
                className="flex flex-col items-center justify-center p-3 hover:bg-gray-100 transition-colors"
                aria-label="Share on WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span className="text-xs mt-1 font-mono">WhatsApp</span>
              </button>
              <button 
                onClick={shareOnTwitter}
                className="flex flex-col items-center justify-center p-3 hover:bg-gray-100 transition-colors"
                aria-label="Share on X"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l11.733 16h4.267l-11.733 -16z"/>
                  <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/>
                </svg>
                <span className="text-xs mt-1 font-mono">X</span>
              </button>
              <button 
                onClick={shareOnLinkedIn}
                className="flex flex-col items-center justify-center p-3 hover:bg-gray-100 transition-colors"
                aria-label="Share on LinkedIn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
                <span className="text-xs mt-1 font-mono">LinkedIn</span>
              </button>
              <button 
                onClick={shareOnFacebook}
                className="flex flex-col items-center justify-center p-3 hover:bg-gray-100 transition-colors"
                aria-label="Share on Facebook"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
                <span className="text-xs mt-1 font-mono">Facebook</span>
              </button>
              <button 
                onClick={shareViaEmail}
                className="flex flex-col items-center justify-center p-3 hover:bg-gray-100 transition-colors"
                aria-label="Share via Email"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span className="text-xs mt-1 font-mono">Email</span>
              </button>
              <button 
                id="copy-btn"
                onClick={copyToClipboard}
                className="flex flex-col items-center justify-center p-3 hover:bg-gray-100 transition-colors"
                aria-label="Copy Link"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span className="text-xs mt-1 font-mono">Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showQR && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] animate-fadeIn"
          onClick={() => setShowQR(false)}
        >
          <div 
            className="bg-white border border-black p-6 max-w-sm w-full mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-black">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider font-mono">Donate</h3>
              <button 
                onClick={() => setShowQR(false)} 
                className="text-black hover:opacity-70"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="flex justify-center mb-4">
              {!qrLoaded && (
                <div className="w-60 h-60 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="w-40 h-40 bg-gray-300"></div>
                </div>
              )}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`}
                alt="UPI QR Code"
                className={`w-60 h-60 ${qrLoaded ? 'block' : 'hidden'}`}
                onLoad={() => setQrLoaded(true)}
              />
            </div>
            <p className="text-center text-xs text-black font-mono leading-relaxed">
              Thank you for supporting our work.<br/>Scan this code with your phone to donate.
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}