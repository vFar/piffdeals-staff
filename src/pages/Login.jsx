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
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Load remembered email on mount and check block status
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      form.setFieldsValue({
        email: rememberedEmail,
        remember: true
      });
      checkBlockedStatus(rememberedEmail);
    }
  }, [form]);

  // Check if email is blocked
  const checkBlockedStatus = async (email) => {
    if (!email) return;
    
    try {
      const { data: isBlockedCheck, error: blockError } = await supabase.rpc('is_email_blocked', {
        check_email: email.toLowerCase()
      });
      
      if (blockError) {
        console.error('Error checking block status:', blockError);
        return;
      }
      
      if (isBlockedCheck) {
        // Get blocked until time
        const { data: blockedUntilData, error: blockedError } = await supabase.rpc('get_blocked_until', {
          check_email: email.toLowerCase()
        });
        
        if (!blockedError && blockedUntilData) {
          const blockedDate = new Date(blockedUntilData);
          setIsBlocked(true);
          setBlockedUntil(blockedDate);
          updateTimeRemaining(blockedDate);
        }
      } else {
        setIsBlocked(false);
        setBlockedUntil(null);
        setTimeRemaining(null);
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  // Update time remaining
  const updateTimeRemaining = (blockedDate) => {
    const now = new Date();
    const diff = blockedDate - now;
    if (diff <= 0) {
      setIsBlocked(false);
      setBlockedUntil(null);
      setTimeRemaining(null);
      return null;
    }
    const minutes = Math.ceil(diff / 60000);
    setTimeRemaining(minutes);
    return minutes;
  };

  // Monitor email input changes to check block status
  const handleEmailChange = (e) => {
    const email = e.target.value;
    if (email) {
      checkBlockedStatus(email);
    } else {
      setIsBlocked(false);
      setBlockedUntil(null);
      setTimeRemaining(null);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (!isBlocked || !blockedUntil) return;
    
    const interval = setInterval(() => {
      const remaining = updateTimeRemaining(blockedUntil);
      if (remaining === null) {
        // Unblocked, check status again
        const email = form.getFieldValue('email');
        if (email) {
          checkBlockedStatus(email);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isBlocked, blockedUntil]);

  // Navigate to dashboard when user is authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const onFinish = async (values) => {
    const email = values.email.toLowerCase();
    
    // Check if blocked before attempting login
    try {
      const { data: isBlockedCheck, error: blockError } = await supabase.rpc('is_email_blocked', {
        check_email: email
      });
      
      if (blockError) {
        console.error('Error checking block status:', blockError);
      } else if (isBlockedCheck) {
        // Get blocked until time for display
        const { data: blockedUntilData, error: blockedError } = await supabase.rpc('get_blocked_until', {
          check_email: email
        });
        
        if (!blockedError && blockedUntilData) {
          const blockedDate = new Date(blockedUntilData);
          const minutesLeft = Math.ceil((blockedDate - new Date()) / 60000);
          message.error(`Bloķēts, mēģiniet vēlāk pēc ${minutesLeft} minūtēm!`, 10);
          setIsBlocked(true);
          setBlockedUntil(blockedDate);
          setTimeRemaining(minutesLeft);
          return;
        } else {
          message.error('Bloķēts, mēģiniet vēlāk pēc 15 minūtēm!', 10);
          setIsBlocked(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    }

    setLoading(true);
    try {
      // Handle remember me functionality
      if (values.remember) {
        localStorage.setItem('rememberedEmail', values.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Check user status BEFORE attempting login
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('status, email')
          .eq('email', values.email.toLowerCase())
          .maybeSingle();
        
        if (profileData) {
          if (profileData.status === 'suspended') {
            message.error('Konts bloķēts. Sazinies ar priekšniecību!');
            setLoading(false);
            return;
          } else if (profileData.status === 'inactive') {
            message.error('Konts nav aktīvs. Sazinies ar priekšniecību!');
            setLoading(false);
            return;
          }
        }
      } catch (profileError) {
        // If we can't check profile, continue with login attempt
        // The ProtectedRoute will catch inactive users after login
      }
      
      // Use Promise.race to add a timeout fallback
      const signInPromise = signIn(values.email, values.password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), 5000)
      );
      
      try {
        await Promise.race([signInPromise, timeoutPromise]);
        
        // Clear login attempts on successful login
        try {
          await supabase.rpc('clear_login_attempts', {
            check_email: email
          });
          setIsBlocked(false);
          setBlockedUntil(null);
          setTimeRemaining(null);
        } catch (clearError) {
          // Non-critical error
          console.error('Error clearing login attempts:', clearError);
        }
        
        // After successful login, verify user status and sign out if inactive/suspended
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('status')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (profileData) {
            if (profileData.status === 'suspended' || profileData.status === 'inactive') {
              // Sign out immediately if account is not active
              await supabase.auth.signOut();
              const statusMsg = profileData.status === 'suspended' 
                ? 'Konts bloķēts. Sazinies ar priekšniecību!'
                : 'Konts nav aktīvs. Sazinies ar priekšniecību!';
              message.error(statusMsg);
              setLoading(false);
              return;
            }
          }
        }
      } catch (raceError) {
        // If timeout, check if we're actually authenticated
        if (raceError.message === 'Login timeout') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Clear attempts on successful login (even if timeout)
            try {
              await supabase.rpc('clear_login_attempts', {
                check_email: email
              });
              setIsBlocked(false);
              setBlockedUntil(null);
              setTimeRemaining(null);
            } catch (clearError) {
              console.error('Error clearing login attempts:', clearError);
            }
            
            // Verify status even on timeout
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('status')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (profileData && (profileData.status === 'suspended' || profileData.status === 'inactive')) {
              await supabase.auth.signOut();
              const statusMsg = profileData.status === 'suspended' 
                ? 'Konts bloķēts. Sazinies ar priekšniecību!'
                : 'Konts nav aktīvs. Sazinies ar priekšniecību!';
              message.error(statusMsg);
              setLoading(false);
              return;
            }
            
            message.success('Veiksmīgi pieslēdzies!');
            return; // Let useEffect handle navigation
          }
        }
        throw raceError;
      }
      
      message.success('Veiksmīgi pieslēdzies!');
      // Navigation will happen via useEffect when currentUser is set
    } catch (error) {
      setLoading(false);
      
      // Record failed login attempt
      try {
        const { data: attemptData, error: attemptError } = await supabase.rpc('record_failed_login', {
          check_email: email
        });
        
        if (!attemptError && attemptData) {
          const attempts = attemptData.attempt_count || 0;
          const isBlockedNow = attemptData.is_blocked || false;
          
          if (isBlockedNow && attemptData.blocked_until) {
            const blockedDate = new Date(attemptData.blocked_until);
            setIsBlocked(true);
            setBlockedUntil(blockedDate);
            const minutesLeft = Math.ceil((blockedDate - new Date()) / 60000);
            message.error(`Bloķēts, mēģiniet vēlāk pēc ${minutesLeft} minūtēm!`, 10);
            return;
          }
        }
      } catch (recordError) {
        console.error('Error recording failed login:', recordError);
      }
      
      let errorMessage = 'Nepareizs e-pasts vai parole!';
      const errorMsg = error?.message || '';
      const errorCode = error?.status || error?.code || '';
      
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

        {/* Blocked Warning */}
        {isBlocked && timeRemaining !== null && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#fff2e8',
            border: '1px solid #ffbb96',
            borderRadius: '8px',
            color: '#d4380d',
            fontSize: '14px',
            textAlign: 'center',
            fontWeight: 500
          }}>
            Bloķēts, mēģiniet vēlāk pēc {timeRemaining} minūtēm!
          </div>
        )}

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
              onChange={handleEmailChange}
              disabled={isBlocked}
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
              disabled={isBlocked}
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
              disabled={isBlocked}
              block
              style={{
                height: '44px',
                borderRadius: '8px',
                background: isBlocked ? '#d9d9d9' : '#0068FF',
                borderColor: isBlocked ? '#d9d9d9' : '#0068FF',
                fontWeight: 600,
                fontSize: '15px',
                cursor: isBlocked ? 'not-allowed' : 'pointer'
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

