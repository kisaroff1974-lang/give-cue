
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Scene, Line, Role } from './types';
import { parseScript } from './services/geminiService';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('HOME');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [rehearsalIndex, setRehearsalIndex] = useState(0);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  
  // Editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const DONATION_URL = 'https://tbank.ru/cf/AhDR5Hn9ci3';

  // Load scenes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scenes');
    if (saved) {
      try {
        setScenes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load scenes");
      }
    }
  }, []);

  // Save scenes to localStorage
  useEffect(() => {
    localStorage.setItem('scenes', JSON.stringify(scenes));
  }, [scenes]);

  const handleCreateScene = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    try {
      const parsedLines = await parseScript(inputText);
      const newScene: Scene = {
        id: Date.now().toString(),
        title: inputText.split('\n')[0].substring(0, 30).trim() || 'Новая сцена',
        createdAt: Date.now(),
        lines: parsedLines.map((line, idx) => ({
          ...line,
          id: `line-${idx}-${Date.now()}`,
          role: Role.PARTNER 
        }))
      };
      setScenes([...scenes, newScene]);
      setCurrentScene(newScene);
      setView('EDIT_ROLES');
    } catch (err) {
      alert('Ошибка при разборе текста. Попробуйте другой формат.');
    } finally {
      setIsParsing(false);
      setInputText('');
    }
  };

  const deleteScene = (id: string) => {
    if (window.confirm('Вы уверены, что хотите окончательно удалить этот проект? Это действие нельзя отменить.')) {
      setScenes(scenes.filter(s => s.id !== id));
    }
  };

  const updateSceneTitle = (newTitle: string) => {
    if (!currentScene) return;
    const updated = { ...currentScene, title: newTitle || 'Без названия' };
    setCurrentScene(updated);
    setScenes(scenes.map(s => s.id === updated.id ? updated : s));
    setEditingTitle(false);
  };

  const updateLineText = (lineId: string, newText: string) => {
    if (!currentScene) return;
    const updated = {
      ...currentScene,
      lines: currentScene.lines.map(l => l.id === lineId ? { ...l, text: newText } : l)
    };
    setCurrentScene(updated);
    setScenes(scenes.map(s => s.id === updated.id ? updated : s));
    setEditingLineId(null);
  };

  const startRehearsal = (scene: Scene) => {
    setCurrentScene(scene);
    setRehearsalIndex(0);
    setView('REHEARSAL');
  };

  const setLineRole = (lineId: string, role: Role) => {
    if (!currentScene) return;
    const updated = {
      ...currentScene,
      lines: currentScene.lines.map(l => 
        l.id === lineId ? { ...l, role: role } : l
      )
    };
    setCurrentScene(updated);
    setScenes(scenes.map(s => s.id === updated.id ? updated : s));
  };

  const startRecording = async (lineId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (currentScene) {
          const updated = {
            ...currentScene,
            lines: currentScene.lines.map(l => 
              l.id === lineId ? { ...l, audioUrl } : l
            )
          };
          setCurrentScene(updated);
          setScenes(scenes.map(s => s.id === updated.id ? updated : s));
        }
        setIsRecording(null);
      };

      recorder.start();
      setIsRecording(lineId);
    } catch (err) {
      alert('Нет доступа к микрофону. Пожалуйста, проверьте разрешения браузера.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const playRecording = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  };

  useEffect(() => {
    if (view === 'REHEARSAL' && currentScene) {
      const currentLine = currentScene.lines[rehearsalIndex];
      if (currentLine && currentLine.role === Role.PARTNER && currentLine.audioUrl) {
        if (audioRef.current) {
          audioRef.current.src = currentLine.audioUrl;
          audioRef.current.play();
        }
      }
    }
  }, [rehearsalIndex, view, currentScene]);

  const renderHome = () => (
    <div className="max-w-2xl mx-auto p-4 animate-in fade-in duration-500">
      <div className="text-center mb-10 pt-12">
        <h1 className="text-6xl font-black text-blue-400 mb-6 tracking-tighter drop-shadow-2xl">Подай Реплику</h1>
        <p className="text-slate-300 text-xl max-w-lg mx-auto leading-relaxed opacity-80 font-medium">
          Твой персональный партнёр для репетиций и самопроб.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button onClick={() => setView('NEW_SCENE')} size="lg" className="rounded-[2.5rem] h-40 text-2xl font-black flex flex-col gap-2 transition-all hover:scale-[1.03] active:scale-95 bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl shadow-blue-900/40">
          <span className="text-4xl">🎭</span>
          <span>Новая сцена</span>
        </Button>
        <Button onClick={() => setView('HELP')} variant="secondary" size="lg" className="rounded-[2.5rem] h-40 text-2xl font-black flex flex-col gap-2 transition-all hover:scale-[1.03] active:scale-95 bg-slate-800 border border-slate-700 shadow-xl">
          <span className="text-4xl">📖</span>
          <span>Инструкция</span>
        </Button>
      </div>
      
      <Button 
        onClick={() => setView('DONATE_CONFIRM')} 
        variant="ghost" 
        className="w-full border-blue-500/20 text-blue-300 h-24 rounded-[2rem] flex flex-col gap-0.5 hover:bg-blue-900/10 mb-12 shadow-lg group"
      >
        <span className="text-xl font-bold group-hover:scale-110 transition-transform">☕ Поддержать проект</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-70">Добровольное пожертвование автору</span>
      </Button>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Ваши проекты</h2>
          {scenes.length > 0 && (
            <span className="text-[10px] bg-slate-900 text-blue-400 px-4 py-1.5 rounded-full uppercase font-black tracking-widest border border-blue-900/50 shadow-inner">
              {scenes.length} ВСЕГО
            </span>
          )}
        </div>
        {scenes.length === 0 ? (
          <div className="text-center py-24 bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-700/30">
            <div className="text-5xl mb-6 opacity-20">📜</div>
            <p className="text-slate-500 text-lg font-medium mb-2">У вас пока нет созданных сцен.</p>
            <p className="text-slate-600 text-sm italic">Начните, нажав на кнопку "Новая сцена" выше.</p>
          </div>
        ) : (
          scenes.map(scene => (
            <div key={scene.id} className="group bg-slate-800/50 backdrop-blur-sm p-8 rounded-[3rem] flex items-center justify-between hover:bg-slate-800 transition-all border border-slate-700/50 hover:border-blue-500/40 shadow-xl hover:shadow-blue-900/20 cursor-pointer relative overflow-hidden" onClick={() => startRehearsal(scene)}>
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600/50 group-hover:w-2 transition-all"></div>
              <div className="flex-1 overflow-hidden pl-2">
                <h3 className="font-black text-2xl text-slate-100 group-hover:text-blue-300 transition-colors truncate mb-1">{scene.title}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest opacity-60">
                    {scene.lines.length} реплик
                  </span>
                  <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                  <span className="text-slate-600 text-[10px] uppercase font-black tracking-widest">
                    {new Date(scene.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 ml-4 shrink-0" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="rounded-2xl w-14 h-14 p-0 text-2xl border-slate-700 bg-slate-900/50 hover:text-white hover:bg-slate-700 transition-all" onClick={() => { setCurrentScene(scene); setView('EDIT_ROLES'); }}>
                  ⚙️
                </Button>
                <Button variant="danger" size="sm" className="rounded-2xl w-14 h-14 p-0 text-2xl bg-red-900/10 border-red-500/20 hover:bg-red-900/40 transition-all" onClick={() => deleteScene(scene.id)}>
                  🗑
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderNewScene = () => (
    <div className="max-w-2xl mx-auto p-4 animate-in slide-in-from-bottom duration-300">
      <Button variant="ghost" className="mb-8 font-bold rounded-2xl" onClick={() => setView('HOME')}>← В главное меню</Button>
      <h2 className="text-4xl font-black mb-3 tracking-tight text-white">Новый сценарий</h2>
      <p className="text-slate-400 mb-8 text-lg font-medium opacity-80 leading-relaxed">
        Вставьте текст из вашего файла. Gemini автоматически разделит его на персонажей.
      </p>
      
      <textarea
        className="w-full h-[32rem] bg-slate-900 border-2 border-slate-800 rounded-[3rem] p-10 text-slate-100 focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500/40 outline-none mb-8 font-mono text-lg leading-relaxed resize-none shadow-2xl transition-all"
        placeholder="ГЕРОЙ: Привет!&#10;ПАРТНЁР: Рад тебя видеть."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />

      <Button 
        fullWidth 
        size="lg" 
        onClick={handleCreateScene} 
        disabled={isParsing || !inputText.trim()}
        className="h-24 font-black text-3xl rounded-[2.5rem] shadow-2xl shadow-blue-900/40 active:scale-[0.98] transition-all bg-gradient-to-r from-blue-600 to-blue-500"
      >
        {isParsing ? (
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span>Разбираю текст...</span>
          </div>
        ) : 'Создать проект 🎭'}
      </Button>
    </div>
  );

  const renderEditRoles = () => {
    if (!currentScene) return null;
    return (
      <div className="max-w-4xl mx-auto p-4 pb-48">
        <audio ref={audioRef} />
        <div className="flex items-center justify-between mb-10 sticky top-0 bg-slate-900/95 backdrop-blur-2xl py-8 z-40 border-b border-slate-800/80">
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setView('HOME')}>← В меню</Button>
          
          <div className="text-center flex-1 px-8">
            {editingTitle ? (
              <div className="flex items-center gap-2 max-w-sm mx-auto">
                <input 
                  autoFocus
                  className="bg-slate-800 border border-blue-500/50 rounded-xl px-4 py-2 text-xl font-bold w-full outline-none focus:ring-2 ring-blue-500/20"
                  defaultValue={currentScene.title}
                  onBlur={(e) => updateSceneTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateSceneTitle((e.target as HTMLInputElement).value)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setEditingTitle(true)}>
                <h2 className="text-2xl font-black text-slate-100 tracking-tight group-hover:text-blue-400 transition-colors">{currentScene.title}</h2>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">✏️</span>
              </div>
            )}
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2 opacity-60">Распределите роли и запишите реплики партнёра</p>
          </div>

          <Button onClick={() => { setRehearsalIndex(0); setView('REHEARSAL'); }} className="shadow-2xl shadow-blue-600/40 px-10 h-14 font-black rounded-[1.5rem] text-lg active:scale-95 transition-all">СТАРТ 🎬</Button>
        </div>

        <div className="space-y-8">
          {currentScene.lines.map((line) => (
            <div key={line.id} className={`p-8 rounded-[3rem] border-2 transition-all duration-500 ${line.role === Role.ME ? 'border-blue-500/40 bg-blue-600/5 shadow-lg shadow-blue-900/10' : 'border-slate-800 bg-slate-800/30'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8 mb-8">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-full tracking-widest border-2 shadow-sm ${line.role === Role.ME ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/20' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                      {line.character}
                    </span>
                    {line.audioUrl && line.role === Role.PARTNER && (
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest animate-pulse">● ЗАПИСАНО</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 w-fit shadow-inner">
                    <button 
                      onClick={() => setLineRole(line.id, Role.ME)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${line.role === Role.ME ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                      Я
                    </button>
                    <button 
                      onClick={() => setLineRole(line.id, Role.PARTNER)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${line.role === Role.PARTNER ? 'bg-slate-100 text-slate-950 shadow-xl' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                      Партнёр
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                  {line.role === Role.PARTNER && (
                    <div className="flex gap-3">
                      {line.audioUrl && (
                         <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-14 h-14 p-0 rounded-2xl border-slate-700 bg-slate-900 shadow-xl hover:bg-slate-800 transition-all active:scale-90" 
                          onClick={() => playRecording(line.audioUrl!)}
                          title="Прослушать"
                        >
                          ▶️
                        </Button>
                      )}
                      <Button 
                        variant={line.audioUrl ? 'secondary' : 'primary'} 
                        size="md"
                        onClick={() => isRecording === line.id ? stopRecording() : startRecording(line.id)}
                        className={`h-14 px-10 rounded-2xl font-black uppercase tracking-wider transition-all shadow-xl ${isRecording === line.id ? 'animate-pulse bg-red-600 text-white ring-8 ring-red-600/20 border-none scale-110' : 'active:scale-95'}`}
                      >
                        {isRecording === line.id ? 'СТОП' : (line.audioUrl ? 'ПЕРЕЗАПИСЬ' : 'ЗАПИСАТЬ')}
                      </Button>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-14 h-14 p-0 rounded-2xl border-slate-700 text-xl"
                    onClick={() => {
                      setEditingLineId(line.id);
                      setTempText(line.text);
                    }}
                    title="Редактировать текст"
                  >
                    ✏️
                  </Button>
                </div>
              </div>

              {editingLineId === line.id ? (
                <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95">
                  <textarea 
                    autoFocus
                    className="w-full bg-slate-900 border-2 border-blue-500/40 rounded-3xl p-6 text-slate-100 font-mono text-lg leading-relaxed outline-none focus:ring-4 ring-blue-500/10 min-h-[120px]"
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                  />
                  <div className="flex gap-3 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingLineId(null)}>Отмена</Button>
                    <Button variant="primary" size="sm" onClick={() => updateLineText(line.id, tempText)}>Сохранить</Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-100 text-xl leading-[1.6] bg-black/40 p-8 rounded-[2rem] border border-white/5 shadow-inner select-none font-medium">
                  {line.text}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pointer-events-none z-40">
          <Button fullWidth size="lg" className="h-24 font-black shadow-[0_35px_60px_-15px_rgba(59,130,246,0.3)] rounded-[2.5rem] text-3xl pointer-events-auto active:scale-95 transition-all bg-gradient-to-r from-blue-600 to-blue-500 border-t-2 border-white/10" onClick={() => setView('REHEARSAL')}>
            ЗАПУСТИТЬ СУФЛЁРА 🎭
          </Button>
        </div>
      </div>
    );
  };

  const renderRehearsal = () => {
    if (!currentScene) return null;
    const currentLine = currentScene.lines[rehearsalIndex];
    const isLast = rehearsalIndex === currentScene.lines.length - 1;
    const progress = ((rehearsalIndex + 1) / currentScene.lines.length) * 100;

    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden safe-area-inset z-50">
        <audio ref={audioRef} />
        
        {/* Progress Bar Header */}
        <div className="h-1.5 w-full bg-slate-900 shrink-0">
          <div 
            className="h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center px-10 py-6 shrink-0 bg-slate-950/80 backdrop-blur-md">
          <Button variant="ghost" size="sm" onClick={() => setView('EDIT_ROLES')} className="text-slate-500 font-black tracking-widest border-none hover:bg-slate-900">НАСТРОЙКИ</Button>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase mb-1 opacity-60">СЦЕНА</span>
            <div className="bg-slate-900 px-10 py-2 rounded-full border-2 border-slate-800 shadow-2xl flex items-center gap-3">
               <span className="text-blue-400 font-black text-2xl drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{rehearsalIndex + 1}</span>
               <span className="text-slate-700 text-xs font-black tracking-widest">/</span>
               <span className="text-slate-500 font-black text-xl">{currentScene.lines.length}</span>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setRehearsalIndex(0)} className="text-slate-500 font-black tracking-widest border-none hover:bg-slate-900">СНАЧАЛА</Button>
        </div>

        {/* Cinematic Scrollable text area */}
        <div className="flex-1 overflow-y-auto px-8 py-12 custom-scrollbar relative flex flex-col bg-slate-950">
           <div className="m-auto w-full max-w-6xl py-24">
              <div className={`transition-all duration-1000 transform text-center ${currentLine.role === Role.ME ? 'scale-100' : 'scale-90 opacity-60'}`}>
                <div className={`text-xs font-black tracking-[0.5em] uppercase mb-14 px-12 py-4 rounded-full inline-block border-2 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] transition-all ${currentLine.role === Role.ME ? 'bg-blue-600 border-blue-300 text-white' : 'bg-slate-900 border-slate-700 text-slate-600'}`}>
                  {currentLine.character} {currentLine.role === Role.ME ? '• ТВОЯ ОЧЕРЕДЬ' : '• СЛУШАЙ'}
                </div>
                <h2 className={`text-5xl md:text-8xl font-black leading-[1.3] select-none transition-all duration-700 whitespace-pre-wrap tracking-tight ${currentLine.role === Role.ME ? 'text-white drop-shadow-2xl' : 'text-slate-700 italic'}`}>
                  {currentLine.text}
                </h2>
                {currentLine.role === Role.PARTNER && !currentLine.audioUrl && (
                  <div className="mt-16 p-6 bg-red-900/10 border border-red-900/40 rounded-3xl inline-flex items-center gap-4 text-red-600/80 text-xs font-black uppercase tracking-[0.3em] animate-pulse">
                    <span>⚠️ Аудио партнёра не записано</span>
                  </div>
                )}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-10 p-10 pb-12 shrink-0 bg-slate-950 border-t border-slate-900/50">
          <Button 
            variant="secondary" 
            size="lg" 
            className="h-32 rounded-[3.5rem] border-2 border-slate-800 text-slate-500 text-2xl font-black bg-slate-900/50 hover:bg-slate-900 hover:text-slate-300 active:scale-95 transition-all shadow-xl"
            disabled={rehearsalIndex === 0} 
            onClick={() => {
              setRehearsalIndex(Math.max(0, rehearsalIndex - 1));
              const textContainer = document.querySelector('.overflow-y-auto');
              if (textContainer) textContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            ← НАЗАД
          </Button>
          <Button 
            variant="primary" 
            size="lg" 
            className={`h-32 rounded-[3.5rem] text-5xl font-black shadow-2xl transition-all active:scale-90 ${currentLine.role === Role.ME ? 'bg-blue-600 shadow-blue-600/40 border-t-2 border-blue-400/40' : 'bg-green-600 shadow-green-600/40 border-t-2 border-green-400/40'}`}
            onClick={() => {
              if (isLast) {
                setView('HOME');
              } else {
                setRehearsalIndex(rehearsalIndex + 1);
                const textContainer = document.querySelector('.overflow-y-auto');
                if (textContainer) textContainer.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            {isLast ? 'ФИНИШ' : 'ДАЛЕЕ'}
          </Button>
        </div>
      </div>
    );
  };

  const renderDonateConfirm = () => (
    <div className="max-w-xl mx-auto p-4 pt-24 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-900/80 backdrop-blur-2xl p-12 rounded-[4rem] border-2 border-blue-500/20 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl"></div>
        
        <div className="text-6xl mb-8 filter drop-shadow-xl">☕</div>
        <h2 className="text-4xl font-black mb-8 text-white tracking-tight">Поддержка проекта</h2>
        
        <div className="space-y-6 text-slate-300 text-lg leading-relaxed mb-12 text-left bg-black/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
          <p>Денежные средства перечисляются в качестве <strong>добровольного пожертвования</strong> автору проекта (Владимир Кисаров).</p>
          <p>Перечисление средств <strong>не является оплатой услуг</strong> и не влечёт возникновения обязательств.</p>
        </div>

        <div className="flex flex-col gap-5">
          <Button 
            fullWidth 
            size="lg" 
            className="h-24 text-2xl font-black rounded-3xl bg-blue-600 shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
            onClick={() => { window.open(DONATION_URL, '_blank'); setView('HOME'); }}
          >
            ПОДДЕРЖАТЬ АВТОРА 🚀
          </Button>
          <Button 
            variant="ghost" 
            fullWidth 
            size="lg" 
            className="h-16 text-slate-500 font-bold border-slate-800 hover:bg-slate-800 rounded-3xl active:scale-95 transition-all"
            onClick={() => setView('HOME')}
          >
            ВЕРНУТЬСЯ НАЗАД
          </Button>
        </div>
      </div>
    </div>
  );

  const renderHelp = () => (
    <div className="max-w-3xl mx-auto p-4 pb-24 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-16 py-6">
        <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setView('HOME')}>← Назад</Button>
        <Button variant="primary" size="sm" onClick={() => setView('DONATE_CONFIRM')} className="bg-blue-600 rounded-2xl px-10 font-black h-12 shadow-lg shadow-blue-600/20 uppercase tracking-widest text-[10px]">Поддержать ☕</Button>
      </div>

      <h2 className="text-6xl font-black mb-16 text-white leading-tight tracking-tighter text-center">Как это работает 🎬</h2>
      
      <div className="space-y-10 text-slate-300">
        {[
          {
            num: "01",
            title: "Создание и редактирование",
            desc: "Вставьте ваш текст на главной странице. Gemini автоматически распознает персонажей. Если парсер ошибся — вы всегда можете отредактировать имя персонажа или текст реплики прямо в настройках сцены.",
            icon: "✍️"
          },
          {
            num: "02",
            title: "Распределение ролей",
            desc: "Для каждой реплики укажите, КТО ее произносит. Реплики с пометкой 'Я' будут просто отображаться на экране. Реплики 'Партнёр' нужно записать — суфлёр будет воспроизводить их автоматически.",
            icon: "👯‍♂️"
          },
          {
            num: "03",
            title: "Индивидуальный ритм",
            desc: "В режиме репетиции вы сами управляете процессом. Нажали 'ДАЛЕЕ' — прозвучала реплика партнера. Если монолог длинный — просто прокрутите его пальцем. Никакой спешки, только творчество.",
            icon: "⏱"
          }
        ].map((item, i) => (
          <section key={i} className="bg-slate-800/30 backdrop-blur-xl p-12 rounded-[4rem] border border-slate-700 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 p-10 text-6xl opacity-10 group-hover:opacity-20 transition-all">{item.icon}</div>
            <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 text-white flex items-center justify-center text-2xl font-black mb-10 shadow-2xl shadow-blue-500/40">{item.num}</div>
            <h3 className="text-3xl font-black text-white mb-6 tracking-tight">{item.title}</h3>
            <p className="text-xl leading-relaxed opacity-70 font-medium">{item.desc}</p>
          </section>
        ))}

        <div className="p-16 bg-gradient-to-br from-blue-900/40 via-slate-800/50 to-slate-900/80 rounded-[4.5rem] border-2 border-blue-500/20 text-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
          <h4 className="text-3xl font-black text-white mb-8 italic tracking-tight">"Твой голос — твой лучший партнер."</h4>
          <p className="text-xs text-slate-500 mb-12 font-black uppercase tracking-[0.5em] opacity-60">Автор проекта: Владимир Кисаров</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button variant="primary" size="md" onClick={() => window.open('https://t.me/kisarov_1', '_blank')} className="px-14 h-20 rounded-3xl font-black text-xl shadow-2xl shadow-blue-600/30">
              Telegram Канал
            </Button>
            <Button variant="ghost" size="md" onClick={() => setView('DONATE_CONFIRM')} className="px-14 h-20 rounded-3xl font-black text-xl border-blue-500/20 text-blue-300 hover:bg-blue-900/20">
              Поддержать ☕
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/40 flex flex-col">
      <main className="flex-1 pb-24">
        {view === 'HOME' && renderHome()}
        {view === 'NEW_SCENE' && renderNewScene()}
        {view === 'EDIT_ROLES' && renderEditRoles()}
        {view === 'REHEARSAL' && renderRehearsal()}
        {view === 'HELP' && renderHelp()}
        {view === 'DONATE_CONFIRM' && renderDonateConfirm()}
      </main>

      {view !== 'REHEARSAL' && (
        <footer className="w-full max-w-3xl mx-auto p-12 pt-0 text-center opacity-30 hover:opacity-100 transition-opacity duration-700 shrink-0">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] border-t border-slate-800/50 pt-12">
            Все пожертвования являются добровольными и не предполагают оказания услуг. © 2025 Подай Реплику
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
