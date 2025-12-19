import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Package, CheckCircle, Users, ArrowRight, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';

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

      const { count: todayCount } = await supabase
        .from('mails')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      const { count: monthCount } = await supabase
        .from('mails')
        .select('*', { count: 'exact', head: true })
        .eq('status', '已取')
        .gte('pickup_time', monthStart)
        .lte('pickup_time', monthEnd);

      const { count: pendingCount } = await supabase
        .from('mails')
        .select('*', { count: 'exact', head: true })
        .eq('status', '待取');

      setTodayNew(todayCount || 0);
      setMonthPickedUp(monthCount || 0);
      setTotalPending(pendingCount || 0);

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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">儀表板</h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhTW })} 概覽
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg card-hover overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              今日新郵件
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{todayNew}</div>
            <p className="text-xs text-muted-foreground mt-1">封郵件</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg card-hover overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              本月已取件
            </CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-success">{monthPickedUp}</div>
            <p className="text-xs text-muted-foreground mt-1">封郵件</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg card-hover overflow-hidden border-l-4 border-l-destructive">
          <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              目前未取總數
            </CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Package className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{totalPending}</div>
            <p className="text-xs text-muted-foreground mt-1">封待取</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/dashboard/new-mail">
          <Card className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 bg-primary-foreground/20 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">新增郵件</h3>
                <p className="text-primary-foreground/80 text-sm">登記新收到的郵件</p>
              </div>
              <ArrowRight className="w-5 h-5 ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/customers">
          <Card className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 bg-accent-foreground/10 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">客戶管理</h3>
                <p className="text-accent-foreground/80 text-sm">查看和管理客戶資料</p>
              </div>
              <ArrowRight className="w-5 h-5 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Customers */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="w-5 h-5 text-primary" />
            未取件客戶清單
            {pendingCustomers.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCustomers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-muted-foreground text-lg">目前沒有待取件的客戶</p>
              <p className="text-muted-foreground text-sm mt-1">所有郵件都已領取</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingCustomers.map((customer, index) => (
                <Link
                  key={customer.id}
                  to={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 hover:shadow-md transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {customer.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{customer.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.customer_id} · {customer.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-sm px-3 py-1">
                      {customer.pending_count} 件待取
                    </Badge>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
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
