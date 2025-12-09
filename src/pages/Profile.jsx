import { useState } from 'react';
import { Card, Typography, Form, Input, Button, message, Modal, Space, App, Tooltip } from 'antd';
import { LockOutlined, ExclamationCircleOutlined, UserOutlined, InfoCircleOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logUserAction, ActionTypes } from '../services/activityLogService';

const { Title, Text } = Typography;

const Profile = () => {
  const [passwordForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();

  // Set document title
  useEffect(() => {
    document.title = 'Profils | Piffdeals';
  }, []);

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
        messageApi.error('Nepareiza pašreizējā parole');
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) throw updateError;

      // Log password change
      try {
        await logUserAction(
          ActionTypes.PASSWORD_CHANGED,
          `Mainīta lietotāja parole: ${userProfile.username} (savs konts)`,
          {
            is_own_account: true,
            is_other_user_account: false,
            modified_by: userProfile.username,
            target_user_role: userProfile.role,
            target_user_status: userProfile.status,
          },
          userProfile.id
        );
      } catch (logError) {
        // Log error but don't block password change
        console.error('Error logging password change:', logError);
      }

      messageApi.success('Parole veiksmīgi nomainīta');
      passwordForm.resetFields();
    } catch (error) {
      // Extract and display the actual error message
      let errorMessage = 'Kļūda maiņot paroli';
      const errorMsg = error?.message || '';
      
      if (errorMsg.includes('New password should be different')) {
        errorMessage = 'Jaunajai parolei jābūt atšķirīgai no pašreizējās paroles';
      } else if (errorMsg.includes('Password')) {
        errorMessage = errorMsg;
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }
      
      messageApi.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async (values) => {
    try {
      setDeletingAccount(true);

      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        messageApi.error('Nav derīgas sesijas');
        setDeletingAccount(false);
        return;
      }

      // Log account deletion BEFORE deletion (so we can still access user info)
      // Store user info in case deletion succeeds and we need it for logging
      const userInfoForLogging = {
        id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        role: userProfile.role,
        status: userProfile.status,
      };

      try {
        await logUserAction(
          ActionTypes.USER_DELETED,
          `Dzēsts lietotāja konts: ${userInfoForLogging.username} (savs konts - pašdzēšana)`,
          {
            deleted_user_role: userInfoForLogging.role,
            deleted_user_status: userInfoForLogging.status,
            is_own_account: true,
            is_other_user_account: false,
            deleted_by: userInfoForLogging.username,
            self_deletion: true,
            target_user_role: userInfoForLogging.role,
            target_user_status: userInfoForLogging.status,
          },
          userInfoForLogging.id
        );
      } catch (logError) {
        // Log error but don't block deletion - logging should not prevent account deletion
        console.error('Error logging account deletion:', logError);
      }

      // Call the delete-user edge function to delete the auth user
      // This will cascade delete the user_profile due to ON DELETE CASCADE
      const { data, error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: {
          userId: userProfile.id,
          password: values.password,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deleteError) {
        // Handle specific error messages
        if (deleteError.message?.includes('Invalid password') || deleteError.message?.includes('Nepareiza parole')) {
          messageApi.error('Nepareiza parole');
        } else if (deleteError.message?.includes('Invalid or expired token')) {
          messageApi.error('Sesija beigusies. Lūdzu, piesakieties vēlreiz.');
        } else {
          messageApi.error(deleteError.message || 'Kļūda dzēšot kontu');
        }
        setDeletingAccount(false);
        return;
      }

      if (!data?.success) {
        messageApi.error(data?.error || 'Kļūda dzēšot kontu');
        setDeletingAccount(false);
        return;
      }

      // Sign out user (may fail if user already deleted, but that's okay)
      try {
        await signOut();
      } catch (signOutError) {
        // User is already deleted, so sign out might fail - that's expected
      }

      messageApi.success('Konts veiksmīgi izdzēsts');
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      messageApi.error(error?.message || 'Kļūda dzēšot kontu');
      setDeletingAccount(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
              Profila iestatījumi
            </Title>
            <Tooltip 
              title={
                <div style={{ maxWidth: '300px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Profila iestatījumi</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    Šeit varat mainīt savu paroli. Jaunajai parolei jābūt vismaz 8 simbolu garai un atšķirīgai no pašreizējās. Varat arī dzēst savu kontu - šī darbība ir neatgriezeniska un dzēsīs visus jūsu datus no sistēmas.
                  </div>
                </div>
              }
              placement="right"
            >
              <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
            </Tooltip>
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










