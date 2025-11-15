import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider
} from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { mozelloService } from '../services/mozelloService';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([
    { id: 1, productHandle: '', name: '', quantity: 1, price: 0, total: 0, stock: null }
  ]);

  useEffect(() => {
    generateInvoiceNumber();
    fetchProducts();
    // Initialize form with default values
    form.setFieldsValue({
      issueDate: dayjs(),
    });
  }, [form]);

  const generateInvoiceNumber = async () => {
    // Generate unique invoice number: INV-########
    let isUnique = false;
    let newInvoiceNumber = '';
    
    while (!isUnique) {
      const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
      newInvoiceNumber = `INV-${random}`;
      
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
      setAvailableProducts(data.products || []);
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

  const calculateItemTotal = (quantity, price) => {
    return (quantity * price).toFixed(2);
  };

  const handleProductSelect = (id, productHandle) => {
    const product = availableProducts.find(p => p.handle === productHandle);
    if (!product) return;

    const title = getProductTitle(product);
    const price = getProductPrice(product);
    const stock = product.stock; // null means unlimited

    setItems(items.map(item => {
      if (item.id === id) {
        // If stock is limited and current quantity exceeds stock, adjust it
        const maxQuantity = stock !== null ? stock : item.quantity;
        const adjustedQuantity = stock !== null ? Math.min(item.quantity, stock) : item.quantity;
        
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

  const handleSave = async (sendInvoice = false) => {
    console.log('handleSave called, sendInvoice:', sendInvoice);
    
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

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
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
          status: sendInvoice ? 'sent' : 'draft',
          notes: formValues.notes || '',
          user_id: currentUser.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
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
      message.success(sendInvoice ? 'Rēķins nosūtīts!' : 'Rēķins saglabāts kā melnraksts');
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
      <Spin spinning={loading}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#111827' }}>
              Izveidot rēķinu
            </h1>
          </div>

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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => handleSave(false)}
                  loading={loading}
                >
                  Saglabāt melnrakstu
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => handleSave(true)}
                  loading={loading}
                >
                  Nosūtīt rēķinu
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </Spin>
    </DashboardLayout>
  );
};

export default CreateInvoice;
