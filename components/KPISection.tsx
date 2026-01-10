import React from 'react';
import { DollarSign, Users, Target, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { KPIAggregates } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  data: KPIAggregates;
}

export const KPISection: React.FC<Props> = ({ data }) => {
  const cards = [
    {
      label: 'Investimento Total',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalSpend),
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
      trend: '+12.5%',
      trendUp: true,
    },
    {
      label: 'Total de Leads',
      value: data.totalLeads.toLocaleString('pt-BR'),
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      trend: '+8.2%',
      trendUp: true,
    },
    {
      label: 'Custo por Lead (CPL)',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.cpl),
      icon: <Target className="h-4 w-4 text-muted-foreground" />,
      trend: '-2.4%',
      trendUp: true,
    },
    {
      label: 'ROAS',
      value: `${data.roas.toFixed(2)}x`,
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      trend: '+4.1%',
      trendUp: true,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <Card key={idx} className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.label}
            </CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className={cn(
                "flex items-center font-medium mr-1",
                card.trendUp ? "text-emerald-600" : "text-destructive"
              )}>
                {card.trendUp ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                {card.trend}
              </span>
              em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};