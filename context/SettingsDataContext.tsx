import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as supabaseService from '../services/supabaseService';
import * as userService from '../services/userService';
import { MetaAdAccount, Franchise, UserProfile } from '../types';
import { CategoryRow } from '../services/supabaseService';

interface SettingsDataContextType {
  // Data
  accounts: MetaAdAccount[];
  franchises: Franchise[];
  users: UserProfile[];
  categories: CategoryRow[];

  // Loading states
  isLoading: boolean;
  accountsLoading: boolean;
  franchisesLoading: boolean;
  usersLoading: boolean;
  categoriesLoading: boolean;

  // Update functions
  setAccounts: React.Dispatch<React.SetStateAction<MetaAdAccount[]>>;
  setFranchises: React.Dispatch<React.SetStateAction<Franchise[]>>;
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  setCategories: React.Dispatch<React.SetStateAction<CategoryRow[]>>;

  // Refresh functions
  refreshAccounts: () => Promise<void>;
  refreshFranchises: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshCategories: () => Promise<void>;
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
  console.log('[SettingsDataProvider] 🔵 Provider renderizando');

  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [accountsLoading, setAccountsLoading] = useState(false);
  const [franchisesLoading, setFranchisesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

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

  // Fetch categories
  const refreshCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await supabaseService.fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Fetch all data
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshAccounts(), refreshFranchises(), refreshUsers(), refreshCategories()]);
  }, [refreshAccounts, refreshFranchises, refreshUsers, refreshCategories]);

  // Initial load - only once
  useEffect(() => {
    if (!isDataLoaded) {
      const loadInitialData = async () => {
        setAccountsLoading(true);
        setFranchisesLoading(true);
        setUsersLoading(true);
        setCategoriesLoading(true);
        try {
          const [accountsData, franchisesData, usersData, categoriesData] = await Promise.all([
            supabaseService.fetchMetaAccounts(),
            supabaseService.fetchFranchises(),
            userService.fetchUsers(),
            supabaseService.fetchCategories()
          ]);
          setAccounts(accountsData);
          setFranchises(franchisesData);
          setUsers(usersData);
          setCategories(categoriesData);
          setIsDataLoaded(true);
        } catch (err) {
          console.error('Failed to load settings data:', err);
        } finally {
          setAccountsLoading(false);
          setFranchisesLoading(false);
          setUsersLoading(false);
          setCategoriesLoading(false);
        }
      };
      loadInitialData();
    }
  }, [isDataLoaded]);

  const isLoading = accountsLoading || franchisesLoading || usersLoading || categoriesLoading;

  const value = useMemo(() => ({
    accounts,
    franchises,
    users,
    categories,
    isLoading,
    accountsLoading,
    franchisesLoading,
    usersLoading,
    categoriesLoading,
    setAccounts,
    setFranchises,
    setUsers,
    setCategories,
    refreshAccounts,
    refreshFranchises,
    refreshUsers,
    refreshCategories,
    refreshAll,
    isDataLoaded
  }), [
    accounts,
    franchises,
    users,
    categories,
    isLoading,
    accountsLoading,
    franchisesLoading,
    usersLoading,
    categoriesLoading,
    refreshAccounts,
    refreshFranchises,
    refreshUsers,
    refreshCategories,
    refreshAll,
    isDataLoaded
  ]);

  return (
    <SettingsDataContext.Provider value={value}>
      {children}
    </SettingsDataContext.Provider>
  );
};
