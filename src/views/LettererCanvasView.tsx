import React, { useState, useEffect } from 'react';
import {
  Type,
  Plus,
  Trash2,
  Move,
  MessageSquare,
  Volume2,
  FileText,
  RefreshCw,
  CheckCircle2,
  X,
  Sliders,
  Sparkles,
  AlertCircle,
  Eye,
  Layers,
} from 'lucide-react';
import {
  elementService,
  ElementSnapshotDto,
  PageSnapshotDto,
  MOCK_ELEMENTS,
  DEFAULT_PAGE_ID,
} from '../services/element.service';

export const LettererCanvasView: React.FC = () => {
  const [elements, setElements] = useState<ElementSnapshotDto[]>(MOCK_ELEMENTS);
  const [pageVersion, setPageVersion] = useState(1);
  const [selectedElement, setSelectedElement] = useState<ElementSnapshotDto | null>(
    MOCK_ELEMENTS[0],
  );
  const [loading, setLoading] = useState(false);
  const [includeRemoved, setIncludeRemoved] = useState(false);

  // Add Element Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newType, setNewType] = useState<string>('DialogueBalloon');
  const [newContent, setNewContent] = useState('');
  const [newX, setNewX] = useState(100);
  const [newY, setNewY] = useState(120);
  const [newWidth, setNewWidth] = useState(200);
  const [newHeight, setNewHeight] = useState(90);

  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setToast({ title, desc });
    setTimeout(() => setToast(null), 3500);
  };

  const loadElements = React.useCallback(async () => {
    setLoading(true);
    try {
      const snap: PageSnapshotDto = await elementService.getPageSnapshot(
        DEFAULT_PAGE_ID,
        includeRemoved,
      );
      if (snap && snap.elements) {
        setElements(snap.elements);
        setPageVersion(snap.version || 1);
        if (snap.elements.length > 0) {
          setSelectedElement(snap.elements[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [includeRemoved]);

  useEffect(() => {
    loadElements();
  }, [loadElements]);

  const handleAddElement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const res = await elementService.addElement(DEFAULT_PAGE_ID, {
        elementType: newType,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        zIndex: elements.length + 1,
        content: newContent.trim(),
      });

      const newElemId =
        res?.elementId ||
        '99999999-9999-9999-9999-' + Math.floor(Math.random() * 899999999999 + 100000000000);
      const newElem: ElementSnapshotDto = {
        elementId: newElemId,
        elementType: newType,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        zIndex: elements.length + 1,
        content: newContent.trim(),
        isRemoved: false,
      };

      setElements((prev) => [...prev, newElem]);
      setSelectedElement(newElem);
      setPageVersion((v) => v + 1);
      setAddModalOpen(false);
      setNewContent('');
      showToast('Đã thêm Element (202 Accepted)', `Đã append sự kiện vào stream trên Marten.`);
    } catch (err: any) {
      showToast('Lỗi thêm Element', err.message);
    }
  };

  const handleMoveElement = async (dx: number, dy: number) => {
    if (!selectedElement) return;
    const targetX = Math.max(0, selectedElement.x + dx);
    const targetY = Math.max(0, selectedElement.y + dy);

    try {
      await elementService.moveElement(DEFAULT_PAGE_ID, selectedElement.elementId, {
        newX: targetX,
        newY: targetY,
        newWidth: selectedElement.width,
        newHeight: selectedElement.height,
        expectedPageVersion: pageVersion,
      });

      setElements((prev) =>
        prev.map((el) =>
          el.elementId === selectedElement.elementId ? { ...el, x: targetX, y: targetY } : el,
        ),
      );
      setSelectedElement((prev) => (prev ? { ...prev, x: targetX, y: targetY } : null));
      setPageVersion((v) => v + 1);
      showToast('Đã di chuyển Element', `Tọa độ mới: X=${targetX}, Y=${targetY}`);
    } catch (err: any) {
      showToast('Lỗi di chuyển', err.message);
    }
  };

  const handleRemoveElement = async (elId: string) => {
    try {
      await elementService.removeElement(DEFAULT_PAGE_ID, elId, 'USER_DELETE');
      setElements((prev) => prev.filter((el) => el.elementId !== elId));
      if (selectedElement?.elementId === elId) {
        setSelectedElement(null);
      }
      setPageVersion((v) => v + 1);
      showToast(
        'Đã xóa mềm Element',
        'Đã append ElementRemovedEvent; dữ liệu lịch sử vẫn bảo toàn.',
      );
    } catch (err: any) {
      showToast('Lỗi xóa', err.message);
    }
  };

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'DialogueBalloon':
        return <MessageSquare className='w-4 h-4 text-emerald-600' />;
      case 'SoundEffect':
        return <Volume2 className='w-4 h-4 text-[#F97316]' />;
      case 'NarrationBox':
        return <FileText className='w-4 h-4 text-blue-600' />;
      default:
        return <Type className='w-4 h-4 text-[#171717]' />;
    }
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Toast */}
      {toast && (
        <div className='fixed top-6 right-6 z-50 bg-[#171717] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200'>
          <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          <div>
            <div className='text-xs font-bold'>{toast.title}</div>
            <div className='text-[11px] text-[#A3A3A3]'>{toast.desc}</div>
          </div>
          <button onClick={() => setToast(null)} className='ml-2 text-[#737373] hover:text-white'>
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold'>
              LETTERER // CANVAS DESK
            </span>
            <span className='text-xs text-[#888888] font-mono'>
              API: <code>/api/pages/&#123;pageId&#125;/elements</code> (Append-Only Event Store)
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Lettering &amp; Balloon Canvas
          </h1>
          <p className='text-xs text-[#737373]'>
            Không gian làm việc của Letterer: Đặt bóng thoại, hộp dẫn chuyện, hiệu ứng âm thanh SFX,
            kiểm tra tràn chữ và di chuyển vị trí tọa độ.
          </p>
        </div>

        <div className='flex items-center gap-2.5 shrink-0'>
          <button
            onClick={loadElements}
            disabled={loading}
            className='inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#555555] bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>Thêm Bóng Thoại / SFX</span>
          </button>
        </div>
      </div>

      {/* Interactive Lettering Canvas & Inspector */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Visual Interactive Canvas */}
        <div className='lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
            <div className='flex items-center gap-2'>
              <Layers className='w-4 h-4 text-emerald-600' />
              <span className='text-sm font-bold text-[#171717]'>
                Manga Panel Canvas (Trang 1 • Event Stream v{pageVersion})
              </span>
            </div>

            <div className='flex items-center gap-2 text-xs'>
              <label className='inline-flex items-center gap-1 text-[#737373] cursor-pointer'>
                <input
                  type='checkbox'
                  checked={includeRemoved}
                  onChange={(e) => setIncludeRemoved(e.target.checked)}
                  className='rounded text-emerald-600'
                />
                <span>Hiện cả phần tử đã xóa</span>
              </label>
            </div>
          </div>

          {/* Canvas Box */}
          <div className='w-full bg-[#171717] rounded-2xl p-6 flex items-center justify-center min-h-[460px] overflow-auto'>
            <div
              className='bg-[#FAF8F5] relative rounded-lg border-2 border-[#555555] shadow-2xl overflow-hidden'
              style={{ width: '480px', height: '620px' }}
            >
              {/* Manga Panel Grid Outline */}
              <div className='absolute inset-4 border border-[#CCCCCC] rounded pointer-events-none'>
                <div className='absolute top-1/2 left-0 right-0 h-[2px] bg-[#E5E5E5]'></div>
                <div className='absolute top-0 bottom-0 left-1/2 w-[2px] bg-[#E5E5E5]'></div>
              </div>

              {/* Elements on Canvas */}
              {elements.map((el) => {
                const isSel = selectedElement?.elementId === el.elementId;
                return (
                  <div
                    key={el.elementId}
                    onClick={() => setSelectedElement(el)}
                    className={`absolute p-2.5 rounded-xl transition-all cursor-pointer select-none text-xs flex flex-col justify-center items-center text-center ${
                      el.elementType === 'DialogueBalloon'
                        ? 'bg-white border-2 border-[#171717] shadow-md'
                        : el.elementType === 'SoundEffect'
                          ? 'bg-[#FFF7ED] border-2 border-[#F97316] font-extrabold text-[#EA580C] italic'
                          : 'bg-blue-50 border-2 border-blue-400 font-serif'
                    } ${isSel ? 'ring-3 ring-emerald-500 z-50' : 'z-10'}`}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                    }}
                  >
                    <div className='text-[10px] uppercase font-mono font-bold opacity-60 flex items-center gap-1 mb-0.5'>
                      {getElementIcon(el.elementType)}
                      <span>{el.elementType}</span>
                    </div>
                    <p className='font-bold leading-tight break-words text-[11px]'>{el.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Element Inspector & Position Controller */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-5'>
          <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2 border-b border-[#E7E7E7] pb-3'>
            <Sliders className='w-4 h-4 text-emerald-600' />
            <span>Thuộc Tính Phần Tử (Element Inspector)</span>
          </h3>

          {selectedElement ? (
            <div className='space-y-4 text-xs'>
              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-[#171717] flex items-center gap-1.5'>
                    {getElementIcon(selectedElement.elementType)}
                    {selectedElement.elementType}
                  </span>
                  <span className='font-mono text-[10px] text-[#888888]'>
                    Z-Index: {selectedElement.zIndex}
                  </span>
                </div>
                <p className='text-[#333333] font-medium italic'>"{selectedElement.content}"</p>
                <div className='text-[10px] font-mono text-[#888888] pt-1'>
                  ID: {selectedElement.elementId}
                </div>
              </div>

              {/* Nudge Position Controls */}
              <div className='space-y-2'>
                <label className='font-bold text-[#171717] block'>
                  Di chuyển tọa độ (Move Element):
                </label>
                <div className='grid grid-cols-3 gap-2 text-center max-w-[180px] mx-auto'>
                  <div></div>
                  <button
                    onClick={() => handleMoveElement(0, -15)}
                    className='px-3 py-2 bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded font-bold cursor-pointer'
                  >
                    ↑
                  </button>
                  <div></div>
                  <button
                    onClick={() => handleMoveElement(-15, 0)}
                    className='px-3 py-2 bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded font-bold cursor-pointer'
                  >
                    ←
                  </button>
                  <div className='p-2 font-mono text-[10px] flex items-center justify-center text-[#888888]'>
                    NUDGE
                  </div>
                  <button
                    onClick={() => handleMoveElement(15, 0)}
                    className='px-3 py-2 bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded font-bold cursor-pointer'
                  >
                    →
                  </button>
                  <div></div>
                  <button
                    onClick={() => handleMoveElement(0, 15)}
                    className='px-3 py-2 bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded font-bold cursor-pointer'
                  >
                    ↓
                  </button>
                  <div></div>
                </div>
                <div className='text-center text-[10px] font-mono text-[#888888]'>
                  X: {selectedElement.x}px • Y: {selectedElement.y}px
                </div>
              </div>

              <div className='pt-3 border-t border-[#E7E7E7]'>
                <button
                  onClick={() => handleRemoveElement(selectedElement.elementId)}
                  className='w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer'
                >
                  <Trash2 className='w-4 h-4' />
                  <span>Xóa Mềm Element (Soft Delete)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className='py-8 text-center text-[#888888] text-xs'>
              Nhấp vào một bóng thoại trên canvas để điều chỉnh tọa độ và kích thước.
            </div>
          )}

          <div className='p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-[11px] text-[#555555] space-y-1'>
            <div className='font-semibold text-emerald-900'>Tính toàn vẹn Event Sourcing</div>
            <p>
              Mỗi lần di chuyển hoặc thêm bóng thoại đều được ghi nhận bằng một Domain Event (
              <code>ElementAddedEvent</code>, <code>ElementMovedEvent</code>) kèm Concurrency
              Version token giúp tránh xung đột khi nhiều cộng tác viên thao tác cùng lúc.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Add Element */}
      {addModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Thêm Element Vào Panel Canvas</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleAddElement} className='space-y-3 text-xs'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Loại phần tử (Element Type)
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                >
                  <option value='DialogueBalloon'>DialogueBalloon (Bóng thoại nhân vật)</option>
                  <option value='SoundEffect'>SoundEffect (Hiệu ứng âm thanh SFX)</option>
                  <option value='NarrationBox'>NarrationBox (Hộp dẫn truyện)</option>
                </select>
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Nội dung lời thoại / SFX
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder='Ví dụ: Không thể nào...! Cậu ấy đã đạt tới trạng thái đó rồi sao?!'
                  rows={3}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  required
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Tọa độ X (px)</label>
                  <input
                    type='number'
                    value={newX}
                    onChange={(e) => setNewX(parseInt(e.target.value, 10))}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Tọa độ Y (px)</label>
                  <input
                    type='number'
                    value={newY}
                    onChange={(e) => setNewY(parseInt(e.target.value, 10))}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setAddModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold'
                >
                  Thêm Vào Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
