import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useUserRole } from '../hooks/useUserRole';

const InvoiceDataContext = createContext(undefined);

export const useInvoiceData = () => {
  const context = useContext(InvoiceDataContext);
  if (context === undefined) {
    throw new Error('useInvoiceData must be used within InvoiceDataProvider');
  }
  return context;
};

export const InvoiceDataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { userProfile, isAdmin, isSuperAdmin } = useUserRole();
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [error, setError] = useState(null);
  
  // Cache duration: 60 seconds (stale-while-revalidate pattern) - increased for better performance
  const CACHE_DURATION = 60000;
  const isFetchingRef = { current: false };

  /**
   * Fetch invoices from database
   * @param {boolean} force - Force refresh even if cache is valid
   */
  const fetchInvoices = useCallback(async (force = false) => {
    // Prevent duplicate fetches
    if (isFetchingRef.current) return;
    
    // Check cache validity (unless forced)
    if (!force && lastFetch && Date.now() - lastFetch < CACHE_DURATION) {
      return;
    }

    // Must have user profile to fetch
    if (!userProfile?.id) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Build query based on role
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // Employees can only see their own invoices
      if (!isAdmin && !isSuperAdmin) {
        query = query.eq('user_id', userProfile.id);
      }

      const { data: invoicesData, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;

      // Fetch all unique user profiles for the creators (for admin views)
      const uniqueUserIds = [...new Set(invoicesData?.map(inv => inv.user_id).filter(Boolean))];
      
      let userProfilesMap = {};
      if (uniqueUserIds.length > 0 && (isAdmin || isSuperAdmin)) {
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, username, email, role')
          .in('id', uniqueUserIds);

        if (!usersError && usersData) {
          usersData.forEach(user => {
            userProfilesMap[user.id] = user;
          });
        }
      }

      // Enrich invoices with creator information
      const enrichedInvoices = invoicesData?.map(invoice => ({
        ...invoice,
        creator: userProfilesMap[invoice.user_id] || null,
      })) || [];

      setInvoices(enrichedInvoices);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userProfile, isAdmin, isSuperAdmin, lastFetch]);

  /**
   * Refresh invoices (force fetch)
   */
  const refreshInvoices = useCallback(() => {
    return fetchInvoices(true);
  }, [fetchInvoices]);

  /**
   * Get filtered invoices by status
   */
  const getInvoicesByStatus = useCallback((status) => {
    return invoices.filter(inv => inv.status === status);
  }, [invoices]);

  /**
   * Get paid invoices
   */
  const getPaidInvoices = useCallback(() => {
    return invoices.filter(inv => inv.status === 'paid');
  }, [invoices]);

  /**
   * Get unpaid invoices (sent, pending, overdue)
   */
  const getUnpaidInvoices = useCallback(() => {
    return invoices.filter(inv => ['sent', 'pending', 'overdue'].includes(inv.status));
  }, [invoices]);

  /**
   * Get invoice by ID
   */
  const getInvoiceById = useCallback((id) => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);

  /**
   * Get invoice by invoice number
   */
  const getInvoiceByNumber = useCallback((invoiceNumber) => {
    return invoices.find(inv => inv.invoice_number === invoiceNumber);
  }, [invoices]);

  // Initial fetch when user profile is available
  useEffect(() => {
    if (userProfile?.id && !lastFetch) {
      fetchInvoices();
    }
  }, [userProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({
    // Data
    invoices,
    loading,
    error,
    lastFetch,
    
    // Actions
    fetchInvoices,
    refreshInvoices,
    
    // Helpers
    getInvoicesByStatus,
    getPaidInvoices,
    getUnpaidInvoices,
    getInvoiceById,
    getInvoiceByNumber,
  }), [invoices, loading, error, lastFetch, fetchInvoices, refreshInvoices, getInvoicesByStatus, getPaidInvoices, getUnpaidInvoices, getInvoiceById, getInvoiceByNumber]);

  return (
    <InvoiceDataContext.Provider value={value}>
      {children}
    </InvoiceDataContext.Provider>
  );
};

