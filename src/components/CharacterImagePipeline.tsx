import React, { useState } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Settings2, 
  Wand2, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  AlertTriangle,
  FileImage,
  ChevronRight
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

// --- Types & Mock Data ---

type FlowState = 'IDLE' | 'GENERATING' | 'REVIEW' | 'COMPLETED';

interface CharacterImagePipelineProps {
  onClose?: () => void;
}

// --- Main Component ---

export default function CharacterImagePipeline({ onClose }: CharacterImagePipelineProps) {
  const { lockedCharacters, addCanvasElement } = useWorkspace();
  const [step, setStep] = useState<FlowState>('IDLE');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isUploaded, setIsUploaded] = useState(false);
  
  // Prompts state
  const [pose, setPose] = useState('Standing');
  const [emotion, setEmotion] = useState('Neutral');
  const [shotScale, setShotScale] = useState('Medium');
  const [colorMode, setColorMode] = useState('Black & White');

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Mock similarities
  const similarityScore = 87;
  const isGoodMatch = similarityScore >= 70;

  // --- Handlers ---
  const handleGenerate = () => {
    if (!selectedCharacter || !isUploaded) {
      alert('Please select a character and upload a sketch first.');
      return;
    }
    setStep('GENERATING');
    setTimeout(() => {
      setStep('REVIEW');
    }, 2000); // 2 second mock generation
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    setShowRejectModal(false);
    setStep('IDLE');
    setIsUploaded(false); // Reset upload
  };

  const handleAccept = () => {
    setShowSuccessModal(true);
  };

  const handleReturnToCanvas = () => {
    setShowSuccessModal(false);
    setStep('COMPLETED');
    
    // Dispatch to global state
    addCanvasElement({
      id: `ai-art-${Date.now()}`,
      type: 'artwork',
      panelId: 'panel-1', // Default to first panel for simplicity
      x: 60,
      y: 60,
      width: 250,
      height: 350,
      color: colorMode === 'Full Color' ? '#818CF8' : '#334155'
    });
    
    if (onClose) onClose();
  };

  return (
    <div className="flex h-full w-full bg-white text-zinc-900 font-sans overflow-hidden">
      
      {/* ========================================================= */}
      {/* LEFT SIDEBAR: Steps 1 to 3                                */}
      {/* ========================================================= */}
      <div className="w-96 shrink-0 bg-zinc-100 border-r border-zinc-300 flex flex-col z-10">
        <div className="p-5 border-b border-zinc-300">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-orange-600" />
            AI Image Pipeline
          </h2>
          <p className="text-xs text-zinc-500 mt-1">7-Step Character Image Generation</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          
          {/* Step 1: Select Locked Character */}
          <div className="space-y-3 relative">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center text-xs font-bold">1</div>
              <h3 className="text-sm font-semibold">Select Character Sheet</h3>
            </div>
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              disabled={step === 'GENERATING' || lockedCharacters.length === 0}
              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 appearance-none"
            >
              {lockedCharacters.length === 0 ? (
                <option value="">-- Please lock a character in Series Bible first --</option>
              ) : (
                <option value="">-- Choose locked character --</option>
              )}
              {lockedCharacters.map(char => (
                <option key={char.id} value={char.id}>{char.name} - {char.version}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Upload Sketch */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center text-xs font-bold">2</div>
              <h3 className="text-sm font-semibold">Upload Sketch</h3>
            </div>
            
            <div 
              className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isUploaded ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-400 bg-white hover:border-gray-500'
              } ${step === 'GENERATING' ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => setIsUploaded(!isUploaded)}
            >
              {isUploaded ? (
                <>
                  <FileImage className="w-8 h-8 text-orange-600 mb-2" />
                  <span className="text-xs font-medium text-orange-500">sketch_01.png uploaded</span>
                  <span className="text-[10px] text-zinc-400 mt-1">Click to remove</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-zinc-400 mb-2" />
                  <span className="text-xs font-medium text-zinc-500">Click or drag & drop to upload</span>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Request Image Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center text-xs font-bold">3</div>
              <h3 className="text-sm font-semibold">Prompt Configuration</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Pose</label>
                <select value={pose} onChange={e => setPose(e.target.value)} disabled={step === 'GENERATING' || step === 'REVIEW'} className="w-full bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 disabled:opacity-50 appearance-none">
                  <option>Standing</option><option>Running</option><option>Sitting</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Emotion</label>
                <select value={emotion} onChange={e => setEmotion(e.target.value)} disabled={step === 'GENERATING' || step === 'REVIEW'} className="w-full bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 disabled:opacity-50 appearance-none">
                  <option>Neutral</option><option>Happy</option><option>Angry</option><option>Sad</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Shot Scale</label>
                <select value={shotScale} onChange={e => setShotScale(e.target.value)} disabled={step === 'GENERATING' || step === 'REVIEW'} className="w-full bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 disabled:opacity-50 appearance-none">
                  <option>Medium</option><option>Wide</option><option>Close-up</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Color Mode</label>
                <select value={colorMode} onChange={e => setColorMode(e.target.value)} disabled={step === 'GENERATING' || step === 'REVIEW'} className="w-full bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 disabled:opacity-50 appearance-none">
                  <option>Black & White</option><option>Full Color</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={step === 'GENERATING' || step === 'REVIEW' || !selectedCharacter || !isUploaded}
              className="w-full py-3 mt-4 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {step === 'GENERATING' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating AI Image...
                </>
              ) : (
                <>
                  <Settings2 className="w-4 h-4" /> Generate Image
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT MAIN AREA: Steps 4 to 7                             */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col relative bg-[#FAF8F5]">
        
        {step === 'IDLE' || step === 'COMPLETED' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
            <p>Configure prompt and generate image to see results here.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 flex overflow-hidden">
              {/* Left Pane: Original Sketch */}
              <div className="flex-1 border-r border-zinc-200 p-6 flex flex-col">
                <h4 className="text-sm font-bold text-zinc-500 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-zinc-100 flex items-center justify-center text-xs">4</span>
                  Original Sketch
                </h4>
                <div className="flex-1 bg-white rounded-2xl border border-zinc-200 flex items-center justify-center p-4">
                  {/* Mock Sketch Outline */}
                  <div className="w-full h-full max-w-sm border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center bg-zinc-50">
                    <span className="text-zinc-400 text-sm font-medium">Original Sketch Input</span>
                  </div>
                </div>
              </div>

              {/* Right Pane: AI Result & Cut-out */}
              <div className="flex-1 p-6 flex flex-col relative">
                <h4 className="text-sm font-bold text-zinc-500 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-zinc-100 flex items-center justify-center text-xs">5</span>
                    AI Segmentation Result
                  </div>
                  
                  {/* Similarity Badge */}
                  {step === 'REVIEW' && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      isGoodMatch ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                    }`}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Similarity Score: {similarityScore}%
                    </div>
                  )}
                </h4>

                {/* The Cutout Checkerboard Area */}
                <div className="flex-1 rounded-2xl border border-zinc-200 relative overflow-hidden flex items-center justify-center"
                     style={{
                       backgroundImage: 'repeating-linear-gradient(45deg, #1f2937 25%, transparent 25%, transparent 75%, #1f2937 75%, #1f2937), repeating-linear-gradient(45deg, #1f2937 25%, #111827 25%, #111827 75%, #1f2937 75%, #1f2937)',
                       backgroundPosition: '0 0, 10px 10px',
                       backgroundSize: '20px 20px'
                     }}>
                  
                  {step === 'GENERATING' ? (
                    <div className="flex flex-col items-center bg-zinc-50/80 p-6 rounded-2xl backdrop-blur-sm border border-zinc-300">
                      <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
                      <p className="text-orange-600 font-bold">Processing AI Cut-out...</p>
                      <p className="text-xs text-zinc-500 mt-1">Applying segmentation masks</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Simulated transparent PNG result */}
                      <div className="w-64 h-80 bg-zinc-100/80 rounded shadow-2xl border border-zinc-300 flex flex-col items-center justify-center p-4 backdrop-blur-md">
                        <ImageIcon className="w-12 h-12 text-zinc-400 mb-2" />
                        <span className="text-zinc-700 font-bold text-center">Transparent PNG Result</span>
                        <div className="mt-4 px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30">
                          Segmentation: Success
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 6: Review Action Bar */}
            {step === 'REVIEW' && (
              <div className="h-24 bg-white border-t border-zinc-200 flex items-center justify-between px-8 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center text-xs font-bold">6</div>
                  <div>
                    <h3 className="font-bold text-zinc-900">Human Review Boundary</h3>
                    <p className="text-xs text-zinc-500">Verify consistency and cut-out quality before storing.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button onClick={handleReject} className="px-6 py-2.5 rounded-lg font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button onClick={() => setStep('IDLE')} className="px-6 py-2.5 rounded-lg font-bold text-zinc-700 hover:bg-zinc-100 border border-zinc-300 transition-colors flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Edit Prompt
                  </button>
                  <button onClick={handleAccept} className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20 transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Accept & Store
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- Modals --- */}
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-100 border border-zinc-300 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Discard Generation?</h3>
            <p className="text-sm text-zinc-500 mb-6">Are you sure you want to discard this image? The prompt settings will be kept, but the image will be lost.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-700 hover:bg-zinc-200">Cancel</button>
              <button onClick={confirmReject} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700">Yes, Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Export Modal (Step 7) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-100 border border-zinc-300 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-5 text-green-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="inline-block px-3 py-1 bg-orange-500/10 text-orange-600 text-xs font-bold rounded-full mb-3">
              Step 7 Complete
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Element Stored Successfully!</h3>
            <p className="text-sm text-zinc-500 mb-8">The image has been cut out, optimized, and saved to your project assets. It is now ready to be placed on the Canvas.</p>
            
            <button 
              onClick={handleReturnToCanvas}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              Close & Return to Canvas <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
