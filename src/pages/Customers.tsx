import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Search, Phone, Mail, ArrowRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Customer = Tables<'customers'>;

interface CustomerWithCount extends Customer {
  pending_count: number;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get pending counts for each customer
      const customersWithCounts: CustomerWithCount[] = [];
      for (const customer of customersData || []) {
        const { count } = await supabase
          .from('mails')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customer.id)
          .eq('status', '待取');

        customersWithCounts.push({
          ...customer,
          pending_count: count || 0,
        });
      }

      setCustomers(customersWithCounts);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('customers').insert({
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || null,
        notes: formData.notes || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: '新增失敗',
            description: '此電話號碼已存在',
          });
          return;
        }
        throw error;
      }

      toast({ title: '新增成功', description: '客戶已建立' });
      setDialogOpen(false);
      setFormData({ full_name: '', phone: '', email: '', notes: '' });
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: '新增失敗',
        description: '請稍後再試',
      });
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.customer_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">客戶列表</h1>
          <p className="text-muted-foreground">共 {customers.length} 位客戶</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新增客戶
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增客戶</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">全名 *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話 *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">電郵</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">備註</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">新增</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜尋客戶 (姓名、電話、編號)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            客戶資料
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {search ? '找不到符合的客戶' : '尚無客戶資料'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  to={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{customer.full_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {customer.customer_id}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </span>
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {customer.pending_count > 0 && (
                      <Badge variant="destructive">{customer.pending_count} 件待取</Badge>
                    )}
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
