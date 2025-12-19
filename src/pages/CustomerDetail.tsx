import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, CheckCircle, Calendar, Edit, Trash2, Phone, Mail as MailIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Customer = Tables<'customers'>;
type MailItem = Tables<'mails'>;

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pendingMails, setPendingMails] = useState<MailItem[]>([]);
  const [pickedUpMails, setPickedUpMails] = useState<MailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [pickupMethod, setPickupMethod] = useState('上門');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [monthFilter, setMonthFilter] = useState<string>('all');

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customerData) {
        navigate('/dashboard/customers');
        return;
      }

      setCustomer(customerData);
      setEditForm({
        full_name: customerData.full_name,
        phone: customerData.phone,
        email: customerData.email || '',
        notes: customerData.notes || '',
      });

      const { data: mailsData, error: mailsError } = await supabase
        .from('mails')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (mailsError) throw mailsError;

      const mails = mailsData || [];
      setPendingMails(mails.filter(m => m.status === '待取'));
      setPickedUpMails(mails.filter(m => m.status === '已取'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupAll = async () => {
    if (pendingMails.length === 0) return;

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('mails')
        .update({ 
          status: '已取', 
          pickup_time: now, 
          pickup_method: pickupMethod 
        })
        .eq('customer_id', id)
        .eq('status', '待取');

      if (error) throw error;

      toast({ title: '取件完成', description: `已取 ${pendingMails.length} 件郵件` });
      setPickupDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error picking up mails:', error);
      toast({ variant: 'destructive', title: '操作失敗', description: '請稍後再試' });
    }
  };

  const handleUpdateCustomer = async () => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          email: editForm.email || null,
          notes: editForm.notes || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: '更新成功' });
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({ variant: 'destructive', title: '更新失敗' });
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      // First delete all mails
      await supabase.from('mails').delete().eq('customer_id', id);
      
      // Then delete customer
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;

      toast({ title: '客戶已刪除' });
      navigate('/dashboard/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({ variant: 'destructive', title: '刪除失敗' });
    }
  };

  const getMonthOptions = () => {
    const months = new Set<string>();
    pickedUpMails.forEach(mail => {
      if (mail.pickup_time) {
        const date = new Date(mail.pickup_time);
        months.add(format(date, 'yyyy-MM'));
      }
    });
    return Array.from(months).sort().reverse();
  };

  const filteredHistory = monthFilter === 'all' 
    ? pickedUpMails 
    : pickedUpMails.filter(mail => {
        if (!mail.pickup_time) return false;
        return format(new Date(mail.pickup_time), 'yyyy-MM') === monthFilter;
      });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/customers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.full_name}</h1>
            <p className="text-muted-foreground">{customer.customer_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Edit className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>編輯客戶</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>全名</Label>
                  <Input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>電話</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>電郵</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>備註</Label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
                <Button onClick={handleUpdateCustomer} className="w-full">儲存</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>確認刪除</DialogTitle>
              </DialogHeader>
              <p>確定要刪除客戶 "{customer.full_name}" 及其所有郵件記錄嗎？此操作無法復原。</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
                <Button variant="destructive" onClick={handleDeleteCustomer}>刪除</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <MailIcon className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.notes && (
              <div className="md:col-span-2 text-muted-foreground">
                備註: {customer.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Mails */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            待取郵件
            <Badge variant="destructive">{pendingMails.length}</Badge>
          </CardTitle>
          {pendingMails.length > 0 && (
            <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  客戶上門取信
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>確認取件</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>將 {pendingMails.length} 件郵件標記為已取？</p>
                  <div className="space-y-2">
                    <Label>取件方式</Label>
                    <Select value={pickupMethod} onValueChange={setPickupMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="上門">上門</SelectItem>
                        <SelectItem value="順豐取件">順豐取件</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handlePickupAll} className="w-full">確認取件</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {pendingMails.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">沒有待取郵件</p>
          ) : (
            <div className="space-y-3">
              {pendingMails.map((mail) => (
                <div key={mail.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">發件人: {mail.sender}</p>
                      <p className="text-sm text-muted-foreground">
                        收件日期: {format(new Date(mail.created_at), 'yyyy年M月d日', { locale: zhTW })}
                      </p>
                    </div>
                    <Badge>待取</Badge>
                  </div>
                  {mail.photos && mail.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {mail.photos.map((photo, idx) => (
                        <img 
                          key={idx} 
                          src={photo} 
                          alt={`Mail photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              取件記錄
              <Badge variant="secondary">{pickedUpMails.length}</Badge>
            </CardTitle>
            {pickedUpMails.length > 0 && (
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="選擇月份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {getMonthOptions().map(month => (
                    <SelectItem key={month} value={month}>
                      {format(new Date(month + '-01'), 'yyyy年M月', { locale: zhTW })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">暫無取件記錄</p>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((mail) => (
                <div key={mail.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">發件人: {mail.sender}</p>
                      <p className="text-sm text-muted-foreground">
                        取件時間: {mail.pickup_time && format(new Date(mail.pickup_time), 'yyyy年M月d日 HH:mm', { locale: zhTW })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        取件方式: {mail.pickup_method}
                      </p>
                    </div>
                    <Badge variant="outline">已取</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
