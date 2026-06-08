'use client';

import React from 'react';

const FeedCard = ({ type, name, desc, isFinal }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
    {isFinal && (
      <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-bold rounded-full border border-blue-100">
        Final Stage
      </span>
    )}
    <p className="text-[11px] font-bold text-slate-700 uppercase">
      {type}:{" "}
      <span className="text-slate-500 normal-case font-medium">{name}</span>
    </p>
    <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
  </div>
);

export default function NewRequestFeed() {
  return (
    <div>
      <aside>
          <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4">
            New Requests Feed
          </h2>
          <div className="space-y-4">
            <FeedCard
              type="NEW VENDOR"
              name="Global Steel Ltd"
              desc="Awaiting Document Verification"
            />
            <FeedCard
              type="NEW ITEM"
              name="Server Rack 42U"
              desc="Avgding Offiea, CBU - IT Dept"
            />
            <FeedCard
              type="NEW ITEM"
              name="Eigonit bck 42U"
              desc="Office Chai - HR Dept"
              isFinal
            />
          </div>
        </aside>
    </div>
  );
}