import React from 'react';
import { Loader2 } from 'lucide-react';

export const ViewLoader: React.FC = () => (
  <div className="flex h-[60vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-slate-500">Carregando...</p>
    </div>
  </div>
);

export default ViewLoader;
