import React, { useState, useMemo, useEffect } from 'react';

const getDifficultyInfo = (idx) => {
  switch (idx) {
    case 0: return { name: 'BASIC', color: 'bg-green-900/30 text-green-400 border-green-500/50 hover:bg-green-900/50' };
    case 1: return { name: 'ADVANCED', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50 hover:bg-yellow-900/50' };
    case 2: return { name: 'EXPERT', color: 'bg-red-900/30 text-red-400 border-red-500/50 hover:bg-red-900/50' };
    case 3: return { name: 'MASTER', color: 'bg-purple-900/30 text-purple-400 border-purple-500/50 hover:bg-purple-900/50' };
    case 4: return { name: 'ULTIMA', color: 'bg-slate-900/80 text-red-500 border-red-600/50 shadow-[0_0_10px_rgba(220,38,38,0.2)] hover:bg-slate-800' };
    default: return { name: 'UNKNOWN', color: 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700' };
  }
};

// データベースダウン時のための内蔵バックアップデータ
const FALLBACK_SONGS = [
  { title: "祈 -Inori-", charts: [ {combo: 928}, {combo: 1319}, {combo: 2200}, {combo: 3200} ] },
  { title: "エンドマークに希望と涙を添えて", charts: [ {combo: 602}, {combo: 938}, {combo: 1729}, {combo: 2470}, {combo: 2600} ] },
  { title: "玩具狂奏曲 -終焉-", charts: [ {combo: 785}, {combo: 1042}, {combo: 2011}, {combo: 3000} ] },
  { title: "The empErroR", charts: [ {combo: 938}, {combo: 1475}, {combo: 2453}, {combo: 3340} ] },
  { title: "Trrricksters!!", charts: [ {combo: 825}, {combo: 1111}, {combo: 1985}, {combo: 2772} ] },
  { title: "DAWNBREAKER", charts: [ {combo: 752}, {combo: 1056}, {combo: 2130}, {combo: 2950} ] },
  { title: "蜘蛛の糸", charts: [ {combo: 630}, {combo: 974}, {combo: 1700}, {combo: 2525} ] }
];

export default function App() {
  const [notes, setNotes] = useState(2000);
  const [targetScore, setTargetScore] = useState(1007500);

  // --- 楽曲検索用のState ---
  const [songsData, setSongsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [extractedDiffs, setExtractedDiffs] = useState([]);
  const [isFetchError, setIsFetchError] = useState(false);

  // 外部APIから楽曲データを取得 (タイムアウト処理付き)
  useEffect(() => {
    const fetchSongs = async () => {
      setIsSearching(true);
      setIsFetchError(false);
      
      const fetchWithTimeout = async (url, timeoutMs = 6000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("HTTP Error");
        return await res.json();
      };

      try {
        // 1. otoge-db を優先 (日本の最新曲が反映されやすいため)
        const data = await fetchWithTimeout('https://raw.githubusercontent.com/zvuc/otoge-db/master/chunithm/data/music-ex.json');
        setSongsData(data);
        setIsSearching(false);
        return;
      } catch (e) {
        console.warn("otoge-dbの取得に失敗", e);
      }

      try {
        // 2. バックアップとして Diving-Fish を試す
        const data = await fetchWithTimeout('https://www.diving-fish.com/api/chunithmprober/music_data');
        setSongsData(data);
        setIsSearching(false);
        return;
      } catch (e) {
        console.warn("Diving-Fishの取得に失敗", e);
      }
      
      // どちらも失敗した場合 (バックアップデータを適用)
      setSongsData(FALLBACK_SONGS);
      setIsFetchError(true);
      setIsSearching(false);
    };
    
    fetchSongs();
  }, []);

  // 選択された楽曲のデータ構造を動的に解析
  useEffect(() => {
    if (!selectedSong) {
      setExtractedDiffs([]);
      return;
    }
    const diffs = [];
    
    // パターンA: Diving-Fish 形式 (charts配列)
    if (selectedSong.charts && Array.isArray(selectedSong.charts)) {
      selectedSong.charts.forEach((chart, idx) => {
        if (chart && (chart.combo || chart.notes)) {
          diffs.push({ name: getDifficultyInfo(idx).name, combo: chart.combo || chart.notes, color: getDifficultyInfo(idx).color });
        }
      });
    } 
    // パターンB: otoge-db 形式 (フラットなオブジェクト)
    else {
      // otoge-db ではノーツ数が存在しない場合があるので、まずはキーを探索
      // 一般的なキー名: lev_bas, lev_adv, lev_exc, lev_mas, lev_ult, WE(World's End)は除外
      
      const checkAndAdd = (levelKey, diffIdx) => {
         // otoge-db の music-ex.json にはノーツ数(combo/notes) が直接含まれていない可能性がある。
         // もし含まれている場合はそれを使う。
         // 含まれていない場合は、このアプリ上ではノーツ数がわからないため抽出できない。
      };

      // キーに 'note' や 'combo' が含まれるか全探索
      Object.keys(selectedSong).forEach(key => {
        const lowerKey = key.toLowerCase();
        
        // tap, hold, slide, air, flick など個別のノーツ種別のキーは除外する
        const excludeKeywords = ['tap', 'hold', 'slide', 'air', 'flick', 'we_'];
        if (excludeKeywords.some(kw => lowerKey.includes(kw))) {
          return;
        }

        // notes_bas, notes_adv... などの可能性を考慮
        if (lowerKey.includes('notes') || lowerKey.includes('combo') || lowerKey.includes('max_combo')) {
          const val = parseInt(selectedSong[key]);
          if (!isNaN(val) && val > 0) {
            let idx = 5;
            if (lowerKey.includes('bas')) idx = 0;
            else if (lowerKey.includes('adv')) idx = 1;
            else if (lowerKey.includes('exp') || lowerKey.includes('exc')) idx = 2;
            else if (lowerKey.includes('mas')) idx = 3;
            else if (lowerKey.includes('ult')) idx = 4;
            // 該当する難易度がない場合は一律OTHERとして追加
            diffs.push({ name: idx !== 5 ? getDifficultyInfo(idx).name : 'OTHER', combo: val, color: getDifficultyInfo(idx !== 5 ? idx : 5).color });
          }
        }
      });
    }
    
    // 重複排除ロジック
    const uniqueDiffs = [];
    const seenCombos = new Set();
    diffs.forEach(diff => {
       if(!seenCombos.has(diff.combo)){
           uniqueDiffs.push(diff);
           seenCombos.add(diff.combo);
       }
    })

    const order = { 'BASIC': 0, 'ADVANCED': 1, 'EXPERT': 2, 'MASTER': 3, 'ULTIMA': 4, 'OTHER': 99 };
    uniqueDiffs.sort((a, b) => (order[a.name] ?? 99) - (order[b.name] ?? 99));
    setExtractedDiffs(uniqueDiffs);
  }, [selectedSong]);

  const combinations = useMemo(() => {
    const notesNum = Math.max(1, parseInt(notes) || 1);
    const targetNum = parseInt(targetScore) || 0;

    if (targetNum > 1010000 || notesNum <= 0) {
      return { exact: [], allow: [], isExactExist: false };
    }

    const exactCombos = [];
    const allowCombos = [];
    const MAX_ITEMS = 3000;

    const lossTarget = 1010000 - targetNum;
    
    // スコア計算の仕様に基づくボーダー失点計算
    let kMaxExact = Math.floor(lossTarget * notesNum / 10000);
    let kMinExact = Math.floor((lossTarget - 1) * notesNum / 10000) + 1;
    
    kMaxExact = Math.max(0, kMaxExact);
    kMinExact = Math.max(0, kMinExact);

    let targetKs = [];
    const isExactExist = kMinExact <= kMaxExact;
    
    if (isExactExist) {
      // ジャストスコアが存在する場合
      for (let k = kMinExact; k <= kMaxExact; k++) targetKs.push(k);
    }

    const maxM = Math.min(notesNum, Math.floor(kMaxExact / 101));

    for (let m = 0; m <= maxM; m++) {
      const maxA = Math.min(notesNum - m, Math.floor((kMaxExact - 101 * m) / 51));
      
      for (let a = 0; a <= maxA; a++) {
        // Allow (許容上限) の計算
        let maxJAllow = kMaxExact - 51 * a - 101 * m;
        if (maxJAllow >= 0) {
          if (maxJAllow + a + m > notesNum) maxJAllow = notesNum - a - m;
          if (maxJAllow >= 0 && allowCombos.length < MAX_ITEMS) {
            allowCombos.push({ j: maxJAllow, a, m });
          }
        }

        // Exact (ぴったり) の計算
        if (isExactExist) {
          targetKs.forEach(k => {
            let exactJ = k - 51 * a - 101 * m;
            if (exactJ >= 0 && (exactJ + a + m) <= notesNum) {
              if (exactCombos.length < MAX_ITEMS) {
                exactCombos.push({ j: exactJ, a, m });
              }
            }
          });
        }

        if (allowCombos.length >= MAX_ITEMS && exactCombos.length >= MAX_ITEMS) break;
      }
      if (allowCombos.length >= MAX_ITEMS && exactCombos.length >= MAX_ITEMS) break;
    }

    return { exact: exactCombos, allow: allowCombos, isExactExist };
  }, [notes, targetScore]);

  const TableHeader = ({ isAllow }) => (
    <thead className="sticky top-0 bg-slate-900 text-slate-400 text-xs shadow-md z-10">
      <tr>
        <th className="py-3 font-medium text-orange-400">
          JUSTICE {isAllow && <span className="text-[10px] text-orange-500">(上限)</span>}
        </th>
        <th className="py-3 font-medium text-green-400">ATTACK</th>
        <th className="py-3 font-medium text-slate-400">MISS</th>
      </tr>
    </thead>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-16 selection:bg-blue-500/30">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-lg border border-white/10">
            C
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
            CHUNITHM SCORE CALCULATOR
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 mt-4">
        
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          
          {/* 曲名検索セクション */}
          <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-visible z-30">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/80 rounded-l-2xl"></div>
            <div className="flex justify-between items-start mb-2 pl-2">
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Search Song (楽曲名から自動入力)
                {isFetchError && (
                  <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                    通信エラー: バックアップデータ適用中
                  </span>
                )}
              </label>
            </div>
            
            <div className="relative pl-2">
              <div className="flex relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-lg">🔍</span>
                <input
                  type="text"
                  placeholder={isSearching ? "データベース接続中..." : "曲名の一部を入力... (例: エンドマーク)"}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedSong(null);
                  }}
                  onFocus={() => {
                    if (selectedSong) setSelectedSong(null);
                  }}
                  disabled={isSearching}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-10 text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all text-slate-200 shadow-inner"
                />
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSong(null);
                    }}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* 検索結果のドロップダウン */}
              {searchQuery && !selectedSong && (
                <div className="absolute top-full left-2 right-0 mt-2 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 divide-y divide-slate-700/50 custom-scrollbar">
                  {songsData.length > 0 ? (
                    <>
                      {songsData
                        .filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 30)
                        .map((song, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedSong(song);
                              setSearchQuery(song.title);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-emerald-900/40 text-sm font-bold text-slate-200 transition-colors"
                          >
                            {song.title}
                          </button>
                        ))}
                      {songsData.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="px-4 py-6 text-slate-300 text-sm flex flex-col items-center justify-center gap-3 bg-slate-800/80">
                          <span className="text-2xl">🤔</span>
                          <p className="font-bold">見つかりませんでした</p>
                          <p className="text-xs text-slate-400 text-center">
                            下のフォームに直接ノーツ数を入力してください。
                          </p>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* 選択された楽曲の難易度別ボタン */}
            {selectedSong && (
              <div className="mt-4 pl-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800 animate-fade-in">
                <div className="text-sm text-slate-400 mb-3">
                  「<span className="text-white font-bold">{selectedSong.title}</span>」の難易度を選択:
                </div>
                
                {extractedDiffs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {extractedDiffs.map((diff, idx) => {
                      const isSelected = String(notes) === String(diff.combo);
                      return (
                        <button
                          key={idx}
                          onClick={() => setNotes(diff.combo)}
                          className={`px-4 py-2 border rounded-xl font-bold flex flex-col items-center justify-center min-w-[80px] transition-all active:scale-95 ${diff.color} ${isSelected ? 'ring-2 ring-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : ''}`}
                        >
                          <span className="text-[10px] opacity-80">{diff.name}</span>
                          <span className="text-lg">{diff.combo}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-orange-400 text-sm py-2 px-3 bg-orange-900/20 border border-orange-500/30 rounded-lg flex items-center gap-2">
                    <span>⚠️</span>
                    ノーツ数データが見つかりませんでした。「Total Notes」に手動入力してください。
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden z-10">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/80"></div>
            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest pl-2 flex items-center justify-between">
              <span>Total Notes (総ノーツ数)</span>
              <span className="text-[10px] text-blue-400/70 font-normal normal-case tracking-normal border border-blue-500/30 px-1.5 rounded">手動入力可</span>
            </label>
            <input 
              type="number" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-2xl font-bold font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all ml-2 shadow-inner"
            />
          </div>
          
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden z-10">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500/80"></div>
            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest pl-2">Target Score (目標スコア)</label>
            <input 
              type="number" 
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-2xl font-bold font-mono text-blue-100 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all ml-2 shadow-inner"
            />
            <div className="flex gap-2 mt-4 pl-2 flex-wrap">
              {[
                { label: 'SS', val: 1000000, color: 'text-yellow-200 border-yellow-200/30 hover:bg-yellow-900/30' },
                { label: 'SS+', val: 1005000, color: 'text-yellow-300 border-yellow-300/30 hover:bg-yellow-900/30' },
                { label: 'SSS', val: 1007500, color: 'text-red-300 border-red-300/30 hover:bg-red-900/30' },
                { label: 'SSS+', val: 1009000, color: 'text-red-400 border-red-400/30 hover:bg-red-900/30' },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setTargetScore(preset.val)}
                  className={`px-4 py-1.5 bg-slate-800 border rounded-lg text-sm font-bold transition-colors shadow-sm ${preset.color}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section (左右入れ替え済み) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Allow Combinations (左側へ移動) */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700 shadow-lg flex flex-col h-[650px]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-slate-300 text-sm font-bold flex items-center gap-2">
                目標スコア<span className="text-yellow-400 font-black">以上</span>を出せる許容上限
              </h3>
              <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded whitespace-nowrap">
                {combinations.allow.length >= 3000 ? '最大3000件' : `全 ${combinations.allow.length} 通り`}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 rounded-lg border border-slate-800 bg-slate-950/50 relative mt-1">
              <table className="w-full text-sm text-center">
                <TableHeader isAllow={true} />
                <tbody className="divide-y divide-slate-800/50">
                  {combinations.allow.length > 0 ? (
                    combinations.allow.map((combo, idx) => (
                      <tr key={`allow-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 text-orange-400 font-mono font-bold relative">
                          {combo.j}
                        </td>
                        <td className="py-2.5 text-green-400 font-mono">{combo.a}</td>
                        <td className="py-2.5 text-slate-400 font-mono">{combo.m}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-12 text-slate-500 text-center">達成できる組み合わせはありません</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 text-center">
              AとMの数に対して、JUSTICEが「最大で何回まで許されるか」を示します。
            </p>
          </div>

          {/* Exact Combinations (右側へ移動) */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] flex flex-col h-[650px]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-blue-300 text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                ぴったり目標スコアになる組み合わせ
              </h3>
              <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded whitespace-nowrap">
                {combinations.exact.length >= 3000 ? '最大3000件' : `全 ${combinations.exact.length} 通り`}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 rounded-lg border border-slate-800 bg-slate-950/50 relative mt-1">
              <table className="w-full text-sm text-center">
                <TableHeader isAllow={false} />
                <tbody className="divide-y divide-slate-800/50">
                  {combinations.isExactExist && combinations.exact.length > 0 ? (
                    combinations.exact.map((combo, idx) => (
                      <tr key={`exact-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 text-orange-400 font-mono font-bold">{combo.j}</td>
                        <td className="py-2.5 text-green-400 font-mono">{combo.a}</td>
                        <td className="py-2.5 text-slate-400 font-mono">{combo.m}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-12 text-slate-500 text-center font-bold">
                        このスコアにはなりません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 text-center">
              表示されたJ, A, Mの数を出せば、正確に入力したスコアになります。
            </p>
          </div>

        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 1); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}