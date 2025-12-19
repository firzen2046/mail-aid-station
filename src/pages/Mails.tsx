import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Mail, Plus, Search, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type MailItem = Tables<'mails'>;
type Customer = Tables<'customers'>;

interface MailWithCustomer extends MailItem {
  customer?: Customer;
}

export default function Mails() {
  const [mails, setMails] = useState<MailWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMail, setSelectedMail] = useState<MailWithCustomer | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMails();
  }, []);

  const fetchMails = async () => {
    try {
      const { data: mailsData, error } = await supabase
        .from('mails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch customer data for each mail
      const mailsWithCustomers: MailWithCustomer[] = [];
      for (const mail of mailsData || []) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', mail.customer_id)
          .maybeSingle();

        mailsWithCustomers.push({
          ...mail,
          customer: customerData || undefined,
        });
      }

      setMails(mailsWithCustomers);
    } catch (error) {
      console.error('Error fetching mails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupSingle = async (mail: MailWithCustomer) => {
    try {
      const { error } = await supabase
        .from('mails')
        .update({
          status: '已取',
          pickup_time: new Date().toISOString(),
          pickup_method: '上門',
        })
        .eq('id', mail.id);

      if (error) throw error;

      toast({ title: '已標記為已取' });
      fetchMails();
    } catch (error) {
      console.error('Error updating mail:', error);
      toast({ variant: 'destructive', title: '操作失敗' });
    }
  };

  const handleDelete = async () => {
    if (!selectedMail) return;

    try {
      const { error } = await supabase.from('mails').delete().eq('id', selectedMail.id);
      if (error) throw error;

      toast({ title: '郵件已刪除' });
      setDeleteDialogOpen(false);
      setSelectedMail(null);
      fetchMails();
    } catch (error) {
      console.error('Error deleting mail:', error);
      toast({ variant: 'destructive', title: '刪除失敗' });
    }
  };

  const filteredMails = mails.filter(mail => {
    const matchesSearch = 
      mail.sender.toLowerCase().includes(search.toLowerCase()) ||
      mail.customer?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      mail.customer?.phone.includes(search);
    
    const matchesStatus = statusFilter === 'all' || mail.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold">郵件管理</h1>
          <p className="text-muted-foreground">共 {mails.length} 封郵件</p>
        </div>
        <Link to="/dashboard/new-mail">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新增郵件
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋 (發件人、客戶名、電話)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="待取">待取</SelectItem>
            <SelectItem value="已取">已取</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mail List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            郵件列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMails.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {search || statusFilter !== 'all' ? '找不到符合的郵件' : '尚無郵件記錄'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredMails.map((mail) => (
                <div key={mail.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">發件人: {mail.sender}</span>
                        <Badge variant={mail.status === '待取' ? 'destructive' : 'outline'}>
                          {mail.status}
                        </Badge>
                      </div>
                      {mail.customer && (
                        <Link 
                          to={`/dashboard/customers/${mail.customer.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          客戶: {mail.customer.full_name} ({mail.customer.phone})
                        </Link>
                      )}
                      <p className="text-sm text-muted-foreground">
                        收件日期: {format(new Date(mail.created_at), 'yyyy年M月d日 HH:mm', { locale: zhTW })}
                      </p>
                      {mail.status === '已取' && mail.pickup_time && (
                        <p className="text-sm text-muted-foreground">
                          取件: {format(new Date(mail.pickup_time), 'yyyy年M月d日 HH:mm', { locale: zhTW })} ({mail.pickup_method})
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {mail.status === '待取' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePickupSingle(mail)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          已取
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => {
                          setSelectedMail(mail);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {mail.photos && mail.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {mail.photos.map((photo, idx) => (
                        <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={photo} 
                            alt={`Mail photo ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
          </DialogHeader>
          <p>確定要刪除這封郵件記錄嗎？此操作無法復原。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
