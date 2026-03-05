import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Table, Layers, FileQuestion, Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

// Types
interface VocabularyItem {
  id: string;
  english: string;
  spanish: string;
  pronunciation?: string;
  note?: string;
  exampleEnglish?: string;
  exampleSpanish?: string;
}

const SHEET1_URL = "https://docs.google.com/spreadsheets/d/1kMuE2jSEcDZOIugWA1T5RcWcz2KyPnfFfSIEbB5dekA/export?format=csv";
const SHEET2_URL = "https://docs.google.com/spreadsheets/d/18aMR1FiIFOhUqVgVrorSoT4Zbi8sENpQxzgeHucCSAw/export?format=csv";

export default function App() {
  const [vocab, setVocab] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'flashcards' | 'quiz'>('table');
  const [search, setSearch] = useState('');

  // Fetch Data
  useEffect(() => {
    async function loadData() {
      try {
        const [res1, res2] = await Promise.all([
          fetch(SHEET1_URL).then(r => r.text()),
          fetch(SHEET2_URL).then(r => r.text())
        ]);

        const data1 = Papa.parse(res1, { header: true }).data as any[];
        const data2 = Papa.parse(res2, { header: true }).data as any[];

        const vocabMap = new Map<string, VocabularyItem>();

        data1.forEach((row, i) => {
          const eng = row["English Translation"]?.trim();
          const esp = row["Spanish Term"]?.trim();
          if (eng && esp) {
            vocabMap.set(eng.toLowerCase(), {
              id: `s1-${i}`,
              english: eng,
              spanish: esp,
              note: row["Grammar or Usage Note"]
            });
          }
        });

        data2.forEach((row, i) => {
          const eng = row["English Word or Expression"]?.trim();
          const esp = row["Spanish Translation"]?.trim();
          if (eng && esp) {
            const key = eng.toLowerCase();
            const existing = vocabMap.get(key);
            vocabMap.set(key, {
              id: existing?.id || `s2-${i}`,
              english: eng,
              spanish: esp,
              pronunciation: row["Pronunciation"] || existing?.pronunciation,
              exampleEnglish: row["English Example Sentence"] || existing?.exampleEnglish,
              exampleSpanish: row["Spanish Sentence Translation"] || existing?.exampleSpanish,
              note: existing?.note
            });
          }
        });

        setVocab(Array.from(vocabMap.values()));
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredVocab = vocab.filter(v => 
    v.english.toLowerCase().includes(search.toLowerCase()) || 
    v.spanish.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center font-mono">Cargando vocabulario...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans text-slate-800">
      <header className="mb-8 border-b pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Estudio de Vocabulario</h1>
        <nav className="flex gap-2">
          <button 
            onClick={() => setView('table')}
            className={`px-4 py-2 rounded flex items-center gap-2 text-sm ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
            <Table size={16} /> Tabla
          </button>
          <button 
            onClick={() => setView('flashcards')}
            className={`px-4 py-2 rounded flex items-center gap-2 text-sm ${view === 'flashcards' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
            <Layers size={16} /> Tarjetas
          </button>
          <button 
            onClick={() => setView('quiz')}
            className={`px-4 py-2 rounded flex items-center gap-2 text-sm ${view === 'quiz' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
          >
            <FileQuestion size={16} /> Test
          </button>
        </nav>
      </header>

      {view === 'table' && (
        <section>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar palabra..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 font-semibold">Inglés</th>
                  <th className="p-3 font-semibold">Español</th>
                  <th className="p-3 font-semibold">Nota / Pronunciación</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVocab.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium">{item.english}</td>
                    <td className="p-3 text-slate-600">{item.spanish}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {item.pronunciation && <div className="font-mono text-blue-600">{item.pronunciation}</div>}
                      {item.note && <div>{item.note}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === 'flashcards' && <FlashcardsView vocab={vocab} />}
      {view === 'quiz' && <QuizView vocab={vocab} />}
    </div>
  );
}

function FlashcardsView({ vocab }: { vocab: VocabularyItem[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const item = vocab[idx];

  if (!item) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div 
        onClick={() => setFlipped(!flipped)}
        className="w-full max-w-sm h-64 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-center p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
      >
        {!flipped ? (
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Inglés</div>
            <div className="text-3xl font-bold">{item.english}</div>
            {item.pronunciation && <div className="mt-2 text-sm text-blue-500 font-mono">{item.pronunciation}</div>}
          </div>
        ) : (
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Español</div>
            <div className="text-3xl font-serif italic text-blue-700">{item.spanish}</div>
            {item.note && <div className="mt-4 text-sm text-slate-500">{item.note}</div>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button 
          disabled={idx === 0}
          onClick={() => { setIdx(idx - 1); setFlipped(false); }}
          className="p-2 border rounded-full disabled:opacity-30 hover:bg-slate-100"
        >
          <ChevronLeft />
        </button>
        <span className="text-sm font-mono">{idx + 1} / {vocab.length}</span>
        <button 
          disabled={idx === vocab.length - 1}
          onClick={() => { setIdx(idx + 1); setFlipped(false); }}
          className="p-2 border rounded-full disabled:opacity-30 hover:bg-slate-100"
        >
          <ChevronRight />
        </button>
      </div>
      <p className="text-xs text-slate-400">Haz clic en la tarjeta para ver la traducción</p>
    </div>
  );
}

function QuizView({ vocab }: { vocab: VocabularyItem[] }) {
  const [items] = useState(() => [...vocab].sort(() => Math.random() - 0.5).slice(0, 10));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = items[idx];

  const handleCheck = () => {
    if (input.trim().toLowerCase() === current.english.toLowerCase()) {
      setScore(score + 1);
    }
    setAnswered(true);
  };

  const handleNext = () => {
    if (idx < items.length - 1) {
      setIdx(idx + 1);
      setInput('');
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  if (finished) return (
    <div className="text-center py-10">
      <h2 className="text-2xl font-bold mb-4">¡Test completado!</h2>
      <div className="text-5xl font-bold text-blue-600 mb-6">{score} / {items.length}</div>
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-2 mx-auto">
        <RotateCcw size={18} /> Reiniciar
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto py-6">
      <div className="mb-4 flex justify-between text-xs font-mono text-slate-400">
        <span>Pregunta {idx + 1} de {items.length}</span>
        <span>Aciertos: {score}</span>
      </div>
      <div className="bg-white border p-8 rounded-xl shadow-sm">
        <div className="text-xs text-slate-400 uppercase mb-2">Traduce al inglés:</div>
        <div className="text-2xl font-serif italic mb-6">{current.spanish}</div>
        
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={answered}
          placeholder="Escribe aquí..."
          className={`w-full p-3 border-b-2 outline-none text-xl font-bold transition-colors ${
            answered 
              ? (input.trim().toLowerCase() === current.english.toLowerCase() ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600') 
              : 'border-slate-200 focus:border-blue-500'
          }`}
        />

        {answered && (
          <div className="mt-4 p-3 bg-slate-50 rounded text-sm">
            <div className="text-slate-400 text-[10px] uppercase mb-1">Respuesta correcta:</div>
            <div className="font-bold">{current.english}</div>
            {current.exampleEnglish && <div className="mt-2 italic text-slate-500">"{current.exampleEnglish}"</div>}
          </div>
        )}

        <div className="mt-8">
          {!answered ? (
            <button 
              onClick={handleCheck}
              disabled={!input.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50"
            >
              Comprobar
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
