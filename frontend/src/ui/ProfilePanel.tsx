import { useEffect, useState } from 'react';
import { useOfficeStore } from '../store/useOfficeStore';

interface Props {
  open: boolean;
  userId: string | null;
  onClose: () => void;
}

type ProfileAnswer = { questionId: string; question: string; answer: string };

type ProfileDetail = {
  displayName: string;
  jobTitle: string | null;
  branchName: string;
  birthDate: string | null;
  joinDate: string | null;
  workStyle: string;
  profiles: ProfileAnswer[];
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function yearsFrom(iso: string | null): string {
  if (!iso) return '';
  const y = Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000));
  return y > 0 ? `（${y}年）` : '';
}

export function ProfilePanel({ open, userId, onClose }: Props) {
  const userInfos = useOfficeStore(s => s.userInfos);
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !open) { setDetail(null); return; }
    setLoading(true);
    fetch(`/api/profile/${userId}`)
      .then(r => r.json())
      .then((d: ProfileDetail) => { setDetail(d); setLoading(false); })
      .catch(() => {
        // フォールバック: userInfosから基本情報だけ表示
        const found = userInfos.find(u => u.id === userId);
        if (found) setDetail({
          displayName: found.displayName,
          jobTitle: found.jobTitle,
          branchName: found.branchName,
          birthDate: null,
          joinDate: null,
          workStyle: '',
          profiles: [],
        });
        setLoading(false);
      });
  }, [userId, open, userInfos]);

  return (
    <div
      className={`fixed top-[41px] right-0 z-40 w-72 h-[calc(100vh-41px)]
                  bg-gray-900 border-l border-gray-700/80 shadow-[-8px_0_32px_rgba(0,0,0,0.4)]
                  flex flex-col transition-transform duration-300 ease-out
                  ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
    >
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 shrink-0">
        <span className="text-sm font-semibold">プロフィール</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {loading && (
          <div className="text-gray-500 text-sm text-center py-6">読み込み中...</div>
        )}

        {!loading && !detail && (
          <div className="text-sm text-gray-500 text-center py-4">
            アバターをクリックして選択してください
          </div>
        )}

        {!loading && detail && (
          <div className="flex flex-col gap-4">
            {/* 基本情報 */}
            <div>
              <div className="text-base font-bold">{detail.displayName}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {detail.jobTitle ?? '役職未設定'} · {detail.branchName}
              </div>
            </div>

            {/* 入社日 / 誕生日 */}
            {(detail.joinDate || detail.birthDate) && (
              <div className="flex flex-col gap-1.5 text-xs">
                {detail.joinDate && (
                  <div className="flex justify-between text-gray-400">
                    <span className="text-gray-500">入社日</span>
                    <span>{formatDate(detail.joinDate)}{yearsFrom(detail.joinDate)}</span>
                  </div>
                )}
                {detail.birthDate && (
                  <div className="flex justify-between text-gray-400">
                    <span className="text-gray-500">誕生日</span>
                    <span>{formatDate(detail.birthDate)}</span>
                  </div>
                )}
              </div>
            )}

            {/* プロフィール回答 */}
            {detail.profiles.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">プロフィール</div>
                {detail.profiles.map(p => (
                  <div key={p.questionId} className="bg-gray-800 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500 mb-1">{p.question}</div>
                    <div className="text-xs text-gray-200">{p.answer}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 bg-gray-800 rounded-lg p-3 text-center">
                プロフィール未記入
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

