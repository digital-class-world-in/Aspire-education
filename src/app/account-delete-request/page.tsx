"use client";

import React, { useState } from 'react';

export default function AccountDeleteRequestPage() {
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send an API request
    setStatus('success');
    setTimeout(() => setStatus(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-public-sans">
      <div className="w-full max-w-lg bg-white rounded border border-gray-200 overflow-hidden">
        {/* Header styling matching the requested image */}
        <div className="bg-[#9c27b0] py-16 px-6 text-center">
          <h1 className="text-[32px] font-medium text-white leading-tight">
            Account Deletion<br/>Request
          </h1>
        </div>

        <div className="p-8">
          {status === 'success' ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 text-center">
              Your account deletion request has been received. We will process it shortly.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9c27b0] focus:border-[#9c27b0] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9c27b0] focus:border-[#9c27b0] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9c27b0] focus:border-[#9c27b0] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9c27b0] focus:border-[#9c27b0] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm text-gray-700 mb-1">
                Your Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9c27b0] focus:border-[#9c27b0] transition-colors resize-none"
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#9c27b0] hover:bg-[#8e24aa] text-white font-medium py-[10px] px-4 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9c27b0]"
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
