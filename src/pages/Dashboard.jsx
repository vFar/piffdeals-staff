import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Breadcrumb, Card, Statistic, Row, Col, Table, Tag, Typography, Space } from 'antd';
import { HomeOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, loading, navigate]);

  // Show spinner only if still loading auth state initially
  // After initial load, if we have a user, we should have a profile (even if temporary)
  if (loading && !currentUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" tip="Uzgaidiet..." />
      </div>
    );
  }

  // If no user and not loading, redirect to login
  if (!loading && !currentUser) {
    return null; // Will redirect via useEffect
  }

  // If we have a user but no profile yet (shouldn't happen due to temp profile, but just in case)
  // Only show spinner briefly, then allow access with currentUser data
  if (currentUser && !userProfile) {
    // Wait a bit for profile to load, but don't wait forever
    // The AuthContext should set a temp profile immediately
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" tip="Uzgaidiet..." />
      </div>
    );
  }

  // If we have a user but still loading, show spinner (this handles the case during refresh)
  if (currentUser && loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" tip="Uzgaidiet..." />
      </div>
    );
  }

  const invoiceColumns = [
    {
      title: 'Rēķina ID',
      dataIndex: 'id',
      key: 'id',
      render: (text) => <Text strong>#{text}</Text>,
    },
    {
      title: 'Klients',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Datums',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Kopā',
      dataIndex: 'total',
      key: 'total',
    },
    {
      title: 'Statuss',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          Paid: 'Samaksāts',
          Pending: 'Gaida',
          Overdue: 'Nokavēts',
        };
        const colorMap = {
          Paid: 'success',
          Pending: 'warning',
          Overdue: 'error',
        };
        return <Tag color={colorMap[status]}>{statusMap[status] || status}</Tag>;
      },
    },
  ];

  const invoiceData = [
    {
      key: '1',
      id: '12045',
      customer: 'Alex Johnson',
      date: '2023-10-27',
      total: '€299.99',
      status: 'Paid',
    },
    {
      key: '2',
      id: '12044',
      customer: 'Maria Garcia',
      date: '2023-10-27',
      total: '€49.50',
      status: 'Pending',
    },
    {
      key: '3',
      id: '12043',
      customer: 'James Smith',
      date: '2023-10-26',
      total: '€120.00',
      status: 'Pending',
    },
    {
      key: '4',
      id: '12042',
      customer: 'Patricia Brown',
      date: '2023-10-25',
      total: '€85.20',
      status: 'Overdue',
    },
    {
      key: '5',
      id: '12041',
      customer: 'Robert Davis',
      date: '2023-10-25',
      total: '€15.99',
      status: 'Paid',
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
              title: 'Informācijas panelis',
            },
          ]}
        />

        {/* Page Header */}
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Informācijas panelis
          </Title>
          <Text type="secondary">
            Laipni lūdzam atpakaļ, {userProfile.displayName || userProfile.email}!
          </Text>
        </div>

        {/* Stats Cards */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Kopējie ienākumi"
                value={12450}
                prefix="€"
                suffix={
                  <Text type="success" style={{ fontSize: '14px' }}>
                    <ArrowUpOutlined /> 5.2%
                  </Text>
                }
                valueStyle={{ color: '#262626' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Kopējie lietotāji"
                value={89}
                suffix={
                  <Text type="success" style={{ fontSize: '14px' }}>
                    <ArrowUpOutlined /> 12.0%
                  </Text>
                }
                valueStyle={{ color: '#262626' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Izveidotie rēķini"
                value={215}
                suffix={
                  <Text type="danger" style={{ fontSize: '14px' }}>
                    <ArrowDownOutlined /> 1.5%
                  </Text>
                }
                valueStyle={{ color: '#262626' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Neapmaksātie rēķini"
                value={32}
                suffix={
                  <Text type="success" style={{ fontSize: '14px' }}>
                    <ArrowUpOutlined /> 8.3%
                  </Text>
                }
                valueStyle={{ color: '#262626' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts Section */}
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={16}>
            <Card title="Pārdošana laika gaitā">
              <div style={{ height: '320px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title="Jaunu lietotāju reģistrācijas">
              <div style={{ height: '320px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               
              </div>
            </Card>
          </Col>
        </Row>

        {/* Recent Invoices Table */}
        <Card title="Pēdējie rēķini">
          <Table
            columns={invoiceColumns}
            dataSource={invoiceData}
            pagination={false}
          />
        </Card>
      </Space>
    </DashboardLayout>
  );
};

export default Dashboard;
