import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const breadcrumbItems = useMemo(() => {
    const items = [];
    const pathname = location.pathname;
    
    // Always start with Home
    items.push({
      title: (
        <a 
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
          style={{ 
            color: '#6b7280', 
            fontSize: '16px', 
            fontWeight: 500, 
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <HomeOutlined />
          <span>Sākums</span>
        </a>
      ),
    });

    // Parse pathname into segments
    const segments = pathname.split('/').filter(Boolean);

    // Map route segments to breadcrumb labels
    const routeLabels = {
      dashboard: 'Informācijas panelis',
      invoices: 'Rēķini',
      'invoice-templates': 'Mani paraugi',
      'user-accounts': 'Lietotāju konti',
      'activity-logs': 'Darbību žurnāls',
      profile: 'Iestatījumi',
      create: 'Izveidot',
      edit: 'Rediģēt',
    };

    // Build breadcrumb items based on path segments
    let currentPath = '';
    
    segments.forEach((segment, index) => {
      // Skip the 'i' segment (public invoice route)
      if (segment === 'i') return;
      
      // Skip segments that match the invoice number (to prevent duplicate breadcrumbs)
      if (params.invoiceNumber) {
        const decodedInvoiceNumber = decodeURIComponent(params.invoiceNumber);
        // Check if segment matches invoice number (encoded or decoded)
        if (segment === decodedInvoiceNumber || 
            segment === params.invoiceNumber || 
            decodeURIComponent(segment) === decodedInvoiceNumber) {
          return; // Skip this segment
        }
      }
      
      // Skip "edit" segment if we're on edit route (handled in invoices section)
      if (segment === 'edit' && index > 0 && segments[index - 1] === 'invoices') {
        return;
      }
      
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      // Special handling for invoice routes
      if (segment === 'invoice' && params.invoiceNumber) {
        const invoiceNumber = decodeURIComponent(params.invoiceNumber);
        items.push({
          title: (
            <span style={{ color: '#111827', fontSize: '16px', fontWeight: 500 }}>
              Rēķins {invoiceNumber}
            </span>
          ),
        });
        return;
      }
      
      if (segment === 'invoices') {
        // Handle invoice sub-routes
        if (index < segments.length - 1) {
          const nextSegment = segments[index + 1];
          if (nextSegment === 'create') {
            items.push({
              title: (
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/invoices');
                  }}
                  style={{ 
                    color: '#6b7280', 
                    fontSize: '16px', 
                    fontWeight: 500, 
                    textDecoration: 'none' 
                  }}
                >
                  {routeLabels.invoices}
                </a>
              ),
            });
          } else if (nextSegment === 'edit') {
            items.push({
              title: (
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/invoices');
                  }}
                  style={{ 
                    color: '#6b7280', 
                    fontSize: '16px', 
                    fontWeight: 500, 
                    textDecoration: 'none' 
                  }}
                >
                  {routeLabels.invoices}
                </a>
              ),
            });
            // Add invoice number breadcrumb - don't show "Rediģēt"
            if (params.invoiceNumber) {
              const invoiceNumber = decodeURIComponent(params.invoiceNumber);
              items.push({
                title: (
                  <span style={{ color: '#111827', fontSize: '16px', fontWeight: 500 }}>
                    Rēķins {invoiceNumber}
                  </span>
                ),
              });
              // Skip processing "edit" segment and invoice number segment
              return;
            }
          }
        } else {
          // Just /invoices
          items.push({
            title: (
              <span style={{ color: '#111827', fontSize: '16px', fontWeight: 500 }}>
                {routeLabels.invoices}
              </span>
            ),
          });
        }
        return;
      }
      
      // Handle create invoice route
      if (segment === 'create' && segments[index - 1] === 'invoices') {
        items.push({
          title: (
            <span style={{ color: '#111827', fontSize: '16px', fontWeight: 500 }}>
              Izveidot rēķinu
            </span>
          ),
        });
        return;
      }
      
      // Get label for current segment
      const label = routeLabels[segment] || segment;
      
      if (isLast) {
        // Last item - not clickable
        items.push({
          title: (
            <span style={{ color: '#111827', fontSize: '16px', fontWeight: 500 }}>
              {label}
            </span>
          ),
        });
      } else {
        // Intermediate item - clickable
        items.push({
          title: (
            <a
              onClick={(e) => {
                e.preventDefault();
                navigate(currentPath);
              }}
              style={{ 
                color: '#6b7280', 
                fontSize: '16px', 
                fontWeight: 500, 
                textDecoration: 'none' 
              }}
            >
              {label}
            </a>
          ),
        });
      }
    });

    return items;
  }, [location.pathname, params, navigate]);

  // Don't show breadcrumbs on login or public routes
  if (location.pathname === '/login' || location.pathname.startsWith('/i/')) {
    return null;
  }

  return (
    <Breadcrumb
      separator={<span style={{ color: '#6b7280', fontSize: '16px', fontWeight: 500 }}>/</span>}
      items={breadcrumbItems}
      style={{ marginBottom: '24px' }}
    />
  );
};

export default Breadcrumbs;

