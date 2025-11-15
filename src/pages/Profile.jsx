import { useState } from 'react';
import { Card, Typography, Form, Input, Button, message, Modal, Space } from 'antd';
import { LockOutlined, ExclamationCircleOutlined, UserOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Profile = () => {
  const [passwordForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // Handle password change
  const handlePasswordChange = async (values) => {
    try {
      setChangingPassword(true);

      // Verify current password by trying to sign in with it
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: values.currentPassword,
      });

      if (verifyError) {
        message.error('Nepareiza pašreizējā parole');
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) throw updateError;

      message.success('Parole veiksmīgi nomainīta');
      passwordForm.resetFields();
    } catch (error) {
      console.error('Error changing password:', error);
      message.error('Kļūda maiņot paroli');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async (values) => {
    try {
      setDeletingAccount(true);

      // Verify password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: values.password,
      });

      if (verifyError) {
        message.error('Nepareiza parole');
        setDeletingAccount(false);
        return;
      }

      // Delete user profile from database
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userProfile.id);

      if (deleteError) throw deleteError;

      // Sign out user (this will also trigger cascade delete in auth.users)
      await signOut();

      message.success('Konts veiksmīgi izdzēsts');
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      message.error('Kļūda dzēšot kontu');
      setDeletingAccount(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
            Profila iestatījumi
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: '14px', color: '#6b7280' }}>Dashboard</Text>
            <Text style={{ fontSize: '14px', color: '#6b7280' }}>/</Text>
            <Text style={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>Profils</Text>
          </div>
        </div>

        {/* User Info Card */}
        <Card
          bordered={false}
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2b6cee 0%, #1e4db7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {userProfile?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                {userProfile?.username || 'Lietotājs'}
              </Title>
              <Text style={{ fontSize: '14px', color: '#6b7280' }}>{userProfile?.email}</Text>
            </div>
          </div>
        </Card>

        {/* Change Password Card */}
        <Card
          bordered={false}
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>
            <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              Mainīt paroli
            </Title>
            <Text style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
              Atjauniniet savu paroli uz jaunu
            </Text>
          </div>

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordChange}
            style={{ maxWidth: '500px' }}
          >
            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Pašreizējā parole</span>}
              name="currentPassword"
              rules={[{ required: true, message: 'Lūdzu, ievadiet pašreizējo paroli' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#6b7280' }} />}
                placeholder="Ievadiet pašreizējo paroli"
                style={{ height: '40px', borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Jaunā parole</span>}
              name="newPassword"
              rules={[
                { required: true, message: 'Lūdzu, ievadiet jauno paroli' },
                { min: 8, message: 'Parolei jābūt vismaz 8 simbolu garai' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#6b7280' }} />}
                placeholder="Ievadiet jauno paroli"
                style={{ height: '40px', borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Apstipriniet jauno paroli</span>}
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Lūdzu, apstipriniet jauno paroli' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Paroles nesakrīt'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#6b7280' }} />}
                placeholder="Apstipriniet jauno paroli"
                style={{ height: '40px', borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={changingPassword}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  minWidth: '140px',
                }}
              >
                Atjaunināt paroli
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Danger Zone Card */}
        <Card
          bordered={false}
          style={{
            borderRadius: '12px',
            border: '1px solid #fca5a5',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ borderBottom: '1px solid #fca5a5', paddingBottom: '16px', marginBottom: '24px' }}>
            <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>
              Bīstamā zona
            </Title>
          </div>

          <div>
            <Text strong style={{ fontSize: '14px', color: '#111827', display: 'block', marginBottom: '4px' }}>
              Dzēst manu kontu
            </Text>
            <Text style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '16px' }}>
              Kad izdzēsīsiet savu kontu, atpakaļceļa nebūs. Lūdzu, esiet pārliecināti.
            </Text>
            <Button
              danger
              icon={<ExclamationCircleOutlined />}
              onClick={() => setDeleteModalOpen(true)}
              style={{
                height: '40px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Dzēst manu kontu
            </Button>
          </div>
        </Card>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '20px', color: '#dc2626' }} />
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              Apstipriniet konta dzēšanu
            </span>
          </div>
        }
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          deleteForm.resetFields();
        }}
        footer={null}
        centered
        width={500}
      >
        <div style={{ marginTop: '16px' }}>
          <Text style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '24px' }}>
            Šī darbība ir <strong>neatgriezeniska</strong>. Visi jūsu dati tiks dzēsti no sistēmas. 
            Lai turpinātu, lūdzu, ievadiet savu paroli.
          </Text>

          <Form
            form={deleteForm}
            layout="vertical"
            onFinish={handleDeleteAccount}
          >
            <Form.Item
              label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Parole</span>}
              name="password"
              rules={[{ required: true, message: 'Lūdzu, ievadiet paroli lai apstiprinātu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#6b7280' }} />}
                placeholder="Ievadiet savu paroli"
                style={{ height: '40px', borderRadius: '8px' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    deleteForm.resetFields();
                  }}
                  style={{ height: '40px', borderRadius: '8px' }}
                >
                  Atcelt
                </Button>
                <Button
                  danger
                  type="primary"
                  htmlType="submit"
                  loading={deletingAccount}
                  style={{
                    height: '40px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Dzēst kontu
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Profile;



