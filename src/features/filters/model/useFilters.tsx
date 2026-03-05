import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subDays } from 'date-fns';
import { RangeValue } from '@/src/shared/ui/calendar';

interface FiltersContextData {
    selectedAccounts: string[];
    setSelectedAccounts: (accounts: string[]) => void;
    selectedCluster: string;
    setSelectedCluster: (cluster: string) => void;
    dateRange: RangeValue | null;
    setDateRange: (range: RangeValue | null) => void;
}

const FiltersContext = createContext<FiltersContextData | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
    const [selectedAccounts, setSelectedAccountsState] = useState<string[]>(() => {
        try {
            const val = localStorage.getItem('op7_account_filter');
            if (val) {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed;
                if (val !== 'ALL') return [val];
            }
        } catch {
            const val = localStorage.getItem('op7_account_filter');
            if (val && val !== 'ALL') return [val];
        }
        return [];
    });

    const [selectedCluster, setSelectedClusterState] = useState<string>(() => {
        return localStorage.getItem('op7_cluster_filter') || 'ALL';
    });

    const [dateRange, setDateRangeState] = useState<RangeValue | null>(() => {
        const savedDates = localStorage.getItem('op7_date_range');
        if (savedDates) {
            try {
                const parsed = JSON.parse(savedDates);
                return {
                    start: new Date(parsed.start),
                    end: new Date(parsed.end)
                };
            } catch (e) {
                console.error("Failed to parse saved dates", e);
            }
        }
        return {
            start: subDays(new Date(), 1),
            end: subDays(new Date(), 1)
        };
    });

    const setSelectedAccounts = (accounts: string[]) => {
        setSelectedAccountsState(accounts);
        localStorage.setItem('op7_account_filter', JSON.stringify(accounts));
    };

    const setSelectedCluster = (cluster: string) => {
        setSelectedClusterState(cluster);
        localStorage.setItem('op7_cluster_filter', cluster);
        if (selectedAccounts.length > 0) {
            setSelectedAccountsState([]);
            localStorage.setItem('op7_account_filter', '[]');
        }
    };

    const setDateRange = (range: RangeValue | null) => {
        setDateRangeState(range);
        if (range?.start && range?.end) {
            localStorage.setItem('op7_date_range', JSON.stringify({
                start: range.start.toISOString(),
                end: range.end.toISOString()
            }));
        } else {
            localStorage.removeItem('op7_date_range');
        }
    };

    return (
        <FiltersContext.Provider value={{ selectedAccounts, setSelectedAccounts, selectedCluster, setSelectedCluster, dateRange, setDateRange }}>
            {children}
        </FiltersContext.Provider>
    );
}

export function useFilters() {
    const context = useContext(FiltersContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FiltersProvider');
    }
    return context;
}
