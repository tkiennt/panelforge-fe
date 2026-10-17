// src/components/modals/SeriesPresetsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Sliders,
  Type,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Save,
  Check,
} from 'lucide-react';
import {
  seriesService,
  TypographyPresetDto,
  CreateTypographyPresetRequest,
  UpdateTypographyPresetRequest,
  ConsistencyRuleDto,
  CreateConsistencyRuleRequest,
  UpdateConsistencyRuleRequest,
} from '@/services/series.service';

interface SeriesPresetsModalProps {
  isOpen: boolean;
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

const COMMON_FONTS = [
  'Wild Words',
  'Anime Ace',
  'CC Astro City',
  'Manga Temple',
  'Bangers',
  'Comic Neue',
  'Inter',
  'Arial',
];

const USAGE_TYPES = ['Dialogue', 'Shout', 'Thought', 'Narrative', 'SFX', 'Custom'];
const RULE_TYPES = ['Character', 'Terminology', 'ReadingOrder', 'Style', 'FactCheck'];
const SEVERITIES = ['Warning', 'Error', 'Info'];

export const SeriesPresetsModal: React.FC<SeriesPresetsModalProps> = ({
  isOpen,
  seriesId,
  seriesTitle,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'typography' | 'consistency'>('typography');

  // Typography Presets State
  const [presets, setPresets] = useState<TypographyPresetDto[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [editingPreset, setEditingPreset] = useState<TypographyPresetDto | null>(null);

  // Typography Form State
  const [presetName, setPresetName] = useState('');
  const [fontFamily, setFontFamily] = useState('Anime Ace');
  const [fontSize, setFontSize] = useState(14);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontStyle, setFontStyle] = useState('Normal');
  const [lineHeight, setLineHeight] = useState(1.2);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textAlign, setTextAlign] = useState('Center');
  const [usageType, setUsageType] = useState('Dialogue');
  const [isDefault, setIsDefault] = useState(false);

  // Consistency Rules State
  const [rules, setRules] = useState<ConsistencyRuleDto[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<ConsistencyRuleDto | null>(null);

  // Consistency Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('Character');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState('Warning');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleIsEnabled, setRuleIsEnabled] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Typography Presets
  const fetchPresets = useCallback(async () => {
    if (!seriesId) return;
    setLoadingPresets(true);
    setError(null);
    try {
      const data = await seriesService.getTypographyPresets(seriesId);
      setPresets(data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải Typography Presets.');
    } finally {
      setLoadingPresets(false);
    }
  }, [seriesId]);

  // Fetch Consistency Rules
  const fetchRules = useCallback(async () => {
    if (!seriesId) return;
    setLoadingRules(true);
    setError(null);
    try {
      const data = await seriesService.getConsistencyRules(seriesId);
      setRules(data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải Consistency Rules.');
    } finally {
      setLoadingRules(false);
    }
  }, [seriesId]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'typography') fetchPresets();
      if (activeTab === 'consistency') fetchRules();
    }
  }, [isOpen, activeTab, fetchPresets, fetchRules]);

  if (!isOpen) return null;

  // ── Typography Preset Handlers ──
  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;
    setActionLoading(true);
    try {
      const payload: CreateTypographyPresetRequest = {
        name: presetName.trim(),
        fontFamily,
        fontSize: Number(fontSize),
        fontWeight: Number(fontWeight),
        fontStyle,
        lineHeight: Number(lineHeight),
        letterSpacing: Number(letterSpacing),
        textAlign,
        usageType,
        isDefault,
      };

      if (editingPreset) {
        await seriesService.updateTypographyPreset(seriesId, editingPreset.id, payload);
        onShowToast?.('Cập nhật Preset thành công', `Đã cập nhật preset "${payload.name}".`);
      } else {
        await seriesService.createTypographyPreset(seriesId, payload);
        onShowToast?.('Tạo Preset thành công', `Đã tạo preset typography "${payload.name}".`);
      }

      setShowAddPreset(false);
      setEditingPreset(null);
      resetPresetForm();
      await fetchPresets();
    } catch (err: any) {
      onShowToast?.('Lỗi Preset', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditPreset = (p: TypographyPresetDto) => {
    setEditingPreset(p);
    setPresetName(p.name);
    setFontFamily(p.fontFamily);
    setFontSize(p.fontSize);
    setFontWeight(p.fontWeight);
    setFontStyle(p.fontStyle);
    setLineHeight(p.lineHeight);
    setLetterSpacing(p.letterSpacing);
    setTextAlign(p.textAlign);
    setUsageType(p.usageType);
    setIsDefault(p.isDefault);
    setShowAddPreset(true);
  };

  const handleDeletePreset = async (p: TypographyPresetDto) => {
    if (!window.confirm(`Xóa Typography Preset "${p.name}"?`)) return;
    setActionLoading(true);
    try {
      await seriesService.deleteTypographyPreset(seriesId, p.id);
      onShowToast?.('Đã xóa', `Đã xóa typography preset "${p.name}".`);
      await fetchPresets();
    } catch (err: any) {
      onShowToast?.('Lỗi xóa', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetPresetForm = () => {
    setPresetName('');
    setFontFamily('Anime Ace');
    setFontSize(14);
    setFontWeight(400);
    setFontStyle('Normal');
    setLineHeight(1.2);
    setLetterSpacing(0);
    setTextAlign('Center');
    setUsageType('Dialogue');
    setIsDefault(false);
  };

  // ── Consistency Rule Handlers ──
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    setActionLoading(true);
    try {
      const payload: CreateConsistencyRuleRequest = {
        name: ruleName.trim(),
        ruleType,
        description: ruleDescription.trim() || undefined,
        severity: ruleSeverity,
        pattern: rulePattern.trim() || undefined,
        isEnabled: ruleIsEnabled,
      };

      if (editingRule) {
        await seriesService.updateConsistencyRule(seriesId, editingRule.id, payload);
        onShowToast?.('Cập nhật Rule thành công', `Đã cập nhật quy tắc "${payload.name}".`);
      } else {
        await seriesService.createConsistencyRule(seriesId, payload);
        onShowToast?.('Tạo Rule thành công', `Đã tạo quy tắc kiểm tra "${payload.name}".`);
      }

      setShowAddRule(false);
      setEditingRule(null);
      resetRuleForm();
      await fetchRules();
    } catch (err: any) {
      onShowToast?.('Lỗi Rule', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRuleStatus = async (r: ConsistencyRuleDto) => {
    try {
      await seriesService.updateConsistencyRule(seriesId, r.id, {
        name: r.name,
        ruleType: r.ruleType,
        description: r.description || undefined,
        severity: r.severity,
        pattern: r.pattern || undefined,
        isEnabled: !r.isEnabled,
      });
      await fetchRules();
    } catch (err: any) {
      onShowToast?.('Lỗi', err.message);
    }
  };

  const handleStartEditRule = (r: ConsistencyRuleDto) => {
    setEditingRule(r);
    setRuleName(r.name);
    setRuleType(r.ruleType);
    setRuleDescription(r.description || '');
    setRuleSeverity(r.severity);
    setRulePattern(r.pattern || '');
    setRuleIsEnabled(r.isEnabled);
    setShowAddRule(true);
  };

  const handleDeleteRule = async (r: ConsistencyRuleDto) => {
    if (!window.confirm(`Xóa quy tắc "${r.name}"?`)) return;
    setActionLoading(true);
    try {
      await seriesService.deleteConsistencyRule(seriesId, r.id);
      onShowToast?.('Đã xóa', `Đã xóa quy tắc "${r.name}".`);
      await fetchRules();
    } catch (err: any) {
      onShowToast?.('Lỗi xóa', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetRuleForm = () => {
    setRuleName('');
    setRuleType('Character');
    setRuleDescription('');
    setRuleSeverity('Warning');
    setRulePattern('');
    setRuleIsEnabled(true);
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5] rounded-t-2xl'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
              <Sliders className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[9px] font-bold'>
                  NFR-08 // PRESETS &amp; RULES
                </span>
                <span className='text-[10px] text-[#888888] font-mono'>
                  Lettering &amp; Consistency
                </span>
              </div>
              <h2 className='text-base font-bold text-[#171717] mt-0.5'>
                Cấu Hình Presets &amp; Rules: {seriesTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className='flex border-b border-[#E7E7E7] bg-[#FAF8F5] px-6 text-xs font-semibold'>
          <button
            onClick={() => setActiveTab('typography')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'typography'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#737373] hover:text-[#171717]'
            }`}
          >
            <Type className='w-4 h-4' />
            <span>Typography Presets ({presets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('consistency')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'consistency'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#737373] hover:text-[#171717]'
            }`}
          >
            <ShieldCheck className='w-4 h-4' />
            <span>Consistency Rules ({rules.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className='p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs'>
          {error && (
            <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2'>
              <AlertCircle className='w-4 h-4 shrink-0' />
              <span>{error}</span>
            </div>
          )}

          {/* ═════════ TAB 1: TYPOGRAPHY PRESETS ═════════ */}
          {activeTab === 'typography' && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <p className='text-[#737373]'>
                  Định nghĩa các mẫu kiểu chữ thoại (Font, Size, Style) để Letterer áp dụng nhanh
                  vào các bóng thoại (UC-08).
                </p>
                <button
                  onClick={() => {
                    resetPresetForm();
                    setEditingPreset(null);
                    setShowAddPreset(!showAddPreset);
                  }}
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer'
                >
                  <Plus className='w-3.5 h-3.5' />
                  <span>{showAddPreset ? 'Đóng' : 'Thêm Typography Preset'}</span>
                </button>
              </div>

              {/* Add / Edit Preset Form */}
              {showAddPreset && (
                <form
                  onSubmit={handleSavePreset}
                  className='p-4 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-3 animate-in fade-in duration-150'
                >
                  <div className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                    <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                    <span>
                      {editingPreset
                        ? `Sửa Preset: ${editingPreset.name}`
                        : 'Tạo Preset Typography Mới'}
                    </span>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Tên Preset *
                      </label>
                      <input
                        type='text'
                        required
                        placeholder='Ví dụ: Thoại Chuẩn, Hét Lớn'
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      />
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>Font Family</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      >
                        {COMMON_FONTS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Mục đích sử dụng (Usage)
                      </label>
                      <select
                        value={usageType}
                        onChange={(e) => setUsageType(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      >
                        {USAGE_TYPES.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>Cỡ chữ (px)</label>
                      <input
                        type='number'
                        min={8}
                        max={72}
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 14)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      />
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Độ dày (Weight)
                      </label>
                      <select
                        value={fontWeight}
                        onChange={(e) => setFontWeight(parseInt(e.target.value, 10) || 400)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      >
                        <option value={400}>Regular (400)</option>
                        <option value={600}>SemiBold (600)</option>
                        <option value={700}>Bold (700)</option>
                        <option value={800}>ExtraBold (800)</option>
                      </select>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Căn lề (Align)
                      </label>
                      <select
                        value={textAlign}
                        onChange={(e) => setTextAlign(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      >
                        <option value='Center'>Center (Giữa)</option>
                        <option value='Left'>Left (Trái)</option>
                        <option value='Right'>Right (Phải)</option>
                      </select>
                    </div>
                  </div>

                  <div className='flex items-center gap-2 pt-1'>
                    <input
                      type='checkbox'
                      id='isDefaultCheck'
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className='rounded accent-[#F97316]'
                    />
                    <label
                      htmlFor='isDefaultCheck'
                      className='text-xs text-[#171717] cursor-pointer'
                    >
                      Đặt làm kiểu chữ mặc định cho Series này
                    </label>
                  </div>

                  {/* Live Preview Box */}
                  <div className='p-3 bg-white border border-[#E7E7E7] rounded-lg space-y-1 text-center'>
                    <span className='text-[10px] text-[#888888] font-mono'>Xem trước mẫu chữ:</span>
                    <div
                      style={{
                        fontFamily,
                        fontSize: `${fontSize}px`,
                        fontWeight,
                        fontStyle: fontStyle.toLowerCase(),
                        textAlign: textAlign.toLowerCase() as any,
                      }}
                      className='text-[#171717] truncate'
                    >
                      Tôi sẽ trở thành thợ săn mạnh nhất thế giới!
                    </div>
                  </div>

                  <div className='flex justify-end gap-2 pt-1'>
                    <button
                      type='button'
                      onClick={() => setShowAddPreset(false)}
                      className='px-3 py-1 rounded-lg border border-[#E7E7E7] bg-white text-[#555555]'
                    >
                      Hủy
                    </button>
                    <button
                      type='submit'
                      disabled={actionLoading}
                      className='px-3.5 py-1 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold flex items-center gap-1.5'
                    >
                      {actionLoading ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        <Save className='w-3 h-3' />
                      )}
                      <span>Lưu Preset</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Presets Grid */}
              {loadingPresets ? (
                <div className='py-8 text-center text-[#888888]'>
                  <Loader2 className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                  <span>Đang tải danh sách Typography Presets...</span>
                </div>
              ) : presets.length === 0 ? (
                <div className='py-8 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E7E7E7] text-[#888888]'>
                  Chưa có Typography Preset nào cho Series này.
                </div>
              ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {presets.map((p) => (
                    <div
                      key={p.id}
                      className='p-3.5 bg-[#FAF8F5] hover:bg-white rounded-xl border border-[#E7E7E7] hover:border-[#F97316] transition-all space-y-2'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-[#171717]'>{p.name}</span>
                          {p.isDefault && (
                            <span className='px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200'>
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className='text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E7E7E7] text-[#555555]'>
                          {p.usageType}
                        </span>
                      </div>

                      <div
                        style={{
                          fontFamily: p.fontFamily,
                          fontSize: `${Math.min(p.fontSize, 18)}px`,
                          fontWeight: p.fontWeight,
                          textAlign: p.textAlign.toLowerCase() as any,
                        }}
                        className='p-2 bg-white rounded-lg border border-[#E7E7E7] text-[#171717] truncate'
                      >
                        Sample Manga Dialogue Text
                      </div>

                      <div className='flex items-center justify-between pt-1 text-[10px] font-mono text-[#737373]'>
                        <span>
                          {p.fontFamily} • {p.fontSize}px • w{p.fontWeight}
                        </span>
                        <div className='flex items-center gap-1'>
                          <button
                            type='button'
                            onClick={() => handleStartEditPreset(p)}
                            className='p-1 hover:text-[#171717]'
                            title='Sửa'
                          >
                            <Edit2 className='w-3 h-3' />
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDeletePreset(p)}
                            className='p-1 hover:text-red-600'
                            title='Xóa'
                          >
                            <Trash2 className='w-3 h-3' />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═════════ TAB 2: CONSISTENCY RULES ═════════ */}
          {activeTab === 'consistency' && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <p className='text-[#737373]'>
                  Các quy tắc kiểm tra tính nhất quán cốt truyện, ngoại hình nhân vật và thuật ngữ
                  trước khi phê duyệt (UC-10, BR-21).
                </p>
                <button
                  onClick={() => {
                    resetRuleForm();
                    setEditingRule(null);
                    setShowAddRule(!showAddRule);
                  }}
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer'
                >
                  <Plus className='w-3.5 h-3.5' />
                  <span>{showAddRule ? 'Đóng' : 'Thêm Consistency Rule'}</span>
                </button>
              </div>

              {/* Add / Edit Rule Form */}
              {showAddRule && (
                <form
                  onSubmit={handleSaveRule}
                  className='p-4 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl space-y-3 animate-in fade-in duration-150'
                >
                  <div className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                    <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                    <span>
                      {editingRule
                        ? `Sửa Quy Tắc: ${editingRule.name}`
                        : 'Tạo Quy Tắc Nhất Quán Mới'}
                    </span>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Tên Quy Tắc *
                      </label>
                      <input
                        type='text'
                        required
                        placeholder='Ví dụ: Kiểm tra vết sẹo mắt phải'
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      />
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Loại Quy Tắc (Type)
                      </label>
                      <select
                        value={ruleType}
                        onChange={(e) => setRuleType(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      >
                        {RULE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Mức Độ Cảnh Báo (Severity)
                      </label>
                      <select
                        value={ruleSeverity}
                        onChange={(e) => setRuleSeverity(e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                      >
                        {SEVERITIES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className='block font-semibold text-[#171717] mb-1'>Mô Tả Quy Tắc</label>
                    <textarea
                      rows={2}
                      placeholder='Mô tả chi tiết nội dung cần kiểm tra đối chiếu với Series Bible...'
                      value={ruleDescription}
                      onChange={(e) => setRuleDescription(e.target.value)}
                      className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                    />
                  </div>

                  <div className='flex items-center gap-2 pt-1'>
                    <input
                      type='checkbox'
                      id='ruleEnabledCheck'
                      checked={ruleIsEnabled}
                      onChange={(e) => setRuleIsEnabled(e.target.checked)}
                      className='rounded accent-[#F97316]'
                    />
                    <label
                      htmlFor='ruleEnabledCheck'
                      className='text-xs text-[#171717] cursor-pointer'
                    >
                      Kích hoạt kiểm tra tự động quy tắc này
                    </label>
                  </div>

                  <div className='flex justify-end gap-2 pt-1'>
                    <button
                      type='button'
                      onClick={() => setShowAddRule(false)}
                      className='px-3 py-1 rounded-lg border border-[#E7E7E7] bg-white text-[#555555]'
                    >
                      Hủy
                    </button>
                    <button
                      type='submit'
                      disabled={actionLoading}
                      className='px-3.5 py-1 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold flex items-center gap-1.5'
                    >
                      {actionLoading ? (
                        <Loader2 className='w-3 h-3 animate-spin' />
                      ) : (
                        <Save className='w-3 h-3' />
                      )}
                      <span>Lưu Quy Tắc</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Rules List */}
              {loadingRules ? (
                <div className='py-8 text-center text-[#888888]'>
                  <Loader2 className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                  <span>Đang tải danh sách Consistency Rules...</span>
                </div>
              ) : rules.length === 0 ? (
                <div className='py-8 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E7E7E7] text-[#888888]'>
                  Chưa có Consistency Rule nào cho Series này.
                </div>
              ) : (
                <div className='space-y-2.5'>
                  {rules.map((r) => (
                    <div
                      key={r.id}
                      className='p-3.5 bg-[#FAF8F5] hover:bg-white rounded-xl border border-[#E7E7E7] transition-all flex items-start justify-between gap-3'
                    >
                      <div className='space-y-1 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-[#171717]'>{r.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              r.severity === 'Error'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : r.severity === 'Warning'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {r.severity}
                          </span>
                          <span className='text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E7E7E7] text-[#555555]'>
                            {r.ruleType}
                          </span>
                        </div>
                        <p className='text-[11px] text-[#555555] leading-relaxed'>
                          {r.description || 'Không có mô tả chi tiết.'}
                        </p>
                      </div>

                      <div className='flex items-center gap-2 shrink-0'>
                        <button
                          type='button'
                          onClick={() => handleToggleRuleStatus(r)}
                          className='p-1 text-[#888888] hover:text-[#171717]'
                          title={
                            r.isEnabled ? 'Đang bật - Click để tắt' : 'Đang tắt - Click để bật'
                          }
                        >
                          {r.isEnabled ? (
                            <ToggleRight className='w-6 h-6 text-[#10B981]' />
                          ) : (
                            <ToggleLeft className='w-6 h-6 text-[#888888]' />
                          )}
                        </button>
                        <button
                          type='button'
                          onClick={() => handleStartEditRule(r)}
                          className='p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] text-[#555555]'
                        >
                          <Edit2 className='w-3.5 h-3.5' />
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDeleteRule(r)}
                          className='p-1.5 rounded-lg hover:bg-red-50 text-[#888888] hover:text-red-600'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-4 bg-[#FAF8F5] border-t border-[#E7E7E7] rounded-b-2xl flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 bg-[#171717] hover:bg-black text-white font-semibold rounded-lg text-xs'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
