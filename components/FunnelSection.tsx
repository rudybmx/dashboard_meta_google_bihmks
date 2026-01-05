import React from 'react';
import { CampaignData } from '../types';
import { 
  AlertTriangle, 
  Eye, 
  MousePointer2, 
  MessageCircle, 
  UserCheck, 
  Star, 
  ArrowDown 
} from 'lucide-react';

interface Props {
  data: CampaignData[];
}

export const FunnelSection: React.FC<Props> = ({ data }) => {
  // Aggregate data
  const agg = data.reduce((acc, curr) => ({
    impressoes: acc.impressoes + curr.impressoes,
    cliques: acc.cliques + curr.cliques_todos,
    msgs_iniciadas: acc.msgs_iniciadas + (curr.msgs_iniciadas || 0),
    msgs_conexoes: acc.msgs_conexoes + (curr.msgs_conexoes || 0),
    msgs_novos_contatos: acc.msgs_novos_contatos + (curr.msgs_novos_contatos || 0),
  }), { impressoes: 0, cliques: 0, msgs_iniciadas: 0, msgs_conexoes: 0, msgs_novos_contatos: 0 });

  // Calculations for Rates
  const ctr = agg.impressoes > 0 ? (agg.cliques / agg.impressoes) * 100 : 0;
  const clickToChat = agg.cliques > 0 ? (agg.msgs_iniciadas / agg.cliques) * 100 : 0;
  const connectionRate = agg.msgs_iniciadas > 0 ? (agg.msgs_conexoes / agg.msgs_iniciadas) * 100 : 0;
  const conversionRate = agg.msgs_conexoes > 0 ? (agg.msgs_novos_contatos / agg.msgs_conexoes) * 100 : 0;

  // Insight Logic
  const dropOffIniciadaToConexao = 100 - connectionRate;
  const hasBottleneck = dropOffIniciadaToConexao > 40; 

  const funnelSteps = [
    {
      id: 'impressions',
      label: 'Impressões',
      subLabel: 'Alcance',
      value: agg.impressoes,
      icon: <Eye size={18} />,
      color: 'bg-slate-50 text-slate-600 border-slate-200',
      barColor: 'bg-slate-200',
      width: 'w-full', 
      conversionLabel: null,
      conversionValue: null
    },
    {
      id: 'clicks',
      label: 'Cliques',
      subLabel: 'Interesse',
      value: agg.cliques,
      icon: <MousePointer2 size={18} />,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      barColor: 'bg-indigo-300',
      width: 'w-[92%]', 
      conversionLabel: 'CTR',
      conversionValue: `${ctr.toFixed(2)}%`
    },
    {
      id: 'started',
      label: 'Msgs Iniciadas',
      subLabel: 'Intenção',
      value: agg.msgs_iniciadas,
      icon: <MessageCircle size={18} />,
      color: 'bg-violet-50 text-violet-600 border-violet-100',
      barColor: 'bg-violet-400',
      width: 'w-[84%]',
      conversionLabel: 'Click-to-Chat',
      conversionValue: `${clickToChat.toFixed(1)}%`
    },
    {
      id: 'connections',
      label: 'Conexões',
      subLabel: 'Retenção',
      value: agg.msgs_conexoes,
      icon: <UserCheck size={18} />,
      color: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
      barColor: 'bg-fuchsia-400',
      width: 'w-[76%]',
      conversionLabel: 'Taxa Conexão',
      conversionValue: `${connectionRate.toFixed(1)}%`
    },
    {
      id: 'leads',
      label: 'Leads (Contatos)',
      subLabel: 'Conversão',
      value: agg.msgs_novos_contatos,
      icon: <Star size={18} />,
      color: 'bg-orange-50 text-orange-600 border-orange-100',
      barColor: 'bg-gradient-to-r from-orange-400 to-amber-400',
      width: 'w-[68%]',
      conversionLabel: 'Qualificação',
      conversionValue: `${conversionRate.toFixed(1)}%`,
      isFinal: true
    }
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-500/5 border border-slate-100 flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">Funil de Conversão</h3>
        <p className="text-sm text-slate-500">Fluxo de aquisição de clientes.</p>
      </div>

      <div className="flex flex-col items-center relative gap-1 w-full">
        {funnelSteps.map((step, idx) => (
          <React.Fragment key={step.id}>
            
            {/* Connector */}
            {idx > 0 && (
              <div className="h-6 w-full flex items-center justify-center relative">
                 <div className="absolute h-full w-px border-l-2 border-dashed border-slate-200 z-0"></div>
                 <div className="z-10 bg-white border border-slate-100 shadow-sm rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <span className="text-slate-400">{step.conversionLabel}</span>
                    <ArrowDown size={10} className="text-slate-300" />
                    <span className={step.isFinal ? 'text-orange-600' : 'text-indigo-600'}>{step.conversionValue}</span>
                 </div>
              </div>
            )}

            {/* Funnel Step Card */}
            <div 
              className={`relative h-16 rounded-2xl border flex items-center px-4 transition-all duration-500 hover:shadow-md hover:scale-[1.01] cursor-default z-10 ${step.color} ${step.width}`}
              style={{ minWidth: '300px', maxWidth: '100%' }} 
            >
              {/* Background Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${step.barColor}`}></div>

              {/* Icon */}
              <div className="mr-4 p-2 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm shrink-0">
                {step.icon}
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-sm font-bold truncate text-slate-800">{step.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{step.subLabel}</span>
              </div>

              {/* Value */}
              <div className="text-right pl-2">
                <span className="text-lg font-bold tracking-tight block text-slate-900">
                    {step.value.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

          </React.Fragment>
        ))}
      </div>

      {/* Insight Box */}
      {hasBottleneck && (
        <div className="mt-6 animate-in slide-in-from-bottom-2 fade-in duration-700">
          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
            <div className="p-2 bg-white rounded-xl text-red-500 shadow-sm shrink-0">
                <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900">Atenção no Atendimento</h4>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                A taxa de conexão está em <strong>{connectionRate.toFixed(1)}%</strong>. 
                Isso significa que {dropOffIniciadaToConexao.toFixed(0)}% das pessoas que iniciam conversa não recebem ou não respondem a primeira mensagem.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};