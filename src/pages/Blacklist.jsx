import { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Input, 
  Form, 
  Spin, 
  Empty, 
  Space, 
  Tag, 
  Tooltip,
  App,
  Popconfirm,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  InfoCircleOutlined,
  StopOutlined,
  SearchOutlined,
  WarningOutlined
} from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import Pagination from '../components/Pagination';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { logActivity, ActionTypes, ActionCategories } from '../services/activityLogService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;

const Blacklist = () => {
  const { message } = App.useApp();
  const { currentUser } = useAuth();
  const { userProfile } = useUserRole();
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [form] = Form.useForm();

  // Set document title
  useEffect(() => {
    document.title = 'Melnais saraksts | Piffdeals';
  }, []);

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const fetchBlacklist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_blacklist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlacklist(data || []);
    } catch (error) {
      message.error('Neizdevās ielādēt melno sarakstu');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      customer_name: record.customer_name,
      customer_email: record.customer_email,
      reason: record.reason,
      overdue_count: record.overdue_count,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record) => {
    try {
      const { error } = await supabase
        .from('customer_blacklist')
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      // Log the activity
      try {
        const logResult = await logActivity({
          actionType: ActionTypes.BLACKLIST_DELETED,
          actionCategory: ActionCategories.BLACKLIST_MANAGEMENT,
          description: `Dzēsts klients no melnā saraksta: ${record.customer_name}`,
          details: {
            customer_name: record.customer_name,
            reason: record.reason,
            overdue_count: record.overdue_count,
          },
          targetType: 'blacklist',
          targetId: record.id,
        });
        if (!logResult.success) {
          // Failed to log blacklist deletion
        }
      } catch (logError) {
        // Don't block the operation if logging fails
      }

      message.success('Ieraksts izdzēsts no melnā saraksta');
      fetchBlacklist();
    } catch (error) {
      message.error('Neizdevās izdzēst ierakstu');
    }
  };

  // Bulk delete selected records
  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);

      const { error } = await supabase
        .from('customer_blacklist')
        .delete()
        .in('id', selectedRowKeys);

      if (error) throw error;

      // Log the activity for each deleted record
      const deletedRecords = blacklist.filter((record) => selectedRowKeys.includes(record.id));
      for (const record of deletedRecords) {
        try {
          const logResult = await logActivity({
            actionType: ActionTypes.BLACKLIST_DELETED,
            actionCategory: ActionCategories.BLACKLIST_MANAGEMENT,
            description: `Dzēsts klients no melnā saraksta: ${record.customer_name}${selectedRowKeys.length > 1 ? ` (masveida dzēšana)` : ''}`,
            details: {
              customer_name: record.customer_name,
              reason: record.reason,
              overdue_count: record.overdue_count,
              bulk_action: selectedRowKeys.length > 1,
              total_deleted: selectedRowKeys.length > 1 ? selectedRowKeys.length : undefined,
            },
            targetType: 'blacklist',
            targetId: record.id,
          });
          if (!logResult.success) {
            // Failed to log blacklist deletion
          }
        } catch (logError) {
          // Don't block the operation if logging fails
        }
      }

      message.success(`${selectedRowKeys.length} ieraksti veiksmīgi izdzēsti no melnā saraksta`);
      setSelectedRowKeys([]);
      fetchBlacklist();
    } catch (error) {
      message.error('Neizdevās izdzēst ierakstus');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('customer_blacklist')
          .update({
            customer_name: values.customer_name,
            customer_email: values.customer_email.toLowerCase(),
            reason: values.reason,
            overdue_count: values.overdue_count || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRecord.id);

        if (error) throw error;

        // Log the activity
        try {
          const logResult = await logActivity({
            actionType: ActionTypes.BLACKLIST_UPDATED,
            actionCategory: ActionCategories.BLACKLIST_MANAGEMENT,
            description: `Rediģēts melnā saraksta ieraksts: ${values.customer_name}`,
            details: {
              customer_name: values.customer_name,
              reason: values.reason,
              overdue_count: values.overdue_count || 0,
              old_customer_name: editingRecord.customer_name,
              modified_by: userProfile?.username || 'Nezināms',
            },
            targetType: 'blacklist',
            targetId: editingRecord.id,
          });
          if (!logResult.success) {
            // Failed to log blacklist update
          }
        } catch (logError) {
          // Don't block the operation if logging fails
        }

        message.success('Ieraksts atjaunināts');
      } else {
        // Check if email already exists in blacklist
        const { data: existing } = await supabase
          .from('customer_blacklist')
          .select('id')
          .eq('customer_email', values.customer_email.toLowerCase())
          .maybeSingle();

        if (existing) {
          message.error('Šis e-pasts jau ir melnajā sarakstā');
          return;
        }

        // Create new record
        const { data: newRecord, error } = await supabase
          .from('customer_blacklist')
          .insert({
            customer_name: values.customer_name,
            customer_email: values.customer_email.toLowerCase(),
            reason: values.reason,
            overdue_count: values.overdue_count || 0,
            added_by: currentUser?.id,
          })
          .select('id')
          .single();

        if (error) throw error;

        // Log the activity
        if (newRecord?.id) {
          try {
            const logResult = await logActivity({
              actionType: ActionTypes.BLACKLIST_ADDED,
              actionCategory: ActionCategories.BLACKLIST_MANAGEMENT,
              description: `Pievienots klients melnajam sarakstam: ${values.customer_name}`,
              details: {
                customer_name: values.customer_name,
                reason: values.reason,
                overdue_count: values.overdue_count || 0,
                added_by: userProfile?.username || 'Nezināms',
              },
              targetType: 'blacklist',
              targetId: newRecord.id,
            });
            if (!logResult.success) {
              // Failed to log blacklist addition
            }
          } catch (logError) {
            // Don't block the operation if logging fails
          }
        }

        message.success('Klients pievienots melnajam sarakstam');
      }

      setModalVisible(false);
      form.resetFields();
      fetchBlacklist();
    } catch (error) {
      if (error.errorFields) {
        message.error('Aizpildiet visus obligātos laukus');
        return;
      }
      message.error('Neizdevās saglabāt ierakstu');
    }
  };

  // Filter blacklist based on search text
  const filteredBlacklist = blacklist.filter(record => {
    const searchLower = searchText.toLowerCase();
    return (
      record.customer_name?.toLowerCase().includes(searchLower) ||
      record.customer_email?.toLowerCase().includes(searchLower) ||
      record.reason?.toLowerCase().includes(searchLower)
    );
  });

  // Reset to page 1 when search text changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  const columns = [
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Klienta vārds</span>,
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StopOutlined style={{ color: '#ef4444' }} />
          <Text style={{ fontWeight: 500, color: '#111827' }}>{text}</Text>
        </div>
      ),
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>E-pasts</span>,
      dataIndex: 'customer_email',
      key: 'customer_email',
      sorter: (a, b) => (a.customer_email || '').localeCompare(b.customer_email || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => (
        <Text style={{ color: '#6b7280' }}>{text}</Text>
      ),
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Nokavēti rēķini</span>,
      dataIndex: 'overdue_count',
      key: 'overdue_count',
      width: 140,
      align: 'center',
      sorter: (a, b) => (a.overdue_count || 0) - (b.overdue_count || 0),
      sortDirections: ['ascend', 'descend'],
      render: (count) => (
        <Tag 
          color={count >= 3 ? 'red' : count >= 2 ? 'orange' : 'default'}
          style={{ fontWeight: 600 }}
        >
          {count || 0}
        </Tag>
      ),
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Iemesls</span>,
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text style={{ color: '#4b5563' }}>{text || '-'}</Text>
        </Tooltip>
      ),
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Pievienots</span>,
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      sortDirections: ['ascend', 'descend'],
      render: (date) => (
        <Text style={{ color: '#6b7280' }}>{dayjs(date).format('DD.MM.YYYY')}</Text>
      ),
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Darbības</span>,
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Rediģēt">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#0068FF' }}
            />
          </Tooltip>
          <Popconfirm
            title="Dzēst ierakstu?"
            description="Vai tiešām vēlaties noņemt šo klientu no melnā saraksta?"
            onConfirm={() => handleDelete(record)}
            okText="Dzēst"
            cancelText="Atcelt"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Dzēst">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#111827' }}>
              Melnais saraksts
            </h1>
            <Tooltip 
              title={
                <div style={{ maxWidth: '300px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Klientu melnais saraksts</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    Šeit tiek uzskaitīti klienti, kuriem ir bijuši vairāk nekā 2 nokavēti rēķini vai citi maksājumu problēmas. 
                    Veidojot jaunu rēķinu, sistēma brīdinās, ja klients ir melnajā sarakstā.
                  </div>
                </div>
              }
              placement="right"
            >
              <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
            </Tooltip>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{
              height: 40,
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 8,
            }}
          >
            Pievienot klientu
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
            marginBottom: 24,
          }}
          styles={{ body: { padding: '16px' } }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            {/* Search Input */}
            <Input
              placeholder="Meklēt pēc vārda, e-pasta vai iemesla..."
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
                  <span style={{ fontWeight: 600, color: '#111827' }}>{selectedRowKeys.length}</span> ieraksti izvēlēti
                </Text>
                
                <Popconfirm
                  title="Dzēst izvēlētos ierakstus?"
                  description={`Vai tiešām vēlaties dzēst ${selectedRowKeys.length} ierakstus no melnā saraksta? Šī darbība ir neatgriezeniska.`}
                  onConfirm={handleBulkDelete}
                  okText="Dzēst"
                  cancelText="Atcelt"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={bulkActionLoading}
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

        {/* Blacklist Table */}
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
          <Spin spinning={loading}>
            {filteredBlacklist.length === 0 && !loading ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Empty
                  description={
                    <span style={{ color: '#6b7280', fontSize: 16 }}>
                      {searchText ? 'Nav atrasti rezultāti' : 'Melnais saraksts ir tukšs'}
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <Table
                    dataSource={filteredBlacklist
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((record) => ({ ...record, key: record.id }))}
                    columns={columns}
                    rowKey="id"
                    rowSelection={rowSelection}
                    pagination={false}
                    className="custom-table"
                  />
                </div>
                {filteredBlacklist.length > 0 && (
                  <Pagination
                    current={currentPage}
                    total={filteredBlacklist.length}
                    pageSize={pageSize}
                    pageSizeOptions={['10', '25', '50', '100']}
                    onChange={(page, size) => {
                      setCurrentPage(page);
                      if (size !== pageSize) {
                        setPageSize(size);
                        setCurrentPage(1);
                      }
                    }}
                    onShowSizeChange={(current, size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </Spin>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningOutlined style={{ color: '#F59E0B' }} />
              {editingRecord ? 'Rediģēt ierakstu' : 'Pievienot melnajam sarakstam'}
            </div>
          }
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
          }}
          okText={editingRecord ? 'Saglabāt' : 'Pievienot'}
          cancelText="Atcelt"
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="customer_name"
              label="Klienta vārds"
              rules={[{ required: true, message: 'Ievadiet klienta vārdu' }]}
            >
              <Input placeholder="Piemēram: Jānis Bērziņš" />
            </Form.Item>

            <Form.Item
              name="customer_email"
              label="E-pasta adrese"
              rules={[
                { required: true, message: 'Ievadiet e-pasta adresi' },
                { type: 'email', message: 'Ievadiet derīgu e-pasta adresi' }
              ]}
            >
              <Input placeholder="piemers@epasts.lv" />
            </Form.Item>

            <Form.Item
              name="overdue_count"
              label="Nokavēto rēķinu skaits"
              initialValue={0}
            >
              <Input 
                type="number" 
                min={0} 
                placeholder="0"
              />
            </Form.Item>

            <Form.Item
              name="reason"
              label="Iemesls"
              rules={[{ required: true, message: 'Ievadiet iemeslu' }]}
            >
              <TextArea 
                rows={3} 
                placeholder="Aprakstiet iemeslu, kāpēc klients ir pievienots melnajam sarakstam..."
              />
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
      </div>
    </DashboardLayout>
  );
};

export default Blacklist;



