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

// Helper functions for localStorage persistence
const getStorageKey = (userId) => `notifications_${userId}`;
const getDeletedKeysKey = (userId) => `deleted_notification_keys_${userId}`;
const getLastDigestKey = (userId) => `last_daily_digest_${userId}`;

const loadNotifications = (userId) => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveNotifications = (userId, notifications) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
};

const loadDeletedKeys = (userId) => {
  try {
    const stored = localStorage.getItem(getDeletedKeysKey(userId));
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveDeletedKeys = (userId, deletedKeys) => {
  try {
    localStorage.setItem(getDeletedKeysKey(userId), JSON.stringify(Array.from(deletedKeys)));
  } catch (error) {
    console.error('Failed to save deleted keys:', error);
  }
};

// Generate a unique key for daily digest notifications based on type, date, and metadata
const generateNotificationKey = (type, metadata = {}) => {
  const today = new Date().toDateString();
  // For daily digest notifications, use type + date + relevant metadata
  if (type === NOTIFICATION_TYPES.OVERDUE_INVOICES || 
      type === NOTIFICATION_TYPES.PENDING_INVESTIGATION || 
      type === NOTIFICATION_TYPES.DRAFT_DELETION_WARNING) {
    // Use count and user-specific info to create unique key
    const metaString = JSON.stringify({ 
      count: metadata.count, 
      isOwn: metadata.invoices?.[0]?.user_id || null,
      date: today 
    });
    return `${type}_${today}_${metaString}`;
  }
  // For real-time notifications, use type + invoice ID + timestamp (they're unique anyway)
  return `${type}_${metadata.invoiceId || ''}_${Date.now()}`;
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { isAdmin, isSuperAdmin, userProfile } = useUserRole();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastDailyDigest, setLastDailyDigest] = useState(null);
  const [deletedNotificationKeys, setDeletedNotificationKeys] = useState(new Set());
  
  // Helper to recalculate unread count from notifications
  const recalculateUnreadCount = useCallback((notificationsList) => {
    return notificationsList.filter(n => !n.read).length;
  }, []);

  /**
   * Add a notification to the list
   */
  const addNotification = useCallback((notificationData, notificationKey = null) => {
    if (!currentUser?.id) return null;

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

    // Generate notification key if not provided
    const key = notificationKey || generateNotificationKey(type, metadata);
    
    // Check if this notification was deleted
    if (deletedNotificationKeys.has(key)) {
      return null;
    }

    // Check if notification with same key already exists (for daily digest)
    setNotifications((prev) => {
      const existingIndex = prev.findIndex(n => n.notificationKey === key);
      if (existingIndex !== -1) {
        // Notification already exists, don't add duplicate
        return prev;
      }

      const newNotification = {
        id: `${Date.now()}-${Math.random()}`,
        notificationKey: key, // Store the key for tracking
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

      const updated = [newNotification, ...prev].slice(0, 50); // Keep last 50
      saveNotifications(currentUser.id, updated);
      
      // Recalculate unread count from the updated list
      const newUnreadCount = recalculateUnreadCount(updated);
      setUnreadCount(newUnreadCount);
      
      return updated;
    });

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

    // Return notification key instead of id for tracking
    return key;
  }, [currentUser, deletedNotificationKeys, recalculateUnreadCount]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    if (!currentUser?.id) return;
    
    setNotifications((prev) => {
      const updated = prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      saveNotifications(currentUser.id, updated);
      
      // Recalculate unread count
      const newUnreadCount = recalculateUnreadCount(updated);
      setUnreadCount(newUnreadCount);
      
      return updated;
    });
  }, [currentUser, recalculateUnreadCount]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    if (!currentUser?.id) return;
    
    setNotifications((prev) => {
      const updated = prev.map((notif) => ({ ...notif, read: true }));
      saveNotifications(currentUser.id, updated);
      setUnreadCount(0);
      return updated;
    });
  }, [currentUser]);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    if (!currentUser?.id) return;
    
    // Mark all notification keys as deleted to prevent regeneration
    setNotifications((prev) => {
      const newDeletedKeys = new Set(deletedNotificationKeys);
      prev.forEach(notif => {
        if (notif.notificationKey) {
          newDeletedKeys.add(notif.notificationKey);
        }
      });
      setDeletedNotificationKeys(newDeletedKeys);
      saveDeletedKeys(currentUser.id, newDeletedKeys);
      return [];
    });
    setUnreadCount(0);
    saveNotifications(currentUser.id, []);
  }, [currentUser, deletedNotificationKeys]);

  /**
   * Remove a notification
   */
  const removeNotification = useCallback((notificationId) => {
    if (!currentUser?.id) return;
    
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      
      // Mark notification key as deleted if it's a daily digest notification
      if (notification?.notificationKey) {
        const newDeletedKeys = new Set(deletedNotificationKeys);
        newDeletedKeys.add(notification.notificationKey);
        setDeletedNotificationKeys(newDeletedKeys);
        saveDeletedKeys(currentUser.id, newDeletedKeys);
      }
      
      const updated = prev.filter((n) => n.id !== notificationId);
      saveNotifications(currentUser.id, updated);
      
      // Recalculate unread count
      const newUnreadCount = recalculateUnreadCount(updated);
      setUnreadCount(newUnreadCount);
      
      return updated;
    });
  }, [currentUser, deletedNotificationKeys, recalculateUnreadCount]);

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
    
    // Check localStorage for last digest if state is not set
    let lastDigest = lastDailyDigest;
    if (!lastDigest && userProfile?.id) {
      try {
        const stored = localStorage.getItem(getLastDigestKey(userProfile.id));
        if (stored) {
          lastDigest = stored;
          setLastDailyDigest(stored);
        }
      } catch {
        // Ignore
      }
    }
    
    if (lastDigest === today) return; // Already sent today

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
          const key = generateNotificationKey(NOTIFICATION_TYPES.OVERDUE_INVOICES, { 
            count: ownOverdue.length, 
            invoices: ownOverdue 
          });
          addNotification({
            type: NOTIFICATION_TYPES.OVERDUE_INVOICES,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Kavēti rēķini',
            message: `Jums ir ${ownOverdue.length} ${ownOverdue.length > 1 ? 'kavēti rēķini' : 'kavēts rēķins'}.`,
            actionUrl: '/invoices?status=overdue',
            metadata: { count: ownOverdue.length, invoices: ownOverdue },
          }, key);
        }

        if (userIsAdmin && othersOverdue.length > 0) {
          const key = generateNotificationKey(NOTIFICATION_TYPES.OVERDUE_INVOICES, { 
            count: othersOverdue.length, 
            invoices: othersOverdue 
          });
          addNotification({
            type: NOTIFICATION_TYPES.OVERDUE_INVOICES,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Kavēti rēķini (sistēma)',
            message: `Sistēmā ir ${othersOverdue.length} ${othersOverdue.length > 1 ? 'kavēti rēķini' : 'kavēts rēķins'}.`,
            actionUrl: '/invoices?status=overdue',
            metadata: { count: othersOverdue.length, invoices: othersOverdue },
          }, key);
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
          const key = generateNotificationKey(NOTIFICATION_TYPES.PENDING_INVESTIGATION, { 
            count: ownPending.length, 
            invoices: ownPending 
          });
          addNotification({
            type: NOTIFICATION_TYPES.PENDING_INVESTIGATION,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Rēķini gaida pārbaudi',
            message: `${ownPending.length} ${ownPending.length > 1 ? 'rēķini' : 'rēķins'} gaida apmaksu jau 3+ dienas. Nepieciešama pārbaude.`,
            actionUrl: '/invoices?status=pending',
            metadata: { count: ownPending.length, invoices: ownPending },
          }, key);
        }

        if (userIsAdmin && othersPending.length > 0) {
          const key = generateNotificationKey(NOTIFICATION_TYPES.PENDING_INVESTIGATION, { 
            count: othersPending.length, 
            invoices: othersPending 
          });
          addNotification({
            type: NOTIFICATION_TYPES.PENDING_INVESTIGATION,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Rēķini gaida pārbaudi (sistēma)',
            message: `Sistēmā ir ${othersPending.length} ${othersPending.length > 1 ? 'rēķini' : 'rēķins'}, kas gaida apmaksu jau 3+ dienas.`,
            actionUrl: '/invoices?status=pending',
            metadata: { count: othersPending.length, invoices: othersPending },
          }, key);
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
          const key = generateNotificationKey(NOTIFICATION_TYPES.DRAFT_DELETION_WARNING, { 
            count: draftWarnings.length, 
            invoices: draftWarnings 
          });
          addNotification({
            type: NOTIFICATION_TYPES.DRAFT_DELETION_WARNING,
            priority: NOTIFICATION_PRIORITY.WARNING,
            title: 'Melnraksti tiks dzēsti',
            message: `${draftWarnings.length} melnraksts${draftWarnings.length > 1 ? 'i' : ''} tiks dzēsts${draftWarnings.length > 1 ? 'ti' : ''} pēc 2 dienām. Lūdzu, pabeidziet vai dzēsiet tos.`,
            actionUrl: '/invoices?status=draft',
            metadata: { count: draftWarnings.length, invoices: draftWarnings },
          }, key);
        }
      }

      setLastDailyDigest(today);
      // Save last daily digest date to localStorage
      if (userProfile?.id) {
        try {
          localStorage.setItem(getLastDigestKey(userProfile.id), today);
        } catch {
          // Ignore
        }
      }
    } catch (error) {
    }
  }, [userProfile, isAdmin, isSuperAdmin, lastDailyDigest, addNotification]);

  // Load notifications and deleted keys from localStorage on mount
  useEffect(() => {
    if (currentUser?.id) {
      const loadedNotifications = loadNotifications(currentUser.id);
      const loadedDeletedKeys = loadDeletedKeys(currentUser.id);
      
      // Calculate unread count from loaded notifications
      const unread = loadedNotifications.filter(n => !n.read).length;
      
      setNotifications(loadedNotifications);
      setUnreadCount(unread);
      setDeletedNotificationKeys(loadedDeletedKeys);
      
      // Load last daily digest date
      try {
        const storedDigest = localStorage.getItem(getLastDigestKey(currentUser.id));
        if (storedDigest) {
          setLastDailyDigest(storedDigest);
        }
      } catch {
        // Ignore
      }
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setDeletedNotificationKeys(new Set());
    }
  }, [currentUser]);

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

    console.log('🔔 Setting up realtime subscription for invoice notifications...');

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
          console.log('📨 Realtime event received:', {
            event: payload.eventType,
            invoiceNumber: payload.new?.invoice_number,
            oldStatus: payload.old?.status,
            newStatus: payload.new?.status,
          });

          const invoice = payload.new;
          const oldInvoice = payload.old;

          // Invoice paid notification
          if (invoice.status === 'paid' && oldInvoice.status !== 'paid') {
            console.log('✅ Invoice paid! Showing notification...');
            notifyInvoicePaid(invoice, invoice.payment_method || '');
          }

          // Stock update failed notification
          if (invoice.stock_update_status === 'failed') {
            console.log('❌ Stock update failed! Showing notification...');
            notifyStockUpdateFailed(invoice);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from realtime...');
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

