import React from 'react';
import { Type } from 'lucide-react';

export const GoogleKeywordsView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Palavras-chave — Google Ads</h2>
        <p className="text-slate-500 text-sm mt-1">Análise de performance por palavra-chave: impressões, cliques, CPC e Quality Score.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-64 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-dashed border-slate-200 gap-3">
          <Type className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">Tabela de palavras-chave em desenvolvimento</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleKeywordsView;
