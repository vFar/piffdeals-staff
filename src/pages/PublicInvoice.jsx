import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { App, Spin, Button, Result } from 'antd';
import { CreditCardOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { mozelloService } from '../services/mozelloService';
import dayjs from 'dayjs';

const PublicInvoice = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [productsData, setProductsData] = useState({});
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvoiceByToken();
    }
  }, [token]);

  // Show success message if returning from Stripe payment
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      message.success({
        content: 'Maksājums veiksmīgi apstrādāts! Paldies par maksājumu.',
        duration: 8,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      });
      // Refresh invoice data to get updated status (webhook should have updated it)
      if (token) {
        // Refresh immediately and then again after a delay to catch webhook update
        fetchInvoiceByToken();
        setTimeout(() => {
          fetchInvoiceByToken();
        }, 3000);
      }
      // Remove the payment=success parameter from URL after showing message
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]payment=success/, '');
      window.history.replaceState({}, '', newUrl);
    } else if (paymentStatus === 'cancelled') {
      message.warning('Maksājums tika atcelts. Varat mēģināt vēlreiz.');
      // Remove the payment=cancelled parameter from URL
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]payment=cancelled/, '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, token, message]);

  useEffect(() => {
    if (invoice) {
      document.title = `Rēķins ${invoice.invoice_number}`;
    } else {
      document.title = 'Rēķins';
    }
  }, [invoice]);

  const fetchInvoiceByToken = async () => {
    try {
      setLoading(true);

      // Fetch invoice by public_token (no auth required thanks to RLS policy)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('public_token', token)
        .maybeSingle();

      if (invoiceError) {
        setNotFound(true);
        return;
      }

      if (!invoiceData) {
        setNotFound(true);
        return;
      }

      // Allow viewing all invoices with public_token (including drafts for preview)
      // Only hide cancelled invoices
      if (invoiceData.status === 'cancelled') {
        setNotFound(true);
        return;
      }

      setInvoice(invoiceData);

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      if (itemsError) throw itemsError;

      setItems(itemsData || []);

      // Fetch product images from Mozello API
      await fetchProductImages(itemsData || []);

      // Payment link should already be created when "Gatavs nosūtīšanai" is clicked
      // No need to auto-create here

    } catch (error) {
      message.error('Neizdevās ielādēt rēķinu');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductImages = async (invoiceItems) => {
    try {
      const productIds = invoiceItems
        .map(item => item.product_id)
        .filter(Boolean);

      if (productIds.length === 0) return;

      const data = await mozelloService.getProducts();
      const products = data.products || [];

      const productsMap = {};
      products.forEach(product => {
        if (productIds.includes(product.handle)) {
          productsMap[product.handle] = {
            imageUrl: product.pictures?.[0]?.url || null,
            title: typeof product.title === 'string' 
              ? product.title 
              : product.title?.lv || product.title?.en || 'Product'
          };
        }
      });

      setProductsData(productsMap);
    } catch (error) {
      // Don't show error to user, just continue without images
    }
  };


  const handlePayInvoice = () => {
    // Payment link should already exist when status is 'sent'
    // Just open it in a new tab
    if (invoice?.stripe_payment_link) {
      window.open(invoice.stripe_payment_link, '_blank');
    } else {
      message.error('Maksājuma saite nav pieejama. Lūdzu, sazinieties ar uzņēmumu.');
    }
  };


  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f9fafb'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f9fafb',
        padding: '24px'
      }}>
        <Result
          status="404"
          title="Rēķins nav atrasts"
          subTitle="Šis rēķins neeksistē vai nav pieejams."
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .invoice-container {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          /* Hide browser print headers/footers */
          @page {
            margin: 0;
          }
          /* Hide URL and page info */
          body::before,
          body::after {
            display: none !important;
          }
        }
        
        /* Additional CSS to hide browser print info */
        @media print {
          /* This will hide the URL and page number in most browsers */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        body {
          background: #f9fafb;
          margin: 0;
          padding: 0;
        }

        .invoice-container {
          max-width: 900px;
          margin: 40px auto;
          background: white;
          padding: 48px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
        }

        @media (max-width: 768px) {
          .invoice-container {
            margin: 0;
            padding: 24px;
            border-radius: 0;
          }
        }
      `}</style>

      {/* Payment Success Banner - Hidden on print */}
      {searchParams.get('payment') === 'success' && (
        <div className="no-print" style={{ 
          maxWidth: 900,
          margin: '24px auto',
          padding: '0 48px',
        }}>
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
          }}>
            <CheckCircleOutlined style={{ fontSize: '32px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                Maksājums veiksmīgi apstrādāts!
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Paldies par maksājumu. Jūsu rēķins tiks atjaunināts tūlīt.
              </div>
            </div>
            <Button
              type="text"
              onClick={() => window.close()}
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              Aizvērt
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons - Hidden on print */}
      <div className="no-print" style={{ 
        maxWidth: 900,
        margin: '24px auto',
        padding: '0 48px',
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        {(() => {
          const hasPaymentLink = !!invoice?.stripe_payment_link;
          const canShowButton = invoice?.status !== 'paid' && invoice?.status !== 'cancelled';
          
          // Only show button if payment link exists
          // Payment link should be created when "Gatavs nosūtīšanai" is clicked
          if (!hasPaymentLink && canShowButton) {
            return (
              <div style={{ 
                padding: '12px 16px', 
                background: '#fff7e6', 
                border: '1px solid #ffd591',
                borderRadius: '6px',
                color: '#ad6800',
                fontSize: '14px'
              }}>
                Maksājuma saite nav pieejama. Lūdzu, sazinieties ar uzņēmumu.
              </div>
            );
          }
          
          // Show button if payment link exists
          return hasPaymentLink && canShowButton ? (
            <Button 
              type="primary"
              icon={<CreditCardOutlined />}
              onClick={handlePayInvoice}
              size="large"
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              Apmaksāt šeit
            </Button>
          ) : null;
        })()}
      </div>

      {/* Invoice Container */}
      <div className="invoice-container" style={{ position: 'relative' }}>
        {/* Paid Watermark */}
        {invoice.status === 'paid' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '120px',
            fontWeight: 700,
            color: 'rgba(16, 185, 129, 0.08)', // Very light green, more faded
            pointerEvents: 'none',
            zIndex: 1,
            whiteSpace: 'nowrap',
            textShadow: '2px 2px 4px rgba(0,0,0,0.05)',
            userSelect: 'none',
            width: '100%',
            textAlign: 'center',
          }}>
            APMAKSĀTS
          </div>
        )}
        
        {/* Logo and Company Name */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img 
              src="/images/S-3.png" 
              alt="PiffDeals Logo" 
              style={{ height: 48, width: 'auto' }}
            />
            <img 
              src="/images/piffdeals_text_primary.svg" 
              alt="PiffDeals" 
              style={{ height: 32, width: 'auto' }}
            />
          </div>
        </div>

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 48,
          paddingBottom: 24,
          borderBottom: '2px solid #e5e7eb'
        }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Rēķins
            </div>
            <div style={{ fontSize: 18, color: '#6b7280' }}>
              {invoice.invoice_number}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              <div><strong>Rēķina datums:</strong> {dayjs(invoice.issue_date).format('DD.MM.YYYY')}</div>
              <div style={{ marginTop: 4 }}>
                <strong>Apmaksas termiņš:</strong> {dayjs(invoice.due_date).format('DD.MM.YYYY')}
              </div>
              <div style={{ marginTop: 8, fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                Apmaksa jāveic 5 dienu laikā
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & From */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 48,
          marginBottom: 48
        }}>
          <div>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: 12
            }}>
              Rēķina saņēmējs
            </div>
            <div style={{ fontSize: 16, color: '#111827' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{invoice.customer_name}</div>
              <div style={{ color: '#6b7280', lineHeight: 1.6 }}>
                {invoice.customer_address && (
                  <div>{invoice.customer_address}</div>
                )}
                {invoice.customer_email && (
                  <div>{invoice.customer_email}</div>
                )}
                {invoice.customer_phone && (
                  <div>+371 {invoice.customer_phone}</div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: 12
            }}>
              Piegādātājs
            </div>
            <div style={{ fontSize: 16, color: '#111827' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Amanda Pevko</div>
              <div style={{ color: '#6b7280', lineHeight: 1.6 }}>
                <div>Kungu iela 86</div>
                <div>Liepāja, LV-3401, Latvija</div>
                <div>+371 23002772</div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ 
                  padding: '12px 0', 
                  textAlign: 'left', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Produkts
                </th>
                <th style={{ 
                  padding: '12px 0', 
                  textAlign: 'center', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  width: 120
                }}>
                  Daudzums
                </th>
                <th style={{ 
                  padding: '12px 0', 
                  textAlign: 'right', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  width: 120
                }}>
                  Cena
                </th>
                <th style={{ 
                  padding: '12px 0', 
                  textAlign: 'right', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  width: 120
                }}>
                  Kopā
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const productInfo = productsData[item.product_id];
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {productInfo?.imageUrl && (
                          <img 
                            src={productInfo.imageUrl}
                            alt={item.product_name}
                            style={{
                              width: 50,
                              height: 50,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid #e5e7eb'
                            }}
                          />
                        )}
                        <div style={{ fontWeight: 500, color: '#111827' }}>
                          {item.product_name}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'center', color: '#111827' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'right', color: '#111827' }}>
                      €{parseFloat(item.unit_price).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
                      €{parseFloat(item.total).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <div style={{ width: 350 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px 0',
              fontSize: 16,
              color: '#6b7280'
            }}>
              <span>Starpsumma</span>
              <span>€{parseFloat(invoice.subtotal).toFixed(2)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '12px 0',
                fontSize: 16,
                color: '#6b7280'
              }}>
                <span>PVN ({invoice.tax_rate}%)</span>
                <span>€{parseFloat(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div style={{ 
              borderTop: '2px solid #e5e7eb',
              marginTop: 12,
              paddingTop: 12
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: 20,
                fontWeight: 700,
                color: '#111827'
              }}>
                <span>Kopā</span>
                <span>€{parseFloat(invoice.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ 
            marginBottom: 32,
            padding: 20,
            background: '#f9fafb',
            borderRadius: 8,
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: '#6b7280',
              textTransform: 'uppercase',
              marginBottom: 8
            }}>
              Piezīmes
            </div>
            <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.6 }}>
              {invoice.notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          paddingTop: 24,
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: 12,
          color: '#9ca3af'
        }}>
          <div>Paldies par sadarbību!</div>
          <div style={{ marginTop: 8 }}>
            <a 
              href="https://www.piffdeals.lv/distances-ligums" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#0068FF', textDecoration: 'none' }}
            >
              Distances līgums
            </a>
            {' • '}
            <a 
              href="https://www.piffdeals.lv" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#0068FF', textDecoration: 'none' }}
            >
              www.piffdeals.lv
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicInvoice;

