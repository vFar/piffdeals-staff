import { useState, useEffect } from 'react';
import { Card, Table, Typography, Breadcrumb, Tag, Space, message, Spin, Modal, Form, Input, Select, Button, Popconfirm, Dropdown } from 'antd';
import { PlusOutlined, MoreOutlined, SearchOutlined, UserSwitchOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';

const { Title, Text } = Typography;
const { Option } = Select;

const UserAccounts = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [bulkRoleForm] = Form.useForm();
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm] = Form.useForm();
  const { isAdmin, isSuperAdmin, userProfile } = useUserRole();

  useEffect(() => {
    if (isAdmin || isSuperAdmin) {
      fetchUsers();
    }
  }, [isAdmin, isSuperAdmin]);

  // Search filter effect
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowerSearch = searchText.toLowerCase();
    const filtered = users.filter((user) => {
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (getRoleLabel(user.role).label || '').toLowerCase();
      
      return username.includes(lowerSearch) || 
             email.includes(lowerSearch) || 
             role.includes(lowerSearch);
    });

    setFilteredUsers(filtered);
  }, [searchText, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Kļūda ielādējot lietotājus');
    } finally {
      setLoading(false);
    }
  };

  // Create user function with role-based permissions and email validation
  const handleCreateUser = async (values) => {
    try {
      setSubmitting(true);

      // Role-based permission check
      if (isAdmin && !isSuperAdmin && values.role !== 'employee') {
        message.error('Administrators var izveidot tikai darbinieku kontus');
        return;
      }

      // Check email uniqueness
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', values.email.toLowerCase())
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (existingUsers && existingUsers.length > 0) {
        message.error('Lietotājs ar šo e-pastu jau eksistē');
        return;
      }

      // Try to call Supabase Edge Function
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
          console.log('User created successfully:', result);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Edge function returned an error');
        }
      } catch (edgeError) {
        console.error('Edge function error:', edgeError);
        throw new Error(
          'Kļūda sazināties ar serveri. Lūdzu, pārbaudiet savienojumu un mēģiniet vēlreiz.'
        );
      }

      // Edge Function creates both auth user AND profile, so we're done!
      // No need to create profile here - it's already created by the Edge Function

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

  // Bulk delete selected users
  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);

      // Prevent users from deleting themselves
      if (selectedRowKeys.includes(userProfile?.id)) {
        message.error('Jūs nevarat dzēst savu pašu kontu. Lūdzu izmantojiet Profilu.');
        setBulkActionLoading(false);
        return;
      }

      // Check permissions - admin can't delete admins or super_admins
      if (isAdmin && !isSuperAdmin) {
        const selectedUsers = users.filter((u) => selectedRowKeys.includes(u.id));
        const hasHigherRoleUsers = selectedUsers.some((u) => u.role === 'admin' || u.role === 'super_admin');
        
        if (hasHigherRoleUsers) {
          message.error('Administrators nevar dzēst citus administratorus');
          return;
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .in('id', selectedRowKeys);

      if (error) throw error;

      message.success(`${selectedRowKeys.length} lietotāji veiksmīgi izdzēsti`);
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting users:', error);
      message.error('Kļūda dzēšot lietotājus');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk change role
  const handleBulkRoleChange = async (values) => {
    try {
      setBulkActionLoading(true);

      // Check permissions - admin can only set role to employee
      if (isAdmin && !isSuperAdmin && values.role !== 'employee') {
        message.error('Administrators var piešķirt tikai darbinieka lomu');
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: values.role })
        .in('id', selectedRowKeys);

      if (error) throw error;

      message.success(`${selectedRowKeys.length} lietotāju lomas veiksmīgi mainītas`);
      setIsBulkRoleModalOpen(false);
      bulkRoleForm.resetFields();
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (error) {
      console.error('Error changing roles:', error);
      message.error('Kļūda maiņot lomas');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk change status
  const handleBulkStatusChange = async (status) => {
    try {
      setBulkActionLoading(true);

      // If changing to suspended, show confirmation
      if (status === 'suspended') {
        Modal.confirm({
          title: 'Vai tiešām vēlaties bloķēt izvēlētos lietotājus?',
          content: `${selectedRowKeys.length} lietotāji vairs nevarēs pieslēgties sistēmai. ${!isSuperAdmin ? 'Tikai galvenais administrators varēs atbloķēt šos kontus.' : ''}`,
          okText: 'Jā, bloķēt',
          cancelText: 'Atcelt',
          okButtonProps: { danger: true },
          onOk: async () => {
            await performBulkStatusUpdate(status);
          },
          onCancel: () => {
            setBulkActionLoading(false);
          }
        });
        return; // Exit early, confirmation will handle the update
      }

      // If no confirmation needed, proceed with update
      await performBulkStatusUpdate(status);
    } catch (error) {
      console.error('Error changing status:', error);
      message.error('Kļūda maiņot statusu');
      setBulkActionLoading(false);
    }
  };

  // Perform the actual bulk status update
  const performBulkStatusUpdate = async (status) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status })
        .in('id', selectedRowKeys);

      if (error) throw error;

      message.success(`${selectedRowKeys.length} lietotāju statusi veiksmīgi mainīti`);
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (error) {
      console.error('Error changing status:', error);
      message.error('Kļūda maiņot statusu');
      throw error;
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Check if current user can edit a specific user
  const canEditUser = (targetUser) => {
    if (!userProfile || !targetUser) return false;

    // Admins cannot edit users with "aizliegts" (suspended) status
    // Only super_admin can edit suspended users
    if (targetUser.status === 'suspended' && !isSuperAdmin) {
      return false;
    }

    // Employee can only edit their own account
    if (!isAdmin && !isSuperAdmin) {
      return targetUser.id === userProfile.id;
    }

    // Admin can edit their own account and any employee
    if (isAdmin && !isSuperAdmin) {
      return targetUser.id === userProfile.id || targetUser.role === 'employee';
    }

    // Super admin can edit their own account, all admins, and all employees
    // BUT cannot edit other super admins
    if (isSuperAdmin) {
      if (targetUser.role === 'super_admin') {
        return targetUser.id === userProfile.id; // Only their own super admin account
      }
      return true; // Can edit all admins and employees
    }

    return false;
  };

  // Open edit modal with user data
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      name: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setIsEditModalOpen(true);
  };

  // Handle user edit submission with status change confirmation
  const handleEditUser = async (values) => {
    try {
      setSubmitting(true);

      if (!editingUser) return;

      // Status-based permission check
      // Only super_admin can change status FROM "suspended"
      if (editingUser.status === 'suspended' && values.status !== 'suspended' && !isSuperAdmin) {
        message.error('Tikai galvenais administrators var mainīt aizliegtu lietotāju statusu');
        return;
      }

      // Role-based permission check for role changes
      if (values.role !== editingUser.role) {
        // Employee can't change roles at all
        if (!isAdmin && !isSuperAdmin) {
          message.error('Jums nav atļaujas mainīt lomas');
          return;
        }

        // Admin can only set role to employee
        if (isAdmin && !isSuperAdmin && values.role !== 'employee') {
          message.error('Administrators var piešķirt tikai darbinieka lomu');
          return;
        }
      }

      // Check email uniqueness if email is changed
      if (values.email.toLowerCase() !== editingUser.email.toLowerCase()) {
        const { data: existingUsers, error: checkError } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('email', values.email.toLowerCase())
          .neq('id', editingUser.id)
          .limit(1);

        if (checkError) {
          throw checkError;
        }

        if (existingUsers && existingUsers.length > 0) {
          message.error('Lietotājs ar šo e-pastu jau eksistē');
          return;
        }
      }

      // If changing status to "suspended", show confirmation
      if (values.status === 'suspended' && editingUser.status !== 'suspended') {
        Modal.confirm({
          title: 'Vai tiešām vēlaties bloķēt šo lietotāju?',
          content: `Lietotājs "${editingUser.username}" vairs nevarēs pieslēgties sistēmai. ${!isSuperAdmin ? 'Tikai galvenais administrators varēs atbloķēt šo kontu.' : ''}`,
          okText: 'Jā, bloķēt',
          cancelText: 'Atcelt',
          okButtonProps: { danger: true },
          onOk: async () => {
            await performUserUpdate(values);
          },
        });
        return; // Exit early, confirmation will handle the update
      }

      // If no confirmation needed, proceed with update
      await performUserUpdate(values);
    } catch (error) {
      console.error('Error updating user:', error);
      message.error(error.message || 'Kļūda atjauninot lietotāju');
    } finally {
      setSubmitting(false);
    }
  };

  // Perform the actual user update
  const performUserUpdate = async (values) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: values.name,
          email: values.email.toLowerCase(),
          role: values.role,
          status: values.status,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      message.success('Lietotāja dati veiksmīgi atjaunināti');
      setIsEditModalOpen(false);
      editForm.resetFields();
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      message.error(error.message || 'Kļūda atjauninot lietotāju');
      throw error;
    }
  };

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    getCheckboxProps: (record) => ({
      // Users can't select themselves
      // Admins can't select other admins or super_admins
      // Admins can't select suspended users (only super_admin can)
      // Super admins can't select other super admins
      disabled: 
        record.id === userProfile?.id || 
        (isAdmin && !isSuperAdmin && (record.role === 'admin' || record.role === 'super_admin')) ||
        (isAdmin && !isSuperAdmin && record.status === 'suspended') ||
        (isSuperAdmin && record.role === 'super_admin' && record.id !== userProfile?.id),
    }),
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

  // Capitalize each word in a string
  const capitalizeWords = (str) => {
    if (!str) return str;
    return str
      .split(' ')
      .map(word => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
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
      sorter: (a, b) => (a.username || '').localeCompare(b.username || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ fontWeight: 500, color: '#111827' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>E-pasts</span>,
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ color: '#6b7280' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Loma</span>,
      dataIndex: 'role',
      key: 'role',
      sorter: (a, b) => {
        const roleOrder = { 'super_admin': 3, 'admin': 2, 'employee': 1 };
        return (roleOrder[a.role] || 0) - (roleOrder[b.role] || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (role) => {
        const roleInfo = getRoleLabel(role);
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Statuss</span>,
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => {
        const statusOrder = { 'active': 3, 'inactive': 2, 'suspended': 1 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      },
      sortDirections: ['ascend', 'descend'],
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
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Pēdējā pieslēgšanās</span>,
      dataIndex: 'last_login',
      key: 'last_login',
      sorter: (a, b) => {
        const dateA = a.last_login ? new Date(a.last_login).getTime() : 0;
        const dateB = b.last_login ? new Date(b.last_login).getTime() : 0;
        return dateA - dateB;
      },
      sortDirections: ['ascend', 'descend'],
      render: (date) => <Text style={{ color: '#6b7280' }}>{formatDate(date)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Darbības</span>,
      key: 'actions',
      render: (_, record) => {
        const canEdit = canEditUser(record);
        
        if (!canEdit) {
          return null;
        }

        const menuItems = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Rediģēt',
            onClick: () => handleOpenEditModal(record),
          },
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
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
          </Dropdown>
        );
      },
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

        {/* Search and Bulk Actions Bar */}
        <Card
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          styles={{ body: { padding: '16px' } }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            {/* Search Input */}
            <Input
              placeholder="Meklēt pēc vārda, e-pasta vai lomas..."
              prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{
                minWidth: '320px',
                maxWidth: '480px',
                height: '40px',
                borderRadius: '8px',
              }}
            />

            {/* Bulk Actions (show when rows selected) */}
            {selectedRowKeys.length > 0 && (
              <Space size="middle">
                <Text style={{ fontSize: '14px', color: '#6b7280' }}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{selectedRowKeys.length}</span> lietotāji izvēlēti
                </Text>
                
                <Button
                  icon={<UserSwitchOutlined />}
                  onClick={() => setIsBulkRoleModalOpen(true)}
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'normal',
                    color: '#6b7280',
                  }}
                >
                  Mainīt lomu
                </Button>

                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'active',
                        label: 'Aktīvs',
                        onClick: () => handleBulkStatusChange('active'),
                      },
                      {
                        key: 'inactive',
                        label: 'Neaktīvs',
                        onClick: () => handleBulkStatusChange('inactive'),
                      },
                      {
                        key: 'suspended',
                        label: 'Aizliegts',
                        danger: true,
                        onClick: () => handleBulkStatusChange('suspended'),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 'normal',
                      color: '#6b7280',
                    }}
                  >
                    Mainīt statusu
                  </Button>
                </Dropdown>

                <Popconfirm
                  title="Dzēst izvēlētos lietotājus?"
                  description={`Vai tiešām vēlaties dzēst ${selectedRowKeys.length} lietotājus? Šī darbība ir neatgriezeniska.`}
                  onConfirm={handleBulkDelete}
                  okText="Dzēst"
                  cancelText="Atcelt"
                  okButtonProps={{ danger: true }}
                  disabled={selectedRowKeys.includes(userProfile?.id)}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={bulkActionLoading}
                    disabled={selectedRowKeys.includes(userProfile?.id)}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 'normal',
                    }}
                  >
                    Dzēst izvēlētos
                  </Button>
                </Popconfirm>
              </Space>
            )}
          </div>
        </Card>

        {/* Users Table */}
        <Card
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          styles={{ body: { padding: 0 } }}
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
                  dataSource={filteredUsers.map((user) => ({ ...user, key: user.id }))}
                  rowSelection={rowSelection}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `Rāda ${range[0]} līdz ${range[1]} no ${total} rezultātiem`,
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
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Vārds, Uzvārds</span>}
            name="name"
            rules={[{ required: true, message: 'Lūdzu, ievadiet vārdu, uzvārdu' }]}
            normalize={capitalizeWords}
          >
            <Input
              placeholder="Jānis Bērziņš"
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
              placeholder="janis.berzins@example.com"
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
              {/* Only super_admin can create admin and super_admin accounts */}
              {isSuperAdmin && <Option value="admin">Administrators</Option>}
              {isSuperAdmin && <Option value="super_admin">Galvenais administrators</Option>}
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

      {/* Bulk Role Change Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Mainīt lietotāju lomas
          </Title>
        }
        open={isBulkRoleModalOpen}
        onCancel={() => {
          setIsBulkRoleModalOpen(false);
          bulkRoleForm.resetFields();
        }}
        footer={null}
        centered
        width={500}
      >
        <Form
          form={bulkRoleForm}
          layout="vertical"
          onFinish={handleBulkRoleChange}
          style={{ marginTop: '24px' }}
        >
          <div style={{ marginBottom: '24px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
            <Text style={{ fontSize: '14px', color: '#6b7280' }}>
              Izvēlēti <span style={{ fontWeight: 600, color: '#111827' }}>{selectedRowKeys.length}</span> lietotāji
            </Text>
          </div>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Jauna loma</span>}
            name="role"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties lomu' }]}
          >
            <Select
              placeholder="Izvēlieties jauno lomu"
              style={{ height: '40px', borderRadius: '8px' }}
            >
              <Option value="employee">Darbinieks</Option>
              {isSuperAdmin && <Option value="admin">Administrators</Option>}
              {isSuperAdmin && <Option value="super_admin">Galvenais administrators</Option>}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsBulkRoleModalOpen(false);
                  bulkRoleForm.resetFields();
                }}
                style={{ height: '40px', borderRadius: '8px' }}
              >
                Atcelt
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={bulkActionLoading}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Mainīt lomu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Rediģēt lietotāju
          </Title>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          editForm.resetFields();
          setEditingUser(null);
        }}
        footer={null}
        centered
        width={600}
        style={{
          borderRadius: '12px',
        }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Vārds, Uzvārds</span>}
            name="name"
            rules={[{ required: true, message: 'Lūdzu, ievadiet vārdu, uzvārdu' }]}
            normalize={capitalizeWords}
          >
            <Input
              placeholder="Jānis Bērziņš"
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
              placeholder="janis.berzins@example.com"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Loma</span>}
            name="role"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties lomu' }]}
          >
            <Select
              placeholder="Izvēlieties lomu"
              style={{ height: '40px', borderRadius: '8px' }}
              disabled={!isAdmin && !isSuperAdmin}
            >
              <Option value="employee">Darbinieks</Option>
              {/* Only super_admin can assign admin and super_admin roles */}
              {isSuperAdmin && <Option value="admin">Administrators</Option>}
              {isSuperAdmin && <Option value="super_admin">Galvenais administrators</Option>}
            </Select>
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Statuss</span>}
            name="status"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties statusu' }]}
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
                  setIsEditModalOpen(false);
                  editForm.resetFields();
                  setEditingUser(null);
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
                Saglabāt izmaiņas
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

