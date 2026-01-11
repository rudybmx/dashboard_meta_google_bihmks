import React from 'react';

import { CampaignData } from '../types';
import { CreativeCarousel } from './CreativeCarousel';

interface Props {
    data: CampaignData[];
}

export const CreativesView: React.FC<Props> = ({ data }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Análise de Criativos</h2>
                <p className="text-slate-500">
                    Visualize e compare a performance visual dos seus anúncios.
                </p>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 shadow-sm">
                <CreativeCarousel ads={data} />
            </div>
        </div>
    );
};
