import { useState, useEffect } from 'react';
import { Card, Typography, Spin } from 'antd';
import { LineChart } from '@mui/x-charts';
import DashboardLayout from '../components/DashboardLayout';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;

const Statistics = () => {
  const { userProfile, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('monthly');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [statisticsData, setStatisticsData] = useState({
    sales: [],
    revenue: [],
  });

  useEffect(() => {
    document.title = 'Statistika | Piffdeals';
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (roleLoading || !userProfile) return;

    const fetchStatisticsData = async () => {
      try {
        setLoading(true);
        const userId = userProfile.id;
        const isAdminUser = isAdmin || isSuperAdmin;

        let invoiceQuery = supabase.from('invoices').select('*');
        if (!isAdminUser) {
          invoiceQuery = invoiceQuery.eq('user_id', userId);
        }

        const { data: invoices, error } = await invoiceQuery;
        if (error) throw error;

        const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];

        const statsData = { sales: [], revenue: [] };
        for (let i = 11; i >= 0; i--) {
          const monthStart = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
          const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
          
          const monthPaid = paidInvoices.filter(inv => {
            const paidDate = new Date(inv.paid_date || inv.updated_at);
            return paidDate >= monthStart && paidDate < monthEnd;
          });

          const monthIncome = monthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
          const monthCount = invoices?.filter(inv => {
            const createdDate = new Date(inv.created_at);
            return createdDate >= monthStart && createdDate < monthEnd;
          }).length || 0;
          
          const monthName = monthStart.toLocaleDateString('lv-LV', { month: 'short' });
          statsData.sales.push({ month: monthName, value: monthCount });
          statsData.revenue.push({ month: monthName, value: monthIncome });
        }

        setStatisticsData(statsData);
      } catch (error) {
        console.error('Error fetching statistics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatisticsData();
  }, [userProfile, isAdmin, isSuperAdmin, roleLoading]);

  const getStatisticsData = () => {
    if (timePeriod === 'monthly') {
      return {
        sales: statisticsData.sales.slice(-12),
        revenue: statisticsData.revenue.slice(-12),
      };
    } else if (timePeriod === 'quarterly') {
      return {
        sales: statisticsData.sales.filter((_, i) => i % 3 === 0).slice(-4),
        revenue: statisticsData.revenue.filter((_, i) => i % 3 === 0).slice(-4),
      };
    } else {
      return {
        sales: statisticsData.sales,
        revenue: statisticsData.revenue,
      };
    }
  };

  const dataToShow = getStatisticsData();
  const combinedData = dataToShow.sales.map((sale, idx) => ({
    month: sale.month,
    sales: sale.value,
    revenue: dataToShow.revenue[idx]?.value || 0,
  }));

  if (roleLoading || loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  const isMobile = windowWidth < 576;
  const isTablet = windowWidth >= 576 && windowWidth < 992;

  return (
    <DashboardLayout>
      <div style={{ 
        padding: isMobile ? '12px 16px 60px' : isTablet ? '16px 20px 80px' : '16px 20px 80px', 
        maxWidth: '1536px', 
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
          <Title level={1} style={{ 
            margin: 0, 
            fontSize: isMobile ? '24px' : '30px', 
            fontWeight: 700, 
            color: '#212B36', 
            lineHeight: '1.2' 
          }}>
            Statistika
          </Title>
          <Text style={{ 
            fontSize: isMobile ? '14px' : '16px', 
            color: '#637381', 
            lineHeight: '1.5', 
            marginTop: '8px', 
            display: 'block' 
          }}>
            Detalizēta statistika par pārdošanu un ienākumiem
          </Text>
        </div>

        <Card
          style={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            padding: isMobile ? '16px' : isTablet ? '18px 20px' : '20px 24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px',
              width: '100%'
            }}
            className="stats-header"
            >
              <div style={{ width: '100%' }}>
                <h3 style={{ 
                  fontSize: isMobile ? '16px' : isTablet ? '17px' : '18px', 
                  fontWeight: 600, 
                  color: '#212B36', 
                  margin: 0, 
                  marginBottom: '4px' 
                }}>
                  Statistika
                </h3>
                <p style={{ 
                  fontSize: isMobile ? '13px' : '14px', 
                  color: '#637381', 
                  margin: 0 
                }}>
                  Mērķis, ko esat noteicis katram mēnesim
                </p>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'start', 
                gap: '12px',
                width: '100%',
                justifyContent: 'flex-end'
              }}
              className="time-period-buttons"
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  background: '#f1f5f9', 
                  borderRadius: '8px', 
                  padding: '4px' 
                }}>
                  <button
                    onClick={() => setTimePeriod('monthly')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: 'none',
                      background: timePeriod === 'monthly' ? '#ffffff' : 'transparent',
                      color: timePeriod === 'monthly' ? '#212B36' : '#637381',
                      boxShadow: timePeriod === 'monthly' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Mēneša
                  </button>
                  <button
                    onClick={() => setTimePeriod('quarterly')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: 'none',
                      background: timePeriod === 'quarterly' ? '#ffffff' : 'transparent',
                      color: timePeriod === 'quarterly' ? '#212B36' : '#637381',
                      boxShadow: timePeriod === 'quarterly' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Ceturkšņa
                  </button>
                  <button
                    onClick={() => setTimePeriod('annually')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: 'none',
                      background: timePeriod === 'annually' ? '#ffffff' : 'transparent',
                      color: timePeriod === 'annually' ? '#212B36' : '#637381',
                      boxShadow: timePeriod === 'annually' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Gada
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div style={{ 
            height: isMobile ? '300px' : isTablet ? '320px' : '325px', 
            position: 'relative' 
          }}>
            {combinedData.length > 0 ? (
              <LineChart
                width={undefined}
                height={isMobile ? 300 : isTablet ? 320 : 325}
                series={[
                  {
                    data: combinedData.map(d => d.sales),
                    label: 'Pārdošana',
                    area: true,
                    curve: 'monotone',
                  },
                  {
                    data: combinedData.map(d => d.revenue),
                    label: 'Ienākumi',
                    area: true,
                    curve: 'monotone',
                  },
                ]}
                xAxis={[{
                  scaleType: 'point',
                  data: combinedData.map(d => d.month),
                }]}
                colors={['#0068FF', '#83AEEA']}
                sx={{
                  '& .MuiChartsAxis-root': {
                    fontSize: isMobile ? '10px' : '12px',
                  },
                }}
              />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: 500,
              }}>
                Pagaidām nav datu...
              </div>
            )}
          </div>
        </Card>

        <style>{`
          @media (min-width: 1024px) {
            .stats-header {
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: center !important;
            }
          }
          @media (max-width: 1023px) {
            .time-period-buttons {
              justify-content: flex-start !important;
              margin-top: 8px;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default Statistics;
