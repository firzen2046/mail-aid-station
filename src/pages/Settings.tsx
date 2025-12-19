import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Settings as SettingsIcon, Loader2 } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as Setting[];
    }
  });

  useEffect(() => {
    if (settings) {
      const initialData: Record<string, string> = {};
      settings.forEach(setting => {
        initialData[setting.key] = setting.value || '';
      });
      setFormData(initialData);
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('settings')
        .update({ value })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('設置已保存');
    },
    onError: (error) => {
      toast.error('保存失敗：' + error.message);
    }
  });

  const handleSave = (key: string) => {
    updateSettingMutation.mutate({ key, value: formData[key] || '' });
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const settingLabels: Record<string, { label: string; placeholder: string }> = {
    timelinesai_webhook_url: {
      label: 'TimelinesAI Webhook URL',
      placeholder: '輸入 TimelinesAI Inbound Webhook URL'
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">系統設置</h1>
          <p className="text-muted-foreground">管理 API 和通知設定</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API 設定</CardTitle>
          <CardDescription>配置第三方服務的 API 連接</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings?.map(setting => {
            const config = settingLabels[setting.key] || {
              label: setting.key,
              placeholder: `輸入 ${setting.key}`
            };
            
            return (
              <div key={setting.id} className="space-y-2">
                <Label htmlFor={setting.key}>{config.label}</Label>
                {setting.description && (
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                )}
                <div className="flex gap-2">
                  <Input
                    id={setting.key}
                    type="url"
                    value={formData[setting.key] || ''}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    placeholder={config.placeholder}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleSave(setting.key)}
                    disabled={updateSettingMutation.isPending}
                  >
                    {updateSettingMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="ml-2">保存</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
