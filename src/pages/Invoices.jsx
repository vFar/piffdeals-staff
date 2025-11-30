import { useState, useEffect } from 'react';
import { Button, Table, message, Modal, Input, Dropdown, Card, Typography, Spin, Tag, App, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, MoreOutlined, EyeOutlined, LinkOutlined, DeleteOutlined, SearchOutlined, EditOutlined, MailOutlined, CheckOutlined, CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import { useNotifications } from '../contexts/NotificationContext';
import { logInvoiceAction, ActionTypes } from '../services/activityLogService';
import { mozelloService } from '../services/mozelloService';

const { Title, Text } = Typography;

const Invoices = () => {
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load separately
  const [searchText, setSearchText] = useState('');
  const [paymentLinkModal, setPaymentLinkModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [shareMethodModal, setShareMethodModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lastEmailSent, setLastEmailSent] = useState(null);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const { isAdmin, isSuperAdmin, userProfile } = useUserRole();
  const { notifyEmailSendFailed, notifyInvoicePaid } = useNotifications();

  useEffect(() => {
    // Only fetch invoices when userProfile is loaded
    if (userProfile) {
      fetchInvoices();
    }
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('invoice-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          if (payload.new.status === 'paid') {
            message.success(`Rēķins ${payload.new.invoice_number} ir apmaksāts!`);
            fetchInvoices();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userProfile]);

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const lowerSearch = searchText.toLowerCase();
    const filtered = invoices.filter((invoice) => {
      const invoiceNumber = (invoice.invoice_number || '').toLowerCase();
      const customerName = (invoice.customer_name || '').toLowerCase();
      const status = (invoice.status || '').toLowerCase();
      
      return invoiceNumber.includes(lowerSearch) || 
             customerName.includes(lowerSearch) || 
             status.includes(lowerSearch);
    });

    setFilteredInvoices(filtered);
  }, [searchText, invoices]);

  // Preserve selectedInvoice when invoices list updates (e.g., after fetchInvoices)
  // This keeps the modal open even when invoices are refreshed
  useEffect(() => {
    if (selectedInvoice?.id && invoices.length > 0 && shareMethodModal) {
      const updatedInvoice = invoices.find(inv => inv.id === selectedInvoice.id);
      if (updatedInvoice) {
        // Update selectedInvoice with fresh data to keep modal in sync
        setSelectedInvoice(updatedInvoice);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, shareMethodModal]);

  const fetchInvoices = async () => {
    try {
      // Only show spinner on initial load, not on refreshes
      if (initialLoad) {
        setLoading(true);
      }
      
      // Fetch invoices
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // Employees can only see their own invoices
      if (!isAdmin && !isSuperAdmin) {
        query = query.eq('user_id', userProfile?.id);
      }

      const { data: invoicesData, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;

      // Fetch all unique user profiles for the creators
      const uniqueUserIds = [...new Set(invoicesData?.map(inv => inv.user_id).filter(Boolean))];
      
      let userProfilesMap = {};
      if (uniqueUserIds.length > 0) {
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
      setFilteredInvoices(enrichedInvoices);
    } catch (error) {
      message.error('Neizdevās ielādēt rēķinus');
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false); // Mark initial load as complete
      }
    }
  };

  const handleViewPaymentLink = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentLinkModal(true);
  };

  const copyPaymentLink = () => {
    if (selectedInvoice?.stripe_payment_link) {
      navigator.clipboard.writeText(selectedInvoice.stripe_payment_link);
      message.success('Maksājuma saite nokopēta starpliktuvē!');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    try {
      // Find the invoice to verify it's a draft
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        message.error('Rēķins nav atrasts');
        return;
      }

      if (invoice.status !== 'draft') {
        message.error('Var dzēst tikai melnraksta rēķinus');
        return;
      }

      // Check permissions
      // Super admin can always delete draft invoices
      if (isSuperAdmin) {
        // Super admin has full permissions, proceed with deletion
      } else {
        const isCreator = invoice.user_id === userProfile?.id;
        // Admin (not super_admin) can delete invoices created by employees
        const isAdminOnly = isAdmin && !isSuperAdmin;
        const creatorIsEmployee = invoice.creator?.role === 'employee';
        const canDeleteAsAdmin = isAdminOnly && creatorIsEmployee;
        
        if (!isCreator && !canDeleteAsAdmin) {
          message.error('Jums nav tiesību dzēst šo rēķinu');
          return;
        }
      }

      const { data, error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .select();

      if (error) {
        throw error;
      }

      // Check if any rows were actually deleted
      if (!data || data.length === 0) {
        message.error('Neizdevās dzēst rēķinu. Pārbaudiet, vai rēķins ir melnraksts un vai jums ir tiesības to dzēst.');
        return;
      }

      // Log invoice deletion
      const isOwnInvoice = invoice.user_id === userProfile?.id;
      await logInvoiceAction(
        ActionTypes.INVOICE_DELETED,
        `Dzēsts rēķins ${invoice.invoice_number}${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`,
        {
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          total_amount: parseFloat(invoice.total || 0),
          is_own_invoice: isOwnInvoice,
          is_other_user_invoice: !isOwnInvoice,
          creator_username: invoice.creator?.username || 'Nezināms',
          deleted_by: userProfile?.username || 'Nezināms',
        },
        invoice.id
      );

      message.success('Rēķins veiksmīgi dzēsts');
      fetchInvoices();
    } catch (error) {
      const errorMessage = error?.message || 'Neizdevās dzēst rēķinu';
      message.error(errorMessage);
    }
  };

  const handleResendInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setShareMethodModal(true);
  };

  const handleSendEmailResend = async () => {
    // Validation
    if (!selectedInvoice?.public_token || !selectedInvoice?.customer_email) {
      message.error({
        content: 'Nav iespējams nosūtīt e-pastu: trūkst rēķina datu vai e-pasta adreses.',
        duration: 5,
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedInvoice.customer_email)) {
      message.error({
        content: 'E-pasta adrese nav derīga. Lūdzu, pārbaudiet e-pasta adresi.',
        duration: 5,
      });
      return;
    }

    // Store invoice ID to preserve reference during updates
    const invoiceId = selectedInvoice.id;
    const currentInvoice = { ...selectedInvoice };

    // Show loading message
    const loadingMessage = message.loading({
      content: 'Nosūta e-pastu...',
      duration: 0, // Don't auto-close
      key: 'sending-email',
    });

    try {
      setSendingEmail(true);
      
      // Get current session for authentication and refresh if needed
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check if session exists and token is still valid (not expired)
      const isTokenExpired = session?.expires_at 
        ? session.expires_at * 1000 < Date.now() + 60000 // Expires within 1 minute
        : false;
      
      // If no session, session error, or token is expired/expiring soon, try to refresh
      if (!session || sessionError || isTokenExpired || !session.access_token) {
        console.log('Session expired or missing, attempting to refresh...');
        
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshedSession && refreshedSession.access_token) {
          session = refreshedSession;
          sessionError = null;
          console.log('Session refreshed successfully');
        } else if (refreshError) {
          console.error('Failed to refresh session:', refreshError);
          
          // If refresh fails, user needs to log in again
          // Clear any stale session data
          await supabase.auth.signOut();
          
          throw new Error('Jūsu sesija ir beigusies. Lūdzu, pieslēdzieties atkārtoti.');
        }
      }
      
      // Final check - if still no session or no access token, throw error
      if (!session || !session.access_token) {
        console.error('No valid session after refresh attempt');
        throw new Error('Nav autentificēts. Lūdzu, pieslēdzieties atkārtoti.');
      }
      
      console.log('Using session token (expires at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown', ')');
      
      // Call Supabase Edge Function to send email with timeout
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, ''); // Remove trailing slash
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-invoice-email`;
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout
      
      let response;
      try {
        response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            invoiceId: currentInvoice.id,
            customerEmail: currentInvoice.customer_email,
            customerName: currentInvoice.customer_name,
            invoiceNumber: currentInvoice.invoice_number,
            publicToken: currentInvoice.public_token,
            total: currentInvoice.total
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Handle timeout
        if (fetchError.name === 'AbortError') {
          throw new Error('Pieprasījums aizņēma pārāk daudz laika. Lūdzu, mēģiniet vēlreiz.');
        }
        
        // Handle network errors
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('network')) {
          throw new Error('Neizdevās izveidot savienojumu. Pārbaudiet interneta savienojumu un mēģiniet vēlreiz.');
        }
        
        throw fetchError;
      }
      
      // Parse response
      let errorData = {};
      let data = {};
      
      try {
        const responseText = await response.text();
        if (responseText) {
          const parsed = JSON.parse(responseText);
          if (!response.ok) {
            errorData = parsed;
          } else {
            data = parsed;
          }
        }
      } catch (parseError) {
        // If response is not JSON, use status text
        if (!response.ok) {
          errorData = { error: response.statusText, message: response.statusText };
        }
      }
      
      if (!response.ok) {
        // Handle specific error status codes
        if (response.status === 429) {
          const cooldownError = new Error(errorData.message || errorData.error || 'Cooldown active');
          cooldownError.status = 429;
          cooldownError.cooldownRemaining = errorData.cooldownRemaining;
          cooldownError.errorType = 'cooldown'; // Always set to 'cooldown' for 429 errors
          throw cooldownError;
        } else if (response.status === 401 || response.status === 403) {
          const authError = new Error(errorData.message || 'Nav autentificēts');
          authError.status = response.status;
          authError.errorType = errorData.errorType || 'auth_error';
          throw authError;
        } else if (response.status === 404) {
          const notFoundError = new Error(errorData.message || 'Rēķins nav atrasts');
          notFoundError.status = 404;
          notFoundError.errorType = errorData.errorType || 'not_found';
          throw notFoundError;
        } else if (response.status === 503 || response.status === 504) {
          const serviceError = new Error(errorData.message || 'Serviss nav pieejams');
          serviceError.status = response.status;
          serviceError.errorType = errorData.errorType || 'service_unavailable';
          throw serviceError;
        } else {
          const httpError = new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          httpError.status = response.status;
          httpError.errorType = errorData.errorType || 'http_error';
          throw httpError;
        }
      }

      // Verify response data
      if (!data?.success && !data?.emailId) {
        throw new Error('E-pasta serviss atgrieza negaidītu atbildi. E-pasts var nebūt nosūtīts.');
      }

      // Log invoice resend
      const isOwnInvoice = currentInvoice.user_id === userProfile?.id;
      try {
        await logInvoiceAction(
          ActionTypes.INVOICE_RESENT,
          `Nosūtīts rēķins ${currentInvoice.invoice_number} klientam vēlreiz${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`,
          {
            invoice_number: currentInvoice.invoice_number,
            customer_name: currentInvoice.customer_name,
            customer_email: currentInvoice.customer_email,
            total_amount: parseFloat(currentInvoice.total || 0),
            is_own_invoice: isOwnInvoice,
            is_other_user_invoice: !isOwnInvoice,
            creator_username: currentInvoice.creator?.username || 'Nezināms',
            resent_by: userProfile?.username || 'Nezināms',
          },
          invoiceId
        );
      } catch (logError) {
        console.error('Failed to log invoice resend:', logError);
        // Don't fail the entire operation if logging fails
      }

      // Update invoice status to 'sent' if it's not already
      if (currentInvoice.status !== 'sent') {
        try {
          const sentAt = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ 
              status: 'sent',
              sent_at: sentAt
            })
            .eq('id', invoiceId);
          
          if (updateError) {
            console.error('Failed to update invoice status:', updateError);
            // Don't fail the entire operation if status update fails
          } else {
            // Update selectedInvoice to reflect new status without closing modal
            setSelectedInvoice(prev => prev ? { ...prev, status: 'sent', sent_at: sentAt } : null);
            // Also update in invoices list to keep data in sync
            setInvoices(prev => prev.map(inv => 
              inv.id === invoiceId ? { ...inv, status: 'sent', sent_at: sentAt } : inv
            ));
            setFilteredInvoices(prev => prev.map(inv => 
              inv.id === invoiceId ? { ...inv, status: 'sent', sent_at: sentAt } : inv
            ));
          }
        } catch (statusError) {
          console.error('Error updating invoice status:', statusError);
          // Don't fail the entire operation if status update fails
        }
      }

      // Update last email sent time
      setLastEmailSent(Date.now());
      
      // Set cooldown to 10 minutes (600 seconds)
      setEmailCooldown(600);
      
      // Update cooldown every second
      const cooldownInterval = setInterval(() => {
        setEmailCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Close loading message and show success
      message.destroy('sending-email');
      message.success({
        content: `E-pasts veiksmīgi nosūtīts uz ${currentInvoice.customer_email}!`,
        duration: 5,
      });
      
      // Keep modal open - don't close it
    } catch (error) {
      // Close loading message
      message.destroy('sending-email');
      
      // Categorize and handle different error types
      let errorMessage = 'Nezināma kļūda';
      let errorType = error?.errorType || 'unknown';
      let showWarning = false;
      
      // Handle specific error types with user-friendly messages
      if (error?.status === 429 || error?.message?.includes('Cooldown') || error?.message?.includes('wait') || error?.message?.includes('uzgaidiet') || error?.errorType === 'cooldown') {
        // Try to extract cooldown from error message or response
        let cooldownSeconds = 600; // Default 10 minutes
        
        // Try to extract from error message
        const cooldownMatch = error?.message?.match(/(\d+)\s*minute/i);
        if (cooldownMatch) {
          cooldownSeconds = parseInt(cooldownMatch[1]) * 60;
        }
        
        // Try to extract from error context/body
        if (error?.cooldownRemaining) {
          cooldownSeconds = error.cooldownRemaining;
        }
        
        setEmailCooldown(cooldownSeconds);
        
        // Update cooldown every second
        const cooldownInterval = setInterval(() => {
          setEmailCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        const minutes = Math.ceil(cooldownSeconds / 60);
        errorMessage = `Lūdzu, uzgaidiet ${minutes} minūte(s) pirms nākamās sūtīšanas`;
        showWarning = true;
        errorType = 'cooldown';
      } else if (error?.status === 401 || error?.status === 403 || error?.message?.includes('autentificēts') || error?.message?.includes('Nav tiesību')) {
        errorMessage = error.message || 'Nav autentificēts. Lūdzu, pieslēdzieties atkārtoti.';
        errorType = 'auth_error';
      } else if (error?.status === 404 || error?.message?.includes('nav atrasts')) {
        errorMessage = error.message || 'Rēķins nav atrasts. Lūdzu, pārbaudiet un mēģiniet vēlreiz.';
        errorType = 'not_found';
      } else if (error?.status === 503 || error?.status === 504 || error?.message?.includes('nav pieejams') || error?.message?.includes('timeout') || error?.message?.includes('aizņēma')) {
        errorMessage = error.message || 'Serviss nav pieejams vai pieprasījums aizņēma pārāk daudz laika. Lūdzu, mēģiniet vēlreiz.';
        errorType = 'service_unavailable';
      } else if (error?.message?.includes('savienojumu') || error?.message?.includes('network') || error?.message?.includes('interneta')) {
        errorMessage = error.message || 'Neizdevās izveidot savienojumu. Pārbaudiet interneta savienojumu.';
        errorType = 'network_error';
      } else if (error?.message?.includes('e-pasta adrese') || error?.message?.includes('email') || error?.message?.includes('validation')) {
        errorMessage = error.message || 'E-pasta adrese nav derīga. Lūdzu, pārbaudiet e-pasta adresi.';
        errorType = 'validation_error';
      } else {
        errorMessage = error?.message || 'Neizdevās nosūtīt e-pastu. Lūdzu, mēģiniet vēlreiz.';
      }
      
      // Show appropriate message type (skip warning for cooldown as it's handled by button state)
      if (showWarning && errorType !== 'cooldown') {
        message.warning({
          content: errorMessage,
          duration: 6,
        });
      } else if (errorType !== 'cooldown') {
        message.error({
          content: errorMessage,
          duration: 6,
        });
      }
      
      // Notify via notification system
      if (selectedInvoice) {
        notifyEmailSendFailed(selectedInvoice, errorMessage);
      }
      
      // Still update status to 'sent' even if email fails (for resend scenarios)
      // This allows users to manually share the link even if email fails
      if (currentInvoice.status !== 'sent') {
        try {
          const sentAt = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ 
              status: 'sent',
              sent_at: sentAt
            })
            .eq('id', invoiceId);
          
          if (!updateError) {
            setSelectedInvoice(prev => prev ? { ...prev, status: 'sent', sent_at: sentAt } : null);
            // Also update in invoices list to keep data in sync
            setInvoices(prev => prev.map(inv => 
              inv.id === invoiceId ? { ...inv, status: 'sent', sent_at: sentAt } : inv
            ));
            setFilteredInvoices(prev => prev.map(inv => 
              inv.id === invoiceId ? { ...inv, status: 'sent', sent_at: sentAt } : inv
            ));
          }
        } catch (statusError) {
          console.error('Error updating invoice status after email failure:', statusError);
          // Don't show error to user - status update failure is not critical
        }
      }
      
      // Log error for debugging (skip for cooldown errors as they're user-facing)
      if (errorType !== 'cooldown') {
        console.error('Send email error:', {
          errorType,
          message: error?.message,
          status: error?.status,
          invoiceId: currentInvoice.id,
          customerEmail: currentInvoice.customer_email,
        });
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkAsPaid = async (invoice) => {
        try {
          // Check if stock was already updated to avoid duplicate updates
          const shouldUpdateStock = invoice.stock_update_status !== 'completed';
          
          // Update invoice status to paid first
          const { error } = await supabase
            .from('invoices')
            .update({ 
              status: 'paid',
              paid_date: new Date().toISOString(),
              payment_method: invoice.payment_method || 'manuāli',
              // Mark stock update as pending if we need to update it
              ...(shouldUpdateStock && { stock_update_status: 'pending' })
            })
            .eq('id', invoice.id);

          if (error) throw error;
          
          // Update stock in Mozello if not already completed
          if (shouldUpdateStock) {
            try {
              const stockUpdateResult = await mozelloService.updateStock(invoice.id);
              
              // Update invoice with stock update status
              const stockUpdateStatus = stockUpdateResult?.success !== false ? 'completed' : 'failed';
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: stockUpdateStatus,
                  stock_updated_at: new Date().toISOString(),
                })
                .eq('id', invoice.id);
              
              if (stockUpdateStatus === 'failed') {
                message.warning('Rēķins atzīmēts kā apmaksāts, bet neizdevās atjaunināt krājumus Mozello veikalā. Lūdzu, pārbaudiet manuāli.');
              }
            } catch (stockError) {
              // Mark stock update as failed but don't fail the entire operation
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: 'failed',
                })
                .eq('id', invoice.id);
              
              message.warning('Rēķins atzīmēts kā apmaksāts, bet neizdevās atjaunināt krājumus Mozello veikalā. Lūdzu, pārbaudiet manuāli.');
            }
          }
          
          // Log invoice status change to paid
          const isOwnInvoice = invoice.user_id === userProfile?.id;
          await logInvoiceAction(
            ActionTypes.INVOICE_STATUS_CHANGED,
            `Rēķins ${invoice.invoice_number} atzīmēts kā apmaksāts${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`,
            {
              invoice_number: invoice.invoice_number,
              old_invoice_status: invoice.status,
              new_invoice_status: 'paid',
              customer_name: invoice.customer_name,
              total_amount: parseFloat(invoice.total || 0),
              payment_method: invoice.payment_method || 'manuāli',
              is_own_invoice: isOwnInvoice,
              is_other_user_invoice: !isOwnInvoice,
              creator_username: invoice.creator?.username || 'Nezināms',
              modified_by: userProfile?.username || 'Nezināms',
            },
            invoice.id
          );
          
          message.success('Rēķins atzīmēts kā apmaksāts!');
          
          // Notify via notification system (real-time subscription will also catch this)
          const updatedInvoice = { ...invoice, status: 'paid', paid_date: new Date().toISOString() };
          notifyInvoicePaid(updatedInvoice, invoice.payment_method || 'manuāli');
          
          fetchInvoices();
        } catch (error) {
          message.error('Neizdevās atjaunināt rēķinu');
        }
  };

  const getPublicInvoiceUrl = (invoice) => {
    if (!invoice?.public_token) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/i/${invoice.public_token}`;
  };

  const handleCopyLinkResend = async () => {
    const url = getPublicInvoiceUrl(selectedInvoice);
    if (!url) {
      message.error('Publiskā saite nav pieejama');
      return;
    }
    
    // Copy to clipboard with fallback method
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        // Ensure document is focused
        window.focus();
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers or when clipboard API fails
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (!successful) {
            throw new Error('execCommand failed');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
      setLinkCopied(true);
      message.success('Saite nokopēta starpliktuvē!');
      
      // Close modal after successful copy
      setTimeout(() => {
        setShareMethodModal(false);
        setSelectedInvoice(null);
        setLinkCopied(false);
      }, 500); // Small delay to show the success message
    } catch (error) {
      message.error('Neizdevās nokopēt saiti. Lūdzu, kopējiet manuāli.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getStatusBadgeStyle = (status) => {
    const statusStyles = {
      draft: {
        background: '#f3f4f6',
        color: '#4b5563',
      },
      sent: {
        background: '#dbeafe',
        color: '#1e40af',
      },
      paid: {
        background: '#dcfce7',
        color: '#166534',
      },
      pending: {
        background: '#fef3c7',
        color: '#92400e',
      },
      overdue: {
        background: '#fee2e2',
        color: '#991b1b',
      },
      cancelled: {
        background: '#f3f4f6',
        color: '#4b5563',
      },
    };
    return statusStyles[status] || statusStyles.draft;
  };

  const columns = [
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Rēķina Nr.</span>,
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      sorter: (a, b) => (a.invoice_number || '').localeCompare(b.invoice_number || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ fontWeight: 500, color: '#111827' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Klients</span>,
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ color: '#111827' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Izsniegšanas datums</span>,
      dataIndex: 'issue_date',
      key: 'issue_date',
      sorter: (a, b) => new Date(a.issue_date) - new Date(b.issue_date),
      sortDirections: ['ascend', 'descend'],
      render: (date) => <Text style={{ color: '#6b7280' }}>{formatDate(date)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Apmaksas termiņš</span>,
      dataIndex: 'due_date',
      key: 'due_date',
      sorter: (a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0),
      sortDirections: ['ascend', 'descend'],
      render: (date) => <Text style={{ color: '#6b7280' }}>{formatDate(date)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Summa</span>,
      dataIndex: 'total',
      key: 'total',
      sorter: (a, b) => parseFloat(a.total || 0) - parseFloat(b.total || 0),
      sortDirections: ['ascend', 'descend'],
      render: (amount) => <Text style={{ fontWeight: 500, color: '#111827' }}>€{parseFloat(amount).toFixed(2)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Statuss</span>,
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => {
        const statusOrder = { 'paid': 5, 'sent': 4, 'pending': 3, 'draft': 2, 'overdue': 1, 'cancelled': 0 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (status) => {
        const statusConfig = {
          draft: { 
            label: 'Melnraksts',
            description: 'Rēķins ir izveidots, bet vēl nav nosūtīts klientam. Var rediģēt un dzēst.'
          },
          sent: { 
            label: 'Nosūtīts',
            description: 'Rēķins ir nosūtīts klientam. Var koplietot saiti vai atzīmēt kā apmaksātu.'
          },
          paid: { 
            label: 'Apmaksāts',
            description: 'Rēķins ir apmaksāts. Krājumi ir atjaunināti Mozello veikalā.'
          },
          pending: { 
            label: 'Gaida',
            description: 'Rēķins gaida apmaksu. Var koplietot saiti vai atzīmēt kā apmaksātu.'
          },
          overdue: { 
            label: 'Kavēts',
            description: 'Rēķina apmaksas termiņš ir pagājis. Var koplietot saiti vai atzīmēt kā apmaksātu.'
          },
          cancelled: { 
            label: 'Atcelts',
            description: 'Rēķins ir atcelts un vairs nav aktīvs.'
          },
        };
        const config = statusConfig[status] || { label: status, description: 'Nezināms statuss' };
        const badgeStyle = getStatusBadgeStyle(status);
        return (
          <Tooltip 
            title={
              <div style={{ maxWidth: '250px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{config.label}</div>
                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  {config.description}
                </div>
              </div>
            }
            placement="top"
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 500,
                background: badgeStyle.background,
                color: badgeStyle.color,
                cursor: 'help',
                transition: 'opacity 0.2s',
              }}
            >
              {config.label}
              <InfoCircleOutlined 
                style={{ 
                  fontSize: '11px', 
                  opacity: 0.7,
                  marginLeft: '2px'
                }} 
              />
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Izveidoja</span>,
      dataIndex: 'creator',
      key: 'creator',
      sorter: (a, b) => (a.creator?.username || '').localeCompare(b.creator?.username || ''),
      sortDirections: ['ascend', 'descend'],
      render: (creator) => {
        if (!creator) return <Text style={{ color: '#6b7280' }}>-</Text>;
        
        const roleLabels = {
          'super_admin': 'Galvenais administrators',
          'admin': 'administrators',
          'employee': 'Darbinieks'
        };
        
        const roleStyles = {
          'super_admin': {
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca'
          },
          'admin': {
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe'
          },
          'employee': {
            background: '#f9fafb',
            color: '#6b7280',
            border: '1px solid #e5e7eb'
          }
        };
        
        const roleStyle = roleStyles[creator.role] || roleStyles['employee'];
        
        return (
          <Tooltip
            title={creator.email || 'Nav norādīts'}
            placement="top"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'help' }}>
              <Text style={{ color: '#111827', fontWeight: 500, fontSize: '14px' }}>{creator.username}</Text>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  width: 'fit-content',
                  ...roleStyle
                }}
              >
                {roleLabels[creator.role] || creator.role}
              </span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Darbības</span>,
      key: 'actions',
      render: (_, record) => {
        const menuItems = [];
        const isCreator = record.user_id === userProfile?.id;
        // Admin (not super_admin) can edit/delete invoices created by employees
        const isAdminOnly = isAdmin && !isSuperAdmin;
        const creatorIsEmployee = record.creator?.role === 'employee';
        const canEditAsAdmin = isAdminOnly && creatorIsEmployee;
        const canEdit = record.status === 'draft' && (isCreator || isSuperAdmin || canEditAsAdmin);
        const canDelete = record.status === 'draft' && (isCreator || isSuperAdmin || canEditAsAdmin);
        const canMarkPaid = ['sent', 'pending', 'overdue'].includes(record.status) && (isCreator || isSuperAdmin);
        const canCancel = record.status !== 'paid' && (isCreator || isSuperAdmin);

        // Edit action - for draft invoices (creator, super_admin, or admin for employee invoices)
        if (canEdit) {
          menuItems.push({
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Rediģēt',
            onClick: () => {
              // URL encode the invoice number to handle special characters like #
              const encodedInvoiceNumber = encodeURIComponent(record.invoice_number);
              const path = `/invoices/edit/${encodedInvoiceNumber}`;
              navigate(path);
            },
            style: { fontWeight: 600, color: '#0068FF' },
          });
        }

        // View payment link - for sent invoices with Stripe link
        if (record.stripe_payment_link && record.status === 'sent') {
          menuItems.push({
            key: 'view-link',
            icon: <LinkOutlined />,
            label: 'Skatīt maksājuma saiti',
            onClick: () => handleViewPaymentLink(record),
          });
        }

        // Resend email - for sent, pending, or overdue invoices (creator or super_admin)
        if (['sent', 'pending', 'overdue'].includes(record.status) && (isCreator || isSuperAdmin)) {
          menuItems.push({
            key: 'resend',
            icon: <MailOutlined />,
            label: 'Nosūtīt vēlreiz',
            onClick: () => handleResendInvoice(record),
          });
        }

        // Mark as paid - for sent, pending, or overdue invoices (creator or super_admin) with Popconfirm
        if (canMarkPaid) {
          menuItems.push({
            key: 'mark-paid',
            icon: <CheckOutlined />,
            label: (
              <Popconfirm
                title="Atzīmēt kā apmaksātu?"
                description={
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '8px' }}>
                      Vai apstiprināt, ka rēķins {record.invoice_number} ir apmaksāts?
                    </p>
                    <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                      ⚠️ ŠĪ DARBĪBA IR NEATSAUKAMA!
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', lineHeight: '1.6' }}>
                      Šī darbība automātiski atjauninās krājumus Mozello veikalā, iekļaus rēķinu pārdošanas pārskatos un nevar būt atcelta. Pārliecinieties, ka maksājums ir saņemts pirms apstiprināšanas.
                    </p>
                  </div>
                }
                onConfirm={() => handleMarkAsPaid(record)}
                okText="Apstiprināt"
                cancelText="Atcelt"
                okButtonProps={{ danger: true }}
              >
                <span>Atzīmēt kā apmaksātu</span>
              </Popconfirm>
            ),
          });
        }

        // View invoice - always available
        // For sent/paid invoices with public token, open public invoice in new tab
        // For draft invoices, open internal view
        if (record.public_token && ['sent', 'paid', 'pending', 'overdue'].includes(record.status)) {
          menuItems.push({
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Skatīt',
            onClick: () => window.open(`/i/${record.public_token}`, '_blank'),
          });
        } else {
          menuItems.push({
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Skatīt',
            onClick: () => {
              // URL encode the invoice number to handle special characters like #
              const encodedInvoiceNumber = encodeURIComponent(record.invoice_number);
              const path = `/invoice/${encodedInvoiceNumber}`;
              navigate(path);
            },
          });
        }

        // Delete action - for draft invoices (creator, super_admin, or admin for employee invoices)
        if (canDelete) {
          if (menuItems.length > 0) {
            menuItems.push({ type: 'divider' });
          }
          menuItems.push({
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Dzēst',
            danger: true,
            onClick: () => {
              modal.confirm({
                title: 'Dzēst rēķinu?',
                content: `Vai tiešām vēlaties dzēst rēķinu ${record.invoice_number}?`,
                okText: 'Dzēst',
                okType: 'danger',
                cancelText: 'Atcelt',
                onOk: () => handleDeleteInvoice(record.id),
              });
            },
          });
        }

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              style={{
                padding: '4px',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="action-button"
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
                Rēķini
              </Title>
              <Tooltip 
                title={
                  <div style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>Rēķinu pārvalde</div>
                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      Šeit varat skatīt, meklēt un pārvaldīt visus rēķinus. Darbinieki redz tikai savus rēķinus, bet administratori redz visus. Melnraksta rēķinus var rediģēt un dzēst. Nosūtītos rēķinus var koplietot ar klientiem vai atzīmēt kā apmaksātus. E-pastu var nosūtīt tikai reizi 5 minūtēs.
                    </div>
                  </div>
                }
                placement="right"
              >
                <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
              </Tooltip>
            </div>
            <Text style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
              Pārvaldīt un sekot visiem rēķiniem
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/invoices/create')}
            style={{
              minWidth: '140px',
              height: '40px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Izveidot rēķinu
          </Button>
        </div>

        {/* Search Bar */}
        <Card
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          styles={{ body: { padding: '16px' } }}
        >
          <Input
            placeholder="Meklēt pēc rēķina numura, klienta vai statusa..."
            prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{
              minWidth: '320px',
              height: '40px',
              borderRadius: '8px',
            }}
          />
        </Card>

        {/* Invoices Table */}
        <Card
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          styles={{ body: { padding: 0 } }}
        >
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={columns}
                dataSource={filteredInvoices.map((invoice) => ({ ...invoice, key: invoice.id }))}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) => `Rāda ${range[0]} līdz ${range[1]} no ${total} rezultātiem`,
                  style: {
                    padding: '16px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                }}
                className="custom-table"
                rowClassName={(record) => {
                  const isCreator = record.user_id === userProfile?.id;
                  return record.status === 'draft' && isCreator ? 'custom-table-row draft-row' : 'custom-table-row';
                }}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Payment Link Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Stripe maksājuma saite
          </Title>
        }
        open={paymentLinkModal}
        onCancel={() => setPaymentLinkModal(false)}
        footer={[
          <Button
            key="copy"
            type="primary"
            onClick={copyPaymentLink}
            style={{
              height: '40px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            Kopēt saiti
          </Button>,
          <Button
            key="close"
            onClick={() => setPaymentLinkModal(false)}
            style={{ height: '40px', borderRadius: '8px' }}
          >
            Aizvērt
          </Button>,
        ]}
        centered
        width={600}
        style={{
          borderRadius: '12px',
        }}
      >
        <div style={{ marginTop: '24px' }}>
          <p style={{ fontSize: '14px', color: '#111827', marginBottom: '12px' }}>
            Nosūtiet šo maksājuma saiti savam klientam:
          </p>
          <Input.TextArea
            value={selectedInvoice?.stripe_payment_link || ''}
            readOnly
            rows={3}
            style={{ marginBottom: 16, borderRadius: '8px' }}
          />
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: 0 }}>
            Kad klients veiks maksājumu, rēķina statuss automātiski 
            mainīsies uz "Apmaksāts" un krājumi tiks atjaunināti Mozello e-veikalā.
          </p>
        </div>
      </Modal>

      {/* Share Method Modal for Resend */}
      <style>{`
        .share-modal-button {
          width: 100% !important;
        }
        @media (min-width: 640px) {
          .share-modal-button {
            width: 100% !important;
          }
        }
        .no-select-link-input input {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          cursor: default !important;
        }
        .no-select-link-input input:focus {
          outline: none !important;
          border-color: #dbe0e6 !important;
        }
      `}</style>
      <Modal
        open={shareMethodModal}
        onCancel={() => {
          if (!sendingEmail) {
            setShareMethodModal(false);
            setSelectedInvoice(null);
            setLinkCopied(false);
          }
        }}
        footer={null}
        width={672}
        styles={{
          body: { padding: 0 }
        }}
        closable={!sendingEmail}
        maskClosable={!sendingEmail}
        destroyOnHidden={false}
        forceRender={false}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 16,
          padding: '24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ 
              fontSize: '20px', 
              fontWeight: 700, 
              color: '#111418', 
              margin: 0,
              lineHeight: '1.2',
              letterSpacing: '-0.02em'
            }}>
              Dalīties ar rēķinu {selectedInvoice?.invoice_number}
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: '#617589', 
              margin: '4px 0 0 0'
            }}>
              Izvēlieties, kā vēlaties nosūtīt rēķinu
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px' }}>
          {/* Email Section */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16,
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: 'white',
            padding: '20px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              lineHeight: '1.2',
              letterSpacing: '-0.015em',
              color: '#111418',
              margin: 0
            }}>
              Nosūtīt e-pastu klientam
            </h3>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 16,
              width: '100%'
            }}
            className="sm:flex-row sm:items-end"
            >
              <label style={{ 
                display: 'flex', 
                flexDirection: 'column',
                width: '100%',
                flex: 1,
                minWidth: 0
              }}>
                <p style={{ 
                  paddingBottom: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: 'normal',
                  color: '#111418',
                  margin: 0
                }}>
                  Klienta e-pasts
                </p>
                <Input
                  prefix={<MailOutlined style={{ color: '#9ca3af', fontSize: '18px' }} />}
                  value={selectedInvoice?.customer_email || ''}
                  readOnly
                  style={{
                    height: '48px',
                    borderRadius: '8px',
                    border: '1px solid #dbe0e6',
                    paddingLeft: '40px',
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#111418',
                    width: '100%'
                  }}
                />
              </label>
              <div style={{ width: '100%' }} className="sm:w-auto">
                <Popconfirm
                  title="Nosūtīt e-pastu?"
                  description={
                    <div>
                      <p>Vai tiešām vēlaties nosūtīt rēķinu uz {selectedInvoice?.customer_email}?</p>
                      <p style={{ 
                        marginTop: '8px', 
                        fontSize: '13px', 
                        color: '#6b7280',
                        lineHeight: 1.5
                      }}>
                        Lūdzu, ņemiet vērā, ka e-pastu var nosūtīt tikai reizi 10 minūtēs, lai novērstu pārāk biežu nosūtīšanu.
                      </p>
                    </div>
                  }
                  onConfirm={async (e) => {
                    e?.stopPropagation?.();
                    e?.preventDefault?.();
                    await handleSendEmailResend();
                  }}
                  okText="Nosūtīt"
                  cancelText="Atcelt"
                  okButtonProps={{
                    style: { background: '#137fec', borderColor: '#137fec' }
                  }}
                  disabled={sendingEmail || emailCooldown > 0}
                  onOpenChange={(open) => {
                    // Prevent Popconfirm from affecting modal state
                    if (!open && sendingEmail) {
                      return false;
                    }
                  }}
                >
                  <Button
                    type="default"
                    icon={<MailOutlined />}
                    loading={sendingEmail}
                    disabled={sendingEmail || emailCooldown > 0}
                    block
                    style={{
                      height: '40px',
                      borderRadius: '8px',
                      borderColor: '#0068FF',
                      color: '#0068FF',
                      fontWeight: 500,
                      fontSize: '14px',
                    }}
                  >
                    {emailCooldown > 0
                      ? `Lūdzu, uzgaidiet ${Math.ceil(emailCooldown / 60)} min`
                      : 'Nosūtīt e-pastu'}
                  </Button>
                </Popconfirm>
                {emailCooldown > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    Atkārtota sūtīšana pieejama pēc {Math.ceil(emailCooldown / 60)} minūtēm
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Separator with "VAI" */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            margin: '8px 0'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              background: '#e5e7eb'
            }}></div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#6b7280',
              padding: '0 12px'
            }}>
              VAI
            </div>
            <div style={{
              flex: 1,
              height: '1px',
              background: '#e5e7eb'
            }}></div>
          </div>

          {/* Link Section */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16,
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: 'white',
            padding: '20px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              lineHeight: '1.2',
              letterSpacing: '-0.015em',
              color: '#111418',
              margin: 0
            }}>
              Kopēt koplietojamo saiti
            </h3>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 16,
              width: '100%'
            }}
            className="sm:flex-row sm:items-center"
            >
              <div style={{ 
                position: 'relative',
                display: 'flex',
                width: '100%',
                flex: 1,
                minWidth: 0
              }}>
                <Input
                  prefix={<LinkOutlined style={{ color: '#9ca3af', fontSize: '18px' }} />}
                  value={getPublicInvoiceUrl(selectedInvoice)}
                  readOnly
                  onFocus={(e) => e.target.blur()}
                  onSelect={(e) => e.preventDefault()}
                  style={{
                    height: '48px',
                    borderRadius: '8px',
                    border: '1px solid #dbe0e6',
                    background: '#f9fafb',
                    paddingLeft: '40px',
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#617589',
                    width: '100%',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    cursor: 'default'
                  }}
                  className="no-select-link-input"
                />
              </div>
              <div style={{ width: '100%' }} className="sm:w-auto">
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyLinkResend}
                  className="share-modal-button"
                  style={{
                    height: '48px',
                    minWidth: '84px',
                    width: '100%',
                    borderRadius: '8px',
                    background: 'rgba(19, 127, 236, 0.1)',
                    border: 'none',
                    color: '#137fec',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '0.015em',
                    padding: '0 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!linkCopied) {
                      e.currentTarget.style.background = 'rgba(19, 127, 236, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!linkCopied) {
                      e.currentTarget.style.background = 'rgba(19, 127, 236, 0.1)';
                    }
                  }}
                >
                  {linkCopied ? 'Kopēts!' : 'Kopēt'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Custom Table Styles */}
      <style>{`
        .custom-table .ant-table {
          font-size: 14px;
        }

        .custom-table .ant-table-thead > tr > th {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 16px;
          font-weight: 500;
        }

        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e5e7eb;
          padding: 16px;
          height: 72px;
        }

        .custom-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        .custom-table .ant-table-tbody > tr {
          background: #ffffff;
        }

        .custom-table .ant-table-tbody > tr:hover > td {
          background: #f9fafb;
        }

        .custom-table .ant-table-tbody > tr.custom-table-row:hover {
          background: #f9fafb;
        }

        /* Highlight draft invoices */
        .custom-table .ant-table-tbody > tr.draft-row {
          background: #fffbeb !important;
          border-left: 3px solid #f59e0b;
        }

        .custom-table .ant-table-tbody > tr.draft-row:hover > td {
          background: #fef3c7 !important;
        }

        .action-button:hover {
          background: rgba(43, 108, 238, 0.1) !important;
        }

        .ant-modal-content {
          border-radius: 12px;
        }

        .ant-modal-header {
          border-bottom: 1px solid #e5e7eb;
          padding: 24px;
        }

        .ant-modal-body {
          padding: 24px;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Invoices;

