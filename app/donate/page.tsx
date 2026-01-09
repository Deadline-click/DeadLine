'use client';

import { Heart, Users, Target, Clock } from 'lucide-react';
import DonateButton from './DonateButton';
import { useEffect, useState } from 'react';
import './donations.css';

interface Donation {
  id: string;
  donor_name: string;
  amount: number;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
}

interface DonationData {
  donations: Donation[];
  totalAmount: number;
  donorCount: number;
  goal: number;
}

export default function DonationsPage() {
  const [data, setData] = useState<DonationData>({
    donations: [],
    totalAmount: 0,
    donorCount: 0,
    goal: 50000,
  });

  useEffect(() => {
    const fetchDonations = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      
      try {
        const response = await fetch(`${baseUrl}/api/get/donate`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          setData({
            donations: result.donations || [],
            totalAmount: result.totalAmount || 0,
            donorCount: result.donorCount || 0,
            goal: result.goal || 50000,
          });
        }
      } catch (error) {
        console.error('Error fetching donations:', error);
      }
    };

    fetchDonations();
    const interval = setInterval(fetchDonations, 60000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min((data.totalAmount / data.goal) * 100, 100);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-black bg-white sticky top-0 z-50">
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    if (window.history.length > 1 && document.referrer.includes(window.location.hostname)) {
                      window.history.back();
                    } else {
                      window.location.href = '/';
                    }
                  }
                }}
                className="text-black hover:opacity-70 transition-opacity flex items-center cursor-pointer"
                title="Go back"
                aria-label="Go back"
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
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <a
                href="/"
                className="text-xl font-black tracking-tight uppercase text-black hover:opacity-80 transition-opacity"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                title="DEADLINE - Museum of Temporary Truths"
                aria-label="DEADLINE - Museum of Temporary Truths Homepage"
              >
                DEADLINE
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 
            className="text-3xl sm:text-4xl font-black tracking-tight text-black mb-3"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Support Our Mission
          </h1>
          <p className="text-black font-mono text-sm leading-relaxed">
            Help us document stories the world forgot.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-black p-4 hover:shadow-lg transition-all duration-300 group">
            <Heart className="w-5 h-5 text-black mb-2 group-hover:scale-110 transition-transform duration-300" />
            <div className="text-xs font-mono text-gray-600 mb-1 tracking-wide">RAISED</div>
            <div className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              ₹{data.totalAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white border border-black p-4 hover:shadow-lg transition-all duration-300 group">
            <Target className="w-5 h-5 text-black mb-2 group-hover:scale-110 transition-transform duration-300" />
            <div className="text-xs font-mono text-gray-600 mb-1 tracking-wide">GOAL</div>
            <div className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              ₹{data.goal.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white border border-black p-4 hover:shadow-lg transition-all duration-300 group">
            <Users className="w-5 h-5 text-black mb-2 group-hover:scale-110 transition-transform duration-300" />
            <div className="text-xs font-mono text-gray-600 mb-1 tracking-wide">DONORS</div>
            <div className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {data.donorCount}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-white border border-black p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-mono text-gray-600 tracking-wide">PROGRESS</span>
              <span className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {progress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 border border-black bg-gray-50 overflow-hidden mb-3">
              <div
                className="h-full bg-black transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs font-mono text-gray-600">
              ₹{(data.goal - data.totalAmount).toLocaleString('en-IN')} remaining
            </div>
          </div>
        </div>

        <DonateButton />

        <div className="bg-gray-50 border border-black p-4 mb-6 flex items-start gap-3">
          <Clock className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-mono text-gray-600 leading-relaxed">
            Donations may take a few minutes to appear. Page auto-refreshes every minute.
          </p>
        </div>

        <div>
          <h2 
            className="text-2xl font-black text-black mb-5 tracking-tight"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Recent Supporters
          </h2>

          {data.donations && data.donations.length > 0 ? (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {data.donations.map((donation, index) => (
                <div
                  key={donation.id}
                  className="bg-white border border-black p-4 hover:shadow-lg transition-all duration-300"
                  style={{
                    animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {donation.is_anonymous ? 'Anonymous' : donation.donor_name}
                    </div>
                    <div className="font-bold text-base text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      ₹{Number(donation.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                  {donation.message && (
                    <p className="text-xs font-mono text-gray-700 mb-2 leading-relaxed">
                      "{donation.message}"
                    </p>
                  )}
                  <div className="text-xs font-mono text-gray-500">
                    {new Date(donation.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-black p-12 text-center">
              <Heart className="w-10 h-10 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-mono text-gray-600">Be the first to support</p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-black text-white py-6 border-t-2 border-black mt-8">
        <div className="px-4 sm:px-6">
          <div className="text-center mb-4 max-w-5xl mx-auto">
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              DEADLINE
            </h2>
            <p className="text-white text-xs sm:text-sm font-mono mb-4">
              Museum of Temporary Truths
            </p>
          </div>
          <nav className="flex justify-center space-x-4 sm:space-x-6 mb-4 max-w-5xl mx-auto">
            <a href="/about" className="text-xs font-mono text-white hover:underline transition-all duration-300">About</a>
            <a href="/report" className="text-xs font-mono text-white hover:underline transition-all duration-300">Report</a>
            <a href="/policies" className="text-xs font-mono text-white hover:underline transition-all duration-300">Policies</a>
          </nav>
          <p className="text-center text-xs text-white opacity-70 font-mono max-w-5xl mx-auto">
            © {new Date().getFullYear()} DEADLINE. Documenting lives that matter.
          </p>
        </div>
      </footer>

    </div>
  );
}