'use client';

import { useState } from 'react';

export default function CallbackRequestsPage() {
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  return (
    <>
      {/* List panel */}
      <div className={`${mobileShowDetail ? 'hidden sm:flex' : 'flex'} w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0`}>
        <div className="px-4 pt-4 pb-2 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Callbacks</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </div>
          <p className="text-sm text-text-muted text-center">No callback requests yet</p>
          <p className="text-xs text-text-muted text-center mt-1">Service providers will request callbacks here</p>
        </div>
      </div>

      {/* Detail panel */}
      <div className={`${mobileShowDetail ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-bg-primary`}>
        {/* Mobile back header */}
        <div className="sm:hidden h-[60px] px-4 flex items-center border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setMobileShowDetail(false)}
            className="btn-icon mr-2"
            aria-label="Back to callbacks"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-text-primary">Callback Details</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">Select a callback request to view details</p>
          </div>
        </div>
      </div>
    </>
  );
}
