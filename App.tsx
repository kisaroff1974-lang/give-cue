
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
        title: inputText.split('\n')[0].substring(0, 30) || 'Новая сцена',
        createdAt: Date.now(),
        lines: parsedLines.map((line, idx) => ({
          ...line,
          id: `line-${idx}-${Date.now()}`,
          role: Role.PARTNER // Default to partner
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
    if (confirm('Вы уверены, что хотите удалить эту сцену?')) {
      setScenes(scenes.filter(s => s.id !== id));
    }
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
      alert('Нет доступа к микрофону');
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

  // Autoplay partner line in rehearsal
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
      <div className="text-center mb-10 pt-8">
        <h1 className="text-5xl font-extrabold text-blue-400 mb-4 tracking-tight">Подай Реплику</h1>
        <p className="text-slate-300 text-lg max-w-lg mx-auto leading-snug">
          Программа предназначена для повторения текста из самопроб, кастингов и репетиций.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button onClick={() => setView('NEW_SCENE')} size="lg" className="rounded-3xl h-32 text-xl font-bold flex flex-col gap-1 transition-transform hover:scale-105">
          <span className="text-3xl">➕</span>
          <span>Новая сцена</span>
        </Button>
        <Button onClick={() => setView('HELP')} variant="secondary" size="lg" className="rounded-3xl h-32 text-xl font-bold flex flex-col gap-1 transition-transform hover:scale-105">
          <span className="text-3xl">📖</span>
          <span>Инструкция</span>
        </Button>
      </div>
      
      <Button 
        onClick={() => setView('DONATE_CONFIRM')} 
        variant="ghost" 
        className="w-full border-blue-500/30 text-blue-300 h-20 rounded-3xl flex flex-col gap-0.5 hover:bg-blue-900/20 mb-10"
      >
        <span className="text-lg font-bold">☕ Поддержать проект</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-70">Добровольная поддержка проекта</span>
      </Button>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-bold text-slate-300">Ваше меню сцен</h2>
          {scenes.length > 0 && <span className="text-xs bg-slate-800 text-slate-500 px-3 py-1 rounded-full uppercase font-black tracking-widest border border-slate-700">{scenes.length}</span>}
        </div>
        {scenes.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-[2.5rem] border-2 border-dashed border-slate-700/50">
            <p className="text-slate-500 mb-2">Здесь будут ваши сценарии.</p>
            <p className="text-slate-600 text-sm italic">Добавьте первую сцену через кнопку выше.</p>
          </div>
        ) : (
          scenes.map(scene => (
            <div key={scene.id} className="group bg-slate-800 p-6 rounded-[2.5rem] flex items-center justify-between hover:bg-slate-750 transition-all border border-slate-700/50 hover:border-blue-500/40 shadow-lg hover:shadow-blue-900/10" onClick={() => startRehearsal(scene)}>
              <div className="flex-1 cursor-pointer">
                <h3 className="font-bold text-xl text-slate-100 group-hover:text-blue-300 transition-colors">{scene.title}</h3>
                <p className="text-slate-500 text-[10px] mt-1 uppercase font-black tracking-widest opacity-60">
                  {scene.lines.length} реплик • {new Date(scene.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="rounded-2xl w-12 h-12 p-0 text-xl border-slate-700 bg-slate-900/30" onClick={() => { setCurrentScene(scene); setView('EDIT_ROLES'); }}>
                  ⚙️
                </Button>
                <Button variant="danger" size="sm" className="rounded-2xl w-12 h-12 p-0 text-xl bg-red-900/10 border-red-500/20 hover:bg-red-900/40" onClick={() => deleteScene(scene.id)}>
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
      <Button variant="ghost" className="mb-6" onClick={() => setView('HOME')}>← В главное меню</Button>
      <h2 className="text-3xl font-bold mb-2">Вставьте текст</h2>
      <p className="text-slate-400 mb-8 text-sm">Скопируйте текст из вашего файла (PDF, DOCX или чата) и вставьте его ниже. Формат: ИМЯ - Текст.</p>
      
      <textarea
        className="w-full h-[28rem] bg-slate-800 border-2 border-slate-700 rounded-[2.5rem] p-8 text-slate-100 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none mb-8 font-mono text-base leading-relaxed resize-none shadow-inner"
        placeholder="ЛЕНА: Ты придёшь?&#10;СЕМЁН: Да, скоро буду."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />

      <Button 
        fullWidth 
        size="lg" 
        onClick={handleCreateScene} 
        disabled={isParsing || !inputText.trim()}
        className="h-20 font-bold text-2xl rounded-3xl shadow-2xl shadow-blue-900/30 active:scale-[0.98] transition-transform"
      >
        {isParsing ? 'Разделяю на реплики...' : 'Создать и разобрать'}
      </Button>
    </div>
  );

  const renderEditRoles = () => {
    if (!currentScene) return null;
    return (
      <div className="max-w-3xl mx-auto p-4 pb-48">
        <audio ref={audioRef} />
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-900/95 backdrop-blur-xl py-6 z-20 border-b border-slate-800/50">
          <Button variant="ghost" size="sm" onClick={() => setView('HOME')}>← Меню</Button>
          <div className="text-center flex-1 px-4 truncate">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">{currentScene.title}</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black opacity-80 mt-0.5">Настройка ролей</p>
          </div>
          {/* Fixed line 249: replaced void expression in logical OR with sequential calls */}
          <Button onClick={() => { setRehearsalIndex(0); setView('REHEARSAL'); }} className="shadow-lg shadow-blue-600/20 px-6 font-bold rounded-2xl">Старт 🎭</Button>
        </div>

        <div className="space-y-6">
          {currentScene.lines.map((line) => (
            <div key={line.id} className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${line.role === Role.ME ? 'border-blue-500/30 bg-blue-600/5' : 'border-slate-800 bg-slate-800/40'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                <div className="flex flex-col gap-3">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest w-fit border ${line.role === Role.ME ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                    {line.character}
                  </span>
                  <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl border border-slate-800 w-fit">
                    <button 
                      onClick={() => setLineRole(line.id, Role.ME)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${line.role === Role.ME ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                      Моя реплика
                    </button>
                    <button 
                      onClick={() => setLineRole(line.id, Role.PARTNER)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${line.role === Role.PARTNER ? 'bg-slate-200 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                      Партнёр
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {line.role === Role.PARTNER && (
                    <div className="flex gap-2">
                      {line.audioUrl && (
                         <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-12 h-12 p-0 rounded-2xl border-slate-700 bg-slate-900/80 hover:bg-slate-800 transition-colors" 
                          onClick={() => playRecording(line.audioUrl!)}
                        >
                          ▶️
                        </Button>
                      )}
                      <Button 
                        variant={line.audioUrl ? 'secondary' : 'primary'} 
                        size="md"
                        onClick={() => isRecording === line.id ? stopRecording() : startRecording(line.id)}
                        className={`h-12 px-8 rounded-2xl font-bold transition-all ${isRecording === line.id ? 'animate-pulse bg-red-600 text-white ring-4 ring-red-600/30 border-none' : ''}`}
                      >
                        {isRecording === line.id ? '⏹ Стоп' : (line.audioUrl ? '🎙 Переписать' : '🎙 Записать голос')}
                      </Button>
                    </div>
                  )}
                  {line.role === Role.ME && (
                    <span className="text-[10px] text-blue-500/40 font-black uppercase tracking-widest italic pr-2">Запись не требуется</span>
                  )}
                </div>
              </div>
              <p className="text-slate-100 text-lg leading-relaxed bg-black/30 p-6 rounded-3xl border border-white/5 shadow-inner select-none">{line.text}</p>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pointer-events-none z-30">
          <Button fullWidth size="lg" className="h-20 font-black shadow-2xl rounded-3xl text-2xl pointer-events-auto shadow-blue-600/30 active:scale-95 transition-transform" onClick={() => setView('REHEARSAL')}>
            Запустить суфлёра 🎭
          </Button>
        </div>
      </div>
    );
  };

  const renderRehearsal = () => {
    if (!currentScene) return null;
    const currentLine = currentScene.lines[rehearsalIndex];
    const isLast = rehearsalIndex === currentScene.lines.length - 1;

    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col p-6 overflow-hidden safe-area-inset z-50">
        <audio ref={audioRef} />
        
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" size="sm" onClick={() => setView('EDIT_ROLES')} className="text-slate-500 font-bold">← Настройка</Button>
          <div className="bg-slate-900 px-8 py-2 rounded-full border-2 border-slate-800 shadow-2xl flex items-center gap-2">
             <span className="text-blue-400 font-black text-xl">{rehearsalIndex + 1}</span>
             <span className="text-slate-700 text-[10px] font-black tracking-widest">ИЗ</span>
             <span className="text-slate-500 font-bold text-lg">{currentScene.lines.length}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setRehearsalIndex(0)} className="text-slate-500 font-bold">Сначала</Button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center px-6">
           <div className={`transition-all duration-1000 transform ${currentLine.role === Role.ME ? 'scale-100' : 'scale-90 opacity-70'}`}>
              <div className={`text-xs font-black tracking-[0.2em] uppercase mb-10 px-8 py-3 rounded-full inline-block border-2 shadow-2xl ${currentLine.role === Role.ME ? 'bg-blue-600 border-blue-300 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                {currentLine.character} {currentLine.role === Role.ME ? '• ГОВОРИТЕ ВЫ' : '• СЛУШАЙТЕ'}
              </div>
              <h2 className={`text-4xl md:text-7xl font-extrabold leading-[1.1] max-w-5xl select-none transition-all duration-700 ${currentLine.role === Role.ME ? 'text-white' : 'text-slate-600 italic'}`}>
                {currentLine.text}
              </h2>
              {currentLine.role === Role.PARTNER && !currentLine.audioUrl && (
                <div className="mt-12 text-red-600/80 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2 animate-pulse">
                  <span>⚠️ Аудио не записано</span>
                </div>
              )}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pb-14 pt-6">
          <Button 
            variant="secondary" 
            size="lg" 
            className="h-32 rounded-[3rem] border-2 border-slate-800 text-slate-500 text-xl font-black bg-slate-900/50"
            disabled={rehearsalIndex === 0} 
            onClick={() => setRehearsalIndex(Math.max(0, rehearsalIndex - 1))}
          >
            ← НАЗАД
          </Button>
          <Button 
            variant="primary" 
            size="lg" 
            className={`h-32 rounded-[3rem] text-4xl font-black shadow-2xl transition-all active:scale-90 ${currentLine.role === Role.ME ? 'bg-blue-600 shadow-blue-600/40 border-t border-blue-400/30' : 'bg-green-600 shadow-green-600/40 border-t border-green-400/30'}`}
            onClick={() => isLast ? setView('HOME') : setRehearsalIndex(rehearsalIndex + 1)}
          >
            {isLast ? 'ФИНИШ' : 'ДАЛЕЕ'}
          </Button>
        </div>
      </div>
    );
  };

  const renderDonateConfirm = () => (
    <div className="max-w-xl mx-auto p-4 pt-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-800 p-10 rounded-[3rem] border-2 border-blue-500/30 shadow-2xl text-center">
        <div className="text-5xl mb-6">☕</div>
        <h2 className="text-3xl font-black mb-6 text-white tracking-tight">Поддержка проекта</h2>
        
        <div className="space-y-4 text-slate-300 text-base leading-relaxed mb-10 text-left bg-black/20 p-6 rounded-3xl border border-white/5">
          <p>Денежные средства перечисляются в качестве <strong>добровольного пожертвования</strong> автору проекта.</p>
          <p>Перечисление средств <strong>не является оплатой услуг</strong> и не влечёт возникновения обязательств.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            fullWidth 
            size="lg" 
            className="h-20 text-xl font-bold rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20"
            onClick={() => { window.open(DONATION_URL, '_blank'); setView('HOME'); }}
          >
            Поддержать автора 🚀
          </Button>
          <Button 
            variant="ghost" 
            fullWidth 
            size="lg" 
            className="h-16 text-slate-500 font-bold border-slate-700"
            onClick={() => setView('HOME')}
          >
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );

  const renderHelp = () => (
    <div className="max-w-2xl mx-auto p-4 pb-24 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-12 py-4">
        <Button variant="ghost" onClick={() => setView('HOME')}>← Назад</Button>
        <Button variant="primary" size="sm" onClick={() => setView('DONATE_CONFIRM')} className="bg-blue-600 rounded-xl px-6">Поддержать ☕</Button>
      </div>

      <h2 className="text-4xl font-black mb-12 text-white leading-tight tracking-tight">Инструкция суфлёра 📖</h2>
      
      <div className="space-y-12 text-slate-300">
        <section className="bg-slate-800/40 p-10 rounded-[3rem] border border-slate-700 shadow-xl relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black mb-8 shadow-xl shadow-blue-500/30">1</div>
          <h3 className="text-2xl font-bold text-white mb-4">Загрузка текста</h3>
          <p className="text-lg leading-relaxed opacity-80">Скопируйте ваш сценарий (даже из PDF или чата) и вставьте его. Gemini автоматически определит реплики. Формат должен быть простым: <span className="text-blue-400 font-bold italic">ИМЯ: Текст</span>.</p>
        </section>

        <section className="bg-slate-800/40 p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black mb-8 shadow-xl shadow-blue-500/30">2</div>
          <h3 className="text-2xl font-bold text-white mb-4">Настройка реплик</h3>
          <p className="text-lg leading-relaxed opacity-80 mb-8">Для каждой реплики выберите роль:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-900/30 p-6 rounded-3xl border border-blue-500/20">
              <strong className="text-blue-400 text-lg block mb-2">Я</strong>
              <span className="text-sm opacity-60">Текст, который вы видите на экране во время репетиции.</span>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-600/30">
              <strong className="text-slate-100 text-lg block mb-2">Партнёр</strong>
              <span className="text-sm opacity-60">Текст, который нужно записать голосом, чтобы суфлёр его подал.</span>
            </div>
          </div>
        </section>

        <section className="bg-slate-800/40 p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black mb-8 shadow-xl shadow-blue-500/30">3</div>
          <h3 className="text-2xl font-bold text-white mb-4">Репетиция</h3>
          <p className="text-lg leading-relaxed opacity-80">Запишите голос партнера. В режиме репетиции вы будете слышать свои записи. Нажимайте <span className="text-blue-400 font-bold">ДАЛЕЕ</span>, чтобы подавать себе следующую реплику.</p>
        </section>

        <div className="p-12 bg-gradient-to-br from-blue-900/40 via-slate-800 to-slate-900 rounded-[3.5rem] border-2 border-blue-500/20 text-center shadow-3xl">
          <h4 className="text-2xl font-bold text-white mb-6 italic tracking-tight">"Твой голос — твой лучший партнер."</h4>
          <p className="text-xs text-slate-500 mb-10 font-black uppercase tracking-[0.4em]">Автор проекта: Владимир Кисаров</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="md" onClick={() => window.open('https://t.me/kisarov_1', '_blank')} className="px-10 h-14 rounded-2xl font-bold text-lg">
              Telegram Канал
            </Button>
            <Button variant="ghost" size="md" onClick={() => setView('DONATE_CONFIRM')} className="px-10 h-14 rounded-2xl font-bold text-lg border-blue-500/30 text-blue-300">
              Поддержать ☕
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30 flex flex-col">
      <main className="flex-1 pb-20">
        {view === 'HOME' && renderHome()}
        {view === 'NEW_SCENE' && renderNewScene()}
        {view === 'EDIT_ROLES' && renderEditRoles()}
        {view === 'REHEARSAL' && renderRehearsal()}
        {view === 'HELP' && renderHelp()}
        {view === 'DONATE_CONFIRM' && renderDonateConfirm()}
      </main>

      {view !== 'REHEARSAL' && (
        <footer className="w-full max-w-2xl mx-auto p-8 pt-0 text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.2em] border-t border-slate-800/50 pt-8">
            Все пожертвования являются добровольными и не предполагают оказания услуг.
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
