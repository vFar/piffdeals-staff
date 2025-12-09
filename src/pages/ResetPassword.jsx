import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Card, App, message } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePassword } = useAuth();
  const { message: messageApi } = App.useApp();

  // Get token and type from URL (check both query params and hash)
  const token = searchParams.get('token') || 
    (window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('access_token') : null) ||
    (window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('token') : null);
  
  const tokenType = searchParams.get('type') || 'recovery';

  // Set document title
  useEffect(() => {
    document.title = 'Atjaunot paroli | Piffdeals';
  }, []);

  // Security: Only allow access if user has a valid reset token
  // If user is already logged in without a token, redirect them away
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If there's no token in the URL
      if (!token) {
        // If user is already logged in (has an existing session), redirect them
        // This prevents logged-in users from accessing the reset password page
        if (session) {
          navigate('/dashboard', { replace: true });
          return;
        }
        // If no session and no token, redirect to login
        navigate('/login', { replace: true });
      }
      // If there's a token, allow access (even if user has a session, 
      // they might be using a reset link which will sign them out first)
    };
    
    checkAccess();
  }, [token, navigate]);

  const onFinish = async (values) => {
    if (values.password !== values.confirmPassword) {
      messageApi.error('Paroles nesakrīt!');
      return;
    }

    setLoading(true);
    try {
      // CRITICAL: Sign out any existing session first to prevent updating wrong user's password
      await supabase.auth.signOut();
      
      if (!token) {
        throw new Error('Nav derīga paroles maiņas saite vai tā ir beigusies');
      }

      // Exchange the token for a session - this will authenticate the CORRECT user (the one the token is for)
      // CRITICAL: This token was generated for the specific user (userEmail) in the edge function
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: tokenType || 'recovery',
      });

      if (verifyError) {
        // If verifyOtp fails, try alternative method
        // Sometimes Supabase processes the token via URL hash automatically
        const { data: { session: autoSession } } = await supabase.auth.getSession();
        if (!autoSession) {
          throw new Error('Nav derīga paroles maiņas saite vai tā ir beigusies');
        }
      }

      // Verify we have a session now for the CORRECT user
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (!finalSession || !finalSession.user) {
        throw new Error('Nav derīga paroles maiņas saite vai tā ir beigusies');
      }

      // Update password for the authenticated user (the one from the token, not any previous session)
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (updateError) {
        throw updateError;
      }

      // Sign out after password change to force re-login
      await supabase.auth.signOut();

      messageApi.success('Parole veiksmīgi nomainīta! Lūdzu, pieslēdzieties ar jauno paroli.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      let errorMessage = 'Kļūda mainot paroli!';
      
      const errorMsg = error?.message || '';
      if (errorMsg.includes('invalid') || errorMsg.includes('expired') || errorMsg.includes('Nav derīga')) {
        errorMessage = 'Nav derīga paroles maiņas saite vai tā ir beigusies';
      } else if (errorMsg.includes('weak')) {
        errorMessage = 'Parole ir pārāk vāja. Lūdzu, izmantojiet stiprāku paroli';
      } else if (errorMsg.includes('New password should be different') || errorMsg.includes('should be different')) {
        errorMessage = 'Jaunajai parolei jābūt atšķirīgai no pašreizējās paroles';
      }
      
      messageApi.error(errorMessage, 5);
    } finally {
      setLoading(false);
    }
  };

  const svgPattern = "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230068FF' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '20px',
      backgroundColor: '#E3EFFF',
      backgroundImage: `url("${svgPattern}")`
    }}>
      {/* Gradient overlay for fade effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(to bottom, #EBF3FF 0%, rgba(235, 243, 255, 0.3) 60%, rgba(235, 243, 255, 0) 100%)',
        pointerEvents: 'none'
      }} />
      
      {/* Content wrapper */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '450px' }}>
        <Card
          variant="borderless"
          style={{
            width: '100%',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
          styles={{
            body: {
              padding: '48px 40px'
            }
          }}
        >
        {/* Logo */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: '#0068FF',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <img 
              src="/images/S-3.png" 
              alt="Logo" 
              style={{ width: '60px', height: '60px' }}
            />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#111827',
            margin: 0
          }}>
            Mainīt paroli
          </h1>
        </div>

        {/* Reset Password Form */}
        <Form
          form={form}
          name="resetPassword"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet jauno paroli!' },
              { min: 6, message: 'Parolei jābūt vismaz 6 simbolu garai!' }
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input.Password 
              placeholder="Ievadiet jauno paroli"
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              style={{
                height: '44px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px'
              }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Lūdzu, apstipriniet paroli!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Paroles nesakrīt!'));
                },
              }),
            ]}
            style={{ marginBottom: '24px' }}
          >
            <Input.Password 
              placeholder="Apstipriniet paroli"
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              style={{
                height: '44px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px'
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              style={{
                height: '44px',
                borderRadius: '8px',
                background: '#0068FF',
                borderColor: '#0068FF',
                fontWeight: 600,
                fontSize: '15px'
              }}
            >
              Mainīt paroli
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#9ca3af'
        }}>
          Atceraties paroli?{' '}
          <a 
            href="/login" 
            style={{ 
              color: '#0068FF',
              textDecoration: 'none'
            }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}
          >
            Pieslēgties
          </a>
        </div>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

