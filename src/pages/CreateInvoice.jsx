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
  Modal
} from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined, FileTextOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { mozelloService } from '../services/mozelloService';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const CreateInvoice = ({ mode = 'create' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { invoiceNumber: editInvoiceNumber } = useParams();
  const { currentUser } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(mode === 'edit');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const templateLoadedRef = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('CreateInvoice mounted/updated:', {
      mode,
      editInvoiceNumber,
      currentUser: currentUser ? 'exists' : 'null',
      pathname: window.location.pathname
    });
  }, [mode, editInvoiceNumber, currentUser]);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([
    { id: 1, productHandle: '', name: '', quantity: 1, price: 0, total: 0, stock: null }
  ]);

  useEffect(() => {
    if (mode === 'edit' && editInvoiceNumber) {
      loadExistingInvoice();
    } else {
      generateInvoiceNumber();
    }
    fetchProducts();
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

  const loadExistingInvoice = async () => {
    try {
      setLoadingInvoice(true);
      
      // Decode the invoice number in case it was URL encoded
      const decodedInvoiceNumber = decodeURIComponent(editInvoiceNumber);
      console.log('Loading invoice for editing with number:', decodedInvoiceNumber);
      
      // Fetch invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', decodedInvoiceNumber)
        .single();

      if (invoiceError) throw invoiceError;

      // Check if user is the creator
      if (invoice.user_id !== currentUser.id) {
        message.error('Jūs nevarat rediģēt šo rēķinu');
        navigate('/invoices');
        return;
      }

      // Check if invoice is draft
      if (invoice.status !== 'draft') {
        message.error('Var rediģēt tikai melnraksta rēķinus');
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

      // Set items
      const loadedItems = invoiceItems.map((item, index) => ({
        id: index + 1,
        productHandle: item.product_id || '',
        name: item.product_name,
        quantity: item.quantity,
        price: parseFloat(item.unit_price),
        total: parseFloat(item.total),
        stock: null, // Will be loaded when products are fetched
      }));

      setItems(loadedItems);

    } catch (error) {
      console.error('Error loading invoice:', error);
      message.error('Neizdevās ielādēt rēķinu');
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

  // Calculate due date automatically (issue date + 5 days)
  const calculateDueDate = (issueDateValue) => {
    if (!issueDateValue) return dayjs().add(5, 'day');
    return issueDateValue.add(5, 'day');
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
      console.error('Error loading products:', error);
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

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems([...items, { id: newId, productHandle: '', name: '', quantity: 1, price: 0, total: 0, stock: null }]);
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
    return calculateSubtotal(); // No tax for now
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
      console.error('Error saving template:', error);
      message.error('Neizdevās saglabāt paraugu');
    }
  };

  const handleSave = async () => {
    console.log('handleSave called, mode:', mode);
    
    // Validate items
    if (items.some(item => !item.name || item.price <= 0)) {
      console.log('Items validation failed');
      message.error('Aizpildiet visus laukus');
      return;
    }

    try {
      // Trigger form validation - this will show red borders if validation fails
      console.log('Validating form fields...');
      const values = await form.validateFields();
      console.log('Form validation passed', values);
      
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
        tax_rate: 0,
        tax_amount: 0,
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
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      setLoading(false);
      const successMsg = mode === 'edit' 
        ? 'Rēķins atjaunināts!'
        : 'Rēķins izveidots!';
      message.success(successMsg);
      navigate('/invoices');
    } catch (error) {
      if (error.errorFields) {
        // Form validation error - red borders and error messages are now shown below fields
        console.log('Form validation errors:', error.errorFields);
        message.error('Aizpildiet visus laukus');
        return;
      }
      setLoading(false);
      console.error('Error saving invoice:', error);
      message.error('Neizdevās saglabāt rēķinu');
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
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#111827' }}>
              {mode === 'edit' ? 'Rediģēt rēķinu' : 'Izveidot rēķinu'}
            </h1>
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
              onFinish={(values) => {
                console.log('Form onFinish triggered with values:', values);
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
                      <Input
                        value={calculateDueDate(getCurrentIssueDate()).format('DD.MM.YYYY')}
                        disabled
                        style={{ background: '#f3f4f6', color: '#6b7280' }}
                        suffix={<span style={{ fontSize: 12, color: '#9ca3af' }}>(+5 dienas)</span>}
                      />
                    </div>
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
                      <th style={{ padding: 12, width: 60, borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: 12 }}>
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
                        </td>
                        <td style={{ padding: 12 }}>
                          <div>
                            <InputNumber
                              min={1}
                              max={item.stock !== null ? Math.min(item.stock, MAX_QUANTITY) : MAX_QUANTITY}
                              value={item.quantity}
                              onChange={(value) => {
                                const stockLimit = item.stock !== null ? item.stock : MAX_QUANTITY;
                                const maxQty = Math.min(stockLimit, MAX_QUANTITY);
                                const finalValue = Math.min(value || 1, maxQty);
                                handleItemChange(item.id, 'quantity', finalValue);
                              }}
                              style={{ width: '100%' }}
                            />
                            {item.stock !== null ? (
                              <div style={{ fontSize: 11, color: item.stock < 5 ? '#ef4444' : '#6b7280', marginTop: 4 }}>
                                Max: {Math.min(item.stock, MAX_QUANTITY)}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                Max: {MAX_QUANTITY}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 12 }}>
                          <InputNumber
                            min={0}
                            step={0.01}
                            value={item.price}
                            onChange={(value) => handleItemChange(item.id, 'price', value || 0)}
                            style={{ width: '100%' }}
                            prefix="€"
                          />
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontSize: 16, fontWeight: 500, color: '#111827' }}>
                          €{parseFloat(item.total).toFixed(2)}
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addItem}
                style={{ marginTop: 16, width: '100%' }}
              >
                Pievienot produktu
              </Button>
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
    </DashboardLayout>
  );
};

export default CreateInvoice;
