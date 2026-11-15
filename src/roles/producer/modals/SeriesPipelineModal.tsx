// src/components/modals/SeriesPipelineModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  pipelineService,
  SeriesPipelineDto,
  PipelineStageDto,
  PipelineRole,
  AddPipelineStageRequest,
  UpdatePipelineStageRequest,
} from '@/services/pipeline.service';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { Modal } from '@/shared/ui';

interface SeriesPipelineModalProps {
  isOpen: boolean;
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

const AVAILABLE_ROLES: PipelineRole[] = ['Producer', 'Artist', 'Letterer', 'Editor'];

const ROLE_COLORS: Record<string, string> = {
  Producer: 'bg-purple-100 text-purple-700 border-purple-200',
  Artist: 'bg-blue-100 text-blue-700 border-blue-200',
  Letterer: 'bg-pink-100 text-pink-700 border-pink-200',
  Editor: 'bg-amber-100 text-amber-700 border-amber-200',
};

export const SeriesPipelineModal: React.FC<SeriesPipelineModalProps> = ({
  isOpen,
  seriesId,
  seriesTitle,
  onClose,
  onShowToast,
}) => {
  const confirm = useConfirm();
  const [pipeline, setPipeline] = useState<SeriesPipelineDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State for Add / Edit Stage
  const [isEditing, setIsEditing] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageName, setStageName] = useState('');
  const [stageSlug, setStageSlug] = useState('');
  const [stageColor, setStageColor] = useState('#F97316');
  const [stageRole, setStageRole] = useState<PipelineRole | ''>('Artist');
  const [isApprovalGate, setIsApprovalGate] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>(2);
  const [isEnabled, setIsEnabled] = useState(true);
  const [stageTrack, setStageTrack] = useState<string>('');
  const [editingStageInitialOrTerminal, setEditingStageInitialOrTerminal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchPipeline = async () => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pipelineService.getSeriesPipeline(seriesId);
      setPipeline(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải cấu hình Pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPipeline();
    }
    // Chỉ tải lại khi mở modal hoặc đổi Series; fetchPipeline được tạo lại mỗi render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seriesId]);

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditing(false);
    setEditingStageId(null);
    setStageName('');
    setStageSlug('');
    setStageColor('#F97316');
    setStageRole('Artist');
    setIsApprovalGate(false);
    setEstimatedDuration(2);
    setIsEnabled(true);
    setStageTrack('');
    setEditingStageInitialOrTerminal(false);
    setShowAddForm(false);
    setError(null);
  };

  const handleStartEdit = (stage: PipelineStageDto) => {
    setIsEditing(true);
    setEditingStageId(stage.id);
    setStageName(stage.name);
    setStageSlug(stage.slug);
    setStageColor(stage.colorCode || '#F97316');
    setStageRole(stage.allowedRole || '');
    setIsApprovalGate(stage.isApprovalGate);
    setEstimatedDuration(stage.estimatedDurationDays ?? '');
    setIsEnabled(stage.isEnabled !== false);
    setStageTrack(stage.track ? stage.track.trim().toUpperCase() : '');
    setEditingStageInitialOrTerminal(stage.isInitial || stage.isTerminal);
    setShowAddForm(true);
    setError(null);
  };

