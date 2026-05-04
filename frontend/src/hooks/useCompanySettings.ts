import { useState, useEffect, useCallback } from 'react';
import api from '../api'; // Your API instance

// Define a type for your company data
interface CompanyData {
  companyName: string;
  logoPath: string | null;
}

// Create a singleton state to share across components
let globalCompanyData: CompanyData = {
  companyName: 'KVAR TECH', // Default from your old logic
  logoPath: null,
};
let globalSetCompanyData: (data: CompanyData) => void;
let listeners: (() => void)[] = [];

// This hook will manage the global state and data fetching
export const useCompanySettings = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Add this component to the list of listeners to re-render when data changes
    const listener = () => forceUpdate({});
    listeners.push(listener);

    return () => {
      // Unsubscribe on unmount
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  // Update global data and notify all listeners
  const setGlobalData = useCallback((newData: CompanyData) => {
    globalCompanyData = newData;
    listeners.forEach((listener) => listener());
  }, []);

  // Function to fetch the current data from the API
  const refetchCompanySettings = useCallback(async () => {
    try {
      const res = await api.get('/admin/company'); // Your endpoint
      setGlobalData({
        companyName: res.data.companyName,
        logoPath: res.data.logoPath,
      });
    } catch (error) {
      console.error('Failed to fetch company details:', error);
    }
  }, [setGlobalData]);

  // Fetch data on the very first mount
  useEffect(() => {
    if (globalCompanyData.companyName === 'KVAR TECH') {
      refetchCompanySettings();
    }
  }, [refetchCompanySettings]);

  return {
    ...globalCompanyData,
    refetchCompanySettings,
  };
};