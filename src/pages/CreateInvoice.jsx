import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  Alert,
  Modal,
  Tooltip,
  Typography
} from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined, FileTextOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { mozelloService } from '../services/mozelloService';
import { logInvoiceAction, ActionTypes } from '../services/activityLogService';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const CreateInvoice = ({ mode = 'create' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { invoiceNumber: editInvoiceNumber } = useParams();
  const { currentUser } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(mode === 'edit');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [blacklistWarningVisible, setBlacklistWarningVisible] = useState(false);
  const [blacklistMatch, setBlacklistMatch] = useState(null);
  const [pendingFormValues, setPendingFormValues] = useState(null);
  const templateLoadedRef = useRef(false);
  
  // VAT settings state
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(0);
  
  // Set document title
  useEffect(() => {
    if (mode === 'edit') {
      document.title = 'Rediģēt rēķinu | Piffdeals';
    } else {
      document.title = 'Izveidot rēķinu | Piffdeals';
    }
  }, [mode]);
  
  // Barcode scanner state
  const scannerInputRef = useRef('');
  const scannerTimeoutRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const itemsRef = useRef([]);
  const availableProductsRef = useRef([]);


  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([
    { id: 1, type: 'product', productHandle: '', name: '', quantity: 1, price: 0, total: 0, stock: null, showQuantity: true }
  ]);

  useEffect(() => {
    if (mode === 'edit' && editInvoiceNumber) {
      loadExistingInvoice();
    } else {
      generateInvoiceNumber();
    }
    fetchProducts();
    fetchVatSettings();
    // Initialize form with default values for create mode
    if (mode === 'create') {
      form.setFieldsValue({
        issueDate: dayjs(),
      });
    }
  }, [form, mode, editInvoiceNumber]);

  // Separate effect for template loading (only runs once when template is provided)
  useEffect(() => {
    if (mode === 'create' && location.state?.template && !templateLoadedRef.current) {
      loadFromTemplate(location.state.template);
      templateLoadedRef.current = true;
      message.success('Parauga dati ielādēti');
    }
  }, [mode, location.state]);

  // Handle scanned product from global barcode scanner
  useEffect(() => {
    if (mode === 'create' && location.state?.scannedProduct && !templateLoadedRef.current) {
      const scannedProduct = location.state.scannedProduct;
      
      // Helper function to add scanned product
      const addScannedProduct = () => {
        setItems(currentItems => {
          // Check if product is already in items
          const existingItem = currentItems.find(item => item.productHandle === scannedProduct.productHandle);
          
          if (existingItem) {
            // Increment quantity if product already exists
            const stockLimit = existingItem.stock !== null ? existingItem.stock : MAX_QUANTITY;
            const maxQty = Math.min(stockLimit, MAX_QUANTITY);
            const newQuantity = Math.min(existingItem.quantity + 1, maxQty);
            
            if (newQuantity === existingItem.quantity && existingItem.quantity >= maxQty) {
              message.warning(`Maksimālais daudzums sasniegts: ${maxQty}`);
              return currentItems; // Return unchanged items
            }
            
            // Update the existing item's quantity
            const updatedItems = currentItems.map(item => {
              if (item.id === existingItem.id) {
                return {
                  ...item,
                  quantity: newQuantity,
                  total: calculateItemTotal(newQuantity, item.price),
                };
              }
              return item;
            });
            
            message.success(`${scannedProduct.name} - daudzums palielināts uz ${newQuantity}`);
            return updatedItems;
          } else {
            // Add new item
            const newId = Math.max(...currentItems.map(i => i.id), 0) + 1;
            const newItem = {
              id: newId,
              type: 'product',
              productHandle: scannedProduct.productHandle,
              name: scannedProduct.name,
              quantity: scannedProduct.quantity || 1,
              price: scannedProduct.price,
              total: calculateItemTotal(scannedProduct.quantity || 1, scannedProduct.price),
              stock: scannedProduct.stock,
              showQuantity: true,
            };
            
            message.success(`${scannedProduct.name} pievienots`);
            return [...currentItems, newItem];
          }
        });
      };
      
      // Wait for products to load before adding scanned product
      if (loadingProducts) {
        // Products are still loading, wait a bit
        const checkProducts = setInterval(() => {
          if (!loadingProducts && availableProducts.length > 0) {
            clearInterval(checkProducts);
            addScannedProduct();
          }
        }, 100);
        
        return () => clearInterval(checkProducts);
      } else if (availableProducts.length > 0) {
        addScannedProduct();
      }
      
      // Clear the scanned product from location state to prevent re-adding
      // Use replace to update location state without adding to history
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [mode, location.state, loadingProducts, availableProducts.length, navigate, message]);

  // Keep refs in sync with state for barcode scanner
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    availableProductsRef.current = availableProducts;
  }, [availableProducts]);

  // Barcode scanner effect - listens for scanner input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current;
      
      // Reset scanner input if too much time passed (user is typing manually)
      // Scanners typically send characters very quickly (< 50ms between keys)
      if (timeSinceLastKey > 100) {
        scannerInputRef.current = '';
      }
      
      lastKeyTimeRef.current = currentTime;
      
      // Ignore if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable ||
        activeElement.closest('.ant-select-dropdown') // Ignore when select dropdown is open
      );
      
      // If Enter key is pressed and we have scanner input, process it
      if (e.key === 'Enter' && scannerInputRef.current.length > 0 && !isInputField) {
        e.preventDefault();
        const scannedCode = scannerInputRef.current.trim();
        scannerInputRef.current = '';
        
        // Process the scanned code using current ref values
        if (scannedCode.length > 0) {
          // Get current values from refs
          const currentItems = itemsRef.current;
          const currentProducts = availableProductsRef.current;
          
          if (currentProducts.length === 0) {
            message.warning('Produkti vēl nav ielādēti. Lūdzu, uzgaidiet...');
            return;
          }
          
          // Search for product by SKU/barcode
          const product = findProductBySKU(scannedCode, currentProducts);
          
          if (!product) {
            message.warning(`Produkts ar SKU "${scannedCode}" nav atrasts`);
            return;
          }
          
          // Check if product is already in items
          const existingItem = currentItems.find(item => item.productHandle === product.handle);
          
          if (existingItem) {
            // Increment quantity if product already exists
            const stockLimit = existingItem.stock !== null ? existingItem.stock : MAX_QUANTITY;
            const maxQty = Math.min(stockLimit, MAX_QUANTITY);
            const newQuantity = Math.min(existingItem.quantity + 1, maxQty);
            
            if (newQuantity === existingItem.quantity && existingItem.quantity >= maxQty) {
              message.warning(`Maksimālais daudzums sasniegts: ${maxQty}`);
              return;
            }
            
            handleItemChange(existingItem.id, 'quantity', newQuantity);
            message.success(`${getProductTitle(product)} - daudzums palielināts uz ${newQuantity}`);
          } else {
            // Add new item if product doesn't exist
            const title = getProductTitle(product);
            const price = getProductPrice(product);
            const stock = product.stock;
            
            const newId = Math.max(...currentItems.map(i => i.id), 0) + 1;
            const newItem = {
              id: newId,
              productHandle: product.handle,
              name: title,
              quantity: 1,
              price: price,
              total: calculateItemTotal(1, price),
              stock: stock,
            };
            
            setItems([...currentItems, newItem]);
            message.success(`${title} pievienots`);
          }
        }
        return;
      }
      
      // Accumulate characters for scanner input (only if not in input field)
      // Scanners send printable characters quickly, so we detect rapid input
      if (!isInputField && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only accept alphanumeric and common barcode characters
        if (/^[a-zA-Z0-9\-_]+$/.test(e.key)) {
          scannerInputRef.current += e.key;
          
          // Clear timeout if exists
          if (scannerTimeoutRef.current) {
            clearTimeout(scannerTimeoutRef.current);
          }
          
          // Reset scanner input after 300ms of no input (user finished typing)
          // This prevents accidental triggers from slow typing
          scannerTimeoutRef.current = setTimeout(() => {
            scannerInputRef.current = '';
          }, 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, []); // Empty deps - we use refs to access current values

  const fetchVatSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_vat_setting');
      
      if (error) {
        return;
      }
      
      if (data) {
        setVatEnabled(data.enabled || false);
        setVatRate((data.rate || 0) * 100); // Convert decimal to percentage
      }
    } catch (error) {
      // Error fetching VAT settings
    }
  };

  const loadExistingInvoice = async () => {
    try {
      setLoadingInvoice(true);
      
      // Decode the invoice number in case it was URL encoded
      const decodedInvoiceNumber = decodeURIComponent(editInvoiceNumber);
      
      // Fetch invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', decodedInvoiceNumber)
        .single();

      if (invoiceError) throw invoiceError;

      // Check if invoice is draft
      if (invoice.status !== 'draft') {
        message.error('Var rediģēt tikai melnraksta rēķinus');
        navigate('/invoices');
        return;
      }

      // Fetch current user's profile to check their role (in case useUserRole hasn't loaded yet)
      let currentUserProfile = null;
      if (currentUser?.id) {
        const { data: currentUserData, error: currentUserError } = await supabase
          .from('user_profiles')
          .select('id, role')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (!currentUserError && currentUserData) {
          currentUserProfile = currentUserData;
        }
      }

      // Fetch creator's profile to check their role
      let creatorProfile = null;
      if (invoice.user_id) {
        const { data: creatorData, error: creatorError } = await supabase
          .from('user_profiles')
          .select('id, username, email, role')
          .eq('id', invoice.user_id)
          .maybeSingle();
        
        if (!creatorError && creatorData) {
          creatorProfile = creatorData;
        }
      }

      // Check if user has permission to edit
      const isCreator = invoice.user_id === currentUser.id;
      // Use currentUserProfile role if available, otherwise fall back to useUserRole hook values
      const currentUserRole = currentUserProfile?.role;
      const isAdminOnly = currentUserRole === 'admin';
      const isSuperAdminUser = currentUserRole === 'super_admin';
      const creatorIsEmployee = creatorProfile?.role === 'employee';
      const canEditAsAdmin = isAdminOnly && creatorIsEmployee;
      
      if (!isCreator && !isSuperAdminUser && !canEditAsAdmin) {
        message.error('Jūs nevarat rediģēt šo rēķinu');
        navigate('/invoices');
        return;
      }

      // Fetch invoice items
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) throw itemsError;

      // Set invoice data
      setExistingInvoice(invoice);
      setInvoiceNumber(invoice.invoice_number);

      // Set form values
      form.setFieldsValue({
        clientName: invoice.customer_name,
        clientEmail: invoice.customer_email,
        clientPhone: invoice.customer_phone,
        clientAddress: invoice.customer_address,
        issueDate: dayjs(invoice.issue_date),
        notes: invoice.notes,
      });

      // Set items - determine type based on whether product_id exists
      const loadedItems = invoiceItems.map((item, index) => {
        const isProduct = !!item.product_id;
        return {
          id: index + 1,
          type: isProduct ? 'product' : 'custom',
          productHandle: item.product_id || '',
          name: item.product_name,
          quantity: item.quantity,
          price: parseFloat(item.unit_price),
          total: parseFloat(item.total),
          stock: null, // Will be loaded when products are fetched
          showQuantity: isProduct || item.quantity > 1, // Show quantity for products or if custom item has qty > 1
        };
      });

      setItems(loadedItems);

    } catch (error) {
      // Only show error if it's not a permission error (already shown above)
      if (error.message !== 'Permission denied') {
        message.error('Neizdevās ielādēt rēķinu');
      }
      navigate('/invoices');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const loadFromTemplate = (template) => {
    form.setFieldsValue({
      clientName: template.clientName,
      clientEmail: template.clientEmail,
      clientPhone: template.clientPhone,
      clientAddress: template.clientAddress,
      notes: template.notes || '',
    });
  };

  const generateInvoiceNumber = async () => {
    // Generate unique invoice number: #########
    let isUnique = false;
    let newInvoiceNumber = '';
    
    while (!isUnique) {
      const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
      newInvoiceNumber = `#${random}`;
      
      // Check if this invoice number already exists in database
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('invoice_number', newInvoiceNumber)
        .maybeSingle();
      
      // If no error and no data returned, the invoice number is unique
      if (!error && !data) {
        isUnique = true;
      }
    }
    
    setInvoiceNumber(newInvoiceNumber);
  };

  // Calculate due date automatically (issue date + 3 days)
  const calculateDueDate = (issueDateValue) => {
    if (!issueDateValue) return dayjs().add(3, 'day');
    return issueDateValue.add(3, 'day');
  };
  
  // Get current issue date from form
  const getCurrentIssueDate = () => {
    return form.getFieldValue('issueDate') || dayjs();
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await mozelloService.getProducts();
      const products = data.products || [];
      
      // Filter products that CAN BE PURCHASED
      const purchasableProducts = products.filter(product => {
        // 1. Check visibility - must be visible
        if (!product.visible) return false;
        
        // 2. Check stock - must have stock > 0 OR null (unlimited)
        const hasValidStock = product.stock === null || product.stock > 0;
        
        // 3. Check price - must have price on product level OR on variant level
        const productPrice = product.sale_price || product.price;
        const hasProductPrice = productPrice && parseFloat(productPrice) > 0;
        
        // Check if variants have price
        const hasVariantPrice = product.variants && product.variants.length > 0 && 
          product.variants.some(variant => {
            const variantPrice = variant.sale_price || variant.price;
            const hasPrice = variantPrice && parseFloat(variantPrice) > 0;
            const hasStock = variant.stock === null || variant.stock > 0;
            return hasPrice && hasStock;
          });
        
        // Product is purchasable if it has valid stock AND (has product price OR has variant price)
        return hasValidStock && (hasProductPrice || hasVariantPrice);
      });
      
      setAvailableProducts(purchasableProducts);
    } catch (error) {
      message.error('Neizdevās ielādēt produktus no veikala');
    } finally {
      setLoadingProducts(false);
    }
  };

  const getProductTitle = (product) => {
    // Get title in appropriate language (default to first available)
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

  // Search product by SKU/barcode
  const findProductBySKU = (sku, products) => {
    if (!products || products.length === 0) return null;
    
    // Try multiple possible field names for SKU/barcode
    return products.find(product => {
      // Check product level SKU/barcode
      if (product.sku && product.sku.toLowerCase() === sku.toLowerCase()) return true;
      if (product.barcode && product.barcode.toLowerCase() === sku.toLowerCase()) return true;
      if (product.code && product.code.toLowerCase() === sku.toLowerCase()) return true;
      if (product.handle && product.handle.toLowerCase() === sku.toLowerCase()) return true;
      
      // Check variant level SKU/barcode
      if (product.variants && product.variants.length > 0) {
        return product.variants.some(variant => {
          if (variant.sku && variant.sku.toLowerCase() === sku.toLowerCase()) return true;
          if (variant.barcode && variant.barcode.toLowerCase() === sku.toLowerCase()) return true;
          if (variant.code && variant.code.toLowerCase() === sku.toLowerCase()) return true;
          return false;
        });
      }
      
      return false;
    });
  };


  // Maximum quantity limit per item (prevents input errors, allows bulk orders)
  const MAX_QUANTITY = 999;

  const calculateItemTotal = (quantity, price) => {
    return (quantity * price).toFixed(2);
  };

  // Get available products for a specific item (excluding already selected products)
  const getAvailableProductsForItem = (currentItemId) => {
    const selectedHandles = items
      .filter(item => item.id !== currentItemId && item.productHandle)
      .map(item => item.productHandle);
    
    return availableProducts.filter(product => !selectedHandles.includes(product.handle));
  };

  const handleProductSelect = (id, productHandle) => {
    const product = availableProducts.find(p => p.handle === productHandle);
    if (!product) return;

    const title = getProductTitle(product);
    const price = getProductPrice(product);
    const stock = product.stock; // null means unlimited

    setItems(items.map(item => {
      if (item.id === id) {
        // Determine max quantity: stock limit OR MAX_QUANTITY, whichever is lower
        const stockLimit = stock !== null ? stock : MAX_QUANTITY;
        const maxAllowed = Math.min(stockLimit, MAX_QUANTITY);
        const adjustedQuantity = Math.min(item.quantity, maxAllowed);
        
        const updatedItem = {
          ...item,
          productHandle: productHandle,
          name: title,
          price: price,
          stock: stock,
          quantity: adjustedQuantity,
          total: calculateItemTotal(adjustedQuantity, price),
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

  const addItem = (type = 'product') => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    // For custom items, showQuantity defaults to false (quantity fixed at 1)
    // For products, showQuantity is always true
    setItems([...items, { id: newId, type, productHandle: '', name: '', quantity: 1, price: 0, total: 0, stock: null, showQuantity: type === 'product' }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
  };

  const calculateTaxAmount = () => {
    if (!vatEnabled) return 0;
    const subtotal = calculateSubtotal();
    return (subtotal * (vatRate / 100));
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount();
    return subtotal + taxAmount;
  };

  // Handle confirmed save after blacklist warning
  const handleConfirmedSave = async () => {
    setBlacklistWarningVisible(false);
    setBlacklistMatch(null);
    setPendingFormValues(null);
    // Proceed with save, skipping blacklist check
    await handleSave(true);
  };

  const handleCancelBlacklistWarning = () => {
    setBlacklistWarningVisible(false);
    setBlacklistMatch(null);
    setPendingFormValues(null);
  };

  const handleSaveAsTemplate = async () => {
    try {
      // Validate client fields and get all form values including notes
      const values = await form.validateFields(['clientName', 'clientEmail', 'clientPhone', 'clientAddress']);
      const allValues = form.getFieldsValue(); // Get all values including notes
      
      if (!templateName.trim()) {
        message.error('Ievadiet parauga nosaukumu');
        return;
      }

      const { error } = await supabase
        .from('invoice_templates')
        .insert({
          user_id: currentUser.id,
          template_name: templateName.trim(),
          customer_name: values.clientName,
          customer_email: values.clientEmail,
          customer_address: values.clientAddress,
          customer_phone: values.clientPhone,
          notes: allValues.notes || '',
        });

      if (error) throw error;

      message.success('Paraugs saglabāts!');
      setSaveTemplateModalVisible(false);
      setTemplateName('');
    } catch (error) {
      if (error.errorFields) {
        message.error('Aizpildiet visus obligātos laukus');
        return;
      }
      message.error('Neizdevās saglabāt paraugu');
    }
  };

  // Check if customer is in blacklist (by email OR name)
  const checkBlacklist = async (customerEmail, customerName) => {
    try {
      const emailLower = customerEmail?.toLowerCase();
      const nameLower = customerName?.toLowerCase();
      
      // Check both email and name against blacklist
      const { data, error } = await supabase
        .from('customer_blacklist')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Find match by email or name (case-insensitive)
        const match = data.find(record => 
          record.customer_email?.toLowerCase() === emailLower ||
          record.customer_name?.toLowerCase() === nameLower
        );
        
        return match || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleSave = async (skipBlacklistCheck = false) => {
    // Validate items
    const invalidItems = items.some(item => {
      if (item.type === 'product') {
        // Product items must have a product selected (productHandle) and price > 0
        return !item.productHandle || item.price < 0;
      } else {
        // Custom items must have a name entered and price >= 0
        return !item.name || !item.name.trim() || item.price < 0;
      }
    });
    
    if (invalidItems) {
      message.error('Aizpildiet visus produktu/pakalpojumu laukus');
      return;
    }

    try {
      // Trigger form validation - this will show red borders if validation fails
      const values = await form.validateFields();
      
      // Check blacklist before saving (only if not skipping)
      if (!skipBlacklistCheck) {
        const blacklistRecord = await checkBlacklist(values.clientEmail, values.clientName);
        if (blacklistRecord) {
          setBlacklistMatch(blacklistRecord);
          setPendingFormValues(values);
          setBlacklistWarningVisible(true);
          return; // Stop and wait for user confirmation
        }
      }
      
      setLoading(true);

      const formValues = values;
      const issueDate = formValues.issueDate;
      const dueDate = calculateDueDate(issueDate);

      // Generate public_token for new invoices or if it doesn't exist
      let publicToken = existingInvoice?.public_token;
      if (!publicToken) {
        publicToken = crypto.randomUUID();
      }

      const invoiceData = {
        customer_name: formValues.clientName,
        customer_email: formValues.clientEmail,
        customer_address: formValues.clientAddress,
        customer_phone: formValues.clientPhone,
        issue_date: issueDate.format('YYYY-MM-DD'),
        due_date: dueDate.format('YYYY-MM-DD'),
        subtotal: calculateSubtotal(),
        tax_rate: vatEnabled ? vatRate / 100 : 0, // Store as decimal (e.g., 0.21)
        tax_amount: calculateTaxAmount(),
        total: calculateTotal(),
        status: 'draft',
        notes: formValues.notes || '',
        public_token: publicToken, // Always include public_token
      };

      let invoice;

      if (mode === 'edit' && existingInvoice) {
        // Update existing invoice
        const { data, error: invoiceError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', existingInvoice.id)
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoice = data;

        // Delete old invoice items
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', existingInvoice.id);

        if (deleteError) throw deleteError;

      } else {
        // Create new invoice
        const { data, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            ...invoiceData,
            invoice_number: invoiceNumber,
            user_id: currentUser.id,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoice = data;
      }

      // Create/update invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.productHandle || null,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.total,
        stock_snapshot: item.stock !== undefined ? item.stock : null, // Store stock snapshot for backend validation
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Log invoice creation or update
      const isOwnInvoice = existingInvoice ? existingInvoice.user_id === currentUser.id : true;
      if (mode === 'edit' && existingInvoice) {
        // Log invoice update
        await logInvoiceAction(
          ActionTypes.INVOICE_UPDATED,
          `Rediģēts rēķins ${invoice.invoice_number}${!isOwnInvoice ? ` (cita lietotāja rēķins)` : ''}`,
          {
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            total_amount: parseFloat(invoice.total || 0),
            is_own_invoice: isOwnInvoice,
            is_other_user_invoice: !isOwnInvoice,
            modified_by: currentUser?.user_metadata?.username || currentUser?.email || 'Nezināms',
          },
          invoice.id
        );
      } else {
        // Log invoice creation
        await logInvoiceAction(
          ActionTypes.INVOICE_CREATED,
          `Izveidots jauns rēķins ${invoice.invoice_number}`,
          {
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            customer_email: invoice.customer_email,
            total_amount: parseFloat(invoice.total || 0),
            is_own_invoice: true,
            created_by: currentUser?.user_metadata?.username || currentUser?.email || 'Nezināms',
          },
          invoice.id
        );
      }

      setLoading(false);
      const successMsg = mode === 'edit' 
        ? 'Rēķins atjaunināts!'
        : 'Rēķins izveidots!';
      message.success(successMsg);
      navigate('/invoices');
    } catch (error) {
      if (error.errorFields) {
        // Form validation error - red borders and error messages are now shown below fields
        message.error('Aizpildiet visus laukus');
        return;
      }
      setLoading(false);
      
      // Check for backend validation errors (quantity limits)
      const errorMessage = error?.message || error?.error?.message || '';
      if (errorMessage.includes('Quantity cannot exceed 999') || errorMessage.includes('quantity > 999')) {
        message.error('Daudzums nedrīkst pārsniegt 999');
      } else if (errorMessage.includes('Quantity cannot exceed available stock') || errorMessage.includes('stock')) {
        message.error('Daudzums nedrīkst pārsniegt pieejamo krājumu');
      } else {
        message.error('Neizdevās saglabāt rēķinu' + (errorMessage ? `: ${errorMessage}` : ''));
      }
    }
  };

  return (
    <DashboardLayout>
      <style>{`
        /* Match original HTML design exactly */
        .ant-input,
        .ant-input-number,
        .ant-select-selector,
        .ant-picker {
          border-radius: 0.375rem !important; /* rounded-md = 6px */
          border-color: #d9d9d9 !important;
          padding: 0.5rem 1rem !important; /* py-2 px-4 */
          color: #262626 !important;
          font-size: 14px !important;
          box-sizing: border-box !important;
        }
        
        /* Ensure Select and Input have same width */
        .ant-select,
        .ant-input {
          width: 100% !important;
          box-sizing: border-box !important;
          min-width: 0 !important;
        }
        
        /* Ensure Select selector matches Input width exactly */
        .ant-select .ant-select-selector {
          width: 100% !important;
          box-sizing: border-box !important;
          min-width: 0 !important;
        }
        
        /* Ensure Select wrapper doesn't add extra width */
        .ant-select {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        
        /* Remove any margins/padding that could affect width */
        .ant-select,
        .ant-input {
          margin: 0 !important;
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
        
        /* Remove all blue outlines and borders */
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
          border-radius: 0.5rem !important; /* rounded-lg */
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
          border-radius: 0.75rem !important; /* rounded-xl */
          border-color: #d9d9d9 !important;
        }
        
        /* Disabled input style */
        .ant-input-disabled,
        .ant-input[disabled],
        .ant-picker-disabled {
          background-color: #f3f4f6 !important;
          color: #6b7280 !important;
        }
      `}</style>
      <Spin spinning={loading || loadingInvoice}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#111827' }}>
                {mode === 'edit' ? 'Rediģēt rēķinu' : 'Izveidot rēķinu'}
              </h1>
              <Tooltip 
                title={
                  <div style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>Rēķina izveide</div>
                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      Izveidojiet jaunu rēķinu, aizpildot klienta datus un pievienojot produktus. Varat izmantot barcode skeneri, lai ātri pievienotu produktus. Apmaksas termiņš tiek automātiski aprēķināts (+5 dienas). Varat saglabāt klienta datus kā paraugu nākamajiem rēķiniem. Rediģēt var tikai melnraksta rēķinus.
                    </div>
                  </div>
                }
                placement="right"
              >
                <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
              </Tooltip>
            </div>
          </div>

          {mode === 'edit' && (
            <Alert
              message="Rediģēšanas režīms"
              description="Jūs rediģējat melnraksta rēķinu. Saglabājiet izmaiņas vai nosūtiet rēķinu klientam."
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Card style={{ borderRadius: 12 }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                issueDate: dayjs(),
              }}
              validateTrigger={['onBlur', 'onChange']}
              onFinish={() => {
              }}
            >
              {/* Header Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Rēķina Nr.</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                    {invoiceNumber}
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
                        />
                      </Form.Item>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 8 }}>
                        Apmaksas termiņš
                      </div>
                      <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.issueDate !== currentValues.issueDate}>
                        {({ getFieldValue }) => {
                          const issueDate = getFieldValue('issueDate') || dayjs();
                          const dueDate = calculateDueDate(issueDate);
                          return (
                            <Input
                              value={dueDate.format('DD.MM.YYYY')}
                              disabled
                              style={{ background: '#f3f4f6', color: '#6b7280' }}
                              suffix={<span style={{ fontSize: 12, color: '#9ca3af' }}>(+3 dienas)</span>}
                            />
                          );
                        }}
                      </Form.Item>
                    </div>
                  </div>
                </div>
              </div>

            <Divider />

            {/* Items Table */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                Rēķina pozīcijas
              </h3>
              
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                {/* Table Header */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '90px 1fr 100px 120px 100px 50px',
                  background: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  padding: '12px 16px',
                  gap: 12,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Tips</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Nosaukums</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Daudzums</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Cena</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Kopā</div>
                  <div></div>
                </div>

                {/* Table Rows */}
                {items.map((item, index) => (
                  <div 
                    key={item.id}
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '90px 1fr 100px 120px 100px 50px',
                      padding: '16px',
                      gap: 12,
                      alignItems: 'center',
                      borderBottom: index < items.length - 1 ? '1px solid #e5e7eb' : 'none',
                      background: '#fff',
                    }}
                  >
                    {/* Type Badge */}
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: item.type === 'product' ? 'rgba(0, 104, 255, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                          color: item.type === 'product' ? '#0068FF' : '#b45309',
                        }}
                      >
                        {item.type === 'product' ? 'Produkts' : 'Cits'}
                      </span>
                    </div>

                    {/* Name / Product Select */}
                    <div style={{ width: '100%' }}>
                      {item.type === 'product' ? (
                        <Select
                          showSearch
                          style={{ width: '100%' }}
                          placeholder="Izvēlieties produktu..."
                          value={item.productHandle || undefined}
                          onChange={(value) => handleProductSelect(item.id, value)}
                          loading={loadingProducts}
                          filterOption={(input, option) =>
                            (option.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                          optionLabelProp="label"
                        >
                          {getAvailableProductsForItem(item.id).map(product => {
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
                                        border: '1px solid #e5e7eb'
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
                        <Input
                          placeholder="Ievadiet nosaukumu (piem. Piegādes maksa)"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          style={{ width: '100%', height: '32px', boxSizing: 'border-box' }}
                        />
                      )}
                    </div>

                    {/* Quantity */}
                    <div style={{ position: 'relative' }}>
                      {item.type === 'product' || item.showQuantity ? (
                        <>
                          <InputNumber
                            min={1}
                            max={item.type === 'product' && item.stock !== null ? Math.min(item.stock, MAX_QUANTITY) : MAX_QUANTITY}
                            value={item.quantity}
                            onChange={(value) => {
                              const stockLimit = item.type === 'product' && item.stock !== null ? item.stock : MAX_QUANTITY;
                              const maxQty = Math.min(stockLimit, MAX_QUANTITY);
                              const finalValue = Math.min(value || 1, maxQty);
                              handleItemChange(item.id, 'quantity', finalValue);
                            }}
                            style={{ width: '100%' }}
                          />
                          {item.type === 'product' && item.stock !== null && (
                            <div style={{ fontSize: 10, color: item.stock < 5 ? '#ef4444' : '#9ca3af', marginTop: 2, textAlign: 'center' }}>
                              max {Math.min(item.stock, MAX_QUANTITY)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            height: 32,
                            color: '#9ca3af',
                            fontSize: 13,
                            cursor: 'pointer',
                            border: '1px dashed #d1d5db',
                            borderRadius: 6,
                          }}
                          onClick={() => {
                            setItems(items.map(i => i.id === item.id ? { ...i, showQuantity: true } : i));
                          }}
                          title="Noklikšķiniet, lai pievienotu daudzumu"
                        >
                          1 ×
                        </div>
                      )}
                      {item.type === 'custom' && item.showQuantity && (
                        <div 
                          style={{ 
                            fontSize: 10, 
                            color: '#9ca3af', 
                            textAlign: 'center', 
                            cursor: 'pointer',
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 2,
                          }}
                          onClick={() => {
                            setItems(items.map(i => i.id === item.id ? { ...i, showQuantity: false, quantity: 1, total: calculateItemTotal(1, i.price) } : i));
                          }}
                        >
                          paslēpt
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div>
                      <InputNumber
                        min={0}
                        step={0.01}
                        value={item.price}
                        onChange={(value) => handleItemChange(item.id, 'price', value || 0)}
                        style={{ width: '100%' }}
                        prefix="€"
                      />
                    </div>

                    {/* Total */}
                    <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#111827' }}>
                      €{parseFloat(item.total).toFixed(2)}
                    </div>

                    {/* Delete */}
                    <div style={{ textAlign: 'center' }}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        size="small"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addItem('product')}
                  style={{ flex: 1 }}
                >
                  Pievienot produktu
                </Button>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addItem('custom')}
                  style={{ 
                    flex: 1,
                    background: 'rgba(217, 119, 6, 0.05)',
                    borderColor: '#d97706',
                    color: '#b45309',
                  }}
                >
                  Pievienot citu
                </Button>
              </div>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
              <div style={{ width: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16 }}>
                  <span style={{ color: '#6b7280' }}>Starpsumma</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>€{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16 }}>
                  <span style={{ color: '#6b7280' }}>
                    PVN ({vatEnabled ? parseFloat(vatRate.toFixed(2)) : 0}%)
                  </span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>€{calculateTaxAmount().toFixed(2)}</span>
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
                  />
                </Form.Item>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                {mode === 'create' && (
                  <Button
                    icon={<FileTextOutlined />}
                    onClick={() => setSaveTemplateModalVisible(true)}
                    style={{
                      borderColor: '#d9d9d9',
                      color: '#0068FF',
                    }}
                  >
                    Saglabāt kā šablonu
                  </Button>
                )}
                <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => handleSave()}
                    loading={loading}
                  >
                    {mode === 'edit' ? 'Saglabāt izmaiņas' : 'Izveidot rēķinu'}
                  </Button>
                </div>
              </div>
            </Form>
          </Card>
        </div>
      </Spin>

      {/* Save Template Modal */}
      <Modal
        title="Saglabāt kā šablonu"
        open={saveTemplateModalVisible}
        onOk={handleSaveAsTemplate}
        onCancel={() => {
          setSaveTemplateModalVisible(false);
          setTemplateName('');
        }}
        okText="Saglabāt"
        cancelText="Atcelt"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#111827' }}>
              Parauga nosaukums *
            </label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Piemēram: Uzņēmums ABC"
              onPressEnter={handleSaveAsTemplate}
            />
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Tiks saglabāti klienta dati (vārds, e-pasts, telefons, adrese) un piezīmes. Produkti netiks saglabāti.
          </div>
        </div>
      </Modal>

      {/* Blacklist Warning Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WarningOutlined style={{ color: '#F59E0B', fontSize: 22 }} />
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>Klients ir melnajā sarakstā!</span>
          </div>
        }
        open={blacklistWarningVisible}
        onOk={handleConfirmedSave}
        onCancel={handleCancelBlacklistWarning}
        okText="Turpināt tik un tā"
        cancelText="Atcelt"
        okButtonProps={{ 
          danger: true,
          style: { fontWeight: 600 }
        }}
        cancelButtonProps={{
          style: { fontWeight: 600 }
        }}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: 8, 
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Klienta vārds:</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                {blacklistMatch?.customer_name || '-'}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>E-pasts:</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>
                {blacklistMatch?.customer_email || '-'}
              </div>
            </div>
            {blacklistMatch?.overdue_count > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Nokavēti rēķini:</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#ef4444' }}>
                  {blacklistMatch.overdue_count}
                </div>
              </div>
            )}
            {blacklistMatch?.reason && (
              <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Iemesls:</div>
                <div style={{ fontSize: 14, color: '#4b5563', fontStyle: 'italic' }}>
                  "{blacklistMatch.reason}"
                </div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
            Šis klients ir pievienots melnajam sarakstam. Vai tiešām vēlaties izveidot rēķinu šim klientam?
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default CreateInvoice;
