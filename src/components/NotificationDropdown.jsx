import React, { useState, useEffect } from 'react';
import { Badge, Dropdown, Button, List, Typography, Empty, Space, Divider, Drawer } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NOTIFICATION_PRIORITY } from '../contexts/NotificationContext';

const { Text } = Typography;

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case NOTIFICATION_PRIORITY.ERROR:
        return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: '16px' }} />;
      case NOTIFICATION_PRIORITY.WARNING:
        return <ExclamationCircleOutlined style={{ color: '#f59e0b', fontSize: '16px' }} />;
      case NOTIFICATION_PRIORITY.SUCCESS:
        return <CheckCircleOutlined style={{ color: '#22c55e', fontSize: '16px' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#3b82f6', fontSize: '16px' }} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case NOTIFICATION_PRIORITY.ERROR:
        return '#fee2e2';
      case NOTIFICATION_PRIORITY.WARNING:
        return '#fef3c7';
      case NOTIFICATION_PRIORITY.SUCCESS:
        return '#dcfce7';
      default:
        return '#dbeafe';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setDropdownOpen(false);
    }
  };

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Tikko';
    if (diffMins < 60) return `Pirms ${diffMins} min`;
    if (diffHours < 24) return `Pirms ${diffHours} st`;
    if (diffDays < 7) return `Pirms ${diffDays} d`;
    // Format date with leading zeros: DD.MM.YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Notification content component (reusable for dropdown and drawer)
  // Must be defined before notificationMenu to avoid hoisting issues
  const NotificationContent = ({ isInDropdown = false }) => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: isMobile ? '100%' : (isInDropdown ? 'auto' : '100%'),
      maxHeight: isMobile ? 'calc(100vh - 120px)' : (isInDropdown ? '400px' : 'calc(100vh - 120px)'),
      overflowY: 'auto',
      width: isInDropdown ? '360px' : '100%',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '16px' : isInDropdown ? '12px 16px 8px 16px' : '16px',
          borderBottom: isInDropdown ? 'none' : '1px solid #e5e7eb',
          marginBottom: isInDropdown ? '0' : '8px',
          flexShrink: 0,
        }}
      >
        <Text strong style={{ fontSize: isMobile ? '18px' : '14px', color: '#111827' }}>
          Paziņojumi
        </Text>
        {unreadCount > 0 && (
          <Space size={isMobile ? 'middle' : 'small'}>
            <Button
              type="link"
              size={isMobile ? 'middle' : 'small'}
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              style={{ padding: 0, fontSize: isMobile ? '14px' : '12px' }}
            >
              Atzīmēt visus kā izlasītus
            </Button>
            {notifications.length > 0 && (
              <Button
                type="link"
                size={isMobile ? 'middle' : 'small'}
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                style={{ padding: 0, fontSize: isMobile ? '14px' : '12px' }}
              >
                Dzēst visus
              </Button>
            )}
          </Space>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text style={{ color: '#9ca3af', fontSize: '13px' }}>
              Nav paziņojumu
            </Text>
          }
          style={{ padding: isMobile ? '60px 20px' : isInDropdown ? '40px 16px' : '40px 20px' }}
        />
      ) : (
        <List
          style={isInDropdown ? { padding: '0 16px 16px 16px' } : {}}
          dataSource={notifications}
          renderItem={(notification) => (
            <List.Item
              key={notification.id}
              style={{
                padding: isMobile ? '16px' : '12px',
                cursor: notification.actionUrl ? 'pointer' : 'default',
                background: notification.read ? '#ffffff' : getPriorityColor(notification.priority),
                borderLeft: notification.read ? 'none' : `3px solid ${getPriorityColor(notification.priority)}`,
                marginBottom: '4px',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onClick={() => {
                handleNotificationClick(notification);
                if (isMobile) {
                  setDropdownOpen(false);
                }
              }}
              onMouseEnter={(e) => {
                if (!notification.read && !isMobile) {
                  e.currentTarget.style.background = getPriorityColor(notification.priority);
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                if (!notification.read && !isMobile) {
                  e.currentTarget.style.background = getPriorityColor(notification.priority);
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              <List.Item.Meta
                avatar={
                  <div
                    style={{
                      width: isMobile ? '40px' : '32px',
                      height: isMobile ? '40px' : '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: getPriorityColor(notification.priority),
                      borderRadius: '6px',
                    }}
                  >
                    {getPriorityIcon(notification.priority)}
                  </div>
                }
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text
                      strong={!notification.read}
                      style={{
                        fontSize: isMobile ? '15px' : '13px',
                        color: '#111827',
                        flex: 1,
                        marginRight: '8px',
                      }}
                    >
                      {notification.title}
                    </Text>
                    <Space>
                      {!notification.read && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        style={{
                          padding: '0 4px',
                          width: isMobile ? '28px' : '20px',
                          height: isMobile ? '28px' : '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      />
                    </Space>
                  </div>
                }
                description={
                  <div>
                    <Text
                      style={{
                        fontSize: isMobile ? '14px' : '12px',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      {notification.message || notification.description}
                    </Text>
                    <Text
                      style={{
                        fontSize: isMobile ? '12px' : '11px',
                        color: '#9ca3af',
                      }}
                    >
                      {formatTime(notification.timestamp)}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  // Notification menu for desktop dropdown (defined after NotificationContent)
  const notificationMenu = {
    items: [
      {
        key: 'notifications',
        label: <NotificationContent isInDropdown={true} />,
        disabled: true,
      },
    ],
  };

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <>
        <Badge
          count={unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : 0}
          offset={[-5, 5]}
          style={{ cursor: 'pointer' }}
        >
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: '20px' }} />}
            onClick={() => setDropdownOpen(true)}
            style={{
              width: '40px',
              height: '40px',
              background: dropdownOpen ? '#e5e7eb' : '#f3f4f6',
              borderRadius: '8px',
              color: '#4b5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          />
        </Badge>
        <Drawer
          title="Paziņojumi"
          placement="right"
          onClose={() => setDropdownOpen(false)}
          open={dropdownOpen}
          width="100%"
          style={{ zIndex: 1002 }}
        >
          <NotificationContent />
        </Drawer>
      </>
    );
  }

  // Desktop: Use Dropdown
  return (
    <Dropdown
      menu={notificationMenu}
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement="bottomRight"
      getPopupContainer={() => document.body}
    >
      <Badge
        count={unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : 0}
        offset={[-5, 5]}
        style={{ cursor: 'pointer' }}
      >
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '20px' }} />}
          style={{
            width: '40px',
            height: '40px',
            background: dropdownOpen ? '#e5e7eb' : '#f3f4f6',
            borderRadius: '8px',
            color: '#4b5563',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationDropdown;







