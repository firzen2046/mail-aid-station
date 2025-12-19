import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Search, Mail, Phone, MessageCircle, Package, ChevronDown, ChevronUp, Calendar, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Customer {
  id: string;
  customer_id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface MailItem {
  id: string;
  sender: string;
  photos: string[] | null;
  status: string;
  pickup_time: string | null;
  pickup_method: string | null;
  created_at: string;
}

export default function CustomerLookup() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pendingMails, setPendingMails] = useState<MailItem[]>([]);
  const [pickedUpMails, setPickedUpMails] = useState<MailItem[]>([]);
  const [showPending, setShowPending] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone.trim())
        .maybeSingle();

      if (customerError) throw customerError;

      if (!customerData) {
        setCustomer(null);
        setPendingMails([]);
        setPickedUpMails([]);
        return;
      }

      setCustomer(customerData);

      const { data: mailsData, error: mailsError } = await supabase
        .from('mails')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      if (mailsError) throw mailsError;

      const mails = mailsData || [];
      setPendingMails(mails.filter(m => m.status === '待取'));
      setPickedUpMails(mails.filter(m => m.status === '已取'));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
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

  const whatsappLink = `https://wa.me/85294738464`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="gradient-primary text-primary-foreground py-8 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-accent/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">生意仔有限公司</h1>
          </div>
          <p className="text-primary-foreground/80 text-lg">郵件代收查詢系統</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
        {/* Search Card */}
        <Card className="shadow-xl border-0 animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="w-5 h-5 text-accent" />
              查詢您的郵件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="輸入您的電話號碼"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-12 h-14 text-lg border-2 focus:border-primary"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={loading} 
                size="lg" 
                className="h-14 px-8 text-lg font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {loading ? '查詢中...' : '查詢'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-4 animate-fade-in">
            {!customer ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-medium text-foreground mb-2">找不到此電話號碼的記錄</p>
                  <p className="text-muted-foreground">請確認電話號碼是否正確，或聯絡我們查詢</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Customer Info */}
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="gradient-primary p-6">
                    <div className="flex items-center justify-between text-primary-foreground">
                      <div>
                        <p className="text-sm opacity-80">客戶編號: {customer.customer_id}</p>
                        <h2 className="text-2xl font-bold mt-1">{customer.full_name}</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-80">未取郵件</p>
                        <p className="text-4xl font-bold">{pendingMails.length}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Pending Mails */}
                {pendingMails.length > 0 && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader 
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setShowPending(!showPending)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-destructive" />
                          待取郵件 
                          <Badge variant="destructive" className="ml-2 text-sm">{pendingMails.length}</Badge>
                        </CardTitle>
                        {showPending ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </CardHeader>
                    {showPending && (
                      <CardContent className="space-y-4 pt-0">
                        {pendingMails.map((mail) => (
                          <div key={mail.id} className="border rounded-xl p-4 space-y-3 bg-card hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-lg">發件人: {mail.sender}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  收件日期: {format(new Date(mail.created_at), 'yyyy年M月d日', { locale: zhTW })}
                                </p>
                              </div>
                              <Badge variant="destructive">待取</Badge>
                            </div>
                            {mail.photos && mail.photos.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {mail.photos.map((photo, idx) => (
                                  <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={photo} 
                                      alt={`Mail photo ${idx + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg border-2 hover:border-primary transition-colors"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Pickup History */}
                <Card className="border-0 shadow-lg">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        取件記錄
                        <Badge variant="secondary" className="ml-2">{pickedUpMails.length}</Badge>
                      </CardTitle>
                      {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </CardHeader>
                  {showHistory && (
                    <CardContent className="space-y-4 pt-0">
                      {pickedUpMails.length > 0 && (
                        <Select value={monthFilter} onValueChange={setMonthFilter}>
                          <SelectTrigger className="w-full">
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
                      {filteredHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">暫無取件記錄</p>
                      ) : (
                        filteredHistory.map((mail) => (
                          <div key={mail.id} className="border rounded-xl p-4 space-y-2 bg-card">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">發件人: {mail.sender}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  取件時間: {mail.pickup_time && format(new Date(mail.pickup_time), 'yyyy年M月d日 HH:mm', { locale: zhTW })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  取件方式: {mail.pickup_method}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">已取</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {/* WhatsApp Contact */}
        <Card className="border-2 border-success/30 bg-success/5 shadow-lg">
          <CardContent className="py-5">
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 text-success hover:text-success/80 font-semibold text-lg transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              WhatsApp 聯絡我們: +852 9473 8464
            </a>
          </CardContent>
        </Card>
      </main>

      {/* Staff Login Link */}
      <div className="fixed bottom-4 right-4">
        <Link to="/auth">
          <Button variant="outline" size="sm" className="shadow-lg bg-card hover:bg-primary hover:text-primary-foreground transition-all">
            <LogIn className="w-4 h-4 mr-2" />
            員工登入
          </Button>
        </Link>
      </div>
    </div>
  );
}
