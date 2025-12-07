import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Row, Col, Table, Typography, Select, Spin, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  LineController,
  DoughnutController,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  LineController,
  DoughnutController,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const { userProfile: authProfile, currentUser, loading: authLoading } = useAuth();
  const { userProfile, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const [lineChartInstance, setLineChartInstance] = useState(null);
  const [pieChartInstance, setPieChartInstance] = useState(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const prevSalesDataRef = useRef([]);
  const prevSelectedMonthRef = useRef('');
  const prevInvoiceStatusDataRef = useRef({});
  
  const [dashboardData, setDashboardData] = useState({
    monthlyIncome: 0,
    monthlyIncomeChange: 0,
    activeInvoices: 0,
    activeInvoicesChange: 0,
    createdInvoices: 0,
    createdInvoicesChange: 0,
    unpaidInvoices: 0,
    unpaidInvoicesChange: 0,
    salesData: [],
    latestUsers: [],
    latestInvoices: [],
    invoiceStatusData: {},
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('current'); // 'current', 'last', 'last2'

  // Memoize admin status to prevent unnecessary re-renders
  const isAdminUser = useMemo(() => isAdmin || isSuperAdmin, [isAdmin, isSuperAdmin]);
  const userId = useMemo(() => userProfile?.id, [userProfile?.id]);

  // Get username with fallback
  const userName = useMemo(() => {
    if (authLoading || roleLoading) return '';
    return userProfile?.username || authProfile?.username || currentUser?.email?.split('@')[0] || 'User';
  }, [userProfile?.username, authProfile?.username, currentUser?.email, authLoading, roleLoading]);

  // Get current month and calculate month ranges
  const getMonthRanges = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last2Month = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      current: { start: currentMonth, end: nextMonth },
      last: { start: lastMonth, end: currentMonth },
      last2: { start: last2Month, end: lastMonth },
    };
  };

  // Reset fetch flag when user changes
  useEffect(() => {
    if (userId && hasFetchedRef.current !== userId) {
      hasFetchedRef.current = false;
    }
  }, [userId]);

  // Fetch dashboard data
  useEffect(() => {
    // Prevent multiple simultaneous fetches
    if (roleLoading || !userProfile || !userId || isFetchingRef.current) return;

    // Only fetch once per user session unless explicitly needed
    if (hasFetchedRef.current === userId) return;

    const fetchDashboardData = async () => {
      // Set flag to prevent concurrent fetches
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        setLoading(true);

        // Get month ranges
        const monthRanges = getMonthRanges();
        const currentRange = monthRanges.current;
        const lastRange = monthRanges.last;

        // Fetch ALL invoices for sales metrics and sales chart (global data)
        const { data: allInvoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('*');

        if (invoicesError) throw invoicesError;

        // For employees: fetch their own invoices for pie chart and latest invoices table
        let employeeInvoices = [];
        if (!isAdminUser) {
          const { data: empInvoices, error: empError } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', userId);
          
          if (!empError && empInvoices) {
            employeeInvoices = empInvoices;
          }
        }

        // Calculate current month income (only paid invoices)
        const currentMonthPaid = allInvoices?.filter(inv => {
          if (inv.status !== 'paid') return false;
          const paidDate = new Date(inv.paid_date || inv.updated_at);
          return paidDate >= currentRange.start && paidDate < currentRange.end;
        }) || [];

        const currentMonthIncome = currentMonthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

        // Calculate last month income
        const lastMonthPaid = allInvoices?.filter(inv => {
          if (inv.status !== 'paid') return false;
          const paidDate = new Date(inv.paid_date || inv.updated_at);
          return paidDate >= lastRange.start && paidDate < lastRange.end;
        }) || [];

        const lastMonthIncome = lastMonthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

        // Calculate income change percentage
        const monthlyIncomeChange = lastMonthIncome > 0
          ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100
          : (currentMonthIncome > 0 ? 100 : 0);

        // Calculate active invoices (sent, pending, overdue)
        const currentActive = allInvoices?.filter(inv => {
          const createdDate = new Date(inv.created_at);
          return ['sent', 'pending', 'overdue'].includes(inv.status) &&
                 createdDate >= currentRange.start && createdDate < currentRange.end;
        }).length || 0;

        const lastActive = allInvoices?.filter(inv => {
          const createdDate = new Date(inv.created_at);
          return ['sent', 'pending', 'overdue'].includes(inv.status) &&
                 createdDate >= lastRange.start && createdDate < lastRange.end;
        }).length || 0;

        const activeInvoicesChange = lastActive > 0
          ? ((currentActive - lastActive) / lastActive) * 100
          : (currentActive > 0 ? 100 : 0);

        // Calculate created invoices
        const currentCreated = allInvoices?.filter(inv => {
          const createdDate = new Date(inv.created_at);
          return createdDate >= currentRange.start && createdDate < currentRange.end;
        }).length || 0;

        const lastCreated = allInvoices?.filter(inv => {
          const createdDate = new Date(inv.created_at);
          return createdDate >= lastRange.start && createdDate < lastRange.end;
        }).length || 0;

        const createdInvoicesChange = lastCreated > 0
          ? ((currentCreated - lastCreated) / lastCreated) * 100
          : (currentCreated > 0 ? 100 : 0);

        // Calculate unpaid invoices (sent, pending, overdue) - FIXED to include 'sent'
        const currentUnpaid = allInvoices?.filter(inv => {
          return ['sent', 'pending', 'overdue'].includes(inv.status);
        }).length || 0;

        const lastUnpaid = allInvoices?.filter(inv => {
          const createdDate = new Date(inv.created_at);
          return ['sent', 'pending', 'overdue'].includes(inv.status) &&
                 createdDate < currentRange.start;
        }).length || 0;

        const unpaidInvoicesChange = lastUnpaid > 0
          ? ((currentUnpaid - lastUnpaid) / lastUnpaid) * 100
          : (currentUnpaid > 0 ? 100 : 0);

        // Calculate invoice status distribution for pie chart
        // For employees: use only their own invoices
        // For admins: use all invoices
        const invoicesForStatusChart = isAdminUser ? allInvoices : employeeInvoices;
        const invoiceStatusCounts = {
          paid: 0,
          sent: 0,
          pending: 0,
          overdue: 0,
          draft: 0,
          cancelled: 0,
        };

        invoicesForStatusChart?.forEach(inv => {
          if (invoiceStatusCounts.hasOwnProperty(inv.status)) {
            invoiceStatusCounts[inv.status]++;
          }
        });

        // Fetch sales data for chart (last 3 months)
        const salesData = [];

        for (let i = 2; i >= 0; i--) {
          const monthStart = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
          const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
          
          const monthPaid = allInvoices?.filter(inv => {
            if (inv.status !== 'paid') return false;
            const paidDate = new Date(inv.paid_date || inv.updated_at);
            return paidDate >= monthStart && paidDate < monthEnd;
          }) || [];

          const monthIncome = monthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
          
          const monthName = monthStart.toLocaleDateString('lv-LV', { month: 'short', year: 'numeric' });
          salesData.push({ month: monthName, income: monthIncome });
        }

        // Fetch latest users (only for admins) with creator info
        let latestUsers = [];
        if (isAdminUser) {
          const { data: usersData, error: usersError } = await supabase
            .from('user_profiles')
            .select('id, email, username, created_at, created_by')
            .order('created_at', { ascending: false })
            .limit(7);

          if (!usersError && usersData) {
            // Get unique creator IDs
            const creatorIds = [...new Set(usersData.map(u => u.created_by).filter(Boolean))];
            
            // Fetch creator profiles
            let creatorsMap = {};
            if (creatorIds.length > 0) {
              const { data: creatorsData } = await supabase
                .from('user_profiles')
                .select('id, username, email')
                .in('id', creatorIds);
              
              if (creatorsData) {
                creatorsMap = creatorsData.reduce((acc, creator) => {
                  acc[creator.id] = creator;
                  return acc;
                }, {});
              }
            }

            latestUsers = usersData.map(user => ({
              ...user,
              key: user.id,
              creator: user.created_by ? creatorsMap[user.created_by] : null,
            }));
          }
        }

        // Fetch latest 5 invoices
        // For employees: show only their own invoices
        // For admins: show all invoices
        const invoicesForTable = isAdminUser ? allInvoices : employeeInvoices;
        const latestInvoices = invoicesForTable
          ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
          .map(inv => ({
            ...inv,
            key: inv.id,
          })) || [];

        setDashboardData({
          monthlyIncome: currentMonthIncome,
          monthlyIncomeChange,
          activeInvoices: currentActive,
          activeInvoicesChange,
          createdInvoices: currentCreated,
          createdInvoicesChange,
          unpaidInvoices: currentUnpaid,
          unpaidInvoicesChange,
          salesData,
          latestUsers,
          latestInvoices,
          invoiceStatusData: invoiceStatusCounts,
        });
        
        // Mark as fetched for this user
        hasFetchedRef.current = userId;
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchDashboardData();
  }, [userId, isAdminUser, roleLoading]);

  // Format percentage with color
  const formatPercentage = (value) => {
    const isPositive = value >= 0;
    const color = isPositive ? '#22c55e' : '#ef4444';
    const sign = isPositive ? '+' : '';
    return { text: `${sign}${value.toFixed(1)}%`, color };
  };

  // Initialize line chart
  useEffect(() => {
    if (!lineChartRef.current || !dashboardData.salesData.length) return;

    // Check if data or month selection actually changed
    const dataChanged = JSON.stringify(dashboardData.salesData) !== JSON.stringify(prevSalesDataRef.current);
    const monthChanged = selectedMonth !== prevSelectedMonthRef.current;
    
    if (!dataChanged && !monthChanged && lineChartInstance) {
      // Data hasn't changed, no need to recreate chart
      return;
    }

    // Update refs
    prevSalesDataRef.current = dashboardData.salesData;
    prevSelectedMonthRef.current = selectedMonth;

    // Destroy existing chart if it exists
    if (lineChartInstance) {
      lineChartInstance.destroy();
      setLineChartInstance(null);
    }

    const ctx = lineChartRef.current.getContext('2d');

    let dataToShow = [];
    if (selectedMonth === 'current') {
      dataToShow = dashboardData.salesData.slice(-1);
    } else if (selectedMonth === 'last') {
      dataToShow = dashboardData.salesData.slice(-2, -1);
    } else {
      dataToShow = dashboardData.salesData.slice(-3, -2);
    }

    const chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataToShow.map(d => d.month),
        datasets: [
          {
            label: 'Ienākumi (€)',
            data: dataToShow.map(d => d.income),
            borderColor: '#137fec',
            backgroundColor: 'rgba(19, 127, 236, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#137fec',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function(context) {
                return `Ienākumi: €${context.parsed.y.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '€' + value.toFixed(0);
              },
              font: {
                size: 12,
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 12,
              },
            },
          },
        },
      },
    });

    setLineChartInstance(chartInstance);

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData.salesData, selectedMonth]);

  // Initialize pie chart for employees
  useEffect(() => {
    if (!pieChartRef.current || isAdminUser) return;
    if (Object.values(dashboardData.invoiceStatusData).every(v => v === 0)) return;

    // Check if data actually changed
    const dataChanged = JSON.stringify(dashboardData.invoiceStatusData) !== JSON.stringify(prevInvoiceStatusDataRef.current);
    
    if (!dataChanged && pieChartInstance) {
      // Data hasn't changed, no need to recreate chart
      return;
    }

    // Update ref
    prevInvoiceStatusDataRef.current = dashboardData.invoiceStatusData;

    // Destroy existing chart if it exists
    if (pieChartInstance) {
      pieChartInstance.destroy();
      setPieChartInstance(null);
    }

    const ctx = pieChartRef.current.getContext('2d');

    const statusLabels = {
      paid: 'Apmaksāts',
      sent: 'Nosūtīts',
      pending: 'Gaida',
      overdue: 'Nokavēts',
      draft: 'Melnraksts',
      cancelled: 'Atcelts',
    };

    const statusColors = {
      paid: '#22c55e',
      sent: '#3b82f6',
      pending: '#f59e0b',
      overdue: '#ef4444',
      draft: '#9ca3af',
      cancelled: '#6b7280',
    };

    const labels = [];
    const data = [];
    const backgroundColor = [];

    Object.entries(dashboardData.invoiceStatusData).forEach(([status, count]) => {
      if (count > 0) {
        labels.push(statusLabels[status] || status);
        data.push(count);
        backgroundColor.push(statusColors[status] || '#9ca3af');
      }
    });

    const chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    setPieChartInstance(chartInstance);

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData.invoiceStatusData, isAdminUser]);

  // Format date with leading zeros
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const invoiceColumns = [
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Rēķina ID</span>,
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text) => {
        // Remove any existing # prefix to avoid double ##
        const cleanText = text?.toString().replace(/^#+/, '') || '';
        return (
          <Text style={{ fontWeight: 500, color: '#111827' }}>#{cleanText}</Text>
        );
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Klients</span>,
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text) => <Text style={{ color: '#6b7280' }}>{text || '-'}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Datums</span>,
      dataIndex: 'issue_date',
      key: 'issue_date',
      render: (text) => <Text style={{ color: '#6b7280' }}>{formatDate(text)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Kopā</span>,
      dataIndex: 'total',
      key: 'total',
      render: (text) => <Text style={{ color: '#6b7280' }}>€{parseFloat(text || 0).toFixed(2)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Statuss</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusStyles = {
          paid: { background: '#dcfce7', color: '#166534', text: 'Apmaksāts' },
          pending: { background: '#fef3c7', color: '#92400e', text: 'Gaida' },
          overdue: { background: '#fee2e2', color: '#991b1b', text: 'Nokavēts' },
          sent: { background: '#dbeafe', color: '#1e40af', text: 'Nosūtīts' },
          draft: { background: '#f3f4f6', color: '#4b5563', text: 'Melnraksts' },
          cancelled: { background: '#f3f4f6', color: '#4b5563', text: 'Atcelts' },
        };
        const style = statusStyles[status] || statusStyles.draft;
        return (
          <span
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 500,
              background: style.background,
              color: style.color,
              borderRadius: '9999px',
              display: 'inline-block',
            }}
          >
            {style.text}
          </span>
        );
      },
    },
  ];

  if (authLoading || roleLoading || loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  const incomePercent = formatPercentage(dashboardData.monthlyIncomeChange);
  const activePercent = formatPercentage(dashboardData.activeInvoicesChange);
  const createdPercent = formatPercentage(dashboardData.createdInvoicesChange);
  const unpaidPercent = formatPercentage(dashboardData.unpaidInvoicesChange);

  const showUserRegistrations = isAdminUser;
  const isEmployee = !isAdminUser;

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Page Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
              Informācijas panelis
            </Title>
            <Tooltip 
              title={
                <div style={{ maxWidth: '300px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Informācijas panelis</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    Šeit redzams pārskats par jūsu rēķiniem un pārdošanu. Administrators redz visu sistēmas datu, bet darbinieki redz tikai savus rēķinus. Metrikas tiek aprēķinātas no apmaksātiem rēķiniem. Ienākumu izmaiņas tiek salīdzinātas ar iepriekšējo mēnesi.
                  </div>
                </div>
              }
              placement="right"
            >
              <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
            </Tooltip>
          </div>
          <Text style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
            {userName ? `Laipni lūdzam atpakaļ, ${userName}!` : 'Laipni lūdzam atpakaļ!'}
          </Text>
        </div>

        {/* Stats Cards */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Kopēji ikmēneša ienākumi</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                  €{dashboardData.monthlyIncome.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: incomePercent.color }}>
                  {incomePercent.text}
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Aktīvie rēķini</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{dashboardData.activeInvoices}</Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: activePercent.color }}>
                  {activePercent.text}
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Izveidotie rēķini</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{dashboardData.createdInvoices}</Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: createdPercent.color }}>
                  {createdPercent.text}
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Neapmaksātie rēķini</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{dashboardData.unpaidInvoices}</Text>
                <Text style={{ fontSize: '16px', fontWeight: 500, color: unpaidPercent.color }}>
                  {unpaidPercent.text}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Charts Section */}
        <Row gutter={[32, 32]}>
          <Col xs={24} xl={showUserRegistrations || isEmployee ? 16 : 24}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Pārdošana laika gaitā</span>
                  <Select
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    style={{ width: 180 }}
                    size="large"
                  >
                    <Option value="current">Pašreizējais mēnesis</Option>
                    <Option value="last">Pēdējais mēnesis</Option>
                    <Option value="last2">Pirms 2 mēnešiem</Option>
                  </Select>
                </div>
              }
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <div style={{ height: '320px', position: 'relative' }}>
                {dashboardData.salesData.length > 0 ? (
                  <canvas ref={lineChartRef} />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: '16px',
                      fontWeight: 500,
                    }}
                  >
                    Pagaidām nav datu...
                  </div>
                )}
              </div>
            </Card>
          </Col>
          {showUserRegistrations && (
            <Col xs={24} xl={8}>
              <Card
                title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Jaunu lietotāju reģistrācijas</span>}
                variant="outlined"
                style={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                }}
                styles={{ body: { padding: '24px' } }}
              >
                {dashboardData.latestUsers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '320px', overflowY: 'auto' }}>
                    {dashboardData.latestUsers.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          padding: '16px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Text style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                            {user.username || user.email}
                          </Text>
                          <Text style={{ fontSize: '13px', color: '#6b7280' }}>
                            {user.email}
                          </Text>
                          {user.creator && (
                            <Text style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                              Izveidoja: {user.creator.username || user.creator.email}
                            </Text>
                          )}
                          <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {formatDate(user.created_at)}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      height: '320px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: '16px',
                      fontWeight: 500,
                    }}
                  >
                    Pagaidām nav datu...
                  </div>
                )}
              </Card>
            </Col>
          )}
          {isEmployee && (
            <Col xs={24} xl={8}>
              <Card
                title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Rēķinu statuss</span>}
                variant="outlined"
                style={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                }}
                styles={{ body: { padding: '24px' } }}
              >
                <div style={{ height: '320px', position: 'relative' }}>
                  {Object.values(dashboardData.invoiceStatusData).some(v => v > 0) ? (
                    <canvas ref={pieChartRef} />
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        fontSize: '16px',
                        fontWeight: 500,
                      }}
                    >
                      Pagaidām nav datu...
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          )}
        </Row>

        {/* Recent Invoices Table */}
        <Card
          title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Pēdējie rēķini</span>}
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            columns={invoiceColumns}
            dataSource={dashboardData.latestInvoices}
            pagination={false}
            className="custom-table"
            locale={{
              emptyText: 'Nav rēķinu',
            }}
          />
        </Card>
      </div>

      {/* Custom Table Styles */}
      <style>{`
        .custom-table .ant-table {
          font-size: 14px;
        }

        .custom-table .ant-table-thead > tr > th {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px;
        }

        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 24px;
        }

        .custom-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        .custom-table .ant-table-tbody > tr {
          background: #ffffff;
        }

        .custom-table .ant-table-tbody > tr:hover > td {
          background: #f9fafb;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Dashboard;
