import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Package, CheckCircle, Users, ArrowRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

interface CustomerWithPending {
  id: string;
  customer_id: string;
  full_name: string;
  phone: string;
  pending_count: number;
}

export default function Dashboard() {
  const [todayNew, setTodayNew] = useState(0);
  const [monthPickedUp, setMonthPickedUp] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [pendingCustomers, setPendingCustomers] = useState<CustomerWithPending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Today's new mails
      const { count: todayCount } = await supabase
        .from('mails')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      // This month's picked up
      const { count: monthCount } = await supabase
        .from('mails')
        .select('*', { count: 'exact', head: true })
        .eq('status', '已取')
        .gte('pickup_time', monthStart)
        .lte('pickup_time', monthEnd);

      // Total pending
      const { count: pendingCount } = await supabase
        .from('mails')
        .select('*', { count: 'exact', head: true })
        .eq('status', '待取');

      setTodayNew(todayCount || 0);
      setMonthPickedUp(monthCount || 0);
      setTotalPending(pendingCount || 0);

      // Get customers with pending mails
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, customer_id, full_name, phone');

      if (customersData) {
        const customersWithPending: CustomerWithPending[] = [];
        
        for (const customer of customersData) {
          const { count } = await supabase
            .from('mails')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customer.id)
            .eq('status', '待取');

          if (count && count > 0) {
            customersWithPending.push({
              ...customer,
              pending_count: count,
            });
          }
        }

        setPendingCustomers(customersWithPending.sort((a, b) => b.pending_count - a.pending_count));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">儀表板</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'yyyy年M月d日')} 概覽
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              今日新郵件
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayNew}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              本月已取件
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{monthPickedUp}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              目前未取總數
            </CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{totalPending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            未取件客戶清單
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCustomers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              目前沒有待取件的客戶
            </p>
          ) : (
            <div className="space-y-2">
              {pendingCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  to={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{customer.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.customer_id} · {customer.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{customer.pending_count} 件待取</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
