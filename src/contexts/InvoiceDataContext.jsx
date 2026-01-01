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
  const [totalCount, setTotalCount] = useState(0);
  
  // Cache duration: 60 seconds (stale-while-revalidate pattern) - increased for better performance
  const CACHE_DURATION = 60000;
  const isFetchingRef = { current: false };

  /**
   * Fetch invoices from database with pagination
   * @param {Object} options - Fetch options
   * @param {boolean} options.force - Force refresh even if cache is valid
   * @param {number} options.page - Page number (1-indexed)
   * @param {number} options.pageSize - Number of items per page
   * @param {string} options.searchText - Optional search text to filter by
   */
  const fetchInvoices = useCallback(async (options = {}) => {
    const { 
      force = false, 
      page = 1, 
      pageSize = 10, 
      searchText = '' 
    } = options;

    // Prevent duplicate fetches
    if (isFetchingRef.current) return;

    // Must have user profile to fetch
    if (!userProfile?.id) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Build base query
      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' }); // Include count for pagination

      // Employees can only see their own invoices
      if (!isAdmin && !isSuperAdmin) {
        query = query.eq('user_id', userProfile.id);
      }

      // Apply search filter if provided
      if (searchText && searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        // Search in invoice_number, customer_name, and status
        query = query.or(`invoice_number.ilike.%${searchLower}%,customer_name.ilike.%${searchLower}%,status.ilike.%${searchLower}%`);
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      // Apply pagination (Supabase uses range, which is 0-indexed)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: invoicesData, error: invoicesError, count } = await query;

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
      setTotalCount(count || 0);
      setLastFetch(Date.now());
      
      // Return pagination metadata
      return {
        data: enrichedInvoices,
        total: count || 0,
        page,
        pageSize,
      };
    } catch (err) {
      setError(err.message || 'Failed to fetch invoices');
      return {
        data: [],
        total: 0,
        page,
        pageSize,
      };
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userProfile, isAdmin, isSuperAdmin]);

  /**
   * Refresh invoices (force fetch with current pagination)
   */
  const refreshInvoices = useCallback(async (page = 1, pageSize = 10, searchText = '') => {
    return fetchInvoices({ force: true, page, pageSize, searchText });
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

  // Note: Initial fetch should be done by consuming components with pagination params
  // This allows components to control their own pagination state

  const value = useMemo(() => ({
    // Data
    invoices,
    loading,
    error,
    lastFetch,
    totalCount, // Total count for pagination
    
    // Actions
    fetchInvoices, // Now accepts options: { page, pageSize, searchText, force }
    refreshInvoices,
    
    // Helpers (Note: These work on current page only, consider deprecating or adjusting)
    getInvoicesByStatus,
    getPaidInvoices,
    getUnpaidInvoices,
    getInvoiceById,
    getInvoiceByNumber,
  }), [invoices, loading, error, lastFetch, totalCount, fetchInvoices, refreshInvoices, getInvoicesByStatus, getPaidInvoices, getUnpaidInvoices, getInvoiceById, getInvoiceByNumber]);

  return (
    <InvoiceDataContext.Provider value={value}>
      {children}
    </InvoiceDataContext.Provider>
  );
};

