import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { message } from 'antd';

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
  
  // Cache duration: 30 seconds (stale-while-revalidate pattern)
  const CACHE_DURATION = 30000;
  const isFetchingRef = useRef(false);
  const subscriptionRef = useRef(null);

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
      console.error('Error fetching invoices:', err);
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

  // Set up real-time subscription for invoice updates
  useEffect(() => {
    if (!userProfile?.id) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    console.log('📊 Setting up realtime subscription for invoice data updates...');

    // Subscribe to invoice changes
    const subscription = supabase
      .channel('invoice-data-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          console.log('📊 Invoice data event received:', {
            event: payload.eventType,
            invoiceNumber: payload.new?.invoice_number || payload.old?.invoice_number,
            oldStatus: payload.old?.status,
            newStatus: payload.new?.status,
          });

          const eventType = payload.eventType;
          const newInvoice = payload.new;
          const oldInvoice = payload.old;

          // Show user-friendly messages for important events
          if (eventType === 'UPDATE' && newInvoice && oldInvoice) {
            // Invoice status changed to paid
            if (newInvoice.status === 'paid' && oldInvoice.status !== 'paid') {
              const isOwnInvoice = newInvoice.user_id === userProfile.id;
              if (isOwnInvoice || isAdmin || isSuperAdmin) {
                console.log('💰 Showing paid invoice message...');
                message.success({
                  content: `Rēķins ${newInvoice.invoice_number} ir apmaksāts! €${parseFloat(newInvoice.total || 0).toFixed(2)}`,
                  duration: 5,
                });
              }
            }
            
            // Invoice status changed to overdue
            if (newInvoice.status === 'overdue' && oldInvoice.status !== 'overdue') {
              const isOwnInvoice = newInvoice.user_id === userProfile.id;
              if (isOwnInvoice || isAdmin || isSuperAdmin) {
                console.log('⚠️ Showing overdue invoice message...');
                message.warning({
                  content: `Rēķins ${newInvoice.invoice_number} ir kavēts!`,
                  duration: 5,
                });
              }
            }
          }

          // Refresh data when changes occur
          // Use a small delay to batch rapid changes
          console.log('🔄 Refreshing invoice data...');
          setTimeout(() => {
            fetchInvoices(true);
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log('🔌 Invoice data subscription status:', status);
      });

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        console.log('🔌 Unsubscribing from invoice data updates...');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [userProfile?.id, isAdmin, isSuperAdmin, fetchInvoices]);

  const value = {
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
  };

  return (
    <InvoiceDataContext.Provider value={value}>
      {children}
    </InvoiceDataContext.Provider>
  );
};

