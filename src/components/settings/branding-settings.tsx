'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Loader2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuth } from '@/lib/hooks/use-auth';
import { isValidHex } from '@/lib/utils/color';
import {
  deleteBrandingAsset,
  listBrandingAssets,
  uploadBrandingAsset,
} from '@/lib/actions/branding-actions';
import {
  MAX_ASSET_BYTES,
  type BrandingAssetMeta,
  type BrandingKind,
} from '@/lib/branding';

/** Ready-made brand colours so an admin does not have to know hex codes. */
const COLOR_PRESETS = [
  { name: '인디고', value: '#4f46e5' },
  { name: '블루', value: '#2563eb' },
  { name: '틸', value: '#0d9488' },
  { name: '그린', value: '#16a34a' },
  { name: '앰버', value: '#d97706' },
  { name: '레드', value: '#dc2626' },
  { name: '퍼플', value: '#7c3aed' },
  { name: '슬레이트', value: '#475569' },
];

const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,.ico';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** Strips the data URL prefix a FileReader result carries. */
function splitDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  return m ? { mime: m[1], base64: m[2] } : null;
}

export function BrandingSettings() {
  const { role } = useAuth();
  const branding = useSettingsStore((s) => s.branding);
  const updateBranding = useSettingsStore((s) => s.updateBranding);

  const [assets, setAssets] = useState<BrandingAssetMeta[]>([]);
  const [busy, setBusy] = useState<BrandingKind | null>(null);
  const [colorDraft, setColorDraft] = useState(branding.primary_color);
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listBrandingAssets().then(setAssets);
  }, []);

  useEffect(() => {
    setColorDraft(branding.primary_color);
  }, [branding.primary_color]);

  const isAdmin = role === 'admin';
  const logo = assets.find((a) => a.kind === 'logo');
  const favicon = assets.find((a) => a.kind === 'favicon');

  const handleUpload = async (kind: BrandingKind, file: File) => {
    if (file.size > MAX_ASSET_BYTES) {
      toast.error(`파일이 너무 큽니다. ${formatBytes(MAX_ASSET_BYTES)} 이하로 올려주세요.`);
      return;
    }
    setBusy(kind);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const parts = splitDataUrl(dataUrl);
      if (!parts) {
        toast.error('파일을 읽을 수 없습니다.');
        return;
      }
      const result = await uploadBrandingAsset(kind, parts.base64, parts.mime, file.name);
      if (!result.ok || !result.asset) {
        toast.error(
          result.error === 'too_large'
            ? '파일이 너무 큽니다.'
            : result.error === 'unsupported_type'
              ? 'PNG, JPG, WEBP, SVG, ICO 파일만 올릴 수 있습니다.'
              : result.error === 'forbidden'
                ? '권한이 없습니다.'
                : '업로드에 실패했습니다.',
        );
        return;
      }
      const saved = result.asset;
      setAssets((prev) => [...prev.filter((a) => a.kind !== kind), saved]);
      // The version busts the long cache on the asset route.
      const version = saved.updatedAt ?? String(Date.now());
      updateBranding(kind === 'logo' ? { logo_version: version } : { favicon_version: version });
      toast.success(kind === 'logo' ? '로고가 등록되었습니다.' : '파비콘이 등록되었습니다.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (kind: BrandingKind) => {
    setBusy(kind);
    try {
      const ok = await deleteBrandingAsset(kind);
      if (!ok) {
        toast.error('삭제에 실패했습니다.');
        return;
      }
      setAssets((prev) => prev.filter((a) => a.kind !== kind));
      updateBranding(kind === 'logo' ? { logo_version: '' } : { favicon_version: '' });
      toast.success('삭제되었습니다.');
    } finally {
      setBusy(null);
    }
  };

  const commitColor = (value: string) => {
    if (!isValidHex(value)) {
      toast.error('색상 코드를 확인해주세요. (예: #4f46e5)');
      setColorDraft(branding.primary_color);
      return;
    }
    updateBranding({ primary_color: value });
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">브랜딩</CardTitle>
          <CardDescription>브랜딩 설정은 시스템 관리자만 변경할 수 있습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">제품 표기</CardTitle>
          <CardDescription>
            사이드바, 로그인 화면, 브라우저 탭에 표시되는 이름입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branding-app-name">시스템 이름</Label>
            <Input
              id="branding-app-name"
              value={branding.app_name}
              placeholder="HRMS"
              onChange={(e) => updateBranding({ app_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branding-tagline">로그인 화면 문구</Label>
            <Input
              id="branding-tagline"
              value={branding.login_tagline}
              placeholder="인사관리시스템"
              onChange={(e) => updateBranding({ login_tagline: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">로고</CardTitle>
          <CardDescription>
            PNG, JPG, WEBP, SVG · 최대 {formatBytes(MAX_ASSET_BYTES)}. 가로로 긴 로고를 권장합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-48 items-center justify-center rounded-lg border bg-muted/30 p-2">
              {branding.logo_version ? (
                // eslint-disable-next-line @next/next/no-img-element -- served from a DB route
                <img
                  src={`/api/branding/logo?v=${encodeURIComponent(branding.logo_version)}`}
                  alt="로고 미리보기"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">등록된 로고 없음</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={logoInput}
                type="file"
                accept={ACCEPT}
                className="hidden"
                data-testid="branding-logo-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload('logo', f);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInput.current?.click()}
                  disabled={busy === 'logo'}
                >
                  {busy === 'logo' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  로고 업로드
                </Button>
                {branding.logo_version && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete('logo')}
                    disabled={busy === 'logo'}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                )}
              </div>
              {logo && (
                <p className="text-xs text-muted-foreground">
                  {logo.fileName} · {formatBytes(logo.byteSize)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">인쇄물에 로고 사용</p>
              <p className="text-xs text-muted-foreground">
                급여명세서와 각종 증명서 상단에 로고를 함께 출력합니다.
              </p>
            </div>
            <Switch
              checked={branding.use_logo_in_print}
              onCheckedChange={(v) => updateBranding({ use_logo_in_print: v })}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted/30 p-2">
              {branding.favicon_version ? (
                // eslint-disable-next-line @next/next/no-img-element -- served from a DB route
                <img
                  src={`/api/branding/favicon?v=${encodeURIComponent(branding.favicon_version)}`}
                  alt="파비콘 미리보기"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground text-center">기본</span>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">파비콘 (브라우저 탭 아이콘)</p>
              <input
                ref={faviconInput}
                type="file"
                accept={ACCEPT}
                className="hidden"
                data-testid="branding-favicon-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload('favicon', f);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => faviconInput.current?.click()}
                  disabled={busy === 'favicon'}
                >
                  {busy === 'favicon' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  파비콘 업로드
                </Button>
                {branding.favicon_version && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete('favicon')}
                    disabled={busy === 'favicon'}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                )}
              </div>
              {favicon && (
                <p className="text-xs text-muted-foreground">
                  {favicon.fileName} · {formatBytes(favicon.byteSize)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            브랜드 색상
          </CardTitle>
          <CardDescription>
            버튼, 강조 표시, 차트 등 시스템 전체의 주요 색상에 즉시 반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.name}
                aria-label={preset.name}
                onClick={() => updateBranding({ primary_color: preset.value })}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  branding.primary_color.toLowerCase() === preset.value
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="branding-color">색상 코드</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="색상 선택기"
                  value={isValidHex(colorDraft) ? colorDraft : '#4f46e5'}
                  onChange={(e) => {
                    setColorDraft(e.target.value);
                    updateBranding({ primary_color: e.target.value });
                  }}
                  className="h-9 w-12 cursor-pointer rounded border bg-transparent p-1"
                />
                <Input
                  id="branding-color"
                  className="w-32 font-mono"
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                  onBlur={(e) => commitColor(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateBranding({ primary_color: '#4f46e5' })}
            >
              기본값으로
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-xs text-muted-foreground">미리보기</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">기본 버튼</Button>
              <Button size="sm" variant="outline">
                보조 버튼
              </Button>
              <span className="rounded-md bg-accent-blue-subtle px-2 py-1 text-xs text-accent-blue">
                강조 배지
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
