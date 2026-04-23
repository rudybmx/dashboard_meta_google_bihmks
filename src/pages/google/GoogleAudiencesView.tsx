import React from 'react';
import { Users } from 'lucide-react';

export const GoogleAudiencesView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Públicos — Google Ads</h2>
        <p className="text-slate-500 text-sm mt-1">Segmentação de público: in-market, remarketing, semelhantes e personalizados.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-64 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-dashed border-slate-200 gap-3">
          <Users className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">Análise de públicos em desenvolvimento</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleAudiencesView;
