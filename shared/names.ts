// Add future approved names here. Each table draws without replacement.
export const BOT_NAMES = [
  'Don Lasagna',
  'Tony Tortellini',
  'Al Cappuccino',
  'The Silent Salami',
  'Capo Cannoli',
  'Al Pasta',
  'Don Salami',
  'Lil Capo',
  'Don Ravioli',
];
export function lobbyName(code: string) {
  const names = [
    'The Pasta Club',
    'Secret Sauce',
    'The Last Cannoli',
    'No Alibis',
    'The Quiet Table',
    'Spaghetti Syndicate',
    'The Lucky Fork',
    'Operation Ravioli',
  ];
  return (
    names[
      (Array.from(code).reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 0) >>> 0) % names.length
    ] ?? names[(code.charCodeAt(0) || 0) % names.length]
  );
}
