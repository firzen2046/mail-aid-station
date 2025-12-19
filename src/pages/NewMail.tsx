import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Plus, X, Check, ChevronsUpDown, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Customer = Tables<'customers'>;

export default function NewMail() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sender, setSender] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const searchCustomers = async (query: string) => {
    if (query.length < 1) {
      setCustomers([]);
      return;
    }

    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,customer_id.ilike.%${query}%`)
      .limit(10);

    setCustomers(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    // Create preview URLs
    const newUrls = files.map(file => URL.createObjectURL(file));
    setPhotoUrls([...photoUrls, ...newUrls]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoUrls[index]);
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const handleCreateCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          full_name: newCustomerForm.full_name,
          phone: newCustomerForm.phone,
          email: newCustomerForm.email || null,
          notes: newCustomerForm.notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ variant: 'destructive', title: '此電話號碼已存在' });
          return;
        }
        throw error;
      }

      setSelectedCustomer(data);
      setNewCustomerDialogOpen(false);
      setNewCustomerForm({ full_name: '', phone: '', email: '', notes: '' });
      toast({ title: '客戶已建立' });
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({ variant: 'destructive', title: '建立失敗' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast({ variant: 'destructive', title: '請選擇客戶' });
      return;
    }
    if (!sender.trim()) {
      toast({ variant: 'destructive', title: '請輸入發件人' });
      return;
    }

    setLoading(true);

    try {
      // Upload photos
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `${Date.now()}-${photo.name}`;
        const { data, error } = await supabase.storage
          .from('mail-photos')
          .upload(fileName, photo);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('mail-photos')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      // Create mail record
      const { error } = await supabase.from('mails').insert({
        customer_id: selectedCustomer.id,
        sender: sender.trim(),
        photos: uploadedUrls.length > 0 ? uploadedUrls : null,
      });

      if (error) throw error;

      toast({ title: '郵件已新增' });
      navigate('/dashboard/mails');
    } catch (error) {
      console.error('Error creating mail:', error);
      toast({ variant: 'destructive', title: '新增失敗', description: '請稍後再試' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">新增郵件</h1>
        <p className="text-muted-foreground">登記新收到的郵件</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>郵件資料</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>信封/信件照片</Label>
              <div className="flex flex-wrap gap-3">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs mt-1">上傳照片</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Sender */}
            <div className="space-y-2">
              <Label htmlFor="sender">發件人 *</Label>
              <Input
                id="sender"
                placeholder="輸入發件人名稱"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                required
              />
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>選擇客戶 *</Label>
              <div className="flex gap-2">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="flex-1 justify-between"
                    >
                      {selectedCustomer ? (
                        <span>{selectedCustomer.full_name} ({selectedCustomer.phone})</span>
                      ) : (
                        <span className="text-muted-foreground">搜尋客戶...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="輸入姓名、電話或編號..."
                        value={searchValue}
                        onValueChange={(val) => {
                          setSearchValue(val);
                          searchCustomers(val);
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {searchValue ? '找不到客戶' : '輸入關鍵字搜尋'}
                        </CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.id}
                              onSelect={() => {
                                setSelectedCustomer(customer);
                                setSearchOpen(false);
                                setSearchValue('');
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedCustomer?.id === customer.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div>
                                <p className="font-medium">{customer.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {customer.customer_id} · {customer.phone}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
                  <Button type="button" variant="outline" onClick={() => setNewCustomerDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增客戶</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>全名 *</Label>
                        <Input
                          value={newCustomerForm.full_name}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>電話 *</Label>
                        <Input
                          value={newCustomerForm.phone}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>電郵</Label>
                        <Input
                          value={newCustomerForm.email}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>備註</Label>
                        <Textarea
                          value={newCustomerForm.notes}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                        />
                      </div>
                      <Button 
                        onClick={handleCreateCustomer} 
                        className="w-full"
                        disabled={!newCustomerForm.full_name || !newCustomerForm.phone}
                      >
                        建立客戶
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  上傳中...
                </>
              ) : (
                '新增郵件'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
