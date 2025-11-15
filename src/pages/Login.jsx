import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Card, App } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { signIn, currentUser } = useAuth();
  const { message } = App.useApp();

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      form.setFieldsValue({
        email: rememberedEmail,
        remember: true
      });
    }
  }, [form]);

  // Navigate to dashboard when user is authenticated
  useEffect(() => {
    if (currentUser) {
      console.log('User authenticated, navigating to dashboard');
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      console.log('Attempting login...');
      
      // Handle remember me functionality
      if (values.remember) {
        localStorage.setItem('rememberedEmail', values.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Use Promise.race to add a timeout fallback
      const signInPromise = signIn(values.email, values.password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), 5000)
      );
      
      try {
        await Promise.race([signInPromise, timeoutPromise]);
        console.log('SignIn completed');
      } catch (raceError) {
        // If timeout, check if we're actually authenticated
        if (raceError.message === 'Login timeout') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('Login succeeded despite timeout, user:', session.user.id);
            message.success('Veiksmīgi pieslēdzies!');
            return; // Let useEffect handle navigation
          }
        }
        throw raceError;
      }
      
      message.success('Veiksmīgi pieslēdzies!');
      // Navigation will happen via useEffect when currentUser is set
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      
      let errorMessage = 'Nepareizs e-pasts vai parole!';
      const errorMsg = error?.message || '';
      const errorCode = error?.status || error?.code || '';
      
      // Check for account blocked/suspended status
      // Try to check user profile even on failed login
      try {
        // Try to find user by email in user_profiles
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('status, email')
          .eq('email', values.email)
          .maybeSingle();
        
        if (profileData) {
          if (profileData.status === 'suspended') {
            errorMessage = 'Konts bloķēts';
            message.error(errorMessage);
            setLoading(false);
            return;
          } else if (profileData.status === 'inactive') {
            errorMessage = 'Konts nav aktīvs, sazinies ar priekšniecību';
            message.error(errorMessage);
            setLoading(false);
            return;
          }
        }
      } catch (profileError) {
        // Silently fail profile check - not critical
        console.warn('Could not check user profile:', profileError);
      }
      
      // Handle Supabase authentication errors
      if (errorMsg === 'Invalid login credentials' || errorMsg.includes('Invalid login credentials')) {
        errorMessage = 'Nepareizs e-pasts vai parole!';
      } else if (errorCode === 429 || errorMsg.includes('too_many_requests') || errorMsg.includes('Too many requests')) {
        errorMessage = 'Pārāk daudz mēģinājumu. Lūdzu, mēģiniet vēlāk!';
      } else if (errorMsg.includes('email_not_confirmed') || errorMsg.includes('Email not confirmed')) {
        errorMessage = 'Lūdzu, apstipriniet savu e-pastu';
      } else if (errorMsg.includes('User is banned') || errorMsg.includes('banned')) {
        errorMessage = 'Konts bloķēts. Sazinies ar priekšniecību!';
      } else if (errorMsg.includes('Email') && !errorMsg.includes('Invalid')) {
        errorMessage = 'Nepareizs e-pasta formāts';
      } else if (errorMsg.includes('network') || errorMsg.includes('Network')) {
        errorMessage = 'Tīkla kļūda. Lūdzu, pārbaudiet interneta savienojumu!';
      }
      
      // Always show error message
      message.error(errorMessage, 5);
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
            STAFF
          </h1>
        </div>

        {/* Login Form */}
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet e-pastu!' },
              { type: 'email', message: 'Lūdzu, ievadiet derīgu e-pastu!' }
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input 
              placeholder="Ievadiet lietotājvārdu vai e-pastu"
              style={{
                height: '44px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px'
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Lūdzu, ievadiet paroli!' }]}
            style={{ marginBottom: '16px' }}
          >
            <Input.Password 
              placeholder="Ievadiet paroli"
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
            name="remember"
            valuePropName="checked"
            style={{ marginBottom: '24px' }}
          >
            <Checkbox style={{ fontSize: '14px', color: '#6b7280' }}>
              Atcerēties mani
            </Checkbox>
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
              Pieslēgties
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
          Ir problēmas?{' '}
          <a 
            href="#" 
            style={{ 
              color: '#0068FF',
              textDecoration: 'none'
            }}
            onClick={(e) => {
              e.preventDefault();
              message.info('Lūdzu, sazinieties ar priekšniecību');
            }}
          >
            Paziņo priekšniekam
          </a>
        </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;

