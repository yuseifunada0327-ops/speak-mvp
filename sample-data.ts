// Supabase未接続時のフォールバック用サンプルデータ

export const sampleVocabulary = [
  {
    id: "1",
    word: "ambiguous",
    phonetic: "/æmˈbɪɡjuəs/",
    meaning: "あいまいな、複数の解釈ができる",
    example: "His answer was ambiguous and left us confused.",
    exampleJa: "彼の答えはあいまいで、私たちは混乱した。",
    level: "B2",
  },
  {
    id: "2",
    word: "diligent",
    phonetic: "/ˈdɪlɪdʒənt/",
    meaning: "勤勉な、熱心な",
    example: "She is a diligent student who studies every day.",
    exampleJa: "彼女は毎日勉強する勤勉な学生だ。",
    level: "B1",
  },
  {
    id: "3",
    word: "resilient",
    phonetic: "/rɪˈzɪliənt/",
    meaning: "回復力のある、立ち直りが早い",
    example: "Children are remarkably resilient to change.",
    exampleJa: "子どもは変化に対して驚くほど回復力がある。",
    level: "B2",
  },
  {
    id: "4",
    word: "inevitable",
    phonetic: "/ɪˈnevɪtəbl/",
    meaning: "避けられない、必然の",
    example: "Conflict was inevitable given the circumstances.",
    exampleJa: "あの状況では衝突は避けられなかった。",
    level: "B2",
  },
  {
    id: "5",
    word: "scrutinize",
    phonetic: "/ˈskruːtɪnaɪz/",
    meaning: "綿密に調べる、精査する",
    example: "The auditor scrutinized every transaction.",
    exampleJa: "監査人はすべての取引を精査した。",
    level: "C1",
  },
];

export const sampleListening = [
  {
    id: "1",
    title: "Coffee Shop Conversation",
    titleJa: "カフェでの会話",
    level: "A2",
    durationSec: 45,
    transcript:
      "Hi, I'd like a medium latte, please. Would you like that hot or iced? Hot, please. And could I add an extra shot of espresso? Sure, that'll be $5.50.",
    transcriptJa:
      "ミディアムラテをお願いします。ホットですか、アイスですか？ホットで。エスプレッソをもう1ショット追加できますか？はい、5.50ドルになります。",
  },
  {
    id: "2",
    title: "Tech News Brief",
    titleJa: "テクノロジーニュース",
    level: "B1",
    durationSec: 60,
    transcript:
      "A new study reveals that artificial intelligence is transforming how we learn languages. Apps using AI can adapt to each learner's pace, making study sessions more efficient than ever before.",
    transcriptJa:
      "新しい研究によると、AIは私たちの言語学習を変革しています。AIを使うアプリは各学習者のペースに適応でき、学習効率を飛躍的に高めます。",
  },
  {
    id: "3",
    title: "Job Interview Excerpt",
    titleJa: "面接の一場面",
    level: "B2",
    durationSec: 75,
    transcript:
      "Tell me about a challenging project you led recently. Well, last quarter I managed a cross-functional team to launch a new feature within tight deadlines. We faced unexpected technical issues, but by prioritizing tasks and communicating clearly, we delivered on time.",
    transcriptJa:
      "最近リードした困難なプロジェクトについて教えてください。前四半期、厳しい締切の中で新機能をローンチするため部門横断チームを率いました。予期せぬ技術問題に直面しましたが、優先順位付けと明確なコミュニケーションで予定通り納品しました。",
  },
];

export const speakingScenarios = [
  {
    id: "cafe",
    title: "カフェで注文",
    titleEn: "Ordering at a Café",
    description: "コーヒーショップでドリンクを注文するシーン",
    level: "A2",
    icon: "☕",
    systemPrompt:
      "You are a friendly barista at a busy café. Help the user order drinks. Keep responses short and natural. Use A2-level English.",
  },
  {
    id: "airport",
    title: "空港チェックイン",
    titleEn: "Airport Check-in",
    description: "国際線のチェックインカウンターでの会話",
    level: "B1",
    icon: "✈️",
    systemPrompt:
      "You are an airline check-in agent. Help the user check in for an international flight. Ask about luggage, seat preference, etc. Use B1-level English.",
  },
  {
    id: "interview",
    title: "ビジネス面接",
    titleEn: "Job Interview",
    description: "外資系企業の英語面接シミュレーション",
    level: "B2",
    icon: "💼",
    systemPrompt:
      "You are a hiring manager interviewing the user for a software engineer position. Ask common interview questions. Provide constructive follow-ups. Use B2-level English.",
  },
  {
    id: "meeting",
    title: "ミーティング",
    titleEn: "Team Meeting",
    description: "プロジェクト進捗を議論するミーティング",
    level: "B2",
    icon: "👥",
    systemPrompt:
      "You are a project manager running a team meeting. Discuss progress, blockers, and next steps with the user. Use B2-level business English.",
  },
];
