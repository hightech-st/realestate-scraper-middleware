import { cleanUpText } from '../cleanUpText';

describe('cleanUpText', () => {
  it('should preserve numbers and letters while removing emojis', () => {
    const input = '🏡 2PN - 0332.807.587';
    const expected = '2PN 0332 807 587';
    expect(cleanUpText(input)).toBe(expected);
  });

  it('should clean up text by removing emojis, special characters, and formatting', () => {
    const input = `🏡 Cho thuê căn hộ 2PN kiểu Duplex – Hoàng Sĩ Khải, Sơn Trà
✨ Phòng mới, thiết kế hiện đại, không gian sống lý tưởng!
📍 Vị trí: Gần Phạm Văn Đồng, kiệt ô tô, đậu xe gần nhà
✓ Có thang máy – di chuyển tiện lợi
✓ Sân thượng chill – thoáng mát, thư giãn mỗi ngày
✓ Máy giặt kèm sấy, tiện nghi đầy đủ – dọn vào ở ngay!
-----
☎️ Liên hệ: 0332.807.587 (Facebook/Zalo/Whatsapp)`;

    const expected = `Cho thuê căn hộ 2PN kiểu Duplex Hoàng Sĩ Khải Sơn Trà Phòng mới thiết kế hiện đại không gian sống lý tưởng Vị trí Gần Phạm Văn Đồng kiệt ô tô đậu xe gần nhà Có thang máy di chuyển tiện lợi Sân thượng chill thoáng mát thư giãn mỗi ngày Máy giặt kèm sấy tiện nghi đầy đủ dọn vào ở ngay Liên hệ 0332 807 587 Facebook Zalo Whatsapp`;

    const result = cleanUpText(input);
    expect(result).toBe(expected);
  });

  it('should handle empty string', () => {
    expect(cleanUpText('')).toBe('');
  });

  it('should handle string with only special characters', () => {
    expect(cleanUpText('🏡✨📍✓☎️')).toBe('');
  });

  it('should handle string with multiple spaces', () => {
    expect(cleanUpText('  multiple    spaces  ')).toBe('multiple spaces');
  });

  it('should handle string with HTML tags', () => {
    expect(cleanUpText('<p>Hello</p>\n<div>World</div>')).toBe('Hello World');
  });
});
