import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Layout, Menu, Input, Button, Avatar, Badge, Space, Typography, Divider, Dropdown, Modal } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  SearchOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  ProfileOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { canAccessPage } from '../utils/rbac';
import { USER_ROLES } from '../types/user';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const DashboardLayout = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSupportClick = () => {
    setIsSupportModalVisible(true);
  };

  const handleSupportModalClose = () => {
    setIsSupportModalVisible(false);
  };

  if (!userProfile) {
    return null;
  }

  const userRole = userProfile.role;
  const canAccessUserAccounts = canAccessPage(userRole, 'userAccounts');

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Informācijas panelis',
    },
    {
      key: '/invoices',
      icon: <FileTextOutlined />,
      label: 'Rēķini',
    },
    ...(canAccessUserAccounts
      ? [
          {
            key: '/user-accounts',
            icon: <UserOutlined />,
            label: 'Lietotāju konti',
          },
        ]
      : []),
    {
      key: '/sales-charts',
      icon: <BarChartOutlined />,
      label: 'Pārdošanas diagrammas',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Iestatījumi',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#EBF3FF' }}>
      <Sider
        width={256}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        {/* Logo Section */}
        <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Avatar
            size={40}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6CNz7i8JNvcBCvSm5YApk4rdfbr3vfIIPx3azxylILA_B9u6947WOhdQJEK_VZNYdNIwv3i5fqYCrkfkt3wH4n8gMzON5MujE9tYPMy0obo09C9PT0ZJcpWLn94CDYyHOKLtZct12e5sy_lu-7XsxK6UktXkhLGfb1KnxThjMTs5JEdATcCjbBHLyusQxZS6L6nHu4jJBHAqglIF9mMURFiFDU1KGHJgKUxdnidcvUjnwQqCWMD24-UDx143orgXRkzujG8BMnwRi"
            style={{ flexShrink: 0 }}
          />
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, padding: '16px 0' }}
        />

        {/* Create Invoice Button */}
        <div style={{ padding: '16px' }}>
          <Button
            type="primary"
            block
            style={{ height: '40px', fontWeight: 600 }}
          >
            Izveidot jaunu rēķinu
          </Button>
        </div>
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Input
            placeholder="Meklēt..."
            prefix={<SearchOutlined />}
            style={{ width: '100%', flex: 1 }}
          />

          <Space size="middle" style={{ flexShrink: 0 }}>
            <Badge count={1} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '20px' }}
              />
            </Badge>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              style={{ fontSize: '20px' }}
            />
            <Divider type="vertical" />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    label: 'Profils',
                    icon: <ProfileOutlined />,
                  },
                  {
                    key: 'support',
                    label: 'Atbalsts',
                    icon: <CustomerServiceOutlined />,
                    onClick: handleSupportClick,
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'logout',
                    label: 'Iziet',
                    icon: <LogoutOutlined />,
                    danger: true,
                    onClick: handleLogout,
                  },
                ],
              }}
              placement="bottomRight"
              trigger={['click', 'hover']}
            >
              <div
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  minWidth: '120px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div 
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: '#262626',
                    lineHeight: '20px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '200px',
                  }}
                >
                  {userProfile.displayName || userProfile.email}
                </div>
                <div 
                  style={{ 
                    fontSize: '12px', 
                    color: '#8c8c8c', 
                    lineHeight: '16px',
                  }}
                >
                  {userProfile.role === USER_ROLES.SUPER_ADMIN 
                    ? 'Super administrators' 
                    : userProfile.role === USER_ROLES.ADMIN 
                    ? 'Administrators' 
                    : 'Darbinieks'}
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            padding: '32px',
            background: '#EBF3FF',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Support Modal */}
      <Modal
        title="Atbalsts"
        open={isSupportModalVisible}
        onCancel={handleSupportModalClose}
        footer={[
          <Button key="close" type="primary" onClick={handleSupportModalClose}>
            Aizvērt
          </Button>,
        ]}
      >
        <p>
          Lai saņemtu atbalstu, lūdzu, sazinieties ar HR vai priekšniecību.
        </p>
      </Modal>
    </Layout>
  );
};

export default DashboardLayout;


