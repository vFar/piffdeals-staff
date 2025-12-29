import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  App,
  Form,
  Spin, 
  Select, 
  Input, 
  InputNumber, 
  DatePicker, 
  Button,
  Space,
  Card,
  Divider,
  Tag,
  message as antMessage,
  Modal,
  Alert,
  Popconfirm,
  Tooltip,
  Typography
} from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined, SendOutlined, ArrowLeftOutlined, EditOutlined, LinkOutlined, MailOutlined, DownloadOutlined, CopyOutlined, EyeOutlined, WarningOutlined, CloseOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { mozelloService } from '../services/mozelloService';
import { stripeService } from '../services/stripeService';
import { useUserRole } from '../hooks/useUserRole';
import { logInvoiceAction, ActionTypes } from '../services/activityLogService';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const ViewInvoice = () => {
  const { invoiceNumber } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [shareMethodModal, setShareMethodModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const isInitialLoad = useRef(true);

  // Set document title
  useEffect(() => {
    if (invoice) {
      document.title = `Rēķins ${invoice.invoice_number} | Piffdeals`;
    } else {
      document.title = 'Rēķins | Piffdeals';
    }
  }, [invoice]);
  const [preparingToSend, setPreparingToSend] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lastEmailSent, setLastEmailSent] = useState(null);
  const [customerNotified, setCustomerNotified] = useState(false); // Track if customer was notified
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // Cooldown remaining in seconds
  const { isAdmin, isSuperAdmin, userProfile } = useUserRole();


  useEffect(() => {
    // Only fetch invoice when userProfile is loaded
    if (invoiceNumber && userProfile) {
      isInitialLoad.current = true;
      fetchInvoiceData(true);
    }
  }, [invoiceNumber, userProfile]);

  // Calculate cooldown from invoice.last_invoice_email_sent
  useEffect(() => {
    if (invoice?.last_invoice_email_sent) {
      const lastSent = new Date(invoice.last_invoice_email_sent);
      const now = new Date();
      const timeSinceLastSent = now.getTime() - lastSent.getTime();
      const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
      
      if (timeSinceLastSent < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - timeSinceLastSent) / 1000);
        setCooldownRemaining(remaining);
      } else {
        setCooldownRemaining(0);
      }
    } else {
      setCooldownRemaining(0);
    }
  }, [invoice?.last_invoice_email_sent]);

  // Update cooldown timer every second
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const fetchInvoiceData = async (showLoading = true) => {
    try {
      // Only show loading spinner on initial load
      if (showLoading && isInitialLoad.current) {
        setLoading(true);
      }

      // Decode the invoice number in case it was URL encoded
      const decodedInvoiceNumber = decodeURIComponent(invoiceNumber);

      // Fetch invoice first (critical - show immediately)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', decodedInvoiceNumber)
        .single();

      if (invoiceError) {
        antMessage.error('Rēķins nav atrasts');
        navigate('/invoices');
        return;
      }

      // Check if user has permission to view this invoice
      if (!isAdmin && !isSuperAdmin && invoiceData.user_id !== userProfile?.id) {
        antMessage.error('Jums nav tiesību skatīt šo rēķinu');
        navigate('/invoices');
        return;
      }

      // Set invoice immediately (don't wait for creator/items) for instant UI render
      setInvoice(invoiceData);

      // Set form values immediately with invoice data
      form.setFieldsValue({
        clientName: invoiceData.customer_name,
        clientEmail: invoiceData.customer_email,
        clientPhone: invoiceData.customer_phone,
        clientAddress: invoiceData.customer_address,
        issueDate: dayjs(invoiceData.issue_date),
        notes: invoiceData.notes || '',
      });

      // Hide loading immediately - page is now usable (items/creator load in background)
      setLoading(false);
      isInitialLoad.current = false;

      // Fetch creator's profile and invoice items in background (non-blocking)
      Promise.all([
        invoiceData.user_id
          ? supabase
              .from('user_profiles')
              .select('id, username, email, role')
              .eq('id', invoiceData.user_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceData.id)
      ]).then(([creatorResult, itemsDataResult]) => {
        const { data: creatorData, error: creatorError } = creatorResult;
        const { data: itemsData, error: itemsError } = itemsDataResult;

        if (itemsError) {
          return;
        }

        const creatorProfile = (!creatorError && creatorData) ? creatorData : null;

        // Update invoice with creator info (non-blocking)
        setInvoice(prev => prev ? { ...prev, creator: creatorProfile } : null);

        // Transform items immediately without waiting for products
        const transformedItems = itemsData.map((item, index) => ({
          id: index + 1,
          productHandle: item.product_id || '',
          name: item.product_name,
          quantity: item.quantity,
          price: parseFloat(item.unit_price),
          total: parseFloat(item.total),
          stock: null,
          imageUrl: null // Will be loaded in background
        }));

        setItems(transformedItems);
      }).catch(error => {
        // Error loading invoice details
      });

    } catch (error) {
      antMessage.error('Neizdevās ielādēt rēķinu');
      navigate('/invoices');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await mozelloService.getProducts();
      setAvailableProducts(data.products || []);
    } catch (error) {
      message.error('Neizdevās ielādēt produktus no veikala');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleEdit = () => {
    if (invoice?.status === 'draft') {
      setIsEditing(true);
      fetchProducts();
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    fetchInvoiceData(false); // Reload original data without loading spinner
  };

  const getProductTitle = (product) => {
    if (typeof product.title === 'string') return product.title;
    if (typeof product.title === 'object') {
      return product.title.lv || product.title.en || product.title[Object.keys(product.title)[0]] || 'Bez nosaukuma';
    }
    return 'Bez nosaukuma';
  };

  const getProductPrice = (product) => {
    const price = product.sale_price || product.price || 0;
    return parseFloat(price) || 0;
  };

  const calculateItemTotal = (quantity, price) => {
    return (quantity * price).toFixed(2);
  };

  const handleProductSelect = (id, productHandle) => {
    const product = availableProducts.find(p => p.handle === productHandle);
    if (!product) return;

    const title = getProductTitle(product);
    const price = getProductPrice(product);
    const stock = product.stock;
    const imageUrl = product.pictures?.[0]?.url || null;

    setItems(items.map(item => {
      if (item.id === id) {
        const adjustedQuantity = stock !== null ? Math.min(item.quantity, stock) : item.quantity;
        
        const updatedItem = {
          ...item,
          productHandle: productHandle,
          name: title,
          price: price,
          stock: stock,
          quantity: adjustedQuantity,
          total: calculateItemTotal(adjustedQuantity, price),
          imageUrl: imageUrl,
        };
        return updatedItem;
      }
      return item;
    }));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updatedItem.total = calculateItemTotal(
            field === 'quantity' ? value : item.quantity,
            field === 'price' ? value : item.price
          );
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems([...items, { id: newId, productHandle: '', name: '', quantity: 1, price: 0, total: 0, stock: null, imageUrl: null }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const calculateDueDate = (issueDateValue) => {
    if (!issueDateValue) return dayjs().add(5, 'day');
    return issueDateValue.add(5, 'day');
  };

  const getCurrentIssueDate = () => {
    return form.getFieldValue('issueDate') || dayjs(invoice?.issue_date);
  };

  const handleSave = async () => {
    if (!isEditing) return;

    // Validate items
    if (items.some(item => !item.name || item.price <= 0)) {
      message.error('Aizpildiet visus laukus');
      return;
    }

    try {
      const values = await form.validateFields();
      setSaving(true);

      const formValues = values;
      const issueDate = formValues.issueDate;
      const dueDate = calculateDueDate(issueDate);

      // Update invoice (always keep status as 'draft' when editing)
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          customer_name: formValues.clientName,
          customer_email: formValues.clientEmail,
          customer_address: formValues.clientAddress,
          customer_phone: formValues.clientPhone,
          issue_date: issueDate.format('YYYY-MM-DD'),
          due_date: dueDate.format('YYYY-MM-DD'),
          subtotal: calculateSubtotal(),
          tax_rate: 0,
          tax_amount: 0,
          total: calculateTotal(),
          status: 'draft',
          notes: formValues.notes || '',
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Delete old items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (deleteError) throw deleteError;

      // Insert new items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.productHandle || null,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Log invoice update
      const isOwnInvoice = invoice.user_id === userProfile?.id;
      await logInvoiceAction(
        ActionTypes.INVOICE_UPDATED,
        `Rediģēts rēķins ${invoice.invoice_number}${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`,
        {
          invoice_number: invoice.invoice_number,
          customer_name: formValues.clientName,
          total_amount: parseFloat(calculateTotal()),
          is_own_invoice: isOwnInvoice,
          is_other_user_invoice: !isOwnInvoice,
          creator_username: invoice.creator?.username || 'Nezināms',
          modified_by: userProfile?.username || 'Nezināms',
        },
        invoice.id
      );

      setSaving(false);
      message.success('Izmaiņas saglabātas!');
      setIsEditing(false);
      fetchInvoiceData(false); // Reload data without loading spinner
    } catch (error) {
      if (error.errorFields) {
        message.error('Aizpildiet visus laukus');
        return;
      }
      setSaving(false);
      message.error('Neizdevās saglabāt rēķinu');
    }
  };

  const getPublicInvoiceUrl = () => {
    if (!invoice?.public_token) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/i/${invoice.public_token}`;
  };

  // Copy link only (for sent invoices - no status update, no modal close)
  const handleCopyLinkOnly = async () => {
    const url = getPublicInvoiceUrl();
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
      
      // Reset linkCopied after 2 seconds
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      message.error('Neizdevās nokopēt saiti. Lūdzu, kopējiet manuāli.');
    }
  };

  const handleCopyLink = async () => {
    const url = getPublicInvoiceUrl();
    if (!url) {
      message.error('Publiskā saite nav pieejama');
      return;
    }
    
    try {
      setPreparingToSend(true);
      
      // ALWAYS ensure payment link exists before copying
      if (!invoice.stripe_payment_link) {
        try {
          const paymentLinkData = await stripeService.createPaymentLink(invoice.id);
          // Update local state instead of refetching
          if (paymentLinkData?.paymentUrl) {
            setInvoice(prev => prev ? { 
              ...prev, 
              stripe_payment_link: paymentLinkData.paymentUrl,
              stripe_payment_link_id: paymentLinkData.paymentLinkId
            } : null);
          } else {
            await fetchInvoiceData(false); // Only refetch if payment link not in response
          }
        } catch (error) {
          message.error('Neizdevās izveidot maksājuma saiti');
          setPreparingToSend(false);
          return;
        }
      }
      
      // Get fresh invoice data
      const { data: freshInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoice.id)
        .single();
      
      if (freshInvoice) {
        setInvoice(freshInvoice);
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
        
        // DO NOT update status or sent_at when copying link
        // Status and sent_at should ONLY be set when email is actually sent
        // Copying link doesn't mean customer was notified
        
        setLinkCopied(true);
        // DO NOT mark customer as notified - they haven't received email
        // setCustomerNotified(true); // REMOVED - only set when email is sent
        
        message.success('Saite nokopēta starpliktuvē!');
        
        // Close modal after successful copy
        setTimeout(() => {
          setLinkCopied(false);
          setShareMethodModal(false);
        }, 500);
      } catch (error) {
        message.error('Neizdevās nokopēt saiti. Lūdzu, kopējiet manuāli.');
      }
    } catch (error) {
      message.error('Neizdevās sagatavot saiti');
    } finally {
      setPreparingToSend(false);
    }
  };

  const handleDownloadPDF = () => {
    const url = getPublicInvoiceUrl();
    if (!url) {
      message.error('Publiskā saite nav pieejama');
      return;
    }
    window.open(url, '_blank');
    message.info('Atveriet rēķinu un izmantojiet pārlūka drukas funkciju (Ctrl+P)');
  };

  const handleReadyToSend = async () => {
    // This is called when user clicks "Gatavs rēķins" on a draft invoice
    // It will send the invoice email directly and change status to 'sent'
    // Note: public_token is already generated when invoice is created
    
    // If we're in edit mode, save changes first
    if (isEditing) {
      // Validate items
      if (items.length === 0 || items.some(item => !item.name || item.price <= 0)) {
        message.error('Lūdzu, aizpildiet visus produktus pirms sagatavošanas nosūtīšanai');
        return;
      }

      try {
        setPreparingToSend(true);
        const values = await form.validateFields();
        
        const formValues = values;
        const issueDate = formValues.issueDate;
        const dueDate = calculateDueDate(issueDate);

        // Update invoice (keep status as 'draft' when editing, will be updated to 'sent' below)
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            customer_name: formValues.clientName,
            customer_email: formValues.clientEmail,
            customer_address: formValues.clientAddress,
            customer_phone: formValues.clientPhone,
            issue_date: issueDate.format('YYYY-MM-DD'),
            due_date: dueDate.format('YYYY-MM-DD'),
            subtotal: calculateSubtotal(),
            tax_rate: 0,
            tax_amount: 0,
            total: calculateTotal(),
            status: 'draft',
            notes: formValues.notes || '',
          })
          .eq('id', invoice.id);

        if (invoiceError) throw invoiceError;

        // Delete old items
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoice.id);

        if (deleteError) throw deleteError;

        // Insert new items
        const invoiceItems = items.map(item => ({
          invoice_id: invoice.id,
          product_id: item.productHandle || null,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total: item.total,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) throw itemsError;

        // Exit edit mode and reload data
        setIsEditing(false);
        await fetchInvoiceData(false); // Reload without loading spinner
        setPreparingToSend(false);
      } catch (saveError) {
        if (saveError.errorFields) {
          message.error('Lūdzu, aizpildiet visus laukus');
        } else {
          message.error('Neizdevās saglabāt izmaiņas');
        }
        setPreparingToSend(false);
        return;
      }
    }

    // Ensure we have items in the database
    const { data: currentItems, error: itemsCheckError } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', invoice.id);

    if (itemsCheckError) {
      message.error('Neizdevās pārbaudīt rēķina produktus');
      return;
    }
    
    if (!currentItems || currentItems.length === 0) {
      message.error('Rēķinam jābūt vismaz vienam produktam. Lūdzu, pievienojiet produktus un mēģiniet vēlreiz.');
      return;
    }

    // Ensure public_token exists (should already exist from creation, but just in case)
    let publicToken = invoice.public_token;
    if (!publicToken) {
      publicToken = crypto.randomUUID();
      // Update invoice with public_token if it was missing
      const { error: tokenError } = await supabase
        .from('invoices')
        .update({ public_token: publicToken })
        .eq('id', invoice.id);
      if (tokenError) {
        message.error('Neizdevās sagatavot rēķinu');
        return;
      }
      // Refresh invoice data without loading spinner
      await fetchInvoiceData(false);
    }

    // Ensure customer email exists
    if (!invoice.customer_email) {
      message.error('Lūdzu, norādiet klienta e-pasta adresi pirms nosūtīšanas');
      return;
    }

    // Ensure Stripe payment link exists before sending email
    try {
      setPreparingToSend(true);
      
      let currentInvoice = invoice;
      if (!currentInvoice.stripe_payment_link) {
        try {
          const paymentLinkData = await stripeService.createPaymentLink(currentInvoice.id);
          
          // Update local state immediately with the payment link from the response
          if (paymentLinkData?.paymentUrl) {
            currentInvoice = { 
              ...currentInvoice, 
              stripe_payment_link: paymentLinkData.paymentUrl,
              stripe_payment_link_id: paymentLinkData.paymentLinkId
            };
            setInvoice(currentInvoice);
          } else {
            // If response doesn't have paymentUrl, refresh from database
            await fetchInvoiceData(false);
            const { data: freshInvoice } = await supabase
              .from('invoices')
              .select('*')
              .eq('id', invoice.id)
              .single();
            if (freshInvoice) {
              currentInvoice = freshInvoice;
              setInvoice(freshInvoice);
            }
          }
        } catch (error) {
          message.error('Neizdevās izveidot maksājuma saiti. Rēķins netika nosūtīts.');
          setPreparingToSend(false);
          return;
        }
      }

      setPreparingToSend(false);

      // Now send the email using the same logic as handleSendEmail
      await handleSendEmailDirect(currentInvoice);
    } catch (error) {
      message.error('Neizdevās sagatavot rēķinu nosūtīšanai');
      setPreparingToSend(false);
    }
  };

  // New function to send email directly (extracted from handleSendEmail for reuse)
  const handleSendEmailDirect = async (invoiceToSend) => {
    if (!invoiceToSend?.public_token || !invoiceToSend?.customer_email) {
      message.error('Nav iespējams nosūtīt e-pastu');
      return;
    }

    try {
      setSendingEmail(true);
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Nav autentificēts. Lūdzu, pieslēdzieties atkārtoti.');
      }
      
      // Call Supabase Edge Function to send email
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, ''); // Remove trailing slash
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-invoice-email`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          invoiceId: invoiceToSend.id,
          customerEmail: invoiceToSend.customer_email,
          customerName: invoiceToSend.customer_name,
          invoiceNumber: invoiceToSend.invoice_number,
          publicToken: invoiceToSend.public_token,
          total: invoiceToSend.total
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Handle 429 (Too Many Requests) with cooldown message
        if (response.status === 429) {
          // Set cooldown from backend response
          if (errorData.cooldownRemaining) {
            setCooldownRemaining(errorData.cooldownRemaining);
          }
          // Also refresh invoice to get latest last_invoice_email_sent
          await fetchInvoiceData(false);
          const cooldownError = new Error(errorData.message || errorData.error || 'Cooldown active');
          cooldownError.status = 429;
          cooldownError.cooldownRemaining = errorData.cooldownRemaining;
          throw cooldownError;
        }
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Update invoice status to 'sent' and set sent_at (only when email is successfully sent)
      const sentAt = new Date().toISOString();
      const oldStatus = invoiceToSend.status;
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'sent',
          sent_at: sentAt
        })
        .eq('id', invoiceToSend.id);
      
      if (!updateError) {
        // Fetch fresh invoice data to get last_invoice_email_sent for cooldown
        const { data: updatedInvoice } = await supabase
          .from('invoices')
          .select('*, last_invoice_email_sent')
          .eq('id', invoiceToSend.id)
          .single();
        
        if (updatedInvoice) {
          setInvoice(updatedInvoice);
          
          // Start cooldown timer (10 minutes = 600 seconds)
          setCooldownRemaining(600);
        } else {
          // Fallback to local state update if fetch fails
          setInvoice(prev => prev ? { ...prev, status: 'sent', sent_at: sentAt } : null);
          // Start cooldown timer anyway
          setCooldownRemaining(600);
        }
        
        // Log invoice sent (first time) or resent
        // First-time send is when status was 'draft', otherwise it's a resend (sent, pending, overdue)
        const isOwnInvoice = invoiceToSend.user_id === userProfile?.id;
        const isFirstTimeSend = oldStatus === 'draft';
        const actionType = isFirstTimeSend ? ActionTypes.INVOICE_SENT : ActionTypes.INVOICE_RESENT;
        const description = isFirstTimeSend 
          ? `Nosūtīts rēķins ${invoiceToSend.invoice_number} klientam${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`
          : `Nosūtīts rēķins ${invoiceToSend.invoice_number} klientam vēlreiz${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`;
        
        await logInvoiceAction(
          actionType,
          description,
          {
            invoice_number: invoiceToSend.invoice_number,
            customer_name: invoiceToSend.customer_name,
            customer_email: invoiceToSend.customer_email,
            total_amount: parseFloat(invoiceToSend.total || 0),
            is_own_invoice: isOwnInvoice,
            is_other_user_invoice: !isOwnInvoice,
            creator_username: invoiceToSend.creator?.username || 'Nezināms',
            sent_by: userProfile?.username || 'Nezināms',
          },
          invoiceToSend.id
        );
        
        message.success(`E-pasts veiksmīgi nosūtīts uz ${invoiceToSend.customer_email}!`);
      } else {
        message.warning('E-pasts nosūtīts, bet neizdevās atjaunināt rēķina statusu');
      }
    } catch (error) {
      
      if (error?.status === 429) {
        const minutes = Math.ceil((error.cooldownRemaining || 600) / 60);
        message.warning(`Lūdzu, uzgaidiet ${minutes} minūte(s) pirms nākamās nosūtīšanas`);
      } else {
        message.error(error?.message || 'Neizdevās nosūtīt e-pastu');
      }
    } finally {
      setSendingEmail(false);
    }
  };

  // Removed handleShareMethod - now handled directly in modal buttons

  const handleSendEmail = async () => {
    if (!invoice?.public_token || !invoice?.customer_email) {
      message.error('Nav iespējams nosūtīt e-pastu');
      return;
    }
    
    // Only allow sending if status is 'draft' or 'sent' (for resend)
    if (invoice?.status !== 'draft' && invoice?.status !== 'sent') {
      message.error('Rēķins jābūt melnraksts vai jau nosūtīts');
      return;
    }

    // Check cooldown - button should be disabled, but double-check here too
    if (cooldownRemaining > 0) {
      const remainingMinutes = Math.floor(cooldownRemaining / 60);
      const remainingSecs = cooldownRemaining % 60;
      message.warning(
        `Lūdzu, uzgaidiet pirms nākamās nosūtīšanas. Atlikušas ${remainingMinutes} min ${remainingSecs} sek.`
      );
      return;
    }

    try {
      setSendingEmail(true);
      
      // ALWAYS ensure payment link exists before sending
      if (!invoice.stripe_payment_link) {
        try {
          setPreparingToSend(true);
          const paymentLinkData = await stripeService.createPaymentLink(invoice.id);
          // Update local state instead of refetching
          if (paymentLinkData?.paymentUrl) {
            setInvoice(prev => prev ? { 
              ...prev, 
              stripe_payment_link: paymentLinkData.paymentUrl,
              stripe_payment_link_id: paymentLinkData.paymentLinkId
            } : null);
          } else {
            await fetchInvoiceData(false); // Only refetch if payment link not in response
          }
          setPreparingToSend(false);
        } catch (error) {
          message.error('Neizdevās izveidot maksājuma saiti. Rēķins netika nosūtīts.');
          setPreparingToSend(false);
          setSendingEmail(false);
          return;
        }
      }
      
      // Get fresh invoice data after payment link creation (include last_invoice_email_sent for cooldown)
      const { data: freshInvoice } = await supabase
        .from('invoices')
        .select('*, last_invoice_email_sent')
        .eq('id', invoice.id)
        .single();
      
      if (freshInvoice) {
        setInvoice(freshInvoice);
      }
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Nav autentificēts. Lūdzu, pieslēdzieties atkārtoti.');
      }
      
      // Call Supabase Edge Function to send email
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, ''); // Remove trailing slash
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-invoice-email`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          customerEmail: invoice.customer_email,
          customerName: invoice.customer_name,
          invoiceNumber: invoice.invoice_number,
          publicToken: invoice.public_token,
          total: invoice.total
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Handle 429 (Too Many Requests) with cooldown message
        if (response.status === 429) {
          // Set cooldown from backend response
          if (errorData.cooldownRemaining) {
            setCooldownRemaining(errorData.cooldownRemaining);
          }
          // Also refresh invoice to get latest last_invoice_email_sent
          await fetchInvoiceData(false);
          const cooldownError = new Error(errorData.message || errorData.error || 'Cooldown active');
          cooldownError.status = 429;
          cooldownError.cooldownRemaining = errorData.cooldownRemaining;
          throw cooldownError;
        }
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Update invoice status to 'sent' and set sent_at (only when email is successfully sent)
      // This works for both 'draft' -> 'sent' (first time) and 'sent' -> 'sent' (resend)
      const sentAt = new Date().toISOString();
      const oldStatus = invoice.status;
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'sent',
          sent_at: sentAt
        })
        .eq('id', invoice.id);
      
      if (!updateError) {
        // Fetch fresh invoice data to get last_invoice_email_sent for cooldown
        const { data: updatedInvoice } = await supabase
          .from('invoices')
          .select('*, last_invoice_email_sent')
          .eq('id', invoice.id)
          .single();
        
        if (updatedInvoice) {
          setInvoice(updatedInvoice);
          
          // Start cooldown timer (10 minutes = 600 seconds)
          setCooldownRemaining(600);
        } else {
          // Fallback to local state update if fetch fails
          setInvoice(prev => prev ? { ...prev, status: 'sent', sent_at: sentAt } : null);
          // Start cooldown timer anyway
          setCooldownRemaining(600);
        }
        
        // Log invoice sent (first time) or resent
        // First-time send is when status was 'draft', otherwise it's a resend (sent, pending, overdue)
        const isOwnInvoice = invoice.user_id === userProfile?.id;
        const isFirstTimeSend = oldStatus === 'draft';
        const actionType = isFirstTimeSend ? ActionTypes.INVOICE_SENT : ActionTypes.INVOICE_RESENT;
        const description = isFirstTimeSend 
          ? `Nosūtīts rēķins ${invoice.invoice_number} klientam${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`
          : `Nosūtīts rēķins ${invoice.invoice_number} klientam vēlreiz${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`;
        
        await logInvoiceAction(
          actionType,
          description,
          {
            invoice_number: invoice.invoice_number,
            old_invoice_status: oldStatus,
            new_invoice_status: 'sent',
            customer_name: invoice.customer_name,
            customer_email: invoice.customer_email,
            total_amount: parseFloat(invoice.total || 0),
            is_own_invoice: isOwnInvoice,
            is_other_user_invoice: !isOwnInvoice,
            creator_username: invoice.creator?.username || 'Nezināms',
            sent_by: userProfile?.username || 'Nezināms',
          },
          invoice.id
        );
      }

      // Update last email sent time
      setLastEmailSent(Date.now());
      
      // Mark customer as notified
      setCustomerNotified(true);
      
      if (data?.success) {
        message.success('E-pasts nosūtīts klientam!');
      } else {
        message.warning('E-pasts var nebūt nosūtīts, bet rēķina statuss ir atjaunināts.');
      }
      
      // Keep modal open - don't close it
    } catch (error) {
      // Handle cooldown errors specifically
      if (error.status === 429 || error.message?.includes('Cooldown') || error.message?.includes('wait')) {
        const errorMessage = error.message || 'Lūdzu, uzgaidiet pirms nākamās nosūtīšanas.';
        message.warning(errorMessage);
      } else {
        message.error('Neizdevās nosūtīt e-pastu');
      }
      
      // DO NOT update status or sent_at if email fails
      // sent_at should ONLY be set when email is successfully sent
      // Status can remain as 'draft' until email is actually sent
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Melnraksts', color: 'default' },
      sent: { label: 'Nosūtīts', color: 'blue' },
      paid: { label: 'Apmaksāts', color: 'green' },
      pending: { label: 'Gaida', color: 'gold' },
      overdue: { label: 'Kavēts', color: 'red' },
      cancelled: { label: 'Atcelts', color: 'default' },
    };
    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  // Admin (not super_admin) can edit invoices created by employees
  const isAdminOnly = isAdmin && !isSuperAdmin;
  const creatorIsEmployee = invoice?.creator?.role === 'employee';
  const canEditAsAdmin = isAdminOnly && creatorIsEmployee;
  const canEdit = invoice?.status === 'draft' && (invoice?.user_id === userProfile?.id || isSuperAdmin || canEditAsAdmin);
  const isReadOnly = !isEditing || invoice?.status !== 'draft';

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <h2>Rēķins nav atrasts</h2>
          <Button type="primary" onClick={() => navigate('/invoices')}>
            Atpakaļ uz rēķiniem
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <style>{`
        /* Match original HTML design exactly */
        .ant-input,
        .ant-input-number,
        .ant-select-selector,
        .ant-picker {
          border-radius: 0.375rem !important;
          border-color: #d9d9d9 !important;
          padding: 0.5rem 1rem !important;
          color: #262626 !important;
          font-size: 14px !important;
        }
        
        .ant-input-textarea textarea {
          border-radius: 0.375rem !important;
          border-color: #d9d9d9 !important;
          padding: 0.5rem 1rem !important;
          color: #262626 !important;
          font-size: 14px !important;
        }
        
        .ant-input:focus,
        .ant-input-focused,
        .ant-input-number:focus,
        .ant-input-number-focused,
        .ant-input-number-focused .ant-input-number-input,
        .ant-input-number:focus-within,
        .ant-select-focused .ant-select-selector,
        .ant-select-selector:focus,
        .ant-select-selector:focus-within,
        .ant-picker-focused {
          border-color: #d9d9d9 !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        .ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input):not(.ant-pagination-size-changer) .ant-select-selector {
          border-color: #d9d9d9 !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        .ant-select:not(.ant-select-disabled):not(.ant-select-customize-input):not(.ant-pagination-size-changer):hover .ant-select-selector {
          border-color: #d9d9d9 !important;
        }
        
        .ant-select-show-search.ant-select:not(.ant-select-customize-input) .ant-select-selector {
          border-color: #d9d9d9 !important;
        }
        
        .ant-select-open .ant-select-selector,
        .ant-select-focused.ant-select-open .ant-select-selector {
          border-color: #d9d9d9 !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        * {
          outline: none !important;
        }
        
        *:focus,
        *:focus-visible,
        *:focus-within {
          outline: none !important;
          box-shadow: none !important;
        }
        
        .ant-input-number-focused {
          box-shadow: none !important;
        }
        
        .ant-input-textarea textarea:focus {
          border-color: #d9d9d9 !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        .ant-btn {
          border-radius: 0.5rem !important;
          font-weight: 700 !important;
          font-size: 14px !important;
          height: 40px !important;
          padding: 0 1.25rem !important;
        }
        
        .ant-btn-primary {
          background: #0068FF !important;
          border-color: #0068FF !important;
        }
        
        .ant-btn-primary:hover {
          background: rgba(0, 104, 255, 0.9) !important;
        }
        
        .ant-btn-dashed {
          background: rgba(0, 104, 255, 0.1) !important;
          border-color: transparent !important;
          color: #0068FF !important;
        }
        
        .ant-btn-dashed:hover {
          background: rgba(0, 104, 255, 0.2) !important;
        }
        
        .ant-card {
          border-radius: 0.75rem !important;
          border-color: #d9d9d9 !important;
        }
        
        .ant-input-disabled,
        .ant-input[disabled],
        .ant-picker-disabled {
          background-color: #f3f4f6 !important;
          color: #6b7280 !important;
        }
      `}</style>
      <Spin spinning={saving}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/invoices')}
              >
                Atpakaļ
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#111827' }}>
                  {isEditing ? 'Rediģēt rēķinu' : 'Skatīt rēķinu'}
                </h1>
                <Tooltip 
                  title={
                    <div style={{ maxWidth: '300px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Rēķina skatīšana</div>
                      <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                        Šeit varat skatīt pilnu rēķina informāciju. Melnraksta rēķinus var rediģēt. Nosūtītos rēķinus var koplietot ar klientiem e-pastā vai kopējot saiti. Kad rēķins ir gatavs, noklikšķiniet "Gatavs nosūtīšanai", lai atjauninātu statusu un izveidotu maksājuma saiti.
                      </div>
                    </div>
                  }
                  placement="right"
                >
                  <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
                </Tooltip>
              </div>
            </div>
            <Space>
              {/* Show "Gatavs rēķins" button for draft invoices when not editing (creator, super_admin, or admin for employee invoices) */}
              {invoice?.status === 'draft' && !isEditing && (invoice?.user_id === userProfile?.id || isSuperAdmin || canEditAsAdmin) && (
                <Popconfirm
                  title="Nosūtīt rēķinu klientam?"
                  description={
                    <div>
                      <p style={{ marginBottom: '8px' }}>
                        Rēķins tiks nosūtīts uz <strong>{invoice?.customer_email}</strong> un statuss mainīsies uz "Nosūtīts".
                      </p>
                      <p style={{ 
                        marginTop: '8px', 
                        fontSize: '13px', 
                        color: '#6b7280',
                        lineHeight: 1.5
                      }}>
                        Pirms nosūtīšanas tiks izveidota maksājuma saite un publiskā saite, lai klients varētu apskatīt un apmaksāt rēķinu.
                      </p>
                    </div>
                  }
                  onConfirm={handleReadyToSend}
                  okText="Nosūtīt"
                  cancelText="Atcelt"
                  okButtonProps={{ 
                    style: { background: '#10b981', borderColor: '#10b981' },
                    loading: preparingToSend || sendingEmail
                  }}
                >
                  <Button 
                    type="primary"
                    icon={<CheckCircleOutlined />} 
                    loading={preparingToSend || sendingEmail}
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                    }}
                  >
                    Gatavs rēķins
                  </Button>
                </Popconfirm>
              )}
              
              {/* Show "Preview" button - always available since public_token is generated on creation */}
              {invoice && (
                <Button 
                  icon={<EyeOutlined />} 
                  onClick={() => {
                    const publicUrl = getPublicInvoiceUrl();
                    if (publicUrl) {
                      // If invoice is draft, show message about payment link
                      if (invoice.status === 'draft') {
                        message.warning('Maksājuma saite nav pieejama, jo rēķins vēl nav nosūtīts');
                      }
                      window.open(publicUrl, '_blank');
                    } else {
                      message.error('Publiskā saite nav pieejama');
                    }
                  }}
                >
                  Priekšskatīt
                </Button>
              )}
              
              {/* Show "Share" button for sent invoices */}
              {invoice?.status !== 'draft' && (
                <Button 
                  icon={<LinkOutlined />} 
                  onClick={async () => {
                    // Refresh invoice data to get latest cooldown info
                    await fetchInvoiceData(false);
                    setShareMethodModal(true);
                  }}
                >
                  Dalīties
                </Button>
              )}
              
              {/* Show "Edit" button for draft invoices */}
              {canEdit && !isEditing && (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={handleEdit}
                >
                  Rediģēt
                </Button>
              )}
              
              {/* Show "Cancel" button when editing */}
              {isEditing && (
                <Button onClick={handleCancelEdit}>
                  Atcelt
                </Button>
              )}
            </Space>
          </div>

          <Card style={{ borderRadius: 12 }}>
            <Form
              form={form}
              layout="vertical"
              validateTrigger={['onBlur', 'onChange']}
            >
              {/* Header Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                  {getStatusBadge(invoice.status)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Rēķina Nr.</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                    {invoice.invoice_number}
                  </div>
                </div>
              </div>


              <Divider />

              {/* Bill To & Details Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32, marginBottom: 32 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                    Rēķina saņēmējs:
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Form.Item
                      name="clientName"
                      rules={[{ required: true, message: 'Aizpildiet visus laukus' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input
                        placeholder="Klienta vārds *"
                        disabled={isReadOnly}
                      />
                    </Form.Item>
                    <Form.Item
                      name="clientEmail"
                      rules={[
                        { required: true, message: 'Aizpildiet visus laukus' },
                        { type: 'email', message: 'Ievadiet derīgu e-pasta adresi' }
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input
                        placeholder="Klienta e-pasts *"
                        type="email"
                        disabled={isReadOnly}
                      />
                    </Form.Item>
                    <Form.Item
                      name="clientPhone"
                      rules={[
                        { required: true, message: 'Aizpildiet visus laukus' },
                        { pattern: /^[0-9+\-\s()]+$/, message: 'Ievadiet derīgu tālruņa numuru' }
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input
                        placeholder="Telefons *"
                        type="tel"
                        disabled={isReadOnly}
                      />
                    </Form.Item>
                    <Form.Item
                      name="clientAddress"
                      rules={[{ required: true, message: 'Aizpildiet visus laukus' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <TextArea
                        placeholder="Klienta adrese *"
                        rows={3}
                        disabled={isReadOnly}
                      />
                    </Form.Item>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                    Detaļas:
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 8 }}>
                        Izrakstīšanas datums
                      </div>
                      <Form.Item
                        name="issueDate"
                        rules={[{ required: true, message: 'Izvēlieties datumu' }]}
                        style={{ marginBottom: 8 }}
                      >
                        <DatePicker
                          style={{ width: '100%' }}
                          format="DD.MM.YYYY"
                          disabled={isReadOnly}
                        />
                      </Form.Item>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 8 }}>
                        Apmaksas termiņš
                      </div>
                      <Input
                        value={invoice.due_date ? dayjs(invoice.due_date).format('DD.MM.YYYY') : '-'}
                        disabled
                        style={{ background: '#f3f4f6', color: '#6b7280' }}
                      />
                    </div>
                    {invoice.stripe_payment_link && invoice.status === 'sent' && (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 8 }}>
                          Stripe maksājuma saite
                        </div>
                        <Input.TextArea
                          value={invoice.stripe_payment_link}
                          readOnly
                          rows={2}
                          style={{ fontSize: 12 }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

            <Divider />

            {/* Items Table */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                Produkti
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                        Produkts
                      </th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: 120, borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                        Daudzums
                      </th>
                      <th style={{ padding: 12, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: 150, borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                        Cena (€)
                      </th>
                      <th style={{ padding: 12, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: 150, borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                        Kopā (€)
                      </th>
                      {isEditing && (
                        <th style={{ padding: 12, width: 60, borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: 12 }}>
                          {isEditing ? (
                            <Select
                              showSearch
                              style={{ width: '100%' }}
                              placeholder="Izvēlieties produktu"
                              value={item.productHandle || undefined}
                              onChange={(value) => handleProductSelect(item.id, value)}
                              loading={loadingProducts}
                              filterOption={(input, option) =>
                                (option.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
                              }
                              optionLabelProp="label"
                            >
                              {availableProducts.map(product => {
                                const imageUrl = product.pictures?.[0]?.url || null;
                                const title = getProductTitle(product);
                                const price = getProductPrice(product).toFixed(2);
                                const stock = product.stock;
                                const stockText = stock === null ? 'Neierobežots' : `Noliktavā: ${stock}`;
                                const stockColor = stock === null ? '#10b981' : (stock < 5 ? '#ef4444' : '#6b7280');
                                
                                return (
                                  <Option 
                                    key={product.handle} 
                                    value={product.handle}
                                    label={`${title} - €${price}`}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      {imageUrl && (
                                        <img
                                          src={imageUrl}
                                          alt={title}
                                          style={{ 
                                            width: 40,
                                            height: 40,
                                            objectFit: 'cover', 
                                            borderRadius: 4,
                                            border: '1px solid #e5e7eb',
                                            flexShrink: 0
                                          }}
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      )}
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, color: '#111827' }}>{title}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                          <span style={{ color: '#6b7280' }}>€{price}</span>
                                          <span style={{ color: '#d1d5db' }}>•</span>
                                          <span style={{ color: stockColor, fontWeight: 500 }}>{stockText}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </Option>
                                );
                              })}
                            </Select>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  style={{ 
                                    width: 48,
                                    height: 48,
                                    objectFit: 'cover', 
                                    borderRadius: 6,
                                    border: '1px solid #e5e7eb',
                                    flexShrink: 0
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <div style={{ color: '#111827', fontWeight: 500 }}>{item.name}</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: 12 }}>
                          {isEditing ? (
                            <div>
                              <InputNumber
                                min={1}
                                max={item.stock !== null ? item.stock : undefined}
                                value={item.quantity}
                                onChange={(value) => {
                                  const maxQty = item.stock !== null ? item.stock : value;
                                  const finalValue = Math.min(value || 1, maxQty);
                                  handleItemChange(item.id, 'quantity', finalValue);
                                }}
                                style={{ width: '100%' }}
                              />
                              {item.stock !== null && (
                                <div style={{ fontSize: 11, color: item.stock < 5 ? '#ef4444' : '#6b7280', marginTop: 4 }}>
                                  Max: {item.stock}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', color: '#111827' }}>{item.quantity}</div>
                          )}
                        </td>
                        <td style={{ padding: 12 }}>
                          {isEditing ? (
                            <InputNumber
                              min={0}
                              step={0.01}
                              value={item.price}
                              onChange={(value) => handleItemChange(item.id, 'price', value || 0)}
                              style={{ width: '100%' }}
                              prefix="€"
                            />
                          ) : (
                            <div style={{ textAlign: 'right', color: '#111827' }}>€{parseFloat(item.price).toFixed(2)}</div>
                          )}
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontSize: 16, fontWeight: 500, color: '#111827' }}>
                          €{parseFloat(item.total).toFixed(2)}
                        </td>
                        {isEditing && (
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isEditing && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addItem}
                  style={{ marginTop: 16, width: '100%' }}
                >
                  Pievienot produktu
                </Button>
              )}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
              <div style={{ width: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16 }}>
                  <span style={{ color: '#6b7280' }}>Starpsumma</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>€{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16 }}>
                  <span style={{ color: '#6b7280' }}>PVN (0%)</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>€0.00</span>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Kopā</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>€{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Divider />

              {/* Notes Section */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                  Piezīmes
                </h3>
                <Form.Item
                  name="notes"
                  style={{ marginBottom: 8 }}
                >
                  <TextArea
                    placeholder="Pievienojiet papildu informāciju klientam..."
                    rows={4}
                    disabled={isReadOnly}
                  />
                </Form.Item>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => handleSave()}
                    loading={saving}
                  >
                    Saglabāt izmaiņas
                  </Button>
                </div>
              )}
            </Form>
          </Card>
        </div>
      </Spin>

      {/* Share Method Modal - Redesigned */}
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
          if (!sendingEmail && !preparingToSend) {
            // Check if customer was not notified and status is NOT 'sent'
            // If status is already 'sent', don't show warning (invoice was already sent before)
            if (!customerNotified && invoice?.status !== 'sent') {
              // Show warning modal instead of closing
              setWarningModalVisible(true);
            } else {
              // Safe to close - customer was notified or invoice status is 'sent' (already sent before)
              setShareMethodModal(false);
              setCustomerNotified(false);
            }
          }
        }}
        footer={null}
        width={672}
        styles={{
          body: { padding: 0 }
        }}
        closable={!sendingEmail && !preparingToSend}
        maskClosable={!sendingEmail && !preparingToSend}
        destroyOnHidden={false}
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
              {!customerNotified && invoice?.status === 'sent'
                ? `Rēķins ${invoice?.invoice_number} ir gatavs`
                : `Dalīties ar rēķinu ${invoice?.invoice_number}`
              }
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: '#617589', 
              margin: '4px 0 0 0'
            }}>
              {!customerNotified && invoice?.status === 'sent'
                ? 'Kā vēlaties to nosūtīt?'
                : 'Izvēlieties, kā vēlaties nosūtīt rēķinu'
              }
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
                  value={invoice?.customer_email || ''}
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
                {cooldownRemaining > 0 ? (
                  <Button
                    type="primary"
                    disabled
                    className="share-modal-button"
                    style={{
                      height: '48px',
                      minWidth: '84px',
                      width: '100%',
                      borderRadius: '8px',
                      background: '#9ca3af',
                      border: 'none',
                      fontSize: '16px',
                      fontWeight: 700,
                      letterSpacing: '0.015em',
                      padding: '0 20px',
                      cursor: 'not-allowed'
                    }}
                  >
                    {(() => {
                      const minutes = Math.floor(cooldownRemaining / 60);
                      const seconds = cooldownRemaining % 60;
                      return `Atlikušas ${minutes}:${seconds.toString().padStart(2, '0')}`;
                    })()}
                  </Button>
                ) : (
                  <Popconfirm
                    title="Nosūtīt e-pastu?"
                    description={
                      <div>
                        <p>Vai tiešām vēlaties nosūtīt rēķinu uz {invoice?.customer_email}?</p>
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
                      // Payment link will be created automatically in handleSendEmail
                      // Send email (this will update status to 'sent' and keep modal open)
                      await handleSendEmail();
                      // Modal stays open - don't close it
                    }}
                    onOpenChange={(open) => {
                      // Prevent Popconfirm from affecting modal state
                      if (!open && sendingEmail) {
                        return false;
                      }
                    }}
                    okText="Nosūtīt"
                    cancelText="Atcelt"
                    okButtonProps={{
                      style: { background: '#137fec', borderColor: '#137fec' }
                    }}
                  >
                    <Button
                      type="primary"
                      loading={preparingToSend || sendingEmail}
                      disabled={preparingToSend || sendingEmail || cooldownRemaining > 0}
                      className="share-modal-button"
                      style={{
                        height: '48px',
                        minWidth: '84px',
                        width: '100%',
                        borderRadius: '8px',
                        background: '#137fec',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: 700,
                        letterSpacing: '0.015em',
                        padding: '0 20px'
                      }}
                    >
                      Nosūtīt e-pastu
                    </Button>
                  </Popconfirm>
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
                  value={getPublicInvoiceUrl()}
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
                  onClick={!customerNotified ? handleCopyLink : handleCopyLinkOnly}
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

      {/* Warning Modal - Customer Not Notified */}
      <Modal
        open={warningModalVisible}
        onCancel={() => {
          setWarningModalVisible(false);
          // Keep share modal open
        }}
        footer={null}
        closable={true}
        centered
        width={512}
        styles={{
          body: { padding: '24px' }
        }}
        style={{
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header with Warning Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              height: '48px',
              width: '48px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: '#FEF3C7'
            }}>
              <WarningOutlined style={{ fontSize: '24px', color: '#F59E0B' }} />
            </div>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 700, 
              color: '#1C2434',
              margin: 0
            }}>
              Brīdinājums
            </h2>
          </div>

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <p style={{ 
              fontSize: '16px', 
              color: '#64748B', 
              lineHeight: 1.5,
              margin: 0
            }}>
              Rēķins joprojām paliek <strong style={{ 
                fontWeight: 600, 
                color: '#1C2434' 
              }}>"Nen nosūtīts"</strong> un klients nav informēts.
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: '#64748B', 
              lineHeight: 1.5,
              margin: 0
            }}>
              Ja aizvērsiet šo logu bez nosūtīšanas, klients <strong style={{ fontWeight: 500 }}>nesaņems automātiskos e-pastus</strong> un <strong style={{ fontWeight: 500 }}>neiegūs maksājuma saiti.</strong>
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: '#EF4444', 
              lineHeight: 1.5,
              fontWeight: 500,
              margin: 0
            }}>
              Lūdzu, nosūtiet rēķinu klientam, lai klients saņemtu automātiskos e-pastus un maksājuma saiti.
            </p>
          </div>

          {/* Footer with Button */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '24px'
          }}>
            <Button
              type="primary"
              onClick={() => {
                setWarningModalVisible(false);
                setShareMethodModal(false);
                setCustomerNotified(false);
              }}
              style={{
                borderRadius: '8px',
                background: '#0F76FF',
                borderColor: '#0F76FF',
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '14px',
                height: '40px',
                padding: '0 24px'
              }}
            >
              Saprotu
            </Button>
          </div>
        </div>
      </Modal>

    </DashboardLayout>
  );
};

export default ViewInvoice;

