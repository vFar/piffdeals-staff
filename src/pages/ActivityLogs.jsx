import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Typography, Tag, Space, Select, DatePicker, Input, Spin, Empty, Tooltip, Alert } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [error, setError] = useState(null);
  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogs();
    }
  }, [isSuperAdmin]);

  // Apply filters whenever filters or logs change
  useEffect(() => {
    applyFilters();
  }, [searchText, selectedActionType, selectedCategory, selectedRole, dateRange, logs]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to last 1000 logs for performance

      if (error) {
        // Check if it's a permission error or table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setError('Darbību žurnāla tabula vēl nav izveidota. Lūdzu, izpildiet datubāzes shēmu.');
        } else if (error.code === '42501' || error.message?.includes('permission')) {
          setError('Nav piekļuves darbību žurnālam.');
        } else {
          setError(`Kļūda: ${error.message}`);
        }
        setLogs([]);
        return;
      }
      setLogs(data || []);
    } catch (error) {
      setError(`Kļūda: ${error.message}`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter((log) => {
        const description = (log.description || '').toLowerCase();
        const username = (log.user_username || '').toLowerCase();
        const email = (log.user_email || '').toLowerCase();
        const actionType = (log.action_type || '').toLowerCase();
        
        return description.includes(lowerSearch) ||
               username.includes(lowerSearch) ||
               email.includes(lowerSearch) ||
               actionType.includes(lowerSearch);
      });
    }

    // Action type filter
    if (selectedActionType !== 'all') {
      filtered = filtered.filter(log => log.action_type === selectedActionType);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.action_category === selectedCategory);
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(log => log.user_role === selectedRole);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      filtered = filtered.filter(log => {
        const logDate = dayjs(log.created_at);
        return logDate.isAfter(startDate.subtract(1, 'second')) && 
               logDate.isBefore(endDate.add(1, 'second'));
      });
    }

    setFilteredLogs(filtered);
  };

  const getActionTypeLabel = (actionType) => {
    const labels = {
      // User management - user-friendly descriptions
      'user_created': 'Izveidots jauns lietotāja konts',
      'user_updated': 'Rediģēti lietotāja dati',
      'user_deleted': 'Dzēsts lietotāja konts',
      'role_changed': 'Mainīta lietotāja loma',
      'status_changed': 'Mainīts lietotāja statuss',
      'bulk_user_action': 'Masveida darbība ar lietotājiem',
      'password_changed': 'Mainīta lietotāja parole',
      'password_reset_requested': 'Nosūtīts paroles maiņas e-pasts',
      
      // Invoice management - user-friendly descriptions
      'invoice_created': 'Izveidots jauns rēķins',
      'invoice_updated': 'Rediģēts rēķins',
      'invoice_deleted': 'Dzēsts rēķins',
      'invoice_sent': 'Nosūtīts rēķins klientam',
      'invoice_resent': 'Nosūtīts rēķins klientam vēlreiz',
      'invoice_status_changed': 'Mainīts rēķina statuss',
      'invoice_paid': 'Rēķins atzīmēts kā apmaksāts',
      'invoice_cancelled': 'Rēķins atcelts',
      'invoice_viewed': 'Skatīts rēķins',
      
      // System
      'login': 'Pieteikšanās sistēmā',
      'logout': 'Iziet no sistēmas',
      'system_config_changed': 'Mainīti sistēmas iestatījumi',
      
      // Security
      'unauthorized_access_attempt': 'Mēģinājums piekļūt bez atļaujas',
      'suspicious_activity': 'Aizdomīga darbība',
    };
    return labels[actionType] || actionType;
  };

  const getActionTypeColor = (actionType) => {
    if (actionType?.includes('created')) return 'green';
    if (actionType?.includes('updated')) return 'blue';
    if (actionType?.includes('deleted')) return 'red';
    if (actionType?.includes('sent')) return 'cyan';
    if (actionType?.includes('changed')) return 'orange';
    if (actionType?.includes('reset') || actionType?.includes('password')) return 'purple';
    return 'default';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'user_management': 'Lietotāju pārvalde',
      'invoice_management': 'Rēķinu pārvalde',
      'system': 'Sistēma',
      'security': 'Drošība',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'user_management': 'purple',
      'invoice_management': 'blue',
      'system': 'default',
      'security': 'red',
    };
    return colors[category] || 'default';
  };

  const getRoleLabel = (role) => {
    if (!role) return '';
    // Normalize the role - handle both database values and any stored display values
    const normalizedRole = String(role).toLowerCase().trim();
    
    // Map all possible variations to correct Latvian labels
    if (normalizedRole === 'super_admin' || normalizedRole === 'super administrators' || normalizedRole.includes('super')) {
      return 'Galvenais administrators';
    }
    if (normalizedRole === 'admin' || normalizedRole === 'administrators') {
      return 'Administrators';
    }
    if (normalizedRole === 'employee' || normalizedRole === 'darbinieks') {
      return 'Darbinieks';
    }
    
    // If it's already in Latvian and correct, return as is
    if (role === 'Galvenais administrators') return role;
    if (role === 'Administrators') return role;
    if (role === 'Darbinieks') return role;
    
    // Fallback - return the role as is (shouldn't happen)
    return role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'employee': 'blue',
      'admin': 'purple',
      'super_admin': 'red',
    };
    return colors[role] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'active': 'Aktīvs',
      'inactive': 'Neaktīvs',
      'suspended': 'Aizliegts',
    };
    return labels[status] || status;
  };

  const formatDetails = (details) => {
    if (!details || typeof details !== 'object') return null;
    
    try {
      const entries = Object.entries(details);
      if (entries.length === 0) return null;
      
      // Format key names to Latvian - user-friendly labels
      const keyLabels = {
        // User management
        'old_role': 'Vecā loma',
        'new_role': 'Jaunā loma',
        'old_status': 'Vecais statuss',
        'new_status': 'Jaunais statuss',
        'bulk_action': 'Masveida darbība',
        'total_updated': 'Atjaunināti lietotāji',
        'total_deleted': 'Dzēsti lietotāji',
        'created_user_role': 'Izveidotā loma',
        'created_user_status': 'Izveidotais statuss',
        'deleted_user_role': 'Dzēstā loma',
        'deleted_user_status': 'Dzēstais statuss',
        
        // Invoice management
        'invoice_number': 'Rēķina numurs',
        'old_invoice_status': 'Vecais statuss',
        'new_invoice_status': 'Jaunais statuss',
        'customer_name': 'Klients',
        'total_amount': 'Summa',
        'is_own_invoice': 'Savs rēķins',
        'is_other_user_invoice': 'Cita lietotāja rēķins',
        'creator_username': 'Izveidoja',
        'modified_by': 'Mainīja',
        'payment_method': 'Maksājuma veids',
        
        // General
        'action_performed_by': 'Veica',
        'target_user_role': 'Mērķa lietotāja loma',
        'target_user_status': 'Mērķa lietotāja statuss',
      };
      
      // Filter out ALL technical/internal fields - ONLY show user-friendly information
      const filteredEntries = entries.filter(([key]) => {
        const lowerKey = key.toLowerCase();
        
        // Explicitly hide ALL technical fields
        if (lowerKey.includes('id') && !lowerKey.includes('invoice_number')) return false;
        if (lowerKey.includes('email')) return false;
        if (lowerKey.includes('username') && !lowerKey.includes('creator_username')) return false;
        if (lowerKey.includes('user_id')) return false;
        if (lowerKey.includes('target_') && !lowerKey.includes('target_user_role') && !lowerKey.includes('target_user_status')) return false;
        if (lowerKey.includes('created_') && !lowerKey.includes('created_user_role') && !lowerKey.includes('created_user_status')) return false;
        if (lowerKey.includes('deleted_') && !lowerKey.includes('deleted_user_role') && !lowerKey.includes('deleted_user_status')) return false;
        if (lowerKey.includes('sent_by')) return false;
        if (lowerKey.includes('by_admin')) return false;
        if (lowerKey.includes('_admin')) return false;
        if (lowerKey === 'admin') return false;
        
        // Allow user-friendly keys
        const allowedKeys = [
          'old_role', 'new_role', 'old_status', 'new_status', 
          'bulk_action', 'total_updated', 'total_deleted',
          'created_user_role', 'created_user_status',
          'deleted_user_role', 'deleted_user_status',
          'invoice_number', 'old_invoice_status', 'new_invoice_status',
          'customer_name', 'total_amount', 'is_own_invoice', 'is_other_user_invoice',
          'creator_username', 'modified_by', 'payment_method',
          'action_performed_by', 'target_user_role', 'target_user_status'
        ];
        return allowedKeys.includes(key);
      });
      
      if (filteredEntries.length === 0) return null;
      
      return (
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', lineHeight: '1.6' }}>
          {filteredEntries.map(([key, value]) => {
            const label = keyLabels[key] || key;
            let displayValue = value;
            
            // Format role values
            if (key.includes('role')) {
              displayValue = getRoleLabel(String(value));
            }
            // Format status values (both user and invoice statuses)
            else if (key.includes('status')) {
              if (key.includes('invoice')) {
                // Invoice status
                const invoiceStatusLabels = {
                  'draft': 'Melnraksts',
                  'sent': 'Nosūtīts',
                  'paid': 'Apmaksāts',
                  'pending': 'Gaida',
                  'overdue': 'Kavēts',
                  'cancelled': 'Atcelts',
                };
                displayValue = invoiceStatusLabels[String(value)] || String(value);
              } else {
                // User status
                displayValue = getStatusLabel(String(value));
              }
            }
            // Format boolean values
            else if (typeof value === 'boolean') {
              displayValue = value ? 'Jā' : 'Nē';
            }
            // Format numbers (amounts)
            else if (typeof value === 'number') {
              if (key.includes('amount') || key.includes('total')) {
                displayValue = `€${parseFloat(value).toFixed(2)}`;
              } else {
                displayValue = String(value);
              }
            }
            else {
              displayValue = String(value);
            }
            
            return (
              <div key={key} style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: '#374151' }}>{label}:</span>{' '}
                <span>{displayValue}</span>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return null;
    }
  };

  const columns = [
    {
      title: 'Laiks',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (date) => {
        const dateObj = dayjs(date);
        const now = dayjs();
        const diffDays = now.diff(dateObj, 'day');
        
        if (diffDays === 0) {
          // Today - show time with seconds
          return (
            <div>
              <div style={{ fontWeight: 500, color: '#111827' }}>Šodien</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{dateObj.format('HH:mm:ss')}</div>
            </div>
          );
        } else if (diffDays === 1) {
          // Yesterday
          return (
            <div>
              <div style={{ fontWeight: 500, color: '#111827' }}>Vakar</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{dateObj.format('HH:mm:ss')}</div>
            </div>
          );
        } else if (diffDays < 7) {
          // This week - show day name
          const dayNames = ['Svētdiena', 'Pirmdiena', 'Otrdiena', 'Trešdiena', 'Ceturtdiena', 'Piektdiena', 'Sestdiena'];
          return (
            <div>
              <div style={{ fontWeight: 500, color: '#111827' }}>{dayNames[dateObj.day()]}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{dateObj.format('DD.MM.YYYY')}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{dateObj.format('HH:mm:ss')}</div>
            </div>
          );
        } else {
          // Older - show full date and time
          return (
            <div>
              <div style={{ fontWeight: 500, color: '#111827' }}>{dateObj.format('DD.MM.YYYY')}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{dateObj.format('HH:mm:ss')}</div>
            </div>
          );
        }
      },
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: 'Lietotājs',
      key: 'user',
      width: 180,
      render: (_, record) => {
        const role = record.user_role ? getRoleLabel(record.user_role) : null;
        return (
          <div>
            <div style={{ fontWeight: 500, marginBottom: '4px', color: '#111827' }}>
              {record.user_username || 'Nezināms'}
            </div>
            {role && (
              <Tag color={getRoleColor(record.user_role)} size="small">
                {role}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Darbība',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <div>
          <Tag color={getActionTypeColor(record.action_type)}>
            {getActionTypeLabel(record.action_type)}
          </Tag>
          <Tag color={getCategoryColor(record.action_category)} style={{ marginTop: '4px' }}>
            {getCategoryLabel(record.action_category)}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Apraksts',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: false },
      render: (text, record) => (
        <div>
          <div style={{ color: '#111827', lineHeight: '1.5', marginBottom: record.details ? '8px' : '0' }}>
            {text}
          </div>
          {formatDetails(record.details)}
        </div>
      ),
    },
    {
      title: 'IP adrese',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      render: (ip) => ip || '-',
    },
  ];

  // Get unique action types for filter
  const uniqueActionTypes = useMemo(() => {
    const types = [...new Set(logs.map(log => log.action_type).filter(Boolean))];
    return types.sort();
  }, [logs]);

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(logs.map(log => log.action_category).filter(Boolean))];
    return categories.sort();
  }, [logs]);

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = [...new Set(logs.map(log => log.user_role).filter(Boolean))];
    return roles.sort();
  }, [logs]);

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <Empty description="Nav piekļuves. Šo lapu var skatīt tikai galvenais administrators." />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Title level={2} style={{ margin: 0 }}>
            Darbību žurnāls
          </Title>
          <Tooltip 
            title={
              <div style={{ maxWidth: '300px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Darbību žurnāls</div>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  Šeit tiek reģistrētas visas nozīmīgās darbības sistēmā: lietotāju izveide, rediģēšana, dzēšana, rēķinu izveide, nosūtīšana, lomas maiņa, statusa maiņa un drošības notikumi. Varat filtrēt pēc darbības veida, kategorijas, lomas un datuma diapazona. Pieejams tikai galvenajam administratoram.
                </div>
              </div>
            }
            placement="right"
          >
            <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
          </Tooltip>
        </div>
        <Text type="secondary">
          Pārskats par visām nozīmīgajām darbībām, kas veiktas sistēmā
        </Text>
      </div>

      <Card>
        {/* Filters */}
        <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Meklēt</Text>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Meklēt pēc apraksta, lietotāja, darbības..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>

          <div style={{ width: '180px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Darbības veids</Text>
            <Select
              value={selectedActionType}
              onChange={setSelectedActionType}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="all">Visi</Option>
              {uniqueActionTypes.map(type => (
                <Option key={type} value={type}>
                  {getActionTypeLabel(type)}
                </Option>
              ))}
            </Select>
          </div>

          <div style={{ width: '180px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Kategorija</Text>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="all">Visas</Option>
              {uniqueCategories.map(category => (
                <Option key={category} value={category}>
                  {getCategoryLabel(category)}
                </Option>
              ))}
            </Select>
          </div>

          <div style={{ width: '180px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Loma</Text>
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="all">Visas</Option>
              {uniqueRoles.map(role => (
                <Option key={role} value={role}>
                  {getRoleLabel(role)}
                </Option>
              ))}
            </Select>
          </div>

          <div style={{ width: '280px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Datuma diapazons</Text>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              allowClear
            />
          </div>

          <div>
            <Space>
              <button
                onClick={fetchLogs}
                style={{
                  padding: '8px 16px',
                  background: '#0068FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                }}
              >
                <ReloadOutlined />
                Atjaunot
              </button>
            </Space>
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Card size="small" style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0068FF' }}>
              {filteredLogs.length}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Kopā ieraksti
            </div>
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>
              {filteredLogs.filter(log => log.action_category === 'user_management').length}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Lietotāju darbības
            </div>
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
              {filteredLogs.filter(log => log.action_category === 'invoice_management').length}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Rēķinu darbības
            </div>
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
              {filteredLogs.filter(log => log.action_category === 'security').length}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Drošības darbības
            </div>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Alert
            message="Kļūda"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `Kopā ${total} ieraksti`,
            pageSizeOptions: ['25', '50', '100', '200'],
          }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: <Empty description="Nav atrastu ierakstu" />,
          }}
        />
      </Card>
    </DashboardLayout>
  );
};

export default ActivityLogs;

