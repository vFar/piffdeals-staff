import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { notification } from 'antd';
import { useAuth } from './AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';

const NotificationContext = createContext(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

/**
 * Notification types based on our streamlined plan
 */
export const NOTIFICATION_TYPES = {
  // Critical - Real-time
  INVOICE_PAID: 'invoice_paid',
  STOCK_UPDATE_FAILED: 'stock_update_failed',
  EMAIL_SEND_FAILED: 'email_send_failed',
  
  // Daily Digest
  OVERDUE_INVOICES: 'overdue_invoices',
  PENDING_INVESTIGATION: 'pending_investigation',
  DRAFT_DELETION_WARNING: 'draft_deletion_warning',
  
  // Optional
  WEEKLY_SUMMARY: 'weekly_summary',
  MONTHLY_REPORT: 'monthly_report',
  
  // Admin Only
  NEW_USER_CREATED: 'new_user_created',
  USER_SUSPENDED: 'user_suspended',
  BULK_USER_ACTION: 'bulk_user_action',
};

/**
 * Notification priority levels
 */
export const NOTIFICATION_PRIORITY = {
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
  INFO: 'info',
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { isAdmin, isSuperAdmin, userProfile } = useUserRole();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastDailyDigest, setLastDailyDigest] = useState(null);

  /**
   * Add a notification to the list
   */
  const addNotification = useCallback((notificationData) => {
    const {
      type,
      priority = NOTIFICATION_PRIORITY.INFO,
      title,
      message,
      description,
      invoiceId,
      invoiceNumber,
      actionUrl,
      metadata = {},
    } = notificationData;

    const newNotification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      priority,
      title,
      message,
      description,
      invoiceId,
      invoiceNumber,
      actionUrl,
      metadata,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount((prev) => prev + 1);

    // Show Ant Design notification
    const notificationConfig = {
      message: title,
      description: message || description,
      duration: priority === NOTIFICATION_PRIORITY.ERROR ? 0 : 4.5, // Errors don't auto-dismiss
      placement: 'topRight',
    };

    switch (priority) {
      case NOTIFICATION_PRIORITY.ERROR:
        notification.error(notificationConfig);
        break;
      case NOTIFICATION_PRIORITY.WARNING:
        notification.warning(notificationConfig);
        break;
      case NOTIFICATION_PRIORITY.SUCCESS:
        notification.success(notificationConfig);
        break;
      default:
        notification.info(notificationConfig);
    }

    return newNotification.id;
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });
  }, []);

  /**
   * Helper: Notify invoice paid
   */
  const notifyInvoicePaid = useCallback((invoice, paymentMethod = '') => {
    const isOwnInvoice = invoice.user_id === currentUser?.id;
    const shouldNotify = isOwnInvoice || isAdmin || isSuperAdmin;

    if (!shouldNotify) return;

    const paymentMethodText = paymentMethod
      ? ` (${paymentMethod === 'stripe' ? 'Stripe' : paymentMethod === 'bank_transfer' ? 'Bankas pārskaitījums' : paymentMethod})`
      : '';

    addNotification({
      type: NOTIFICATION_TYPES.INVOICE_PAID,
      priority: NOTIFICATION_PRIORITY.SUCCESS,
      title: 'Rēķins apmaksāts',
      message: `Rēķins ${invoice.invoice_number} ir apmaksāts!${paymentMethodText} Summa: €${parseFloat(invoice.total || 0).toFixed(2)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      actionUrl: `/invoices/${invoice.id}`,
      metadata: { paymentMethod, total: invoice.total },
    });
  }, [currentUser, isAdmin, isSuperAdmin, addNotification]);

  /**
   * Helper: Notify email send failed
   */
  const notifyEmailSendFailed = useCallback((invoice, errorMessage = '') => {
    if (invoice.user_id !== currentUser?.id) return; // Only notify creator

    addNotification({
      type: NOTIFICATION_TYPES.EMAIL_SEND_FAILED,
      priority: NOTIFICATION_PRIORITY.ERROR,
      title: 'E-pasta nosūtīšana neizdevās',
      message: `Neizdevās nosūtīt rēķinu ${invoice.invoice_number} uz ${invoice.customer_email || 'klientu'}. ${errorMessage ? `Kļūda: ${errorMessage}` : 'Lūdzu, mēģiniet vēlreiz.'}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      actionUrl: `/invoices/${invoice.id}`,
      metadata: { errorMessage },
    });
  }, [currentUser, addNotification]);

  /**
   * Helper: Notify stock update failed
   */
  const notifyStockUpdateFailed = useCallback((invoice, errorMessage = '') => {
    const isOwnInvoice = invoice.user_id === currentUser?.id;
    const shouldNotify = isOwnInvoice || isAdmin || isSuperAdmin;

    if (!shouldNotify) return;

    addNotification({
      type: NOTIFICATION_TYPES.STOCK_UPDATE_FAILED,
      priority: NOTIFICATION_PRIORITY.ERROR,
      title: 'Krājumu atjaunināšana neizdevās',
      message: `Neizdevās atjaunināt krājumus rēķinam ${invoice.invoice_number}. ${errorMessage ? `Kļūda: ${errorMessage}` : 'Lūdzu, pārbaudiet manuāli.'}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      actionUrl: `/invoices/${invoice.id}`,
      metadata: { errorMessage },
    });
  }, [currentUser, isAdmin, isSuperAdmin, addNotification]);

  /**
   * Check and send daily digest notifications
   */
  const checkDailyDigest = useCallback(async () => {
    if (!userProfile) return;

    const today = new Date().toDateString();
    if (lastDailyDigest === today) return; // Already sent today

    const userId = userProfile.id;
    const userIsAdmin = isAdmin || isSuperAdmin;

    try {
      // Build invoice query
      let invoiceQuery = supabase.from('invoices').select('*');
      if (!userIsAdmin) {
        invoiceQuery = invoiceQuery.eq('user_id', userId);
      }

      const { data: allInvoices, error } = await invoiceQuery;
      if (error) throw error;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Check overdue invoices
      const overdueInvoices = allInvoices?.filter((inv) => {
        if (inv.status !== 'overdue') return false;
        if (!userIsAdmin && inv.user_id !== userId) return false;
        return true;
      }) || [];

      if (overdueInvoices.length > 0) {
        const ownOverdue = overdueInvoices.filter((inv) => inv.user_id === userId);
        const othersOverdue = overdueInvoices.filter((inv) => inv.user_id !== userId);

        if (ownOverdue.length > 0) {
          addNotification({
            type: NOTIFICATION_TYPES.OVERDUE_INVOICES,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Kavēti rēķini',
            message: `Jums ir ${ownOverdue.length} kavēts${ownOverdue.length > 1 ? 'i' : ''} rēķins${ownOverdue.length > 1 ? 'i' : ''}.`,
            actionUrl: '/invoices?status=overdue',
            metadata: { count: ownOverdue.length, invoices: ownOverdue },
          });
        }

        if (userIsAdmin && othersOverdue.length > 0) {
          addNotification({
            type: NOTIFICATION_TYPES.OVERDUE_INVOICES,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Kavēti rēķini (sistēma)',
            message: `Sistēmā ir ${othersOverdue.length} kavēts${othersOverdue.length > 1 ? 'i' : ''} rēķins${othersOverdue.length > 1 ? 'i' : ''}.`,
            actionUrl: '/invoices?status=overdue',
            metadata: { count: othersOverdue.length, invoices: othersOverdue },
          });
        }
      }

      // Check pending investigation (3+ days old)
      const pendingInvestigation = allInvoices?.filter((inv) => {
        if (inv.status !== 'pending') return false;
        const createdDate = new Date(inv.created_at);
        if (createdDate > threeDaysAgo) return false;
        if (!userIsAdmin && inv.user_id !== userId) return false;
        return true;
      }) || [];

      if (pendingInvestigation.length > 0) {
        const ownPending = pendingInvestigation.filter((inv) => inv.user_id === userId);
        const othersPending = pendingInvestigation.filter((inv) => inv.user_id !== userId);

        if (ownPending.length > 0) {
          addNotification({
            type: NOTIFICATION_TYPES.PENDING_INVESTIGATION,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Rēķini gaida pārbaudi',
            message: `${ownPending.length} rēķins${ownPending.length > 1 ? 'i' : ''} gaida apmaksu jau 3+ dienas. Nepieciešama pārbaude.`,
            actionUrl: '/invoices?status=pending',
            metadata: { count: ownPending.length, invoices: ownPending },
          });
        }

        if (userIsAdmin && othersPending.length > 0) {
          addNotification({
            type: NOTIFICATION_TYPES.PENDING_INVESTIGATION,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Rēķini gaida pārbaudi (sistēma)',
            message: `Sistēmā ir ${othersPending.length} rēķins${othersPending.length > 1 ? 'i' : ''}, kas gaida apmaksu jau 3+ dienas.`,
            actionUrl: '/invoices?status=pending',
            metadata: { count: othersPending.length, invoices: othersPending },
          });
        }
      }

      // Check draft deletion warnings (1+ days old, will be deleted in 2 days)
      if (!userIsAdmin) {
        const draftWarnings = allInvoices?.filter((inv) => {
          if (inv.status !== 'draft') return false;
          if (inv.user_id !== userId) return false;
          const createdDate = new Date(inv.created_at);
          return createdDate <= oneDayAgo;
        }) || [];

        if (draftWarnings.length > 0) {
          addNotification({
            type: NOTIFICATION_TYPES.DRAFT_DELETION_WARNING,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Melnraksti tiks dzēsti',
            message: `${draftWarnings.length} melnraksts${draftWarnings.length > 1 ? 'i' : ''} tiks dzēsts${draftWarnings.length > 1 ? 'ti' : ''} pēc 2 dienām. Lūdzu, pabeidziet vai dzēsiet tos.`,
            actionUrl: '/invoices?status=draft',
            metadata: { count: draftWarnings.length, invoices: draftWarnings },
          });
        }
      }

      setLastDailyDigest(today);
    } catch (error) {
      console.error('Error checking daily digest:', error);
    }
  }, [userProfile, isAdmin, isSuperAdmin, lastDailyDigest, addNotification]);

  // Check daily digest on mount and when user profile loads
  useEffect(() => {
    if (userProfile) {
      // Check immediately
      checkDailyDigest();

      // Then check daily at 9 AM
      const now = new Date();
      const nextCheck = new Date(now);
      nextCheck.setHours(9, 0, 0, 0);
      if (nextCheck <= now) {
        nextCheck.setDate(nextCheck.getDate() + 1);
      }

      const timeUntilCheck = nextCheck.getTime() - now.getTime();
      const timeoutId = setTimeout(() => {
        checkDailyDigest();
        // Then check every 24 hours
        const intervalId = setInterval(checkDailyDigest, 24 * 60 * 60 * 1000);
        return () => clearInterval(intervalId);
      }, timeUntilCheck);

      return () => clearTimeout(timeoutId);
    }
  }, [userProfile, checkDailyDigest]);

  // Subscribe to real-time invoice updates
  useEffect(() => {
    if (!currentUser) return;

    const subscription = supabase
      .channel('invoice-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          const invoice = payload.new;
          const oldInvoice = payload.old;

          // Invoice paid notification
          if (invoice.status === 'paid' && oldInvoice.status !== 'paid') {
            notifyInvoicePaid(invoice, invoice.payment_method || '');
          }

          // Stock update failed notification
          if (invoice.stock_update_status === 'failed') {
            notifyStockUpdateFailed(invoice);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser, notifyInvoicePaid, notifyStockUpdateFailed]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    notifyInvoicePaid,
    notifyEmailSendFailed,
    notifyStockUpdateFailed,
    checkDailyDigest,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