  const handleToggleStage = async (stage: PipelineStageDto) => {
    if (stage.isInitial || stage.isTerminal) {
      setError('Không thể tắt công đoạn khởi tạo hoặc kết thúc.');
      return;
    }
    const prevPipeline = pipeline;
    const newEnabled = stage.isEnabled === false;
    setActionLoading(true);
    setError(null);
    setPipeline((prev) =>
      prev
        ? {
            ...prev,
            stages: prev.stages.map((s) =>
              s.id === stage.id ? { ...s, isEnabled: newEnabled } : s,
            ),
          }
        : prev,
    );
    try {
      const payload: UpdatePipelineStageRequest = {
        name: stage.name,
        colorCode: stage.colorCode,
        allowedRole: stage.allowedRole,
        isApprovalGate: stage.isApprovalGate,
        estimatedDurationDays: stage.estimatedDurationDays,
        isEnabled: newEnabled,
        track: stage.track ?? undefined,
      };
      const updated = await pipelineService.updateStage(seriesId, stage.id, payload);
      setPipeline(updated);
      onShowToast?.(
        newEnabled ? 'Đã bật công đoạn' : 'Đã tắt công đoạn',
        `Công đoạn "${stage.name}" hiện đã ${newEnabled ? 'được bật' : 'tắt'}.`,
      );
    } catch (err: any) {
      setPipeline(prevPipeline);
      const msg = err.message || 'Không thể thay đổi trạng thái công đoạn.';
      setError(msg);
      onShowToast?.('Không thể cập nhật công đoạn', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) {
      setError('Vui lòng nhập tên công đoạn.');
      return;
    }

    const prevPipeline = pipeline;
    setActionLoading(true);
    setError(null);
    try {
      if (isEditing && editingStageId) {
        const payload: UpdatePipelineStageRequest = {
          name: stageName.trim(),
          colorCode: stageColor || null,
          allowedRole: (stageRole as PipelineRole) || null,
          isApprovalGate,
          estimatedDurationDays: typeof estimatedDuration === 'number' ? estimatedDuration : null,
          isEnabled,
          track: stageTrack,
        };
        const updated = await pipelineService.updateStage(seriesId, editingStageId, payload);
        setPipeline(updated);
        onShowToast?.('Cập nhật thành công', `Đã cập nhật công đoạn "${stageName.trim()}".`);
      } else {
        const payload: AddPipelineStageRequest = {
          name: stageName.trim(),
          slug: stageSlug.trim() || undefined,
          colorCode: stageColor || undefined,
          allowedRole: (stageRole as PipelineRole) || undefined,
          isApprovalGate,
          estimatedDurationDays:
            typeof estimatedDuration === 'number' ? estimatedDuration : undefined,
        };
        const updated = await pipelineService.addStage(seriesId, payload);
        setPipeline(updated);
        onShowToast?.('Thêm công đoạn thành công', `Đã thêm "${stageName.trim()}" vào Pipeline.`);
      }
      resetForm();
    } catch (err: any) {
      setPipeline(prevPipeline);
      if (
        isEditing &&
        editingStageId &&
        prevPipeline &&
        (err.code === 'CONFLICT' || err.status === 409)
      ) {
        const orig = prevPipeline.stages.find((s) => s.id === editingStageId);
        if (orig) {
          setIsEnabled(orig.isEnabled !== false);
          setStageTrack(orig.track ? orig.track.trim().toUpperCase() : '');
          setStageRole(orig.allowedRole || '');
        }
      }
      const msg = err.message || 'Thao tác không thành công.';
      setError(msg);
      onShowToast?.('Không thể lưu công đoạn', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    if (!pipeline || !pipeline.stages) return;
    const prevPipeline = pipeline;
    const stages = [...pipeline.stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    // Swap
    const temp = stages[index];
    stages[index] = stages[targetIndex];
    stages[targetIndex] = temp;

    const newOrderIds = stages.map((s) => s.id);
    setActionLoading(true);
    setError(null);
    setPipeline({
      ...pipeline,
      stages: stages.map((s, idx) => ({ ...s, stageOrder: idx + 1 })),
    });
    try {
      const updated = await pipelineService.reorderStages(seriesId, newOrderIds);
      setPipeline(updated);
      onShowToast?.('Sắp xếp hoàn tất', 'Đã lưu thứ tự công đoạn mới.');
    } catch (err: any) {
      setPipeline(prevPipeline);
      const msg = err.message || 'Không thể đổi thứ tự công đoạn.';
      setError(msg);
      onShowToast?.('Không thể đổi thứ tự công đoạn', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStage = async (stage: PipelineStageDto) => {
    if (
      !(await confirm({
        title: `Xóa công đoạn "${stage.name}"?`,
        description:
          'Thao tác này sẽ tự động tái cấu trúc lại các bước chuyển giao (Transitions) giữa các công đoạn còn lại.',
        confirmText: 'Xóa công đoạn',
        cancelText: 'Giữ lại',
        variant: 'danger',
      }))
    ) {
      return;
    }

    const prevPipeline = pipeline;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await pipelineService.deleteStage(seriesId, stage.id);
      setPipeline(updated);
      onShowToast?.('Đã xóa công đoạn', `Đã xóa "${stage.name}" khỏi quy trình.`);
    } catch (err: any) {
      setPipeline(prevPipeline);
      const rawMsg = err.message || 'Không thể xóa công đoạn.';
      const isConflict = err.code === 'CONFLICT' || err.status === 409;
      const hasDisableHint =
        /tắt công đoạn thay vì xoá|tắt công đoạn thay vì xóa|tắt thay vì/i.test(rawMsg);
      const msg =
        isConflict && !hasDisableHint ? `${rawMsg} Gợi ý: Tắt công đoạn thay vì xoá.` : rawMsg;
      setError(msg);
      onShowToast?.('Không thể xóa công đoạn', msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='xl'
      title='Cấu Hình Quy Trình Sản Xuất (Pipeline Stages)'
      description={`Series: ${seriesTitle}`}
      closeLabel='Đóng modal'
    >
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-[#E7E7E7] bg-[#FAF8F5]'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#F97316]'>
              <Layers className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
                  UC-03 // PIPELINE CONFIG
                </span>
                <span className='text-xs text-[#888888] font-mono'>Series: {seriesTitle}</span>
              </div>
              <h2 className='text-lg font-bold text-[#171717]'>
                Cấu Hình Quy Trình Sản Xuất (Pipeline Stages)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg flex items-center justify-center text-[#888888] hover:text-[#171717] hover:bg-black/5 transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content Body */}
        <div className='p-6 overflow-y-auto space-y-6 flex-1 text-xs'>
          {error && (
            <div className='p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5'>
              <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
              <div className='space-y-1'>
                <div className='font-bold text-xs'>Thông báo hệ thống</div>
                <div className='text-xs leading-relaxed'>{error}</div>
              </div>
            </div>
          )}

          {loading ? (
            <div className='py-16 text-center text-[#888888] space-y-2'>
              <Loader2 className='w-6 h-6 animate-spin mx-auto text-[#F97316]' />
              <p>Đang tải cấu hình Pipeline từ hệ thống...</p>
            </div>
          ) : !pipeline ? (
            <div className='py-12 text-center text-[#888888]'>
              Không tìm thấy cấu hình Pipeline cho Series này.
            </div>
          ) : (
            <>
              {/* Pipeline Overview Banner */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                <div className='bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E7E7]'>
                  <div className='text-[10px] text-[#888888] uppercase font-mono'>
                    Tổng số Stage
                  </div>
                  <div className='text-lg font-bold text-[#171717] mt-0.5'>
                    {pipeline.stages.length} công đoạn
                  </div>
                </div>
                <div className='bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E7E7]'>
                  <div className='text-[10px] text-[#888888] uppercase font-mono'>
                    Cổng Phê Duyệt
                  </div>
                  <div className='text-lg font-bold text-[#F97316] mt-0.5 flex items-center gap-1.5'>
                    <Shield className='w-4 h-4' />
                    <span>{pipeline.stages.filter((s) => s.isApprovalGate).length} Gate</span>
                  </div>
                </div>
                <div className='bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E7E7]'>
                  <div className='text-[10px] text-[#888888] uppercase font-mono'>
                    Bước Chuyển (Transitions)
                  </div>
                  <div className='text-lg font-bold text-[#059669] mt-0.5 flex items-center gap-1.5'>
                    <ArrowRight className='w-4 h-4' />
                    <span>{pipeline.transitions.length} luồng</span>
                  </div>
                </div>
                <div className='bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E7E7]'>
                  <div className='text-[10px] text-[#888888] uppercase font-mono'>
                    Tự Động Sinh Transition
                  </div>
                  <div className='text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1'>
                    <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                    <span>Active (Backend Engine)</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className='flex items-center justify-between pt-2'>
                <h3 className='font-bold text-sm text-[#171717] flex items-center gap-2'>
                  <Layers className='w-4 h-4 text-[#F97316]' />
                  <span>Danh Sách Công Đoạn Sản Xuất (Theo Thứ Tự Tiến)</span>
                </h3>
                {!showAddForm && (
                  <button
                    onClick={() => {
                      resetForm();
                      setShowAddForm(true);
                    }}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs'
                  >
                    <Plus className='w-3.5 h-3.5' />
                    <span>Thêm Công Đoạn Mới</span>
                  </button>
                )}
              </div>

              <div
                data-testid='pipeline-thumbnail-hint'
                className='rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-[11px] text-amber-900'
              >
                💡 Gợi ý: Muốn bỏ Thumbnail: tắt công đoạn rồi bấm Sinh / Đồng bộ ô việc ở lưới.
              </div>

              {/* Form Add / Edit */}
              {showAddForm && (
                <form
                  onSubmit={handleSaveStage}
                  className='p-4 bg-[#FFF7ED] rounded-xl border border-[#FDBA74] space-y-3.5 animate-in fade-in'
                >
                  <div className='flex items-center justify-between border-b border-[#FDBA74]/50 pb-2'>
                    <span className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                      <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                      {isEditing
                        ? `Chỉnh sửa công đoạn: ${stageName}`
                        : 'Thêm công đoạn mới vào Pipeline'}
                    </span>
                    <button
                      type='button'
                      onClick={resetForm}
                      className='text-[#888888] hover:text-[#171717] cursor-pointer'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Tên công đoạn *
                      </label>
                      <input
                        type='text'
                        required
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        placeholder='VD: Color Pass, AI Cleanup...'
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:border-[#F97316] outline-none'
                      />
                    </div>

                    {!isEditing && (
                      <div>
                        <label className='block font-semibold text-[#171717] mb-1'>
                          Slug (mã định danh duy nhất)
                        </label>
                        <input
                          type='text'
                          value={stageSlug}
                          onChange={(e) => setStageSlug(e.target.value)}
                          placeholder='Bỏ trống sẽ tự sinh từ tên'
                          className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:border-[#F97316] outline-none font-mono'
                        />
                      </div>
                    )}

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Vai trò phụ trách (Allowed Role)
                      </label>
                      <select
                        value={stageRole}
                        onChange={(e) => setStageRole(e.target.value as any)}
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:border-[#F97316] outline-none'
                      >
                        <option value=''>Tất cả thành viên</option>
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Mã màu (Hex Code)
                      </label>
                      <div className='flex items-center gap-2'>
                        <input
                          type='color'
                          value={stageColor}
                          onChange={(e) => setStageColor(e.target.value)}
                          className='w-7 h-7 rounded border border-[#E7E7E7] cursor-pointer'
                        />
                        <input
                          type='text'
                          value={stageColor}
                          onChange={(e) => setStageColor(e.target.value)}
                          className='flex-1 px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs font-mono focus:border-[#F97316] outline-none'
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Thời gian dự kiến (Ngày)
                      </label>
                      <input
                        type='number'
                        min={1}
                        value={estimatedDuration}
                        onChange={(e) =>
                          setEstimatedDuration(e.target.value ? parseInt(e.target.value, 10) : '')
                        }
                        placeholder='2'
                        className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:border-[#F97316] outline-none'
                      />
                    </div>

                    <div className='flex items-center gap-2 pt-5'>
                      <input
                        type='checkbox'
                        id='isApprovalGate'
                        checked={isApprovalGate}
                        onChange={(e) => setIsApprovalGate(e.target.checked)}
                        className='w-4 h-4 accent-[#F97316] cursor-pointer'
                      />
                      <label
                        htmlFor='isApprovalGate'
                        className='font-bold text-[#171717] cursor-pointer select-none'
                      >
                        Cổng duyệt (Approval Gate)
                      </label>
                    </div>

                    {isEditing && (
                      <div>
                        <label
                          htmlFor='stageTrackSelect'
                          className='block font-semibold text-[#171717] mb-1'
                        >
                          Nhánh song song (Track BR-19)
                        </label>
                        <select
                          id='stageTrackSelect'
                          value={stageTrack}
                          onChange={(e) => setStageTrack(e.target.value)}
                          className='w-full px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:border-[#F97316] outline-none'
                        >
                          <option value=''>Bước chung (Không phân nhánh)</option>
                          <option value='A'>Nhánh A (Ink → Color)</option>
                          <option value='B'>Nhánh B (Lettering)</option>
                        </select>
                      </div>
                    )}

                    {isEditing && (
                      <div className='flex flex-col gap-1 pt-3 col-span-full border-t border-[#FDBA74]/40'>
                        <div className='flex items-center gap-2'>
                          <input
                            type='checkbox'
                            id='stageIsEnabled'
                            disabled={editingStageInitialOrTerminal}
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className='w-4 h-4 accent-[#F97316] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                          />
                          <label
                            htmlFor='stageIsEnabled'
                            className={`font-bold select-none cursor-pointer ${
                              editingStageInitialOrTerminal
                                ? 'text-zinc-400 cursor-not-allowed'
                                : 'text-[#171717]'
                            }`}
                          >
                            Bật công đoạn này (Enabled)
                          </label>
                          {editingStageInitialOrTerminal && (
                            <span className='text-[10px] text-zinc-500 italic'>
                              (Không thể tắt công đoạn khởi tạo hoặc kết thúc)
                            </span>
                          )}
                        </div>
                        <p className='text-[11px] text-[#888888]'>
                          Gợi ý: Truyện trắng đen → tắt Color (hoặc tắt bất kỳ công đoạn không cần
                          thiết mà không phải xoá).
                        </p>
                      </div>
                    )}
                  </div>

                  <div className='flex items-center justify-end gap-2 pt-2 border-t border-[#FDBA74]/50'>
                    <button
                      type='button'
                      onClick={resetForm}
                      className='px-3 py-1.5 border border-[#E7E7E7] bg-white rounded-lg font-medium text-[#555555] hover:bg-[#FAF8F5]'
                    >
                      Hủy
                    </button>
                    <button
                      type='submit'
                      disabled={actionLoading}
                      className='px-4 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50'
                    >
                      {actionLoading ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : null}
                      <span>{isEditing ? 'Lưu Thay Đổi' : 'Xác Nhận Thêm'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Stages List */}
              <div className='space-y-2'>
                {pipeline.stages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-2xs group ${
                      stage.isEnabled === false
                        ? 'opacity-65 bg-zinc-100/90 border-dashed border-zinc-300'
                        : 'bg-[#FAF8F5] hover:bg-white border-[#E7E7E7] hover:border-[#171717]'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      {/* Move Up/Down Controls */}
                      <div className='flex flex-col gap-0.5'>
                        <button
                          type='button'
                          disabled={idx === 0 || actionLoading}
                          onClick={() => handleMoveStage(idx, 'up')}
                          className='p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed'
                          title='Di chuyển lên trước'
                        >
                          <ChevronUp className='w-3.5 h-3.5' />
                        </button>
                        <button
                          type='button'
                          disabled={idx === pipeline.stages.length - 1 || actionLoading}
                          onClick={() => handleMoveStage(idx, 'down')}
                          className='p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed'
                          title='Di chuyển xuống sau'
                        >
                          <ChevronDown className='w-3.5 h-3.5' />
                        </button>
                      </div>

                      {/* Stage Order Badge */}
                      <span className='w-6 h-6 rounded-full bg-[#171717] text-white flex items-center justify-center font-mono font-bold text-[10px]'>
                        {stage.stageOrder}
                      </span>

                      {/* Color Pill */}
                      <span
                        className='w-3 h-3 rounded-full shrink-0 border border-black/10'
                        style={{ backgroundColor: stage.colorCode || '#888888' }}
                      />

                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-[#171717] text-sm'>{stage.name}</span>
                          <span className='text-[10px] font-mono text-[#888888] bg-white px-1.5 py-0.2 rounded border border-[#E7E7E7]'>
                            slug: {stage.slug}
                          </span>
                          {stage.track?.trim() && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                                stage.track.trim().toUpperCase() === 'A'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                              }`}
                            >
                              Nhánh {stage.track.trim().toUpperCase()}
                            </span>
                          )}
                          {stage.isEnabled === false && (
                            <span className='px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700 text-[9px] font-mono font-bold uppercase'>
                              Đã tắt
                            </span>
                          )}
                          {stage.isInitial && (
                            <span className='px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[9px] font-mono font-bold uppercase'>
                              Khởi Tạo
                            </span>
                          )}
                          {stage.isTerminal && (
                            <span className='px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[9px] font-mono font-bold uppercase'>
                              Hoàn Thành
                            </span>
                          )}
                        </div>

                        <div className='flex items-center gap-3 mt-1 text-[11px] text-[#737373]'>
                          {stage.allowedRole ? (
                            <span
                              className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                                ROLE_COLORS[stage.allowedRole] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              Phụ trách: {stage.allowedRole}
                            </span>
                          ) : (
                            <span className='text-[#888888] text-[10px] font-mono'>
                              Mọi vai trò
                            </span>
                          )}

                          {stage.isApprovalGate && (
                            <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'>
                              <Shield className='w-3 h-3 text-amber-600' />
                              Approval Gate (Duyệt/Từ chối)
                            </span>
                          )}

                          {stage.estimatedDurationDays ? (
                            <span className='flex items-center gap-1 text-[10px] font-mono'>
                              <Clock className='w-3 h-3 text-[#888888]' />
                              {stage.estimatedDurationDays} ngày
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className='flex items-center gap-1'>
                      <button
                        type='button'
                        data-testid={`pipeline-toggle-stage-${stage.id}`}
                        disabled={stage.isInitial || stage.isTerminal || actionLoading}
                        onClick={() => handleToggleStage(stage)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                          stage.isEnabled === false
                            ? 'text-zinc-600 bg-zinc-50 border-zinc-300 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
                            : 'text-emerald-700 bg-emerald-50/70 border-emerald-200 hover:text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                        }`}
                        title={
                          stage.isInitial || stage.isTerminal
                            ? 'Không thể tắt công đoạn khởi tạo hoặc kết thúc'
                            : stage.isEnabled === false
                              ? 'Bật lại công đoạn này'
                              : 'Tắt công đoạn này (không hiển thị cột trên lưới giao việc)'
                        }
                      >
                        {stage.isEnabled === false ? (
                          <>
                            <EyeOff className='w-3.5 h-3.5' />
                            <span>Bật</span>
                          </>
                        ) : (
                          <>
                            <Eye className='w-3.5 h-3.5' />
                            <span>Tắt</span>
                          </>
                        )}
                      </button>
                      <button
                        type='button'
                        onClick={() => handleStartEdit(stage)}
                        className='p-1.5 rounded-lg hover:bg-gray-100 text-[#555555] hover:text-[#171717] transition-colors cursor-pointer'
                        title='Sửa công đoạn'
                      >
                        <Edit2 className='w-3.5 h-3.5' />
                      </button>
                      <button
                        type='button'
                        disabled={stage.isInitial || stage.isTerminal || actionLoading}
                        onClick={() => handleDeleteStage(stage)}
                        className='p-1.5 rounded-lg hover:bg-red-50 text-[#888888] hover:text-red-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors'
                        title={
                          stage.isInitial || stage.isTerminal
                            ? 'Không thể xóa công đoạn khởi tạo hoặc kết thúc'
                            : 'Xóa công đoạn'
                        }
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Transitions Flow Section */}
              <div className='mt-6 p-4 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-3'>
                <h4 className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                  <RotateCcw className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>
                    Luồng Chuyển Giao Tự Động (Transitions Matrix - {pipeline.transitions.length}{' '}
                    quy tắc)
                  </span>
                </h4>
                <p className='text-[11px] text-[#737373]'>
                  Backend tự động dựng luồng tiến tuần tự giữa các stage và sinh nhánh Từ Chối
                  (Reject - yêu cầu kèm lý do) từ các công đoạn là Approval Gate về các bước trước
                  đó.
                </p>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1'>
                  {pipeline.transitions.map((tr) => {
                    const fromStage = pipeline.stages.find((s) => s.id === tr.fromStageId);
                    const toStage = pipeline.stages.find((s) => s.id === tr.toStageId);
                    return (
                      <div
                        key={tr.id}
                        className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                          tr.isBackwardTransition
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-white border-[#E7E7E7] text-[#171717]'
                        }`}
                      >
                        <div className='flex items-center gap-1.5 font-medium truncate'>
                          <span className='font-bold truncate max-w-[90px]'>
                            {fromStage?.name || 'Unknown'}
                          </span>
                          <ArrowRight
                            className={`w-3 h-3 shrink-0 ${
                              tr.isBackwardTransition
                                ? 'text-rose-500 rotate-180'
                                : 'text-emerald-500'
                            }`}
                          />
                          <span className='font-bold truncate max-w-[90px]'>
                            {toStage?.name || 'Unknown'}
                          </span>
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          <span className='text-[10px] font-mono px-1 rounded bg-black/5'>
                            {tr.transitionName}
                          </span>
                          {tr.requiresComment && (
                            <span className='text-[9px] font-mono text-rose-600 font-bold'>
                              Cần Lý Do
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className='px-6 py-3.5 border-t border-[#E7E7E7] bg-[#FAF8F5] flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors'
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
