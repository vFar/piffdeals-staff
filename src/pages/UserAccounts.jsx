import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Space, Popconfirm, Spin, Breadcrumb, Typography, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { canAccessPage, canCreateRole, canManageUser, getCreatableRoles, getRoleDisplayName } from '../utils/rbac';
import { getAllUsers, createUser, deactivateUser, activateUser, updateUserRole } from '../services/userService';
import { USER_ROLES, USER_STATUS } from '../types/user';
import DashboardLayout from '../components/DashboardLayout';

const { Title, Text } = Typography;

const { Option } = Select;

const UserAccounts = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!authLoading && !userProfile) {
      navigate('/login');
      return;
    }

    if (userProfile) {
      const userRole = userProfile.role;
      if (!canAccessPage(userRole, 'userAccounts')) {
        navigate('/dashboard');
        return;
      }
      loadUsers();
    }
  }, [userProfile, authLoading, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      message.error('Neizdevās ielādēt lietotājus');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      displayName: user.displayName || '',
      role: user.role,
    });
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        // Update existing user
        await updateUserRole(editingUser.uid, values.role);
        message.success('Lietotājs veiksmīgi atjaunināts');
      } else {
        // Create new user
        const password = values.password || 'TempPassword123!'; // In production, generate a secure password
        await createUser(
          values.email,
          password,
          values.displayName,
          values.role,
          userProfile.uid
        );
        message.success('Lietotājs veiksmīgi izveidots');
      }
      handleModalCancel();
      loadUsers();
    } catch (error) {
      message.error(error.message || 'Neizdevās saglabāt lietotāju');
      console.error('Error saving user:', error);
    }
  };

  const handleDeactivate = async (uid) => {
    try {
      await deactivateUser(uid);
      message.success('Lietotājs veiksmīgi deaktivizēts');
      loadUsers();
    } catch (error) {
      message.error('Neizdevās deaktivizēt lietotāju');
      console.error('Error deactivating user:', error);
    }
  };

  const handleActivate = async (uid) => {
    try {
      await activateUser(uid);
      message.success('Lietotājs veiksmīgi aktivizēts');
      loadUsers();
    } catch (error) {
      message.error('Neizdevās aktivizēt lietotāju');
      console.error('Error activating user:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Spin size="large" tip="Uzgaidiet..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!userProfile) {
    return null;
  }

  const userRole = userProfile.role;
  const creatableRoles = getCreatableRoles(userRole);
  const canCreate = creatableRoles.length > 0;

  const columns = [
    {
      title: 'E-pasts',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: 'Vārds',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text) => text || '-',
    },
    {
      title: 'Loma',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const roleMap = {
          [USER_ROLES.EMPLOYEE]: 'Darbinieks',
          [USER_ROLES.ADMIN]: 'Administrators',
          [USER_ROLES.SUPER_ADMIN]: 'Super administrators',
        };
        return (
          <Tag color={role === USER_ROLES.SUPER_ADMIN ? 'red' : role === USER_ROLES.ADMIN ? 'blue' : 'default'}>
            {roleMap[role] || getRoleDisplayName(role)}
          </Tag>
        );
      },
      filters: [
        { text: 'Darbinieks', value: USER_ROLES.EMPLOYEE },
        { text: 'Administrators', value: USER_ROLES.ADMIN },
        { text: 'Super administrators', value: USER_ROLES.SUPER_ADMIN },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Statuss',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          [USER_STATUS.ACTIVE]: 'Aktīvs',
          [USER_STATUS.INACTIVE]: 'Neaktīvs',
          [USER_STATUS.SUSPENDED]: 'Apturēts',
        };
        return (
          <Tag color={status === USER_STATUS.ACTIVE ? 'green' : 'red'}>
            {statusMap[status] || status?.toUpperCase() || 'NEZINĀMS'}
          </Tag>
        );
      },
      filters: [
        { text: 'Aktīvs', value: USER_STATUS.ACTIVE },
        { text: 'Neaktīvs', value: USER_STATUS.INACTIVE },
        { text: 'Apturēts', value: USER_STATUS.SUSPENDED },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Izveidots',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('lv-LV');
      },
    },
    {
      title: 'Darbības',
      key: 'actions',
      render: (_, record) => {
        const canManage = canManageUser(userRole, record.role);
        const isCurrentUser = record.uid === userProfile.uid;
        
        return (
          <Space size="middle">
            {canManage && !isCurrentUser && (
              <>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEditUser(record)}
                  disabled={!canManageUser(userRole, record.role)}
                >
                  Rediģēt
                </Button>
                {record.status === USER_STATUS.ACTIVE ? (
                  <Popconfirm
                    title="Deaktivizēt lietotāju"
                    description="Vai tiešām vēlaties deaktivizēt šo lietotāju?"
                    onConfirm={() => handleDeactivate(record.uid)}
                    okText="Jā"
                    cancelText="Nē"
                  >
                    <Button type="link" danger icon={<DeleteOutlined />}>
                      Deaktivizēt
                    </Button>
                  </Popconfirm>
                ) : (
                  <Button
                    type="link"
                    onClick={() => handleActivate(record.uid)}
                  >
                    Aktivizēt
                  </Button>
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            {
              href: '#',
              title: <HomeOutlined />,
            },
            {
              title: 'Lietotāju konti',
            },
          ]}
        />

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Lietotāju konti
            </Title>
            <Text type="secondary">
              Pārvaldīt lietotāju kontus un atļaujas
            </Text>
          </div>
          {canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
              size="large"
            >
              Izveidot lietotāju
            </Button>
          )}
        </div>

        {/* Users Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={users}
            rowKey="uid"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Kopā ${total} lietotāji`,
            }}
          />
        </Card>
      </Space>

      <Modal
        title={editingUser ? 'Rediģēt lietotāju' : 'Izveidot lietotāju'}
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            role: creatableRoles[0] || USER_ROLES.EMPLOYEE,
          }}
        >
          <Form.Item
            name="email"
            label="E-pasts"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet e-pastu' },
              { type: 'email', message: 'Lūdzu, ievadiet derīgu e-pasta adresi' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="lietotajs@piemers.lv"
              disabled={!!editingUser}
            />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Parole"
              rules={[
                { required: true, message: 'Lūdzu, ievadiet paroli' },
                { min: 6, message: 'Parolei jābūt vismaz 6 rakstzīmēm' },
              ]}
            >
              <Input.Password placeholder="Ievadiet paroli" />
            </Form.Item>
          )}

          <Form.Item
            name="displayName"
            label="Vārds"
            rules={[{ required: true, message: 'Lūdzu, ievadiet vārdu' }]}
          >
            <Input placeholder="Jānis Bērziņš" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Loma"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties lomu' }]}
          >
            <Select placeholder="Izvēlieties lomu">
              {creatableRoles.map((role) => {
                const roleMap = {
                  [USER_ROLES.EMPLOYEE]: 'Darbinieks',
                  [USER_ROLES.ADMIN]: 'Administrators',
                  [USER_ROLES.SUPER_ADMIN]: 'Super administrators',
                };
                return (
                  <Option key={role} value={role}>
                    {roleMap[role] || getRoleDisplayName(role)}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Atjaunināt' : 'Izveidot'}
              </Button>
              <Button onClick={handleModalCancel}>Atcelt</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
};

export default UserAccounts;


