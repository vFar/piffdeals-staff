import { useState, useEffect } from 'react';
import { Button, Table, message, Modal, Input, Dropdown, Card, Typography, Spin } from 'antd';
import { PlusOutlined, MoreOutlined, EyeOutlined, LinkOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';

const { Title, Text } = Typography;

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [paymentLinkModal, setPaymentLinkModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { isAdmin, isSuperAdmin, userProfile } = useUserRole();

  useEffect(() => {
    // Only fetch invoices when userProfile is loaded
    if (userProfile) {
      fetchInvoices();
    }
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('invoice-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          if (payload.new.status === 'paid') {
            message.success(`Rēķins ${payload.new.invoice_number} ir apmaksāts!`);
            fetchInvoices();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userProfile]);

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const lowerSearch = searchText.toLowerCase();
    const filtered = invoices.filter((invoice) => {
      const invoiceNumber = (invoice.invoice_number || '').toLowerCase();
      const customerName = (invoice.customer_name || '').toLowerCase();
      const status = (invoice.status || '').toLowerCase();
      
      return invoiceNumber.includes(lowerSearch) || 
             customerName.includes(lowerSearch) || 
             status.includes(lowerSearch);
    });

    setFilteredInvoices(filtered);
  }, [searchText, invoices]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Fetch invoices
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // Employees can only see their own invoices
      if (!isAdmin && !isSuperAdmin) {
        query = query.eq('user_id', userProfile?.id);
      }

      const { data: invoicesData, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;

      // Fetch all unique user profiles for the creators
      const uniqueUserIds = [...new Set(invoicesData?.map(inv => inv.user_id).filter(Boolean))];
      
      let userProfilesMap = {};
      if (uniqueUserIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, username, email')
          .in('id', uniqueUserIds);

        if (!usersError && usersData) {
          usersData.forEach(user => {
            userProfilesMap[user.id] = user;
          });
        }
      }

      // Enrich invoices with creator information
      const enrichedInvoices = invoicesData?.map(invoice => ({
        ...invoice,
        creator: userProfilesMap[invoice.user_id] || null,
      })) || [];

      setInvoices(enrichedInvoices);
      setFilteredInvoices(enrichedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Neizdevās ielādēt rēķinus');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPaymentLink = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentLinkModal(true);
  };

  const copyPaymentLink = () => {
    if (selectedInvoice?.stripe_payment_link) {
      navigator.clipboard.writeText(selectedInvoice.stripe_payment_link);
      message.success('Maksājuma saite nokopēta starpliktuvē!');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      message.success('Rēķins veiksmīgi dzēsts');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Neizdevās dzēst rēķinu');
    }
  };

  const getStatusBadgeStyle = (status) => {
    const statusStyles = {
      draft: {
        background: '#f3f4f6',
        color: '#4b5563',
      },
      sent: {
        background: '#dbeafe',
        color: '#1e40af',
      },
      paid: {
        background: '#dcfce7',
        color: '#166534',
      },
      pending: {
        background: '#fef3c7',
        color: '#92400e',
      },
      overdue: {
        background: '#fee2e2',
        color: '#991b1b',
      },
      cancelled: {
        background: '#f3f4f6',
        color: '#4b5563',
      },
    };
    return statusStyles[status] || statusStyles.draft;
  };

  const columns = [
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Rēķina Nr.</span>,
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      sorter: (a, b) => (a.invoice_number || '').localeCompare(b.invoice_number || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ fontWeight: 500, color: '#111827' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Klients</span>,
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ color: '#111827' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Izveidoja</span>,
      dataIndex: 'creator',
      key: 'creator',
      sorter: (a, b) => (a.creator?.username || '').localeCompare(b.creator?.username || ''),
      sortDirections: ['ascend', 'descend'],
      render: (creator) => <Text style={{ color: '#6b7280' }}>{creator?.username || '-'}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Izsniegšanas datums</span>,
      dataIndex: 'issue_date',
      key: 'issue_date',
      sorter: (a, b) => new Date(a.issue_date) - new Date(b.issue_date),
      sortDirections: ['ascend', 'descend'],
      render: (date) => <Text style={{ color: '#6b7280' }}>{new Date(date).toLocaleDateString('lv-LV')}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Apmaksas termiņš</span>,
      dataIndex: 'due_date',
      key: 'due_date',
      sorter: (a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0),
      sortDirections: ['ascend', 'descend'],
      render: (date) => <Text style={{ color: '#6b7280' }}>{date ? new Date(date).toLocaleDateString('lv-LV') : '-'}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Summa</span>,
      dataIndex: 'total',
      key: 'total',
      sorter: (a, b) => parseFloat(a.total || 0) - parseFloat(b.total || 0),
      sortDirections: ['ascend', 'descend'],
      render: (amount) => <Text style={{ fontWeight: 500, color: '#111827' }}>€{parseFloat(amount).toFixed(2)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Statuss</span>,
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => {
        const statusOrder = { 'paid': 5, 'sent': 4, 'pending': 3, 'draft': 2, 'overdue': 1, 'cancelled': 0 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (status) => {
        const statusConfig = {
          draft: { label: 'Melnraksts' },
          sent: { label: 'Nosūtīts' },
          paid: { label: 'Apmaksāts' },
          pending: { label: 'Gaida' },
          overdue: { label: 'Kavēts' },
          cancelled: { label: 'Atcelts' },
        };
        const config = statusConfig[status] || { label: status };
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
            {config.label}
          </span>
        );
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Darbības</span>,
      key: 'actions',
      render: (_, record) => {
        const menuItems = [];

        if (record.stripe_payment_link && record.status === 'sent') {
          menuItems.push({
            key: 'view-link',
            icon: <LinkOutlined />,
            label: 'Skatīt maksājuma saiti',
            onClick: () => handleViewPaymentLink(record),
          });
        }

        if (record.status === 'draft') {
          menuItems.push({
            key: 'edit',
            icon: <EyeOutlined />,
            label: 'Rediģēt',
            onClick: () => navigate(`/invoices/edit/${record.id}`),
          });
        }

        menuItems.push({
          key: 'view',
          icon: <EyeOutlined />,
          label: 'Skatīt',
          onClick: () => navigate(`/invoices/view/${record.id}`),
        });

        if ((isAdmin || isSuperAdmin) || (record.status === 'draft' && record.user_id === userProfile?.id)) {
          menuItems.push({
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Dzēst',
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Dzēst rēķinu?',
                content: `Vai tiešām vēlaties dzēst rēķinu ${record.invoice_number}?`,
                okText: 'Dzēst',
                okType: 'danger',
                cancelText: 'Atcelt',
                onOk: () => handleDeleteInvoice(record.id),
              });
            },
          });
        }

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
              Rēķini
            </Title>
            <Text style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
              Pārvaldīt un sekot visiem jūsu rēķiniem
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/invoices/create')}
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
            Izveidot rēķinu
          </Button>
        </div>

        {/* Search Bar */}
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
          <Input
            placeholder="Meklēt pēc rēķina numura, klienta vai statusa..."
            prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{
              minWidth: '320px',
              height: '40px',
              borderRadius: '8px',
            }}
          />
        </Card>

        {/* Invoices Table */}
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
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={columns}
                dataSource={filteredInvoices.map((invoice) => ({ ...invoice, key: invoice.id }))}
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
          )}
        </Card>
      </div>

      {/* Payment Link Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Stripe maksājuma saite
          </Title>
        }
        open={paymentLinkModal}
        onCancel={() => setPaymentLinkModal(false)}
        footer={[
          <Button
            key="copy"
            type="primary"
            onClick={copyPaymentLink}
            style={{
              height: '40px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            Kopēt saiti
          </Button>,
          <Button
            key="close"
            onClick={() => setPaymentLinkModal(false)}
            style={{ height: '40px', borderRadius: '8px' }}
          >
            Aizvērt
          </Button>,
        ]}
        centered
        width={600}
        style={{
          borderRadius: '12px',
        }}
      >
        <div style={{ marginTop: '24px' }}>
          <p style={{ fontSize: '14px', color: '#111827', marginBottom: '12px' }}>
            Nosūtiet šo maksājuma saiti savam klientam:
          </p>
          <Input.TextArea
            value={selectedInvoice?.stripe_payment_link || ''}
            readOnly
            rows={3}
            style={{ marginBottom: 16, borderRadius: '8px' }}
          />
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: 0 }}>
            Kad klients veiks maksājumu, rēķina statuss automātiski 
            mainīsies uz "Apmaksāts" un krājumi tiks atjaunināti jūsu Mozello veikalā.
          </p>
        </div>
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

export default Invoices;

