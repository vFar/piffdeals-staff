import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Card, Row, Col, Typography, Spin, Table } from 'antd';
import { UserOutlined, ShoppingOutlined, ClockCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { LineChart, BarChart, PieChart } from '@mui/x-charts';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';

const { Text, Title } = Typography;

// Euro Icon Component
const EuroIcon = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
    color: 'currentColor',
    lineHeight: 1,
  }}>
    €
  </div>
);

// Stat Card Component - Memoized to prevent unnecessary re-renders (defined outside to avoid hooks issues)
const StatCard = memo(({ icon, title, value, change, iconBg = '#EBF3FF', iconColor = '#0068FF', formatValue }) => {
  const displayValue = useMemo(() => formatValue ? formatValue(value) : value.toLocaleString(), [formatValue, value]);
  
  return (
    <Card
      className="stat-card"
      style={{
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        height: '100%',
      }}
    >
      <div className="stat-card-content">
        <div className="stat-card-info">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: iconBg, color: iconColor }}>
              {icon}
            </div>
            <div className="stat-card-text">
              <h3 className="stat-card-value">{displayValue}</h3>
              <div className="stat-card-meta">
                <Text className="stat-card-title">{title}</Text>
                <span className="stat-card-change" style={{
                  background: change.isPositive ? '#dcfce7' : '#fee2e2',
                  color: change.isPositive ? '#166534' : '#991b1b',
                }}>
                  {change.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

const Dashboard = () => {
  const { userProfile: authProfile, currentUser, loading: authLoading } = useAuth();
  const { userProfile, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    totalOrdersChange: 0,
    unpaidInvoices: 0,
    unpaidInvoicesChange: 0,
    totalRevenue: 0,
    totalRevenueChange: 0,
    totalCustomers: 0,
    totalCustomersChange: 0,
    chartData: {
      orders: [],
      unpaid: [],
      revenue: [],
      customers: [],
    },
    revenueChartData: {
      labels: [],
      values: [],
    },
    statusDistribution: [],
    recentInvoices: [],
    monthlyComparison: {
      current: 0,
      previous: 0,
    },
  });

  const isAdminUser = useMemo(() => isAdmin || isSuperAdmin, [isAdmin, isSuperAdmin]);
  const userId = useMemo(() => userProfile?.id, [userProfile?.id]);

  const getMonthRanges = useCallback(() => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      current: { start: currentMonth, end: nextMonth },
      last: { start: lastMonth, end: currentMonth },
    };
  }, []);

  useEffect(() => {
    document.title = 'Informācijas panelis | Piffdeals';
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch all invoices for dashboard statistics
  useEffect(() => {
    if (roleLoading || !userProfile) return;

    const fetchAllInvoices = async () => {
      try {
        setInvoicesLoading(true);
        let query = supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });

        // Employees can only see their own invoices
        if (!isAdmin && !isSuperAdmin) {
          query = query.eq('user_id', userProfile.id);
        }

        const { data: invoicesData, error: invoicesError } = await query;
        if (invoicesError) throw invoicesError;

        setInvoices(invoicesData || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        setInvoices([]);
      } finally {
        setInvoicesLoading(false);
      }
    };

    fetchAllInvoices();
  }, [userProfile, isAdmin, isSuperAdmin, roleLoading]);

  // Calculate dashboard data from shared invoice context
  const calculateDashboardData = useCallback(() => {
    if (!invoices || invoices.length === 0) {
      return;
    }

    const monthRanges = getMonthRanges();
    const currentRange = monthRanges.current;
    const lastRange = monthRanges.last;

    const allInvoices = invoices;

    // Calculate total orders
    const currentMonthOrders = allInvoices?.filter(inv => {
      const createdDate = new Date(inv.created_at);
      return createdDate >= currentRange.start && createdDate < currentRange.end;
    }).length || 0;
    const lastMonthOrders = allInvoices?.filter(inv => {
      const createdDate = new Date(inv.created_at);
      return createdDate >= lastRange.start && createdDate < lastRange.end;
    }).length || 0;
    const totalOrders = allInvoices?.length || 0;
    const totalOrdersChange = lastMonthOrders > 0
      ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
      : (currentMonthOrders > 0 ? 100 : 0);

    // Calculate unpaid invoices (sent, pending, overdue statuses)
    const currentMonthUnpaid = allInvoices?.filter(inv => {
      const createdDate = new Date(inv.created_at);
      return createdDate >= currentRange.start && createdDate < currentRange.end &&
             ['sent', 'pending', 'overdue'].includes(inv.status);
    }).length || 0;
    const lastMonthUnpaid = allInvoices?.filter(inv => {
      const createdDate = new Date(inv.created_at);
      return createdDate >= lastRange.start && createdDate < lastRange.end &&
             ['sent', 'pending', 'overdue'].includes(inv.status);
    }).length || 0;
    const unpaidInvoices = allInvoices?.filter(inv => 
      ['sent', 'pending', 'overdue'].includes(inv.status)
    ).length || 0;
    const unpaidInvoicesChange = lastMonthUnpaid > 0
      ? ((currentMonthUnpaid - lastMonthUnpaid) / lastMonthUnpaid) * 100
      : (currentMonthUnpaid > 0 ? 100 : 0);

    // Calculate total revenue (from paid invoices)
    const paidInvoices = allInvoices?.filter(inv => inv.status === 'paid') || [];
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const lastMonthPaid = paidInvoices.filter(inv => {
      const paidDate = new Date(inv.paid_date || inv.updated_at);
      return paidDate >= lastRange.start && paidDate < lastRange.end;
    });
    const lastMonthRevenue = lastMonthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const totalRevenueChange = lastMonthRevenue > 0
      ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : (totalRevenue > 0 ? 100 : 0);

    // Calculate total customers
    const uniqueCustomers = new Set();
    allInvoices?.forEach(inv => {
      if (inv.customer_name) {
        uniqueCustomers.add(inv.customer_name);
      }
    });
    const totalCustomers = uniqueCustomers.size;
    const currentMonthCustomers = new Set();
    const lastMonthCustomers = new Set();
    allInvoices?.forEach(inv => {
      const createdDate = new Date(inv.created_at);
      if (inv.customer_name) {
        if (createdDate >= currentRange.start && createdDate < currentRange.end) {
          currentMonthCustomers.add(inv.customer_name);
        }
        if (createdDate >= lastRange.start && createdDate < lastRange.end) {
          lastMonthCustomers.add(inv.customer_name);
        }
      }
    });
    const totalCustomersChange = lastMonthCustomers.size > 0
      ? ((currentMonthCustomers.size - lastMonthCustomers.size) / lastMonthCustomers.size) * 100
      : (currentMonthCustomers.size > 0 ? 100 : 0);

    // Generate mini chart data (last 7 days) - smooth curve data
    const chartData = { orders: [], unpaid: [], revenue: [], customers: [] };
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));
      
      const dayOrders = allInvoices?.filter(inv => {
        const createdDate = new Date(inv.created_at);
        return createdDate >= dayStart && createdDate <= dayEnd;
      }).length || 0;
      
      const dayUnpaid = allInvoices?.filter(inv => {
        const createdDate = new Date(inv.created_at);
        return createdDate >= dayStart && createdDate <= dayEnd &&
               ['sent', 'pending', 'overdue'].includes(inv.status);
      }).length || 0;
      
      const dayPaid = paidInvoices.filter(inv => {
        const paidDate = new Date(inv.paid_date || inv.updated_at);
        return paidDate >= dayStart && paidDate <= dayEnd;
      });
      const dayRevenue = dayPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      
      const dayCustomers = new Set();
      allInvoices?.forEach(inv => {
        const createdDate = new Date(inv.created_at);
        if (inv.customer_name && createdDate >= dayStart && createdDate <= dayEnd) {
          dayCustomers.add(inv.customer_name);
        }
      });
      
      chartData.orders.push(Math.max(0, dayOrders));
      chartData.unpaid.push(Math.max(0, dayUnpaid));
      chartData.revenue.push(Math.max(0, dayRevenue));
      chartData.customers.push(Math.max(0, dayCustomers.size));
    }

    // Revenue chart data (last 6 months)
    const revenueChartData = { labels: [], values: [] };
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
      
      const monthPaid = paidInvoices.filter(inv => {
        const paidDate = new Date(inv.paid_date || inv.updated_at);
        return paidDate >= monthStart && paidDate < monthEnd;
      });
      const monthRevenue = monthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      
      const monthName = monthStart.toLocaleDateString('lv-LV', { month: 'short' });
      revenueChartData.labels.push(monthName);
      revenueChartData.values.push(Math.max(0, monthRevenue));
    }

    // Status distribution for pie chart
    const statusCounts = {
      paid: allInvoices?.filter(inv => inv.status === 'paid').length || 0,
      sent: allInvoices?.filter(inv => inv.status === 'sent').length || 0,
      pending: allInvoices?.filter(inv => inv.status === 'pending').length || 0,
      overdue: allInvoices?.filter(inv => inv.status === 'overdue').length || 0,
    };
    const statusDistribution = [
      { id: 0, value: statusCounts.paid, label: 'Apmaksāts', color: '#12b76a' },
      { id: 1, value: statusCounts.sent, label: 'Nosūtīts', color: '#0068FF' },
      { id: 2, value: statusCounts.pending, label: 'Gaida', color: '#f59e0b' },
      { id: 3, value: statusCounts.overdue, label: 'Nokavēts', color: '#ef4444' },
    ].filter(item => item.value > 0);

    // Recent invoices
    const recentInvoices = allInvoices?.slice(0, 5).map((inv, idx) => ({
      key: idx,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name || 'Nav norādīts',
      total: parseFloat(inv.total || 0),
      status: inv.status,
      created_at: inv.created_at,
    })) || [];

    // Monthly comparison
    const currentMonthRevenue = paidInvoices.filter(inv => {
      const paidDate = new Date(inv.paid_date || inv.updated_at);
      return paidDate >= currentRange.start && paidDate < currentRange.end;
    }).reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    
    const previousMonthRevenue = paidInvoices.filter(inv => {
      const paidDate = new Date(inv.paid_date || inv.updated_at);
      return paidDate >= lastRange.start && paidDate < lastRange.end;
    }).reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

    setDashboardData({
      totalOrders,
      totalOrdersChange,
      unpaidInvoices,
      unpaidInvoicesChange,
      totalRevenue,
      totalRevenueChange,
      totalCustomers,
      totalCustomersChange,
      chartData,
      revenueChartData,
      statusDistribution,
      recentInvoices,
      monthlyComparison: {
        current: currentMonthRevenue,
        previous: previousMonthRevenue,
      },
    });
  }, [invoices, getMonthRanges]);

  // Format percentage helper function - defined before use
  const formatPercentage = useCallback((value) => {
    const isPositive = value >= 0;
    const color = isPositive ? '#12b76a' : '#ef4444';
    const sign = isPositive ? '+' : '';
    return { text: `${sign}${value.toFixed(1)}%`, color, isPositive };
  }, []);

  // Recalculate when invoices change - only if invoices actually changed
  useEffect(() => {
    if (invoices && invoices.length >= 0) {
      calculateDashboardData();
    }
  }, [invoices, calculateDashboardData]);
  
  // Memoize formatted percentages to prevent recalculation
  const ordersPercent = useMemo(() => formatPercentage(dashboardData.totalOrdersChange), [dashboardData.totalOrdersChange, formatPercentage]);
  const unpaidPercent = useMemo(() => formatPercentage(dashboardData.unpaidInvoicesChange), [dashboardData.unpaidInvoicesChange, formatPercentage]);
  const revenuePercent = useMemo(() => formatPercentage(dashboardData.totalRevenueChange), [dashboardData.totalRevenueChange, formatPercentage]);
  const customersPercent = useMemo(() => formatPercentage(dashboardData.totalCustomersChange), [dashboardData.totalCustomersChange, formatPercentage]);

  // Recent Invoices Table Columns - Memoized to prevent recreation
  const invoiceColumns = useMemo(() => [
    {
      title: 'Rēķina numurs',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text) => (
        <Text style={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
          #{text?.toString().replace(/^#+/, '') || ''}
        </Text>
      ),
    },
    {
      title: 'Klients',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text) => (
        <Text style={{ fontSize: '14px', color: '#637381' }}>{text}</Text>
      ),
    },
    {
      title: 'Summa',
      dataIndex: 'total',
      key: 'total',
      render: (text) => (
        <Text style={{ fontSize: '14px', fontWeight: 600, color: '#212B36' }}>
          €{text.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Statuss',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusStyles = {
          paid: { background: '#dcfce7', color: '#166534', text: 'Apmaksāts' },
          pending: { background: '#fef3c7', color: '#92400e', text: 'Gaida' },
          overdue: { background: '#fee2e2', color: '#991b1b', text: 'Nokavēts' },
          sent: { background: '#dbeafe', color: '#1e40af', text: 'Nosūtīts' },
          draft: { background: '#f3f4f6', color: '#6b7280', text: 'Melnraksts' },
          cancelled: { background: '#e5e7eb', color: '#4b5563', text: 'Atcelts' },
        };
        const style = statusStyles[status] || statusStyles.pending;
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 500,
            background: style.background,
            color: style.color,
          }}>
            {style.text}
          </span>
        );
      },
    },
  ], []);

  // Early return for loading state - AFTER all hooks are called
  if (authLoading || roleLoading || invoicesLoading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <Title level={1} className="dashboard-title">
            Informācijas panelis
          </Title>
          <Text className="dashboard-subtitle">
            Pārskats par jūsu biznesa veiktspēju un statistiku
          </Text>
        </div>

        {/* Stats Cards - 2x2 Grid */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={12}>
            <StatCard
              icon={<ShoppingOutlined style={{ fontSize: '24px' }} />}
              title="Kopējie pasūtījumi"
              value={dashboardData.totalOrders}
              change={ordersPercent}
            />
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <StatCard
              icon={<ClockCircleOutlined style={{ fontSize: '24px' }} />}
              title="Neapmaksātie rēķini"
              value={dashboardData.unpaidInvoices}
              change={unpaidPercent}
              iconBg="#fef3c7"
              iconColor="#f59e0b"
            />
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <StatCard
              icon={<EuroIcon />}
              title="Kopējie ienākumi"
              value={dashboardData.totalRevenue}
              change={revenuePercent}
              iconBg="#dcfce7"
              iconColor="#12b76a"
              formatValue={(val) => `€${val.toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <StatCard
              icon={<UserOutlined style={{ fontSize: '24px' }} />}
              title="Klienti"
              value={dashboardData.totalCustomers}
              change={customersPercent}
            />
          </Col>
        </Row>

        {/* Revenue Chart and Status Distribution */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} lg={12}>
            <Card className="chart-card">
              <div className="chart-card-header">
                <Title level={4} className="chart-card-title">
                  Ienākumi pēdējos 6 mēnešos
                </Title>
                <Text className="chart-card-subtitle">
                  Kopējie ienākumi no apmaksātiem rēķiniem
                </Text>
              </div>
              <div className="chart-card-content">
                {dashboardData.revenueChartData.values.length > 0 ? (
                  <BarChart
                    width={undefined}
                    height={300}
                    series={[
                      {
                        data: dashboardData.revenueChartData.values,
                        label: 'Ienākumi (€)',
                      },
                    ]}
                    xAxis={[{
                      scaleType: 'band',
                      data: dashboardData.revenueChartData.labels,
                    }]}
                    yAxis={[{
                      min: 0,
                    }]}
                    colors={['#0068FF']}
                    sx={{
                      width: '100%',
                      '& .MuiBarElement-root': {
                        borderRadius: '6px 6px 0 0',
                      },
                    }}
                  />
                ) : (
                  <div className="chart-no-data">Pagaidām nav datu...</div>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card className="chart-card">
              <div className="chart-card-header">
                <Title level={4} className="chart-card-title">
                  Rēķinu sadalījums pēc statusa
                </Title>
                <Text className="chart-card-subtitle">
                  Rēķinu skaits pēc katra statusa
                </Text>
              </div>
              <div className="chart-card-content chart-card-content-center">
                {dashboardData.statusDistribution.length > 0 ? (
                  <div className="pie-chart-wrapper">
                    <PieChart
                      series={[
                        {
                          data: dashboardData.statusDistribution,
                          innerRadius: 60,
                          outerRadius: 100,
                          paddingAngle: 2,
                          cornerRadius: 5,
                        },
                      ]}
                      width={400}
                      height={300}
                      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    />
                  </div>
                ) : (
                  <div className="chart-no-data">Pagaidām nav datu...</div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Monthly Comparison and Recent Invoices */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card className="chart-card">
              <div className="chart-card-header">
                <Title level={4} className="chart-card-title">
                  Mēneša salīdzinājums
                </Title>
                <Text className="chart-card-subtitle">
                  Ienākumu salīdzinājums starp pašreizējo un iepriekšējo mēnesi
                </Text>
              </div>
              <div className="monthly-comparison">
                <div className="monthly-comparison-item">
                  <Text className="monthly-comparison-label">
                    Pašreizējais mēnesis
                  </Text>
                  <div className="monthly-comparison-value-wrapper">
                    <Text className="monthly-comparison-value">
                      €{dashboardData.monthlyComparison.current.toFixed(2)}
                    </Text>
                    {dashboardData.monthlyComparison.current > dashboardData.monthlyComparison.previous && (
                      <span className="monthly-comparison-change monthly-comparison-change-positive">
                        <ArrowUpOutlined />
                        {((dashboardData.monthlyComparison.current / dashboardData.monthlyComparison.previous - 1) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="monthly-comparison-item">
                  <Text className="monthly-comparison-label">
                    Iepriekšējais mēnesis
                  </Text>
                  <div className="monthly-comparison-value-wrapper">
                    <Text className="monthly-comparison-value">
                      €{dashboardData.monthlyComparison.previous.toFixed(2)}
                    </Text>
                    {dashboardData.monthlyComparison.previous > dashboardData.monthlyComparison.current && (
                      <span className="monthly-comparison-change monthly-comparison-change-negative">
                        <ArrowDownOutlined />
                        {((dashboardData.monthlyComparison.previous / dashboardData.monthlyComparison.current - 1) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card className="chart-card">
              <div className="chart-card-header">
                <Title level={4} className="chart-card-title">
                  Pēdējie rēķini
                </Title>
                <Text className="chart-card-subtitle">
                  Pēdējie 5 izveidotie rēķini
                </Text>
              </div>
              <Table
                columns={invoiceColumns}
                dataSource={dashboardData.recentInvoices}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Responsive Styles */}
      <style>{`
        .dashboard-container {
          padding: 16px 20px 80px;
          max-width: 1536px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 32px;
        }

        .dashboard-title {
          margin: 0 !important;
          font-size: 30px !important;
          font-weight: 700 !important;
          color: #212B36 !important;
          line-height: 1.2 !important;
        }

        .dashboard-subtitle {
          font-size: 16px;
          color: #637381;
          line-height: 1.5;
          margin-top: 8px;
          display: block;
        }

        /* Stat Card Styles */
        .stat-card .ant-card-body {
          padding: 20px;
        }

        .stat-card-content {
          display: flex;
          align-items: center;
          height: 100%;
        }

        .stat-card-info {
          flex: 1;
          min-width: 0;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-card-icon {
          display: inline-flex;
          height: 48px;
          width: 48px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .stat-card-text {
          flex: 1;
          min-width: 0;
        }

        .stat-card-value {
          font-size: 28px;
          font-weight: 600;
          color: #212B36;
          margin: 0 0 4px 0;
          line-height: 1.2;
        }

        .stat-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .stat-card-title {
          font-size: 14px !important;
          color: #637381 !important;
          margin: 0 !important;
          line-height: 1.4;
        }

        .stat-card-change {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 9999px;
          padding: 2px 10px;
          font-size: 14px;
          font-weight: 500;
          flex-shrink: 0;
        }

        /* Chart Card Styles */
        .chart-card .ant-card-body {
          padding: 20px 24px;
        }

        .chart-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }

        .chart-card-header {
          margin-bottom: 20px;
        }

        .chart-card-title {
          margin: 0 !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #212B36 !important;
        }

        .chart-card-subtitle {
          font-size: 14px;
          color: #637381;
          margin-top: 4px;
          display: block;
        }

        .chart-card-content {
          height: 300px;
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .chart-card-content-center {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pie-chart-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .chart-no-data {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 16px;
          font-weight: 500;
        }

        /* Monthly Comparison */
        .monthly-comparison {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
        }

        .monthly-comparison-item {
          flex: 1;
          min-width: 200px;
        }

        .monthly-comparison-label {
          font-size: 14px;
          color: #637381;
          display: block;
          margin-bottom: 8px;
        }

        .monthly-comparison-value-wrapper {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .monthly-comparison-value {
          font-size: 32px !important;
          font-weight: 700 !important;
          color: #212B36 !important;
        }

        .monthly-comparison-change {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          font-weight: 500;
        }

        .monthly-comparison-change-positive {
          color: #12b76a;
        }

        .monthly-comparison-change-negative {
          color: #ef4444;
        }

        /* Mobile Responsive (< 576px) */
        @media (max-width: 575px) {
          .dashboard-container {
            padding: 12px 16px 60px;
          }

          .dashboard-header {
            margin-bottom: 24px;
          }

          .dashboard-title {
            font-size: 24px !important;
          }

          .dashboard-subtitle {
            font-size: 14px;
          }

          .stat-card .ant-card-body {
            padding: 16px;
          }

          .stat-card-header {
            gap: 12px;
          }

          .stat-card-icon {
            height: 44px;
            width: 44px;
          }

          .stat-card-value {
            font-size: 24px;
          }

          .stat-card-title {
            font-size: 13px !important;
          }

          .stat-card-change {
            font-size: 12px;
            padding: 2px 8px;
          }

          .chart-card .ant-card-body {
            padding: 16px;
          }

          .chart-card-header {
            margin-bottom: 16px;
          }

          .chart-card-title {
            font-size: 16px !important;
          }

          .chart-card-subtitle {
            font-size: 12px;
          }

          .chart-card-content {
            height: 250px;
          }

          .pie-chart-wrapper svg {
            max-width: 100% !important;
            height: auto !important;
          }

          .chart-no-data {
            font-size: 14px;
          }

          .monthly-comparison {
            gap: 16px;
          }

          .monthly-comparison-item {
            min-width: 100%;
          }

          .monthly-comparison-value {
            font-size: 24px !important;
          }
        }

        /* Tablet Responsive (576px - 991px) */
        @media (min-width: 576px) and (max-width: 991px) {
          .stat-card-value {
            font-size: 26px;
          }

          .chart-card-content {
            height: 280px;
          }

          .pie-chart-wrapper {
            max-width: 350px;
            margin: 0 auto;
          }

          .monthly-comparison-value {
            font-size: 28px !important;
          }
        }

        /* Small Laptop (992px - 1279px) */
        @media (min-width: 992px) and (max-width: 1279px) {
          .stat-card-value {
            font-size: 27px;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Dashboard;
