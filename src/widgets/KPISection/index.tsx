import React from 'react';
import { DollarSign, Users, Target, MessageCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/ui/card';
import { useFinanceData } from '@/src/entities/finance';
import { Skeleton } from '@/src/shared/ui/skeleton';

export const KPISection: React.FC = () => {
    const { data, isLoading, isError, error } = useFinanceData();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                Erro ao carregar os KPIs: {error?.message}
            </div>
        );
    }

    const defaultData = { spend: 0, leads: 0, leads_cadastro: 0, conversations: 0, cpl: 0, ctr: 0 };
    const metrics = data || defaultData;

    const cards = [
        {
            label: 'Investimento',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.spend),
            icon: <DollarSign className="h-4 w-4 text-emerald-600" />,
        },
        {
            label: 'Leads de Mensagem',
            value: metrics.conversations.toLocaleString('pt-BR'),
            icon: <MessageCircle className="h-4 w-4 text-blue-500" />,
        },
        {
            label: 'Leads de Cadastro',
            value: (metrics.leads_cadastro || 0).toLocaleString('pt-BR'),
            icon: <FileText className="h-4 w-4 text-orange-500" />,
        },
        {
            label: 'Leads Geral',
            value: metrics.leads.toLocaleString('pt-BR'),
            icon: <Users className="h-4 w-4 text-indigo-600" />,
        },
        {
            label: 'CPL',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.cpl),
            icon: <Target className="h-4 w-4 text-purple-600" />,
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
            {cards.map((card, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                            {card.label}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-slate-50">
                            {card.icon}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-800">{card.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
