import { useState } from 'react';
import { Layout, Menu, Input, Button, Badge, Dropdown, Modal, message } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  LogoutOutlined,
  DownOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';

const { Header, Sider, Content } = Layout;

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const { currentUser, userProfile, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  // Build menu items
  const menuItems = [
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
      key: '/sales-charts',
      icon: <BarChartOutlined style={{ fontSize: '20px' }} />,
      label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Pārdošanas grafiki</span>,
    },
    // Only show User Accounts to admins
    ...(isAdmin ? [{
      key: '/user-accounts',
      icon: <TeamOutlined style={{ fontSize: '20px' }} />,
      label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Lietotāju konti</span>,
    }] : []),
    {
      key: '/profile',
      icon: <SettingOutlined style={{ fontSize: '20px' }} />,
      label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Iestatījumi</span>,
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleUserMenuClick = async ({ key }) => {
    if (key === 'logout') {
      try {
        await signOut();
        message.success('Veiksmīgi atslēdzies');
        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
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
              selectedKeys={[location.pathname]}
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
          {/* Search Bar */}
          <div style={{ width: '100%', minWidth: '160px', maxWidth: '384px' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
              placeholder="Meklēt..."
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                height: '40px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Right Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge dot offset={[-5, 5]} color="#ef4444">
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: '20px' }} />}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    color: '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              </Badge>
            </div>

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
      `}</style>
    </Layout>
  );
};

export default DashboardLayout;


