import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.branch.count();
  if (existing > 0) {
    console.log('Already seeded. Skipping.');
    return;
  }

  // ── Branches ──────────────────────────────────────────────
  const [sapporo, tokyo, nagoya, fukuoka, tomakomai] = await Promise.all([
    prisma.branch.create({ data: { name: '札幌' } }),
    prisma.branch.create({ data: { name: '東京' } }),
    prisma.branch.create({ data: { name: '名古屋' } }),
    prisma.branch.create({ data: { name: '福岡' } }),
    prisma.branch.create({ data: { name: '苫小牧' } }),
  ]);

  // ── Floor (Phase 1: 札幌本社のみ) ─────────────────────────
  const floor = await prisma.floor.create({
    data: { name: '本社フロア', branchId: sapporo.id },
  });

  // エリア配置
  await prisma.layoutObject.createMany({
    data: [
      { floorId: floor.id, type: 'meeting_room', label: '竹', x: 0,  y: 0, width: 4, height: 3 },
      { floorId: floor.id, type: 'meeting_room', label: '梅', x: 5,  y: 0, width: 4, height: 3 },
      { floorId: floor.id, type: 'meeting_room', label: '松', x: 10, y: 0, width: 4, height: 3 },
      { floorId: floor.id, type: 'office',       label: '職員室', x: 0, y: 4, width: 6, height: 4 },
      { floorId: floor.id, type: 'lounge',       label: '休憩室', x: 7, y: 4, width: 4, height: 4 },
      { floorId: floor.id, type: 'office',       label: '執務室', x: 0, y: 9, width: 14, height: 6 },
    ],
  });

  // ── Users (10名) ──────────────────────────────────────────
  const userData = [
    { displayName: '田中 太郎',   email: 'tanaka@example.com',    jobTitle: 'プロジェクトマネージャー', role: 'admin',  workStyle: 'office', deskX: 1, deskY: 10 },
    { displayName: '鈴木 花子',   email: 'suzuki@example.com',    jobTitle: 'エンジニア',              role: 'member', workStyle: 'office', deskX: 2, deskY: 10 },
    { displayName: '山田 次郎',   email: 'yamada@example.com',    jobTitle: 'エンジニア',              role: 'member', workStyle: 'office', deskX: 3, deskY: 10 },
    { displayName: '高橋 美咲',   email: 'takahashi@example.com', jobTitle: 'デザイナー',              role: 'member', workStyle: 'office', deskX: 4, deskY: 10 },
    { displayName: '加藤 健太',   email: 'kato@example.com',      jobTitle: 'エンジニア',              role: 'member', workStyle: 'remote', deskX: 5, deskY: 10 },
    { displayName: '吉田 さくら', email: 'yoshida@example.com',   jobTitle: 'エンジニア',              role: 'member', workStyle: 'remote', deskX: 6, deskY: 10 },
    { displayName: '伊藤 拓也',   email: 'ito@example.com',       jobTitle: 'セールス',               role: 'member', workStyle: 'office', deskX: 7, deskY: 10 },
    { displayName: '渡辺 優子',   email: 'watanabe@example.com',  jobTitle: 'マーケター',             role: 'member', workStyle: 'office', deskX: 8, deskY: 10 },
    { displayName: '中村 賢一',   email: 'nakamura@example.com',  jobTitle: 'エンジニア',              role: 'member', workStyle: 'ses',    deskX: 9, deskY: 10 },
    { displayName: '小林 純',     email: 'kobayashi@example.com', jobTitle: 'バックエンドエンジニア', role: 'member', workStyle: 'office', deskX: 10, deskY: 10 },
  ];

  const users = await Promise.all(
    userData.map(d =>
      prisma.user.create({
        data: { ...d, branchId: sapporo.id, floorId: floor.id },
      }),
    ),
  );
  const [tanaka, suzuki, yamada, takahashi, kato, yoshida, ito, watanabe, nakamura, kobayashi] = users;

  // ── Profile Questions ─────────────────────────────────────
  const [q1, q2, q3, q4] = await Promise.all([
    prisma.profileQuestion.create({ data: { question: '趣味・特技を教えてください', order: 1 } }),
    prisma.profileQuestion.create({ data: { question: '最近ハマっていることは？', order: 2 } }),
    prisma.profileQuestion.create({ data: { question: '得意な技術スタックは？', order: 3 } }),
    prisma.profileQuestion.create({ data: { question: '座右の銘を教えてください', order: 4 } }),
  ]);

  // サンプル回答
  await prisma.userProfile.createMany({
    data: [
      { userId: tanaka.id, questionId: q1.id, answer: 'ゴルフ・読書' },
      { userId: tanaka.id, questionId: q3.id, answer: 'TypeScript, Node.js' },
      { userId: suzuki.id, questionId: q1.id, answer: 'カフェ巡り' },
      { userId: suzuki.id, questionId: q3.id, answer: 'React, TypeScript' },
      { userId: yamada.id, questionId: q2.id, answer: 'Rust の勉強' },
      { userId: takahashi.id, questionId: q1.id, answer: 'イラスト制作' },
    ],
  });

  // ── Groups ────────────────────────────────────────────────
  const [ecProject, mobileProject, newBizTeam, aiTeam, golfClub] = await Promise.all([
    prisma.group.create({ data: { name: 'ECサイト刷新',     category: 'project', assignType: 'client'  } }),
    prisma.group.create({ data: { name: 'モバイルアプリ',   category: 'project', assignType: 'inhouse' } }),
    prisma.group.create({ data: { name: '新規案件獲得チーム', category: 'team' } }),
    prisma.group.create({ data: { name: 'AI強化委員会',     category: 'team' } }),
    prisma.group.create({ data: { name: 'ゴルフ部',         category: 'club' } }),
  ]);

  // ── UserGroups ────────────────────────────────────────────
  await prisma.userGroup.createMany({
    data: [
      // ECサイト刷新 (client) — 田中(multi)、鈴木(client)
      { userId: tanaka.id,    groupId: ecProject.id,    role: 'PM',       assignRate: 80  },
      { userId: suzuki.id,    groupId: ecProject.id,    role: 'engineer', assignRate: 100 },
      // モバイルアプリ (inhouse) — 田中(multi)、山田・小林(inhouse)
      { userId: tanaka.id,    groupId: mobileProject.id, role: 'PM',       assignRate: 20  },
      { userId: yamada.id,    groupId: mobileProject.id, role: 'engineer', assignRate: 100 },
      { userId: kobayashi.id, groupId: mobileProject.id, role: 'engineer', assignRate: 100 },
      // チーム
      { userId: ito.id,       groupId: newBizTeam.id },
      { userId: watanabe.id,  groupId: newBizTeam.id },
      { userId: kato.id,      groupId: aiTeam.id },
      { userId: yoshida.id,   groupId: aiTeam.id },
      // 部活
      { userId: tanaka.id,    groupId: golfClub.id },
      { userId: ito.id,       groupId: golfClub.id },
    ],
  });

  console.log('✅ Seed complete!');
  console.log(`  Branches: 5（札幌・東京・名古屋・福岡・苫小牧）`);
  console.log(`  Users: ${users.length}名`);
  console.log(`  Groups: ECサイト刷新 / モバイルアプリ / 新規案件獲得チーム / AI強化委員会 / ゴルフ部`);
  console.log(`  田中さん → multi（ECサイト + モバイルアプリ）`);
  console.log(`  鈴木さん → client（ECサイト刷新）`);
  console.log(`  山田・小林さん → inhouse（モバイルアプリ）`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
