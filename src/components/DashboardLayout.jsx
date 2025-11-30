import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Layout, Menu, Input, Button, Dropdown, Modal, message, Spin, Typography, Empty } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SearchOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  LogoutOutlined,
  DownOutlined,
  TeamOutlined,
  FileProtectOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';
import Breadcrumbs from './Breadcrumbs';
import NotificationDropdown from './NotificationDropdown';

const { Text } = Typography;

const { Header, Sider, Content } = Layout;

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const { currentUser, userProfile, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading, userProfile: roleProfile } = useUserRole();
  
  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ invoices: [], users: [], total: 0 });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchResultsListRef = useRef(null);

  // Cache admin status in localStorage to prevent flicker on refresh
  const [cachedIsAdmin, setCachedIsAdmin] = useState(() => {
    try {
      const cached = localStorage.getItem('isAdmin');
      return cached === 'true';
    } catch {
      return false;
    }
  });

  // Cache super admin status in localStorage to prevent flicker on refresh
  const [cachedIsSuperAdmin, setCachedIsSuperAdmin] = useState(() => {
    try {
      const cached = localStorage.getItem('isSuperAdmin');
      return cached === 'true';
    } catch {
      return false;
    }
  });

  // Update cache when isAdmin changes and loading is complete
  useEffect(() => {
    if (!roleLoading) {
      try {
        localStorage.setItem('isAdmin', String(isAdmin));
        setCachedIsAdmin(isAdmin);
      } catch (error) {
        // Failed to cache admin status
      }
    }
  }, [isAdmin, roleLoading]);

  // Update cache when isSuperAdmin changes and loading is complete
  useEffect(() => {
    if (!roleLoading) {
      try {
        localStorage.setItem('isSuperAdmin', String(isSuperAdmin));
        setCachedIsSuperAdmin(isSuperAdmin);
      } catch (error) {
        // Failed to cache super admin status
      }
    }
  }, [isSuperAdmin, roleLoading]);

  // Global search function - Role-based: employees see only invoices/customers, admins see everything
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults({ invoices: [], users: [], total: 0 });
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const searchTerm = query.trim().toLowerCase();
      const invoiceResults = [];
      const userResults = [];

      // Get current user ID for filtering
      const currentUserId = roleProfile?.id || currentUser?.id;
      
      // Determine if user is admin (use actual value, not cached during loading)
      const userIsAdmin = roleLoading ? cachedIsAdmin : isAdmin;

      // Search invoices - all users can search invoices
      let invoiceQuery = supabase
        .from('invoices')
        .select('id, invoice_number, customer_name, customer_email, status, total, issue_date')
        .or(`invoice_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(8); // Increased limit since employees only see invoices

      // Employees can only see their own invoices, admins see all
      if (!userIsAdmin) {
        invoiceQuery = invoiceQuery.eq('user_id', currentUserId);
      }

      const { data: invoices, error: invoicesError } = await invoiceQuery;

      if (!invoicesError && invoices) {
        invoices.forEach(invoice => {
          const statusConfig = {
            paid: { label: 'Apmaksāts', color: '#22c55e', bg: '#dcfce7' },
            sent: { label: 'Nosūtīts', color: '#3b82f6', bg: '#dbeafe' },
            pending: { label: 'Gaida', color: '#f59e0b', bg: '#fef3c7' },
            overdue: { label: 'Nokavēts', color: '#ef4444', bg: '#fee2e2' },
            draft: { label: 'Melnraksts', color: '#9ca3af', bg: '#f3f4f6' },
            cancelled: { label: 'Atcelts', color: '#6b7280', bg: '#f3f4f6' },
          };
          const status = statusConfig[invoice.status] || { label: invoice.status, color: '#6b7280', bg: '#f3f4f6' };

          invoiceResults.push({
            type: 'invoice',
            id: invoice.id,
            title: invoice.invoice_number,
            subtitle: invoice.customer_name,
            metadata: status.label,
            statusColor: status.color,
            statusBg: status.bg,
            amount: parseFloat(invoice.total || 0),
            url: `/invoice/${encodeURIComponent(invoice.invoice_number)}`, // Encode invoice_number for URL
            icon: <FileTextOutlined />,
          });
        });
      }

      // Search user accounts - ONLY for admins
      // Employees do NOT have access to search user accounts
      if (userIsAdmin) {
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, username, email, role')
          .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(6);

        if (!usersError && users) {
          users.forEach(user => {
            const roleConfig = {
              employee: { label: 'Darbinieks', color: '#6366f1', bg: '#eef2ff' },
              admin: { label: 'Administrators', color: '#8b5cf6', bg: '#f3e8ff' },
              super_admin: { label: 'Galvenais administrators', color: '#ec4899', bg: '#fce7f3' },
            };
            const role = roleConfig[user.role] || { label: user.role, color: '#6b7280', bg: '#f3f4f6' };

            userResults.push({
              type: 'user',
              id: user.id,
              title: user.username || user.email,
              subtitle: user.email,
              metadata: role.label,
              statusColor: role.color,
              statusBg: role.bg,
              url: `/user-accounts?highlight=${user.id}`, // Add user ID as query parameter for highlighting
              icon: <TeamOutlined />,
            });
          });
        }
      }

      // Combine results grouped by type
      setSearchResults({
        invoices: invoiceResults,
        users: userResults,
        total: invoiceResults.length + userResults.length,
      });
    } catch (error) {
      setSearchResults({ invoices: [], users: [], total: 0 });
    } finally {
      setIsSearching(false);
    }
  }, [isAdmin, roleLoading, cachedIsAdmin, roleProfile, currentUser]);

  // Debounced search
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
      setSelectedIndex(-1);
    } else {
      setSearchResults({ invoices: [], users: [], total: 0 });
      setShowSearchResults(false);
      setSelectedIndex(-1);
    }

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Close search results when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showSearchResults) {
        setShowSearchResults(false);
        setSearchQuery('');
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showSearchResults]);

  // Handle search result click
  const handleSearchResultClick = (result) => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSelectedIndex(-1);
    // Navigate to the result URL
    navigate(result.url);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setSelectedIndex(-1);
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (searchResults.total > 0 || searchQuery.trim().length >= 2) {
      setShowSearchResults(true);
    }
  };

  // Handle keyboard navigation - Role-based: only include user results for admins
  const handleSearchKeyDown = (e) => {
    if (!showSearchResults || searchResults.total === 0) return;

    // Only include user results if user is admin, otherwise only invoices
    const allResults = isAdmin 
      ? [...searchResults.invoices, ...searchResults.users]
      : [...searchResults.invoices];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && allResults[selectedIndex]) {
      e.preventDefault();
      handleSearchResultClick(allResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSelectedIndex(-1);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && searchResultsListRef.current) {
      const selectedElement = searchResultsListRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Build menu items - memoized to prevent flickering during role loading
  // Use cached admin status for instant display, update when real status loads
  const menuItems = useMemo(() => {
    const shouldShowAdmin = roleLoading ? cachedIsAdmin : isAdmin;
    const shouldShowSuperAdmin = roleLoading ? cachedIsSuperAdmin : isSuperAdmin;
    
    return [
      {
        key: '/dashboard',
        icon: <DashboardOutlined style={{ fontSize: '20px' }} />,
        label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Informācijas panelis</span>,
      },
      {
        key: '/invoices',
        icon: <FileTextOutlined style={{ fontSize: '20px' }} />,
        label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Rēķini</span>,
      },
      {
        key: '/invoice-templates',
        icon: <FileProtectOutlined style={{ fontSize: '20px' }} />,
        label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Mani paraugi</span>,
      },
      {
        key: '/sales-charts',
        icon: <BarChartOutlined style={{ fontSize: '20px' }} />,
        label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Pārdošanas grafiki</span>,
      },
      // Only show User Accounts to admins (uses cached value during loading for smooth UX)
      ...(shouldShowAdmin ? [{
        key: '/user-accounts',
        icon: <TeamOutlined style={{ fontSize: '20px' }} />,
        label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Lietotāju konti</span>,
      }] : []),
      // Only show Activity Logs to super_admins
      ...(shouldShowSuperAdmin ? [{
        key: '/activity-logs',
        icon: <HistoryOutlined style={{ fontSize: '20px' }} />,
        label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Darbību žurnāls</span>,
      }] : []),
      {
        key: '/profile',
        icon: <SettingOutlined style={{ fontSize: '20px' }} />,
        label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Iestatījumi</span>,
      },
    ];
  }, [isAdmin, isSuperAdmin, roleLoading, cachedIsAdmin, cachedIsSuperAdmin]);

  // Get the selected menu key based on current pathname
  const getSelectedKey = () => {
    const path = location.pathname;
    
    // For invoice-related paths, select the invoices menu item
    if (path.startsWith('/invoices') || path.startsWith('/invoice/')) {
      return '/invoices';
    }
    
    // For invoice templates
    if (path.startsWith('/invoice-templates')) {
      return '/invoice-templates';
    }
    
    // For user accounts related paths
    if (path.startsWith('/user-accounts')) {
      return '/user-accounts';
    }
    
    // For activity logs
    if (path.startsWith('/activity-logs')) {
      return '/activity-logs';
    }
    
    // For profile
    if (path.startsWith('/profile')) {
      return '/profile';
    }
    
    // For sales charts
    if (path.startsWith('/sales-charts')) {
      return '/sales-charts';
    }
    
    // Default to dashboard
    if (path === '/' || path.startsWith('/dashboard')) {
      return '/dashboard';
    }
    
    // Return the path as-is if it matches exactly
    return path;
  };

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleUserMenuClick = async ({ key }) => {
    if (key === 'logout') {
      try {
        // Clear cached admin status on logout
        try {
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('isSuperAdmin');
        } catch (error) {
          // Failed to clear admin cache
        }
        
        await signOut();
        message.success('Veiksmīgi atslēdzies');
        navigate('/login');
      } catch (error) {
        message.error('Kļūda atslēdzoties');
      }
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'support') {
      setIsSupportModalOpen(true);
    }
  };

  // Build user menu items with user info header
  const getUserMenuItems = () => {
    const userName = userProfile?.username || currentUser?.email?.split('@')[0] || 'User';
    const userEmail = userProfile?.email || currentUser?.email || '';

    return [
      {
        key: 'user-info-header',
        disabled: true,
        label: (
          <div style={{ padding: '8px 0', minWidth: '200px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              {userName}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {userEmail}
            </div>
          </div>
        ),
        style: { cursor: 'default', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' },
      },
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profils',
      },
      {
        key: 'support',
        icon: <CustomerServiceOutlined />,
        label: 'Atbalsts',
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Atslēgties',
        danger: true,
      },
    ];
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#EBF3FF', overflow: 'visible' }}>
      {/* Sidebar */}
      <Sider 
        width={256}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img 
                src="/images/S-3.png" 
                alt="Piffdeals" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src="/images/piffdeals_text_primary.svg" 
                alt="Piffdeals" 
                style={{ height: '24px', width: 'auto' }}
              />
            </div>
          </div>

          {/* Navigation Menu */}
          <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey()]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                border: 'none',
                background: 'transparent',
              }}
              className="custom-menu"
            />
          </div>

          {/* Create Invoice Button */}
          <div style={{ padding: '16px', marginTop: 'auto' }}>
            <Button
              type="primary"
              block
              size="large"
              style={{
                height: '40px',
                background: '#0068FF',
                borderColor: '#0068FF',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '8px',
              }}
              onClick={() => navigate('/invoices/create')}
            >
              Izveidot jaunu rēķinu
            </Button>
          </div>
        </div>
      </Sider>

      {/* Main Layout */}
      <Layout style={{ marginLeft: 256, background: '#EBF3FF' }}>
        {/* Header */}
        <Header
          style={{
            padding: '0 32px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            borderBottom: '1px solid #e5e7eb',
            height: '64px',
          }}
        >
          {/* Search Bar with Results Dropdown */}
          <div 
            ref={searchContainerRef}
            style={{ 
              width: '100%', 
              minWidth: '300px', 
              maxWidth: '600px',
              position: 'relative',
              flex: 1,
            }}
          >
            <Input
              ref={searchInputRef}
              prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
              placeholder={
                roleLoading 
                  ? 'Meklēt...' 
                  : isAdmin 
                    ? 'Meklēt rēķinus, klientus, lietotājus...' 
                    : 'Meklēt rēķinus un klientus...'
              }
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              allowClear
              style={{
                background: showSearchResults ? '#ffffff' : '#f3f4f6',
                border: showSearchResults ? '1px solid #0068FF' : 'none',
                borderRadius: '8px',
                height: '40px',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e5e7eb',
                  maxHeight: '480px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  zIndex: 10000,
                  animation: 'searchDropdownFadeIn 0.2s ease-out',
                }}
                className="global-search-results"
              >
                {isSearching ? (
                  <div style={{ 
                    padding: '40px 24px', 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <Spin size="large" />
                    <Text style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
                      Meklē rezultātus...
                    </Text>
                  </div>
                ) : searchResults.total > 0 ? (
                  <div ref={searchResultsListRef}>
                    {/* Invoices Section */}
                    {searchResults.invoices.length > 0 && (
                      <div style={{ padding: '12px 12px 8px 12px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                        }}>
                          <FileTextOutlined style={{ color: '#0068FF', fontSize: '14px' }} />
                          <Text style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            {isAdmin ? 'Rēķini' : 'Rēķini un klienti'} ({searchResults.invoices.length})
                          </Text>
                        </div>
                        {searchResults.invoices.map((result, index) => {
                          const globalIndex = index;
                          const isSelected = selectedIndex === globalIndex;
                          return (
                            <div
                              key={`invoice-${result.id}-${index}`}
                              onClick={() => handleSearchResultClick(result)}
                              style={{
                                padding: '12px',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                transition: 'all 0.15s',
                                marginBottom: index < searchResults.invoices.length - 1 ? '4px' : 0,
                                background: isSelected ? '#f0f7ff' : 'transparent',
                                border: isSelected ? '1px solid #0068FF' : '1px solid transparent',
                              }}
                              className="search-result-item"
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = '#f9fafb';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.borderColor = 'transparent';
                                }
                              }}
                              onMouseMove={() => setSelectedIndex(globalIndex)}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'linear-gradient(135deg, rgba(0, 104, 255, 0.1) 0%, rgba(0, 104, 255, 0.05) 100%)',
                                  borderRadius: '10px',
                                  flexShrink: 0,
                                }}>
                                  {React.cloneElement(result.icon, { style: { color: '#0068FF', fontSize: '18px' } })}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '6px',
                                  }}>
                                    <Text style={{
                                      fontSize: '14px',
                                      fontWeight: 600,
                                      color: '#111827',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      #{result.title?.toString().replace(/^#+/, '') || ''}
                                    </Text>
                                  </div>
                                  <Text style={{
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    marginBottom: '8px',
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {result.subtitle}
                                  </Text>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                  }}>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: result.statusColor,
                                      background: result.statusBg,
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                    }}>
                                      {result.metadata}
                                    </span>
                                    <span style={{
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      color: '#111827',
                                    }}>
                                      €{result.amount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Users Section - Only visible to admins */}
                    {isAdmin && searchResults.users.length > 0 && (
                      <div style={{
                        padding: searchResults.invoices.length > 0 ? '12px 12px 8px 12px' : '12px 12px 8px 12px',
                        borderTop: searchResults.invoices.length > 0 ? '1px solid #f3f4f6' : 'none',
                        marginTop: searchResults.invoices.length > 0 ? '4px' : 0,
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                        }}>
                          <TeamOutlined style={{ color: '#22c55e', fontSize: '14px' }} />
                          <Text style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            Lietotāji ({searchResults.users.length})
                          </Text>
                        </div>
                        {searchResults.users.map((result, index) => {
                          const globalIndex = searchResults.invoices.length + index;
                          const isSelected = selectedIndex === globalIndex;
                          return (
                            <div
                              key={`user-${result.id}-${index}`}
                              onClick={() => handleSearchResultClick(result)}
                              style={{
                                padding: '12px',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                transition: 'all 0.15s',
                                marginBottom: index < searchResults.users.length - 1 ? '4px' : 0,
                                background: isSelected ? '#f0fdf4' : 'transparent',
                                border: isSelected ? '1px solid #22c55e' : '1px solid transparent',
                              }}
                              className="search-result-item"
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = '#f9fafb';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.borderColor = 'transparent';
                                }
                              }}
                              onMouseMove={() => setSelectedIndex(globalIndex)}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                                  borderRadius: '10px',
                                  flexShrink: 0,
                                }}>
                                  {React.cloneElement(result.icon, { style: { color: '#22c55e', fontSize: '18px' } })}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <Text style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#111827',
                                    marginBottom: '6px',
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {result.title}
                                  </Text>
                                  <Text style={{
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    marginBottom: '8px',
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {result.subtitle}
                                  </Text>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: result.statusColor,
                                    background: result.statusBg,
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                  }}>
                                    {result.metadata}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : searchQuery.trim().length >= 2 ? (
                  <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      margin: '0 auto 16px',
                      borderRadius: '50%',
                      background: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <SearchOutlined style={{ fontSize: '28px', color: '#9ca3af' }} />
                    </div>
                    <Text style={{
                      color: '#6b7280',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      Nav atrastu rezultātu
                    </Text>
                    <Text style={{
                      color: '#9ca3af',
                      fontSize: '12px',
                    }}>
                      Mēģiniet ar citu meklēšanas terminu
                    </Text>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Notification Bell */}
            <NotificationDropdown />

            {/* User Info with Dropdown */}
            <Dropdown
              menu={{
                items: getUserMenuItems(),
                onClick: handleUserMenuClick,
              }}
              trigger={['hover', 'click']}
              placement="bottomRight"
              getPopupContainer={() => document.body}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                background: 'transparent',
                position: 'relative',
                zIndex: 1001,
              }}
              className="user-dropdown-trigger"
              >
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  gap: '2px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827', lineHeight: '1.2' }}>
                    {userProfile?.username || currentUser?.email?.split('@')[0] || 'User'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.2' }}>
                    {userProfile?.email || currentUser?.email || ''}
                  </div>
                </div>
                <DownOutlined style={{ fontSize: '12px', color: '#6b7280' }} />
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: '32px',
            minHeight: 'calc(100vh - 64px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Breadcrumbs />
          {children}
        </Content>
      </Layout>

      {/* Support Modal */}
      <Modal
        title="Atbalsts"
        open={isSupportModalOpen}
        onOk={() => setIsSupportModalOpen(false)}
        onCancel={() => setIsSupportModalOpen(false)}
        centered
        footer={[
          <Button key="ok" type="primary" onClick={() => setIsSupportModalOpen(false)}>
            Sapratu
          </Button>,
        ]}
      >
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
          Lai saņemtu atbalstu, lūdzu, sazinieties ar priekšniecību.
        </p>
      </Modal>

      {/* Custom Menu Styles */}
      <style>{`
        .custom-menu .ant-menu-item {
          height: 40px;
          line-height: 40px;
          border-radius: 8px;
          margin-bottom: 8px;
          color: #4b5563;
          transition: all 0.2s;
        }

        .custom-menu .ant-menu-item:hover {
          background: #f3f4f6 !important;
          color: #4b5563;
        }

        .custom-menu .ant-menu-item-selected {
          background: rgba(0, 104, 255, 0.1) !important;
          color: #0068FF !important;
        }

        .custom-menu .ant-menu-item-selected .ant-menu-item-icon {
          color: #0068FF !important;
        }

        .custom-menu .ant-menu-item::after {
          display: none;
        }

        .user-dropdown-trigger:hover {
          background: #f3f4f6 !important;
        }

        .ant-dropdown {
          z-index: 10000 !important;
        }

        .ant-dropdown-menu {
          z-index: 10000 !important;
        }

        .ant-dropdown-placement-bottomRight {
          z-index: 10000 !important;
        }

        .global-search-results {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .global-search-results::-webkit-scrollbar {
          width: 6px;
        }

        .global-search-results::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .global-search-results::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .global-search-results::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .search-result-item:active {
          background: #f3f4f6 !important;
        }

        @keyframes searchDropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Layout>
  );
};

export default DashboardLayout;


