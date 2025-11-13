import { useMemo } from 'react';
import { Card, Row, Col, Table, Typography, Breadcrumb } from 'antd';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { userProfile, currentUser, loading } = useAuth();
  
  // Get username with fallback - memoized to prevent flickering
  const userName = useMemo(() => {
    if (loading) return ''; // Don't show anything while loading
    return userProfile?.username || currentUser?.email?.split('@')[0] || 'User';
  }, [userProfile?.username, currentUser?.email, loading]);
  const invoiceColumns = [
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Rēķina ID</span>,
      dataIndex: 'id',
      key: 'id',
      render: (text) => (
        <Text style={{ fontWeight: 500, color: '#111827' }}>#{text}</Text>
      ),
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Klients</span>,
      dataIndex: 'customer',
      key: 'customer',
      render: (text) => <Text style={{ color: '#6b7280' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Datums</span>,
      dataIndex: 'date',
      key: 'date',
      render: (text) => <Text style={{ color: '#6b7280' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Kopā</span>,
      dataIndex: 'total',
      key: 'total',
      render: (text) => <Text style={{ color: '#6b7280' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Statuss</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusStyles = {
          Paid: { background: '#dcfce7', color: '#166534', text: 'Apmaksāts' },
          Pending: { background: '#fef3c7', color: '#92400e', text: 'Gaida' },
          Overdue: { background: '#fee2e2', color: '#991b1b', text: 'Nokavēts' },
        };
        const style = statusStyles[status];
        return (
          <span
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 500,
              background: style.background,
              color: style.color,
              borderRadius: '9999px',
              display: 'inline-block',
            }}
          >
            {style.text}
          </span>
        );
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Breadcrumb */}
        <Breadcrumb
          separator={<span style={{ color: '#6b7280', fontSize: '16px', fontWeight: 500 }}>/</span>}
          items={[
            {
              title: <a href="#" style={{ color: '#6b7280', fontSize: '16px', fontWeight: 500, textDecoration: 'none' }}>Sākums</a>,
            },
            {
              title: <span style={{ color: '#111827', fontSize: '16px', fontWeight: 500 }}>Informācijas panelis</span>,
            },
          ]}
        />

        {/* Page Header */}
        <div>
          <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
            Informācijas panelis
          </Title>
          <Text style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
            {userName ? `Laipni lūdzam atpakaļ, ${userName}!` : 'Laipni lūdzam atpakaļ!'}
          </Text>
        </div>

        {/* Stats Cards */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={true}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Kopēji ikmēneša ienākumi</Text>
                <Text style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>€12,450</Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#22c55e' }}>+5.2%</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={true}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Aktīvie rēķini</Text>
                <Text style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>24</Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#22c55e' }}>+12.0%</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={true}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Izveidotie rēķini</Text>
                <Text style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>215</Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#ef4444' }}>-1.5%</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={true}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Neapmaksātie rēķini</Text>
                <Text style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>32</Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#22c55e' }}>+8.3%</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Charts Section */}
        <Row gutter={[32, 32]}>
          <Col xs={24} xl={16}>
            <Card
              title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Pārdošana laika gaitā</span>}
              bordered={true}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div
                style={{
                  height: '320px',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  color: '#9ca3af',
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              >
                Pagaidām nav datu...
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card
              title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Jaunu lietotāju reģistrācijas</span>}
              bordered={true}
              style={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <div
                style={{
                  height: '320px',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  color: '#9ca3af',
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              >
                Pagaidām nav datu...
              </div>
            </Card>
          </Col>
        </Row>

        {/* Recent Invoices Table */}
        <Card
          title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Pēdējie rēķini</span>}
          bordered={true}
          style={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            columns={invoiceColumns}
            dataSource={invoiceData}
            pagination={false}
            className="custom-table"
          />
        </Card>
      </div>

      {/* Custom Table Styles */}
      <style>{`
        .custom-table .ant-table {
          font-size: 14px;
        }

        .custom-table .ant-table-thead > tr > th {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px;
        }

        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 24px;
        }

        .custom-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        .custom-table .ant-table-tbody > tr {
          background: #ffffff;
        }

        .custom-table .ant-table-tbody > tr:hover > td {
          background: #ffffff;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Dashboard;


