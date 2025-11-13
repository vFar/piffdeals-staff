import { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Card, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser } from '../services/userService';
import { USER_STATUS } from '../types/user';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { currentUser, loading: authLoading } = useAuth();

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && currentUser) {
            navigate('/dashboard', { replace: true });
        }
    }, [currentUser, authLoading, navigate]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Step 1: Authenticate with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            // Step 2: Check user status in Firestore (silently)
            try {
                const userProfile = await getUser(user.uid);
                
                if (userProfile) {
                    // User document exists - check status
                    if (userProfile.status !== USER_STATUS.ACTIVE) {
                        // User is not active - sign out silently and show generic error
                        await signOut(auth);
                        message.error('Nepareiza parole un/vai e-pasts');
                        setLoading(false);
                        return;
                    }
                    
                    // User is active - proceed with login
                    message.success({
                        content: 'Uzgaidiet...',
                        icon: <CheckCircleOutlined style={{ color: '#0068FF' }} />,
                        duration: 1.5,
                    });
                    navigate('/dashboard');
                } else {
                    // User document doesn't exist in Firestore
                    // Allow login with temporary profile (employee role)
                    // Admin should create proper Firestore document
                    message.success({
                        content: 'Uzgaidiet...',
                        icon: <CheckCircleOutlined style={{ color: '#0068FF' }} />,
                        duration: 1.5,
                    });
                    navigate('/dashboard');
                }
            } catch (firestoreError) {
                // Firestore error (might be blocked or offline)
                // Check if it's a connection issue
                const isConnectionError = firestoreError.code === 'unavailable' || 
                                         firestoreError.message?.includes('offline') || 
                                         firestoreError.message?.includes('Failed to get document') ||
                                         firestoreError.message?.includes('network') ||
                                         firestoreError.message?.includes('ERR_BLOCKED_BY_CLIENT');
                
                if (isConnectionError) {
                    // Firestore is blocked/offline - allow login with temporary profile
                    console.warn('Firestore connection issue. Allowing login with temporary profile.');
                    message.success({
                        content: 'Uzgaidiet...',
                        icon: <CheckCircleOutlined style={{ color: '#0068FF' }} />,
                        duration: 1.5,
                    });
                    navigate('/dashboard');
                } else {
                    // Other Firestore error - sign out and show generic error
                    await signOut(auth);
                    message.error('Nepareiza parole un/vai e-pasts');
                    setLoading(false);
                }
            }
        } catch (error) {
            // Firebase Auth errors - show generic error for all cases
            // Don't reveal specific error details for security
            message.error('Nepareiza parole un/vai e-pasts');
            setLoading(false);
        }
    };

    // Show loading while checking auth state
    if (authLoading) {
        return null;
    }

    // Don't render login form if already authenticated (will redirect)
    if (currentUser) {
        return null;
    }

    return (
        <div className="login-page-container">
            <div className="login-content-wrapper">
                <div className="login-main-content">

                {/* Login Card */}
                <Card className="login-card">
                        {/* Logo and Title */}
                    <div className="login-header">
                        <div className="login-logo-container">
                            <img
                                src="/images/S-3.png"
                                alt="Piffdeals Logo"
                                className="login-logo-image"
                            />
                        </div>
                    </div>
                        <div className="login-card-header">
                            <h1 className="login-title">STAFF </h1>
                        </div>

                        <Form
                            name="login"
                            onFinish={onFinish}
                            autoComplete="off"
                            layout="vertical"
                            className="login-form"
                            initialValues={{ remember: false }}
                        >
                            <Form.Item
                                name="email"
                                rules={[
                                    { required: true, message: 'Lūdzu, ievadiet e-pastu!' },
                                    { type: 'email', message: 'Lūdzu, ievadiet derīgu e-pasta adresi!' }
                                ]}
                                className="login-form-item"
                            >
                                <Input
                                    placeholder="Ievadiet lietotājvārdu vai e-pastu"
                                    className="login-input"
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                rules={[{ required: true, message: 'Lūdzu, ievadiet paroli!' }]}
                                className="login-form-item"
                            >
                                <Input.Password
                                    placeholder="Ievadiet paroli"
                                    className="login-input"
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item className="login-form-options">
                                <div className="form-options-wrapper">
                                    <Form.Item name="remember" valuePropName="checked" noStyle>
                                        <Checkbox className="login-checkbox">
                                            Atcerēties mani
                                        </Checkbox>
                                    </Form.Item>
                                </div>
                            </Form.Item>

                            <Form.Item className="login-form-submit">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    block
                                    className="login-button"
                                    size="large"
                                >
                                    Pieslēgties
                                </Button>
                            </Form.Item>
                        </Form>

                        <p className="login-support-text">
                            Ir problēmas? <span href="#" className="support-link">Paziņo priekšniekam </span>
                        </p>
                </Card>
            </div>
        </div>
        </div>
    );
};

export default Login;
