import React, { useState } from 'react';
import { Cpu, Key, CheckCircle2, Save, Sliders, Activity, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export const AIConfigurationView: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('***********************************3A7b');
  const [claudeApiKey, setClaudeApiKey] = useState('***********************************8F12');
  const [openAiApiKey, setOpenAiApiKey] = useState('***********************************119C');

  const [allowedModels, setAllowedModels] = useState<string[]>([
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'claude-3-5-sonnet',
  ]);

  const [monthlyTokenQuota, setMonthlyTokenQuota] = useState('500000');

  const toggleModel = (model: string) => {
    if (allowedModels.includes(model)) {
      setAllowedModels(allowedModels.filter((m) => m !== model));
    } else {
      setAllowedModels([...allowedModels, model]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className='space-y-6 max-w-5xl'>
      <div className='flex items-center justify-between bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              AI CONFIG // PROVIDERS
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Cấu Hình AI Provider Credentials & Model Quotas
          </h1>
          <p className='text-xs text-[#737373]'>
            Quản trị API Key, danh sách Model được phép kích hoạt và hạn ngạch token cho studio.
          </p>
        </div>

        {savedSuccess && (
          <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold animate-in fade-in'>
            <CheckCircle2 className='w-4 h-4' />
            <span>Đã lưu AI Configuration!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className='space-y-6'>
        {/* API Credentials */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
            <Key className='w-4 h-4 text-[#F97316]' />
            <span>AI Provider API Key Credentials</span>
          </h3>

          <div className='space-y-4 text-xs'>
            <div>
              <label className='block font-bold text-[#171717] mb-1.5 flex items-center justify-between'>
                <span>Google Gemini API Key (Default Engine)</span>
                <span className='text-emerald-600 font-mono text-[10px] font-bold'>Connected</span>
              </label>
              <Input
                type='password'
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className='h-9 font-mono text-xs'
              />
            </div>

            <div>
              <label className='block font-bold text-[#171717] mb-1.5 flex items-center justify-between'>
                <span>Anthropic Claude API Key (Script & Dialogue Specialist)</span>
                <span className='text-emerald-600 font-mono text-[10px] font-bold'>Connected</span>
              </label>
              <Input
                type='password'
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                className='h-9 font-mono text-xs'
              />
            </div>

            <div>
              <label className='block font-bold text-[#171717] mb-1.5 flex items-center justify-between'>
                <span>OpenAI API Key (Secondary Fallback)</span>
                <span className='text-emerald-600 font-mono text-[10px] font-bold'>Connected</span>
              </label>
              <Input
                type='password'
                value={openAiApiKey}
                onChange={(e) => setOpenAiApiKey(e.target.value)}
                className='h-9 font-mono text-xs'
              />
            </div>
          </div>
        </div>

        {/* Allowed Models & Token Quotas */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
            <Sliders className='w-4 h-4 text-[#F97316]' />
            <span>Cho Phép Sử Dụng Model & Hạn Ngạch Quota</span>
          </h3>

          <div className='space-y-4 text-xs'>
            <div>
              <label className='block font-bold text-[#171717] mb-2'>
                Danh sách Model được phép kích hoạt trong Studio:
              </label>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5'>
                {[
                  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Series Bible Grounding' },
                  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Fast Panel OCR' },
                  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Script Dialogue Writer' },
                  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Multi-modal Vision' },
                ].map((m) => {
                  const checked = allowedModels.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleModel(m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? 'border-[#F97316] bg-[#FFF7ED] text-[#171717]'
                          : 'border-[#E7E7E7] bg-[#FAF8F5] text-[#555555]'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-xs'>{m.name}</span>
                        <input type='checkbox' checked={checked} readOnly className='accent-[#F97316]' />
                      </div>
                      <div className='text-[10px] text-[#737373] mt-1'>{m.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className='block font-bold text-[#171717] mb-1.5'>
                Hạn ngạch Token tháng (Monthly Workspace Token Quota):
              </label>
              <Input
                type='number'
                value={monthlyTokenQuota}
                onChange={(e) => setMonthlyTokenQuota(e.target.value)}
                className='h-9 font-mono text-xs max-w-xs'
              />
            </div>
          </div>
        </div>

        {/* Usage Reports & Metrics */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
            <Activity className='w-4 h-4 text-[#F97316]' />
            <span>AI Usage & Token Consumption Report</span>
          </h3>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs'>
            <div className='p-4 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5]'>
              <div className='text-[#737373]'>Tokens đã sử dụng (Tháng này)</div>
              <div className='text-2xl font-serif font-bold text-[#171717] mt-1'>342,850</div>
              <div className='text-[10px] font-mono text-emerald-600 font-semibold mt-0.5'>68% Quota Used</div>
            </div>
            <div className='p-4 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5]'>
              <div className='text-[#737373]'>AI Request Latency Average</div>
              <div className='text-2xl font-serif font-bold text-[#171717] mt-1'>1.2s</div>
              <div className='text-[10px] font-mono text-blue-600 font-semibold mt-0.5'>Optimal Performance</div>
            </div>
            <div className='p-4 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5]'>
              <div className='text-[#737373]'>Series Bible Citations</div>
              <div className='text-2xl font-serif font-bold text-[#171717] mt-1'>1,890</div>
              <div className='text-[10px] font-mono text-purple-600 font-semibold mt-0.5'>100% Grounded</div>
            </div>
          </div>
        </div>

        <div className='flex justify-end'>
          <Button
            type='submit'
            className='bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer'
          >
            <Save className='w-4 h-4 mr-1.5' /> Lưu Cấu Hình AI
          </Button>
        </div>
      </form>
    </div>
  );
};
