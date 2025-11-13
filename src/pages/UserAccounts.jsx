import { useState, useEffect } from 'react';
import { Card, Table, Typography, Breadcrumb, Tag, Space, message, Spin, Modal, Form, Input, Select, Button } from 'antd';
import { PlusOutlined, MoreOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';

const { Title, Text } = Typography;
const { Option } = Select;

const UserAccounts = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Kļūda ielādējot lietotājus');
    } finally {
      setLoading(false);
    }
  };

  // Create user function
  const handleCreateUser = async (values) => {
    try {
      setSubmitting(true);

      // Try to call Supabase Edge Function first (if available)
      // Update the function name to match your edge function
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      
      let userId = null;
      
      try {
        // Get the current session to pass auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            username: values.name,
            role: values.role,
            status: values.status,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          userId = result.userId;
        } else {
          throw new Error('Edge function not available or failed');
        }
      } catch (edgeError) {
        // If edge function fails, try alternative approach
        console.warn('Edge function not available, trying alternative method:', edgeError);
        
        // Alternative: Use Supabase Admin API via RPC (requires setup)
        // This requires a database function that can create auth users
        // For now, show an error with instructions
        throw new Error(
          'Lietotāja izveide prasa servera piekļuvi. ' +
          'Lūdzu, izveidojiet Supabase Edge Function vai backend API endpoint. ' +
          'Skatiet dokumentāciju: src/services/userService.js'
        );
      }

      // If we have a userId, create the profile
      if (userId) {
        // Create user profile using database function
        const { error: profileError } = await supabase.rpc('create_user_profile', {
          p_user_id: userId,
          p_email: values.email,
          p_username: values.name,
          p_role: values.role,
          p_status: values.status,
        });

        if (profileError) {
          // If RPC fails, try direct insert
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: values.email,
              username: values.name,
              role: values.role,
              status: values.status,
            });

          if (insertError) {
            console.error('Profile creation error:', insertError);
            throw insertError;
          }
        }
      }

      message.success('Lietotājs veiksmīgi izveidots');
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      message.error(error.message || 'Kļūda izveidojot lietotāju');
    } finally {
      setSubmitting(false);
    }
  };

  // Role display mapping
  const getRoleLabel = (role) => {
    const roleMap = {
      super_admin: { label: 'Galvenais administrators', color: 'red' },
      admin: { label: 'Administrators', color: 'blue' },
      employee: { label: 'Darbinieks', color: 'default' },
    };
    return roleMap[role] || { label: role, color: 'default' };
  };

  // Status display mapping
  const getStatusLabel = (status) => {
    const statusMap = {
      active: { label: 'Aktīvs', color: 'success' },
      inactive: { label: 'Neaktīvs', color: 'default' },
      suspended: { label: 'Aizliegts', color: 'error' },
    };
    return statusMap[status] || { label: status, color: 'default' };
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('lv-LV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge style
  const getStatusBadgeStyle = (status) => {
    const statusStyles = {
      active: {
        background: '#dcfce7',
        color: '#166534',
        darkBackground: 'rgba(34, 197, 94, 0.1)',
        darkColor: '#86efac',
      },
      inactive: {
        background: '#f3f4f6',
        color: '#4b5563',
        darkBackground: 'rgba(107, 114, 128, 0.1)',
        darkColor: '#9ca3af',
      },
      suspended: {
        background: '#fee2e2',
        color: '#991b1b',
        darkBackground: 'rgba(239, 68, 68, 0.1)',
        darkColor: '#fca5a5',
      },
    };
    return statusStyles[status] || statusStyles.inactive;
  };

  const columns = [
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Lietotājvārds</span>,
      dataIndex: 'username',
      key: 'username',
      render: (text) => <Text style={{ fontWeight: 500, color: '#111827' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>E-pasts</span>,
      dataIndex: 'email',
      key: 'email',
      render: (text) => <Text style={{ color: '#6b7280' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Loma</span>,
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const roleInfo = getRoleLabel(role);
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Statuss</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusInfo = getStatusLabel(status);
        const badgeStyle = getStatusBadgeStyle(status);
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              background: badgeStyle.background,
              color: badgeStyle.color,
            }}
          >
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Pēdējā pieteikšanās</span>,
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date) => <Text style={{ color: '#6b7280' }}>{formatDate(date)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Darbības</span>,
      key: 'actions',
      render: () => (
        <Button
          type="text"
          icon={<MoreOutlined />}
          style={{
            padding: '4px',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="action-button"
        />
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
              Lietotāju konti
            </Title>
            <Text style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
              Pārvaldīt sistēmas lietotājus un to piekļuves lomas
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{
              minWidth: '140px',
              height: '40px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Pievienot jaunu lietotāju
          </Button>
        </div>

        {/* Users Table */}
        <Card
          bordered={false}
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          bodyStyle={{ padding: 0 }}
        >
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <Table
                  columns={columns}
                  dataSource={users.map((user) => ({ ...user, key: user.id }))}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Rāda 1 līdz ${Math.min(10, total)} no ${total} rezultātiem`,
                    style: {
                      padding: '16px',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    },
                  }}
                  className="custom-table"
                  rowClassName="custom-table-row"
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create User Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Pievienot jaunu lietotāju
          </Title>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        centered
        width={600}
        style={{
          borderRadius: '12px',
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Vārds</span>}
            name="name"
            rules={[{ required: true, message: 'Lūdzu, ievadiet vārdu' }]}
          >
            <Input
              placeholder="Ievadiet lietotāja vārdu"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>E-pasts</span>}
            name="email"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet e-pastu' },
              { type: 'email', message: 'Lūdzu, ievadiet derīgu e-pasta adresi' },
            ]}
          >
            <Input
              type="email"
              placeholder="lietotajs@piemers.lv"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Parole</span>}
            name="password"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet paroli' },
              { min: 8, message: 'Parolei jābūt vismaz 8 simbolu garai' },
            ]}
          >
            <Input.Password
              placeholder="Ievadiet paroli"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Loma</span>}
            name="role"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties lomu' }]}
            initialValue="employee"
          >
            <Select
              placeholder="Izvēlieties lomu"
              style={{ height: '40px', borderRadius: '8px' }}
            >
              <Option value="employee">Darbinieks</Option>
              <Option value="admin">Administrators</Option>
              <Option value="super_admin">Galvenais administrators</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Statuss</span>}
            name="status"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties statusu' }]}
            initialValue="active"
          >
            <Select
              placeholder="Izvēlieties statusu"
              style={{ height: '40px', borderRadius: '8px' }}
            >
              <Option value="active">Aktīvs</Option>
              <Option value="inactive">Neaktīvs</Option>
              <Option value="suspended">Aizliegts</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  form.resetFields();
                }}
                style={{ height: '40px', borderRadius: '8px' }}
              >
                Atcelt
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Izveidot lietotāju
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Custom Table Styles */}
      <style>{`
        .custom-table .ant-table {
          font-size: 14px;
        }

        .custom-table .ant-table-thead > tr > th {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 16px;
          font-weight: 500;
        }

        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e5e7eb;
          padding: 16px;
          height: 72px;
        }

        .custom-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        .custom-table .ant-table-tbody > tr {
          background: #ffffff;
        }

        .custom-table .ant-table-tbody > tr:hover > td {
          background: #f9fafb;
        }

        .custom-table .ant-table-tbody > tr.custom-table-row:hover {
          background: #f9fafb;
        }

        .action-button:hover {
          background: rgba(43, 108, 238, 0.1) !important;
        }

        .ant-modal-content {
          border-radius: 12px;
        }

        .ant-modal-header {
          border-bottom: 1px solid #e5e7eb;
          padding: 24px;
        }

        .ant-modal-body {
          padding: 24px;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default UserAccounts;

