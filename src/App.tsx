/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Plus, Minus, UserPlus, Trash2, RefreshCcw, Trophy, Trees, Sparkles, BookOpen, Heart, CheckCircle, Lightbulb, ChevronDown, ChevronUp, Info, Lock, Unlock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Student {
  id: string;
  name: string;
  points: number;
  emoji: string;
}

const EMOJIS = ['🐱', '🐶', '🦊', '🐰', '🐯', '🦁', '🐮', '🐷', '🐨', '🐼', '🐸', '🐵', '🐣', '🦄', '🐝', '🦋'];

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [newName, setNewName] = useState('');
  const [isConfigured, setIsConfigured] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [lastMilestone, setLastMilestone] = useState<Record<string, number>>({});

  const POINT_GUIDE = [
    {
      title: "1. 자기주도 학습 태도 영역",
      icon: <BookOpen className="text-blue-500" />,
      color: "bg-blue-50 border-blue-100",
      items: [
        { name: "경청의 왕", desc: "선생님이나 친구가 발표할 때 눈을 맞추며 고개를 끄덕인 경우" },
        { name: "질문 대장", desc: "수업 내용 중 궁금한 점을 용기 있게 질문하거나 친구의 이해를 돕는 질문을 한 경우" },
        { name: "준비 완료", desc: "수업 시작 전 교과서와 필기구를 미리 책상 위에 준비한 경우" },
        { name: "기록의 힘", desc: "배운 내용을 자신만의 방식(글, 그림, 마인드맵 등)으로 공책에 잘 정리한 경우" },
        { name: "발표의 용기", desc: "정답이 아니더라도 자신의 생각을 자신 있게 발표한 경우" },
      ]
    },
    {
      title: "2. 배려와 협력 영역 (우리 함께)",
      icon: <Heart className="text-rose-500" />,
      color: "bg-rose-50 border-rose-100",
      items: [
        { name: "따뜻한 말 한마디", desc: "친구에게 \"고마워\", \"괜찮아\", \"내가 도와줄까?\" 같은 격려의 말을 건넨 경우" },
        { name: "든든한 도우미", desc: "수업 도중 어려움을 겪는 친구를 다정하게 도와준 경우" },
        { name: "갈등 해결사", desc: "친구와 의견 차이가 생겼을 때 화내지 않고 대화로 해결하려고 노력한 경우" },
        { name: "칭찬 릴레이", desc: "친구의 장점을 발견하여 게시판이나 대화 중에 구체적으로 칭찬한 경우" },
        { name: "모둠의 기둥", desc: "모둠 활동에서 소외되는 친구 없이 모두가 참여할 수 있도록 이끈 경우" },
      ]
    },
    {
      title: "3. 기본 생활 습관 영역 (책임감)",
      icon: <CheckCircle className="text-emerald-500" />,
      color: "bg-emerald-50 border-emerald-100",
      items: [
        { name: "시간 약속 엄수", desc: "등교 시간이나 쉬는 시간 끝난 뒤 수업 시작 시간을 잘 지킨 경우" },
        { name: "정리 정돈의 달인", desc: "자신의 주변(책상 위, 서랍 속)뿐만 아니라 공용 공간을 스스로 정리한 경우" },
        { name: "환경 지킴이", desc: "교실의 전등을 끄거나 급식을 남기지 않고 깨끗하게 먹은 경우" },
        { name: "인사 예절", desc: "선생님과 학교 방문객, 친구들에게 밝은 목소리로 먼저 인사한 경우" },
        { name: "안전 지킴이", desc: "복도에서 걷기, 계단 조심히 다니기 등 학교 안전 수칙을 철저히 지킨 경우" },
      ]
    },
    {
      title: "4. 도전과 창의성 영역 (성장)",
      icon: <Lightbulb className="text-amber-500" />,
      color: "bg-amber-50 border-amber-100",
      items: [
        { name: "실패는 성공의 어머니", desc: "실패하더라도 포기하지 않고 끝까지 과제를 완수한 경우" },
        { name: "새로운 아이디어", desc: "기존의 방식이 아닌 자신만의 독창적인 방법으로 문제를 해결한 경우" },
        { name: "재능 나눔", desc: "자신이 잘하는 것(그림, 노래, 컴퓨터 등)을 활용해 학급에 기여한 경우" },
        { name: "정직한 행동", desc: "잘못을 했을 때 숨기지 않고 솔직하게 말하고 사과한 경우" },
        { name: "독서 열정", desc: "쉬는 시간이나 점심시간을 활용해 꾸준히 책을 읽는 모습을 보인 경우" },
      ]
    }
  ];

  // Firebase Realtime Database Sync
  useEffect(() => {
    const studentsRef = ref(db, 'students');
    
    // Check if Firebase is configured (basic check)
    // In a real app, we'd handle this more gracefully
    try {
      const unsubscribe = onValue(studentsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data).map(([id, val]: [string, any]) => ({
            id,
            ...val,
          }));
          setStudents(list);
        } else {
          setStudents([]);
        }
      }, (error) => {
        console.error("Firebase connection error:", error);
        if (error.message.includes("apiKey")) setIsConfigured(false);
      });

      return () => unsubscribe();
    } catch (e) {
      setIsConfigured(false);
    }
  }, []);

  // Sorted students for ranking
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }, [students]);

  // Add Student
  const addStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const studentsRef = ref(db, 'students');
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    
    push(studentsRef, {
      name: newName.trim(),
      points: 0,
      emoji: randomEmoji
    });
    
    setNewName('');
  };

  // Update Points
  const updatePoints = (id: string, currentPoints: number, delta: number) => {
    const newPoints = Math.max(0, currentPoints + delta);
    const studentRef = ref(db, `students/${id}`);
    
    update(studentRef, { points: newPoints });

    // Confetti effect for milestones (10, 20, 30...)
    if (delta > 0 && newPoints > 0 && newPoints % 10 === 0 && lastMilestone[id] !== newPoints) {
      triggerCelebration(newPoints);
      setLastMilestone(prev => ({ ...prev, [id]: newPoints }));
    }
  };

  const triggerCelebration = (points: number) => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#81C784', '#B3E5FC', '#FFF176', '#F06292']
    });
  };

  // Delete Student
  const deleteStudent = (id: string) => {
    if (window.confirm('정말 이 학생을 삭제할까요?')) {
      remove(ref(db, `students/${id}`));
    }
  };

  // Reset All Points
  const resetAllPoints = () => {
    if (resetPassword === '6956') { // Updated password
      const updates: Record<string, any> = {};
      students.forEach(s => {
        updates[`students/${s.id}/points`] = 0;
      });
      update(ref(db), updates);
      setShowResetModal(false);
      setResetPassword('');
      alert('모든 포인트가 초기화되었습니다! 새 학기 화이팅! 🌱');
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  // Admin Login
  const handleAdminLogin = () => {
    if (adminPassword === '6956') {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminPassword('');
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md">
          <Trees className="w-16 h-16 text-forest-accent mx-auto mb-4" />
          <h1 className="text-2xl font-jua mb-4">Firebase 설정이 필요합니다</h1>
          <p className="text-slate-600 mb-6">
            src/firebase.ts 파일에 Firebase API 키와 설정값을 입력해주세요.
            설정 후 앱이 정상적으로 작동합니다.
          </p>
          <div className="text-sm bg-slate-50 p-4 rounded-lg text-left font-mono">
            1. Firebase Console 접속<br/>
            2. Realtime Database 생성<br/>
            3. Rules: {`{".read": true, ".write": true}`}<br/>
            4. Config 복사 & 붙여넣기
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <header className="text-center mb-12 relative">
        <div className="absolute right-0 top-0">
          <button
            onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminModal(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-jua text-sm transition-all shadow-sm",
              isAdmin ? "bg-forest-accent text-white" : "bg-white text-slate-400 hover:text-forest-accent"
            )}
          >
            {isAdmin ? <Unlock size={18} /> : <Lock size={18} />}
            <span>{isAdmin ? "선생님 모드" : "조회 전용"}</span>
          </button>
        </div>
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1 bg-white/50 rounded-full text-forest-accent font-jua text-sm mb-4 border border-forest-accent/20"
        >
          <Sparkles size={16} />
          <span>꿈꾸는 요정 숲</span>
        </motion.div>
        <h1 className="text-5xl md:text-6xl text-slate-800 mb-2 drop-shadow-sm">
          반짝반짝 포인트 숲
        </h1>
        <p className="text-slate-500 font-nanum">우리 반 친구들의 멋진 성장을 응원해요! 🌱</p>
      </header>

      {/* Controls */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Add Student Form */}
          <form onSubmit={addStudent} className="md:col-span-2 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="새로운 친구 이름을 입력하세요"
                className="w-full px-6 py-4 rounded-2xl bg-white shadow-sm border-none focus:ring-2 focus:ring-forest-accent outline-none font-jua text-lg"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4 bg-forest-accent text-white rounded-2xl font-jua text-lg shadow-md hover:bg-forest-accent/90 transition-all active:scale-95 flex items-center gap-2"
            >
              <UserPlus size={20} />
              <span>추가</span>
            </button>
          </form>

          {/* Reset Button */}
          <button
            onClick={() => setShowResetModal(true)}
            className="px-6 py-4 bg-white text-slate-400 rounded-2xl font-jua text-lg shadow-sm hover:text-red-400 hover:bg-red-50 transition-all flex items-center justify-center gap-2 border border-transparent hover:border-red-100"
          >
            <RefreshCcw size={20} />
            <span>새 학기 모드</span>
          </button>
        </div>
      )}

      {/* Point Guide Section */}
      <div className="mb-12">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-8 py-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-forest-accent/20 shadow-sm hover:bg-white transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-accent/10 flex items-center justify-center text-forest-accent">
              <Info size={20} />
            </div>
            <span className="text-xl font-jua text-slate-700">✨ 우리 반 포인트 안내 (어떻게 포인트를 받을까요?)</span>
          </div>
          <div className="text-slate-400 group-hover:text-forest-accent transition-colors">
            {showGuide ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </button>

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {POINT_GUIDE.map((category, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn("p-6 rounded-3xl border-2", category.color)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        {category.icon}
                      </div>
                      <h3 className="text-lg font-jua text-slate-800">{category.title}</h3>
                    </div>
                    <ul className="space-y-3">
                      {category.items.map((item, i) => (
                        <li key={i} className="flex flex-col">
                          <span className="font-jua text-slate-700 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {item.name}
                          </span>
                          <span className="text-xs text-slate-500 font-nanum ml-3.5 leading-relaxed">
                            {item.desc}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Student Grid */}
      <motion.div 
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {sortedStudents.map((student, index) => (
            <motion.div
              key={student.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ y: -5 }}
              className={cn(
                "relative bg-white rounded-3xl p-6 shadow-sm border-2 transition-colors",
                index === 0 ? "border-yellow-200 bg-yellow-50/30" : "border-transparent"
              )}
            >
              {/* Rank Badge */}
              {index < 3 && (
                <div className={cn(
                  "absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center shadow-md z-10",
                  index === 0 ? "bg-yellow-400 text-white" : 
                  index === 1 ? "bg-slate-300 text-white" : 
                  "bg-orange-300 text-white"
                )}>
                  <Trophy size={20} />
                </div>
              )}

              {/* Student Info */}
              <div className="flex flex-col items-center mb-6">
                <div className="text-5xl mb-3 filter drop-shadow-sm">{student.emoji}</div>
                <h3 className="text-2xl font-jua text-slate-700">{student.name}</h3>
              </div>

              {/* Points Display */}
              <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2 mb-4">
                {isAdmin ? (
                  <button
                    onClick={() => updatePoints(student.id, student.points, -1)}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 shadow-sm"
                  >
                    <Minus size={24} />
                  </button>
                ) : (
                  <div className="w-12 h-12" />
                )}
                
                <motion.div 
                  key={student.points}
                  initial={{ scale: 1.5, color: '#81C784' }}
                  animate={{ scale: 1, color: '#334155' }}
                  className="text-3xl font-jua"
                >
                  {student.points}
                  <span className="text-sm ml-1 text-slate-400">P</span>
                </motion.div>

                {isAdmin ? (
                  <button
                    onClick={() => updatePoints(student.id, student.points, 1)}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-forest-accent text-white hover:bg-forest-accent/90 transition-all active:scale-90 shadow-md"
                  >
                    <Plus size={24} />
                  </button>
                ) : (
                  <div className="w-12 h-12" />
                )}
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="p-2 text-slate-300 hover:text-red-400 transition-colors"
                    title="학생 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {students.length === 0 && (
        <div className="text-center py-20 bg-white/30 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="text-6xl mb-4 opacity-50">🌳</div>
          <p className="text-xl font-jua text-slate-400">아직 숲에 친구들이 없어요.<br/>새로운 친구를 추가해볼까요?</p>
        </div>
      )}

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-2xl font-jua mb-4 text-center">선생님 인증 🔑</h2>
              <p className="text-slate-600 mb-6 text-center">
                관리 기능을 사용하려면 비밀번호를 입력하세요.
              </p>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 mb-4 outline-none focus:ring-2 focus:ring-forest-accent text-center font-nanum"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-jua hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 py-3 bg-forest-accent text-white rounded-xl font-jua hover:bg-forest-accent/90 transition-colors shadow-md"
                >
                  인증하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-2xl font-jua mb-4 text-center">새 학기 초기화 🧹</h2>
              <p className="text-slate-600 mb-6 text-center">
                모든 학생의 포인트를 0으로 초기화합니다.<br/>
                비밀번호를 입력해주세요.
              </p>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 mb-4 outline-none focus:ring-2 focus:ring-red-400 text-center font-nanum"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-jua hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={resetAllPoints}
                  className="flex-1 py-3 bg-red-400 text-white rounded-xl font-jua hover:bg-red-500 transition-colors shadow-md"
                >
                  초기화 실행
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="mt-20 text-center text-slate-400 text-sm font-nanum pb-8">
        <p>© 2024 반짝반짝 포인트 숲 - 초등 학급용 실시간 포인트 시스템</p>
        <p className="mt-1">Firebase Realtime Database를 통해 모든 기기에서 실시간 동기화됩니다.</p>
      </footer>
    </div>
  );
}
