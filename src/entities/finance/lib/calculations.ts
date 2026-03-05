import { RawFinanceData, ConsolidatedMetrics } from '../model/types';

export const calculateCPL = (spend: number, leads: number): number => {
    if (leads <= 0) return 0;
    return spend / leads;
};

/**
 * Calculates efficiency: The percentage difference between unit CPL and the average CPL.
 * Negative difference means the unit is cheaper (more efficient).
 */
export const calculateEfficiency = (unitCpl: number, averageCpl: number): number => {
    if (averageCpl === 0 || unitCpl === 0) return 0;
    return ((unitCpl - averageCpl) / averageCpl) * 100;
};

/**
 * Summarizes an array of raw finance rows from the backend into single consolidated metrics object.
 */
export const summarizeMetrics = (data: RawFinanceData[]): ConsolidatedMetrics => {
    const totals = data.reduce(
        (acc, row) => {
            acc.spend += row.investimento || 0;
            acc.leads += row.leads || 0;

            acc.leads_cadastro += row.leads_cadastro || 0;
            acc.purchases += row.compras || 0;
            acc.conversations += row.conversas || 0;
            acc.clicks += row.clicks || 0;
            acc.impressions += row.impressoes || 0;
            acc.reach += row.alcance || 0;
            acc.totalBalance += row.saldo_atual || 0;
            return acc;
        },
        { spend: 0, leads: 0, leads_cadastro: 0, purchases: 0, conversations: 0, clicks: 0, impressions: 0, reach: 0, totalBalance: 0 }
    );

    return {
        ...totals,
        cpl: calculateCPL(totals.spend, totals.leads),
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        totalBalance: totals.totalBalance,
        rawData: data // Return raw metrics to be used by deeper components
    };
};
