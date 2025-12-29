import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 576;

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
          className="breadcrumb-link breadcrumb-home"
        >
          <HomeOutlined className="breadcrumb-icon" />
          {!isMobile && <span className="breadcrumb-home-text">Sākums</span>}
        </a>
      ),
    });

    // Parse pathname into segments
    const segments = pathname.split('/').filter(Boolean);

    // Map route segments to breadcrumb labels (all in Latvian)
    const routeLabels = {
      dashboard: 'Informācijas panelis',
      invoices: 'Rēķini',
      'invoice-templates': 'Mani paraugi',
      'sales-charts': 'Pārdošanas grafiki',
      overview: 'Pārskats',
      statistics: 'Statistika',
      'sales-analytics': 'Pārdošanas analītika',
      analytics: 'Vispārējā analītika',
      'user-accounts': 'Lietotāju konti',
      'activity-logs': 'Darbību žurnāls',
      'company-settings': 'Uzņēmuma iestatījumi',
      profile: 'Iestatījumi',
      create: 'Izveidot',
      edit: 'Rediģēt',
      blacklist: 'Melnais saraksts',
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
        const displayNumber = isMobile && invoiceNumber.length > 10 
          ? invoiceNumber.substring(0, 8) + '...' 
          : invoiceNumber;
        items.push({
          title: (
            <span className="breadcrumb-text breadcrumb-text-current">
              {isMobile ? 'Rēķins' : `Rēķins ${displayNumber}`}
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
                  className="breadcrumb-link"
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
                  className="breadcrumb-link"
                >
                  {routeLabels.invoices}
                </a>
              ),
            });
            // Add invoice number breadcrumb - don't show "Rediģēt"
            if (params.invoiceNumber) {
              const invoiceNumber = decodeURIComponent(params.invoiceNumber);
              const displayNumber = isMobile && invoiceNumber.length > 10 
                ? invoiceNumber.substring(0, 8) + '...' 
                : invoiceNumber;
              items.push({
                title: (
                  <span className="breadcrumb-text breadcrumb-text-current">
                    {isMobile ? 'Rēķins' : `Rēķins ${displayNumber}`}
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
              <span className="breadcrumb-text breadcrumb-text-current">
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
            <span className="breadcrumb-text breadcrumb-text-current">
              {isMobile ? 'Izveidot' : 'Izveidot rēķinu'}
            </span>
          ),
        });
        return;
      }
      
      // Get label for current segment
      const label = routeLabels[segment] || segment;
      // Truncate long labels on mobile
      const displayLabel = isMobile && label.length > 15 ? label.substring(0, 13) + '...' : label;
      
      if (isLast) {
        // Last item - not clickable
        items.push({
          title: (
            <span className="breadcrumb-text breadcrumb-text-current">
              {displayLabel}
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
              className="breadcrumb-link"
            >
              {displayLabel}
            </a>
          ),
        });
      }
    });

    return items;
  }, [location.pathname, params, navigate, isMobile]);

  // Don't show breadcrumbs on login or public routes
  if (location.pathname === '/login' || location.pathname.startsWith('/i/')) {
    return null;
  }

  return (
    <>
      <Breadcrumb
        separator={<span className="breadcrumb-separator">/</span>}
        items={breadcrumbItems}
        className="breadcrumb-container"
      />
      
      <style>{`
        .breadcrumb-container {
          margin-bottom: 24px;
          overflow: hidden;
        }

        .breadcrumb-link {
          color: #6b7280;
          font-size: 16px;
          font-weight: 500;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
        }

        .breadcrumb-link:hover {
          color: #0068FF;
        }

        .breadcrumb-icon {
          font-size: 16px;
          display: inline-flex;
          align-items: center;
        }

        .breadcrumb-home {
          gap: 10px !important;
        }

        .breadcrumb-home-text {
          margin-left: 2px;
          display: inline-flex;
          align-items: center;
        }

        .breadcrumb-text {
          font-size: 16px;
          font-weight: 500;
        }

        .breadcrumb-text-current {
          color: #111827;
        }

        .breadcrumb-separator {
          color: #6b7280;
          font-size: 16px;
          font-weight: 500;
        }

        /* Mobile Responsive (< 576px) */
        @media (max-width: 575px) {
          .breadcrumb-container {
            margin-bottom: 16px;
          }

          .breadcrumb-link {
            font-size: 14px;
            gap: 4px;
          }

          .breadcrumb-icon {
            font-size: 14px;
          }

          .breadcrumb-text {
            font-size: 14px;
          }

          .breadcrumb-separator {
            font-size: 14px;
          }
        }

        /* Tablet Responsive (576px - 991px) */
        @media (min-width: 576px) and (max-width: 991px) {
          .breadcrumb-container {
            margin-bottom: 20px;
          }

          .breadcrumb-link {
            font-size: 15px;
          }

          .breadcrumb-icon {
            font-size: 15px;
          }

          .breadcrumb-text {
            font-size: 15px;
          }

          .breadcrumb-separator {
            font-size: 15px;
          }
        }
      `}</style>
    </>
  );
};

export default Breadcrumbs;
