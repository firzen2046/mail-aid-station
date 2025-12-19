import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Search, Mail, Phone, MessageCircle, Package, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
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
  const [showPending, setShowPending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      // Find customer by phone
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

      // Fetch mails for this customer
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-2xl font-bold">生意仔有限公司</h1>
          </div>
          <p className="text-primary-foreground/80">郵件代收查詢系統</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Search Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              查詢您的郵件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="輸入您的電話號碼"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 text-lg h-12"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} size="lg" className="px-6">
                {loading ? '查詢中...' : '查詢'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <>
            {!customer ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">找不到此電話號碼的記錄</p>
                  <p className="mt-2">請確認電話號碼是否正確，或聯絡我們查詢</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Customer Info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">客戶編號: {customer.customer_id}</p>
                        <h2 className="text-xl font-semibold">{customer.full_name}</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">未取郵件</p>
                        <p className="text-3xl font-bold text-primary">{pendingMails.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Mails */}
                {pendingMails.length > 0 && (
                  <Card>
                    <CardHeader 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setShowPending(!showPending)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          待取郵件 
                          <Badge variant="destructive">{pendingMails.length}</Badge>
                        </CardTitle>
                        {showPending ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </CardHeader>
                    {showPending && (
                      <CardContent className="space-y-4">
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
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Pickup History */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        取件記錄
                        <Badge variant="secondary">{pickedUpMails.length}</Badge>
                      </CardTitle>
                      {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </CardHeader>
                  {showHistory && (
                    <CardContent className="space-y-4">
                      {pickedUpMails.length > 0 && (
                        <Select value={monthFilter} onValueChange={setMonthFilter}>
                          <SelectTrigger>
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
                        <p className="text-center text-muted-foreground py-4">暫無取件記錄</p>
                      ) : (
                        filteredHistory.map((mail) => (
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
                        ))
                      )}
                    </CardContent>
                  )}
                </Card>
              </>
            )}
          </>
        )}

        {/* WhatsApp Contact */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-green-700 hover:text-green-800 font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp 聯絡我們: +852 9473 8464
            </a>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
