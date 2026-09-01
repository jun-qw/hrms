'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CompanyInfoSettings() {
  const company = useSettingsStore((s) => s.company);
  const updateCompany = useSettingsStore((s) => s.updateCompany);

  const [form, setForm] = useState({
    name: '',
    business_number: '',
    ceo_name: '',
    address: '',
    industry: '',
    phone: '',
    fax: '',
    website: '',
  });

  useEffect(() => {
    setForm({ ...company });
  }, [company]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateCompany(form);
    toast.success('회사정보가 저장되었습니다.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>회사정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">회사명</Label>
            <Input
              id="company-name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-number">사업자등록번호</Label>
            <Input
              id="business-number"
              value={form.business_number}
              onChange={(e) => handleChange('business_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ceo-name">대표자명</Label>
            <Input
              id="ceo-name"
              value={form.ceo_name}
              onChange={(e) => handleChange('ceo_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">업종</Label>
            <Input
              id="industry"
              value={form.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fax">팩스</Label>
            <Input
              id="fax"
              value={form.fax}
              onChange={(e) => handleChange('fax', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">주소</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">웹사이트</Label>
          <Input
            id="website"
            value={form.website}
            onChange={(e) => handleChange('website', e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>저장</Button>
        </div>
      </CardContent>
    </Card>
  );
}
