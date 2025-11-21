import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Typography, Tag, Space, Select, DatePicker, Input, Spin, Empty } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
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
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to last 1000 logs for performance

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
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
      'user_created': 'Lietotājs izveidots',
      'user_updated': 'Lietotājs atjaunināts',
      'user_deleted': 'Lietotājs dzēsts',
      'role_changed': 'Loma mainīta',
      'status_changed': 'Statuss mainīts',
      'invoice_created': 'Rēķins izveidots',
      'invoice_updated': 'Rēķins atjaunināts',
      'invoice_deleted': 'Rēķins dzēsts',
      'invoice_sent': 'Rēķins nosūtīts',
      'bulk_action': 'Masveida darbība',
      'login': 'Pieteikšanās',
      'logout': 'Iziet',
      'password_changed': 'Parole mainīta',
      'password_reset_requested': 'Paroles maiņas pieprasījums nosūtīts',
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
    const labels = {
      'employee': 'Darbinieks',
      'admin': 'Administrators',
      'super_admin': 'Super administrators',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'employee': 'blue',
      'admin': 'purple',
      'super_admin': 'red',
    };
    return colors[role] || 'default';
  };

  const formatDetails = (details) => {
    if (!details || typeof details !== 'object') return null;
    
    try {
      const entries = Object.entries(details);
      if (entries.length === 0) return null;
      
      return (
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          {entries.map(([key, value]) => (
            <div key={key} style={{ marginBottom: '2px' }}>
              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </div>
          ))}
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
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: 'Lietotājs',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            {record.user_username || record.user_email || 'Nezināms'}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {record.user_email}
          </div>
          {record.user_role && (
            <Tag color={getRoleColor(record.user_role)} size="small" style={{ marginTop: '4px' }}>
              {getRoleLabel(record.user_role)}
            </Tag>
          )}
        </div>
      ),
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
      ellipsis: true,
      render: (text, record) => (
        <div>
          <div>{text}</div>
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
          <Empty description="Nav piekļuves" />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
          Darbību žurnāls
        </Title>
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

