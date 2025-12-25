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
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;

const Blacklist = () => {
  const { message } = App.useApp();
  const { currentUser } = useAuth();
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchText, setSearchText] = useState('');
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
      console.error('Error fetching blacklist:', error);
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

      message.success('Ieraksts izdzēsts no melnā saraksta');
      fetchBlacklist();
    } catch (error) {
      console.error('Error deleting blacklist record:', error);
      message.error('Neizdevās izdzēst ierakstu');
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
        const { error } = await supabase
          .from('customer_blacklist')
          .insert({
            customer_name: values.customer_name,
            customer_email: values.customer_email.toLowerCase(),
            reason: values.reason,
            overdue_count: values.overdue_count || 0,
            added_by: currentUser?.id,
          });

        if (error) throw error;
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
      console.error('Error saving blacklist record:', error);
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

  const columns = [
    {
      title: 'Klienta vārds',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StopOutlined style={{ color: '#ef4444' }} />
          <Text strong>{text}</Text>
        </div>
      ),
    },
    {
      title: 'E-pasts',
      dataIndex: 'customer_email',
      key: 'customer_email',
      render: (text) => (
        <Text style={{ color: '#6b7280' }}>{text}</Text>
      ),
    },
    {
      title: 'Nokavēti rēķini',
      dataIndex: 'overdue_count',
      key: 'overdue_count',
      width: 140,
      align: 'center',
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
      title: 'Iemesls',
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
      title: 'Pievienots',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => (
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          {dayjs(date).format('DD.MM.YYYY')}
        </Text>
      ),
    },
    {
      title: 'Darbības',
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

        <Card style={{ borderRadius: 12, marginBottom: 24 }}>
          {/* Search Bar */}
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="Meklēt pēc vārda, e-pasta vai iemesla..."
              prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{
                maxWidth: 400,
                borderRadius: 8,
              }}
            />
          </div>

          <Spin spinning={loading}>
            {filteredBlacklist.length === 0 && !loading ? (
              <Empty
                description={
                  <span style={{ color: '#6b7280', fontSize: 16 }}>
                    {searchText ? 'Nav atrasti rezultāti' : 'Melnais saraksts ir tukšs'}
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                dataSource={filteredBlacklist}
                columns={columns}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} no ${total}`,
                }}
                style={{ marginTop: 8 }}
              />
            )}
          </Spin>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningOutlined style={{ color: '#ef4444' }} />
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
                style={{ width: 120 }}
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
      </div>
    </DashboardLayout>
  );
};

export default Blacklist;


