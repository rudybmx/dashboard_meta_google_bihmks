import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as supabaseService from '../services/supabaseService';
import * as userService from '../services/userService';
import { MetaAdAccount, Franchise, UserProfile } from '../types';

interface SettingsDataContextType {
  // Data
  accounts: MetaAdAccount[];
  franchises: Franchise[];
  users: UserProfile[];
  
  // Loading states
  isLoading: boolean;
  accountsLoading: boolean;
  franchisesLoading: boolean;
  usersLoading: boolean;
  
  // Update functions
  setAccounts: React.Dispatch<React.SetStateAction<MetaAdAccount[]>>;
  setFranchises: React.Dispatch<React.SetStateAction<Franchise[]>>;
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  
  // Refresh functions
  refreshAccounts: () => Promise<void>;
  refreshFranchises: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Cache status
  isDataLoaded: boolean;
}

const SettingsDataContext = createContext<SettingsDataContextType | undefined>(undefined);

export const useSettingsData = () => {
  const context = useContext(SettingsDataContext);
  if (!context) {
    throw new Error('useSettingsData must be used within a SettingsDataProvider');
  }
  return context;
};

interface SettingsDataProviderProps {
  children: React.ReactNode;
}

export const SettingsDataProvider: React.FC<SettingsDataProviderProps> = ({ children }) => {
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [franchisesLoading, setFranchisesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch accounts
  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const data = await supabaseService.fetchMetaAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // Fetch franchises
  const refreshFranchises = useCallback(async () => {
    setFranchisesLoading(true);
    try {
      const data = await supabaseService.fetchFranchises();
      setFranchises(data);
    } catch (err) {
      console.error('Failed to fetch franchises:', err);
    } finally {
      setFranchisesLoading(false);
    }
  }, []);

  // Fetch users
  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await userService.fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch all data
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshAccounts(), refreshFranchises(), refreshUsers()]);
  }, [refreshAccounts, refreshFranchises, refreshUsers]);

  // Initial load - only once
  useEffect(() => {
    if (!isDataLoaded) {
      const loadInitialData = async () => {
        setAccountsLoading(true);
        setFranchisesLoading(true);
        setUsersLoading(true);
        try {
          const [accountsData, franchisesData, usersData] = await Promise.all([
            supabaseService.fetchMetaAccounts(),
            supabaseService.fetchFranchises(),
            userService.fetchUsers()
          ]);
          setAccounts(accountsData);
          setFranchises(franchisesData);
          setUsers(usersData);
          setIsDataLoaded(true);
        } catch (err) {
          console.error('Failed to load settings data:', err);
        } finally {
          setAccountsLoading(false);
          setFranchisesLoading(false);
          setUsersLoading(false);
        }
      };
      loadInitialData();
    }
  }, [isDataLoaded]);

  const isLoading = accountsLoading || franchisesLoading || usersLoading;

  const value = useMemo(() => ({
    accounts,
    franchises,
    users,
    isLoading,
    accountsLoading,
    franchisesLoading,
    usersLoading,
    setAccounts,
    setFranchises,
    setUsers,
    refreshAccounts,
    refreshFranchises,
    refreshUsers,
    refreshAll,
    isDataLoaded
  }), [
    accounts,
    franchises,
    users,
    isLoading,
    accountsLoading,
    franchisesLoading,
    usersLoading,
    refreshAccounts,
    refreshFranchises,
    refreshUsers,
    refreshAll,
    isDataLoaded
  ]);

  return (
    <SettingsDataContext.Provider value={value}>
      {children}
    </SettingsDataContext.Provider>
  );
};
