import React, { useState } from 'react';
import { Badge, Dropdown, Button, List, Typography, Empty, Space, Divider } from 'antd';
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

  const notificationMenu = {
    items: [
      {
        key: 'header',
        label: (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '8px',
            }}
          >
            <Text strong style={{ fontSize: '14px', color: '#111827' }}>
              Paziņojumi
            </Text>
            {unreadCount > 0 && (
              <Space>
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  style={{ padding: 0, fontSize: '12px' }}
                >
                  Atzīmēt visus kā izlasītus
                </Button>
                {notifications.length > 0 && (
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAll();
                    }}
                    style={{ padding: 0, fontSize: '12px' }}
                  >
                    Dzēst visus
                  </Button>
                )}
              </Space>
            )}
          </div>
        ),
        disabled: true,
      },
      {
        key: 'notifications',
        label: (
          <div style={{ maxHeight: '400px', overflowY: 'auto', width: '360px' }}>
            {notifications.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text style={{ color: '#9ca3af', fontSize: '13px' }}>
                    Nav paziņojumu
                  </Text>
                }
                style={{ padding: '40px 20px' }}
              />
            ) : (
              <List
                dataSource={notifications}
                renderItem={(notification) => (
                  <List.Item
                    key={notification.id}
                    style={{
                      padding: '12px',
                      cursor: notification.actionUrl ? 'pointer' : 'default',
                      background: notification.read ? '#ffffff' : getPriorityColor(notification.priority),
                      borderLeft: notification.read ? 'none' : `3px solid ${getPriorityColor(notification.priority)}`,
                      marginBottom: '4px',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleNotificationClick(notification)}
                    onMouseEnter={(e) => {
                      if (!notification.read) {
                        e.currentTarget.style.background = getPriorityColor(notification.priority);
                        e.currentTarget.style.opacity = '0.9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!notification.read) {
                        e.currentTarget.style.background = getPriorityColor(notification.priority);
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
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
                              fontSize: '13px',
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
                                width: '20px',
                                height: '20px',
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
                              fontSize: '12px',
                              color: '#6b7280',
                              display: 'block',
                              marginBottom: '4px',
                            }}
                          >
                            {notification.message || notification.description}
                          </Text>
                          <Text
                            style={{
                              fontSize: '11px',
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
        ),
        disabled: true,
      },
    ],
  };

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







