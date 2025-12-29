import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Spin } from 'antd';
import {
  LineChart,
  BarChart,
} from '@mui/x-charts';
import DashboardLayout from '../components/DashboardLayout';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;

const Analytics = () => {
  const { userProfile, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [analyticsData, setAnalyticsData] = useState({
    revenueData: [],
    topProducts: [],
  });

  useEffect(() => {
    document.title = 'Vispārējā analītika | Piffdeals';
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

    const fetchAnalyticsData = async () => {
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

        // Revenue over time (last 12 months)
        const revenueData = [];
        for (let i = 11; i >= 0; i--) {
          const monthStart = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
          const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
          
          const monthPaid = paidInvoices.filter(inv => {
            const paidDate = new Date(inv.paid_date || inv.updated_at);
            return paidDate >= monthStart && paidDate < monthEnd;
          });

          const monthIncome = monthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
          const monthName = monthStart.toLocaleDateString('lv-LV', { month: 'short' });
          revenueData.push({ month: monthName, revenue: monthIncome });
        }

        // Top Products
        const { data: invoiceItems, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .in('invoice_id', paidInvoices.map(inv => inv.id));

        let topProducts = [];
        if (!itemsError && invoiceItems) {
          const productMap = {};
          invoiceItems.forEach(item => {
            const key = item.product_name || item.product_id || 'Unknown';
            if (!productMap[key]) {
              productMap[key] = {
                name: key,
                revenue: 0,
                quantity: 0,
                count: 0,
              };
            }
            productMap[key].revenue += parseFloat(item.total || 0);
            productMap[key].quantity += parseInt(item.quantity || 0);
            productMap[key].count += 1;
          });

          topProducts = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
            .map(p => ({
              name: p.name.length > 30 ? p.name.substring(0, 30) + '...' : p.name,
              revenue: p.revenue,
              quantity: p.quantity,
              count: p.count,
            }));
        }

        setAnalyticsData({
          revenueData,
          topProducts,
        });
      } catch (error) {
        // Error fetching analytics data
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [userProfile, isAdmin, isSuperAdmin, roleLoading]);

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
            Vispārējā analītika
          </Title>
          <Text style={{ 
            fontSize: isMobile ? '14px' : '16px', 
            color: '#637381', 
            lineHeight: '1.5', 
            marginTop: '8px', 
            display: 'block' 
          }}>
            Visaptveroša analītika par ienākumiem un produktiem
          </Text>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(12, 1fr)', 
          gap: '16px 24px'
        }}>
          {/* Revenue Chart */}
          <div style={{ 
            gridColumn: 'span 12',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
          className="revenue-chart-column"
          >
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: isMobile ? '16px' : isTablet ? '18px 20px' : '20px 24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
                <h3 style={{ 
                  fontSize: isMobile ? '16px' : isTablet ? '17px' : '18px', 
                  fontWeight: 600, 
                  color: '#212B36', 
                  margin: 0 
                }}>
                  Ienākumi laika gaitā
                </h3>
              </div>
              <div style={{ 
                height: isMobile ? '300px' : isTablet ? '350px' : '400px', 
                position: 'relative' 
              }}>
                {analyticsData.revenueData.length > 0 ? (
                  <LineChart
                    width={undefined}
                    height={isMobile ? 300 : isTablet ? 350 : 400}
                    series={[
                      {
                        data: analyticsData.revenueData.map(d => d.revenue),
                        label: 'Ienākumi (€)',
                        curve: 'monotone',
                      },
                    ]}
                    xAxis={[{
                      scaleType: 'point',
                      data: analyticsData.revenueData.map(d => d.month),
                    }]}
                    colors={['#0068FF']}
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
          </div>

          {/* Top Products Chart */}
          <div style={{ 
            gridColumn: 'span 12',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
          className="products-chart-column"
          >
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: isMobile ? '16px' : isTablet ? '18px 20px' : '20px 24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
                <h3 style={{ 
                  fontSize: isMobile ? '16px' : isTablet ? '17px' : '18px', 
                  fontWeight: 600, 
                  color: '#212B36', 
                  margin: 0 
                }}>
                  Top produkti
                </h3>
              </div>
              <div style={{ 
                height: isMobile ? '300px' : isTablet ? '350px' : '400px', 
                position: 'relative' 
              }}>
                {analyticsData.topProducts.length > 0 ? (
                  <BarChart
                    width={undefined}
                    height={isMobile ? 300 : isTablet ? 350 : 400}
                    series={[
                      {
                        data: analyticsData.topProducts.map(d => d.revenue),
                        label: 'Ienākumi (€)',
                      },
                    ]}
                    xAxis={[{
                      scaleType: 'band',
                      data: analyticsData.topProducts.map(d => d.name),
                    }]}
                    yAxis={[{
                      min: 0,
                    }]}
                    colors={['#0068FF']}
                    sx={{
                      '& .MuiBarElement-root': {
                        borderRadius: '6px 6px 0 0',
                      },
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
