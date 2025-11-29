import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Empty, Spin, Modal, Input, message, Space, Tooltip, Typography } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { TextArea } = Input;

const InvoiceTemplates = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editFormData, setEditFormData] = useState({ template_name: '', notes: '' });

  useEffect(() => {
    fetchTemplates();
  }, [currentUser]);

  const fetchTemplates = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      message.error('Neizdevās ielādēt paraugus');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template) => {
    // Navigate to create invoice with template data
    navigate('/invoices/create', { 
      state: { 
        template: {
          clientName: template.customer_name,
          clientEmail: template.customer_email,
          clientPhone: template.customer_phone,
          clientAddress: template.customer_address,
          notes: template.notes
        }
      } 
    });
  };

  const handleDeleteClick = (template) => {
    setTemplateToDelete(template);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from('invoice_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;

      message.success('Paraugs izdzēsts');
      setDeleteModalVisible(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      message.error('Neizdevās izdzēst paraugu');
    }
  };

  const handleEditClick = (template) => {
    setEditingTemplate(template);
    setEditFormData({
      template_name: template.template_name,
      notes: template.notes || ''
    });
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('invoice_templates')
        .update({
          template_name: editFormData.template_name,
          notes: editFormData.notes
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      message.success('Paraugs atjaunināts');
      setEditModalVisible(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      message.error('Neizdevās atjaunināt paraugu');
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#111827' }}>
              Mani paraugi
            </h1>
            <Tooltip 
              title={
                <div style={{ maxWidth: '300px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Rēķinu paraugi</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    Saglabājiet bieži izmantoto klientu datus kā paraugus, lai ātri izveidotu jaunus rēķinus. Paraugos tiek saglabāti tikai klienta dati (vārds, e-pasts, telefons, adrese) un piezīmes. Produkti netiek saglabāti - tos būs jāpievieno katru reizi.
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
            onClick={() => navigate('/invoices/create')}
            style={{
              height: 40,
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 8,
            }}
          >
            Izveidot jaunu rēķinu
          </Button>
        </div>

        <Spin spinning={loading}>
          {templates.length === 0 ? (
            <Card style={{ borderRadius: 12, textAlign: 'center', padding: '48px 24px' }}>
              <Empty
                description={
                  <span style={{ color: '#6b7280', fontSize: 16 }}>
                    Jums vēl nav izveidoti paraugi
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/invoices/create')}
                  style={{ marginTop: 16 }}
                >
                  Izveidot pirmo rēķinu
                </Button>
              </Empty>
            </Card>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: 24 
            }}>
              {templates.map((template) => (
                <Card
                  key={template.id}
                  hoverable
                  style={{ 
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  bodyStyle={{ padding: 20 }}
                  onClick={() => handleUseTemplate(template)}
                  actions={[
                    <Button
                      key="edit"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(template);
                      }}
                      style={{ color: '#0068FF' }}
                    >
                      Rediģēt
                    </Button>,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(template);
                      }}
                    >
                      Dzēst
                    </Button>,
                  ]}
                >
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ 
                      fontSize: 18, 
                      fontWeight: 600, 
                      color: '#111827', 
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <FileTextOutlined style={{ color: '#0068FF' }} />
                      {template.template_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Izveidots: {dayjs(template.created_at).format('DD.MM.YYYY')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      <span style={{ color: '#6b7280', minWidth: 60 }}>Vārds:</span>
                      <span style={{ color: '#111827', fontWeight: 500 }}>{template.customer_name}</span>
                    </div>
                    
                    {template.customer_email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                        <MailOutlined style={{ color: '#6b7280', minWidth: 20 }} />
                        <span style={{ color: '#111827' }}>{template.customer_email}</span>
                      </div>
                    )}
                    
                    {template.customer_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                        <PhoneOutlined style={{ color: '#6b7280', minWidth: 20 }} />
                        <span style={{ color: '#111827' }}>{template.customer_phone}</span>
                      </div>
                    )}
                    
                    {template.customer_address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                        <HomeOutlined style={{ color: '#6b7280', minWidth: 20, marginTop: 2 }} />
                        <span style={{ color: '#111827' }}>{template.customer_address}</span>
                      </div>
                    )}
                  </div>

                  {template.notes && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 12, 
                      background: '#f9fafb', 
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#4b5563'
                    }}>
                      {template.notes}
                    </div>
                  )}

                  <div style={{ 
                    marginTop: 16, 
                    paddingTop: 16, 
                    borderTop: '1px solid #e5e7eb' 
                  }}>
                    <Button
                      type="primary"
                      block
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template);
                      }}
                      style={{
                        height: 36,
                        fontWeight: 600,
                        fontSize: 14,
                        borderRadius: 8,
                      }}
                    >
                      Izmantot paraugu
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Spin>

        {/* Delete Confirmation Modal */}
        <Modal
          title="Dzēst paraugu"
          open={deleteModalVisible}
          onOk={handleDeleteConfirm}
          onCancel={() => {
            setDeleteModalVisible(false);
            setTemplateToDelete(null);
          }}
          okText="Dzēst"
          cancelText="Atcelt"
          okButtonProps={{ danger: true }}
        >
          <p>Vai tiešām vēlaties dzēst paraugu "{templateToDelete?.template_name}"?</p>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Šo darbību nevar atsaukt.</p>
        </Modal>

        {/* Edit Modal */}
        <Modal
          title="Rediģēt paraugu"
          open={editModalVisible}
          onOk={handleEditSave}
          onCancel={() => {
            setEditModalVisible(false);
            setEditingTemplate(null);
          }}
          okText="Saglabāt"
          cancelText="Atcelt"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#111827' }}>
                Parauga nosaukums *
              </label>
              <Input
                value={editFormData.template_name}
                onChange={(e) => setEditFormData({ ...editFormData, template_name: e.target.value })}
                placeholder="Ievadiet parauga nosaukumu"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#111827' }}>
                Piezīmes
              </label>
              <TextArea
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Pievienojiet piezīmes..."
                rows={4}
              />
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceTemplates;

