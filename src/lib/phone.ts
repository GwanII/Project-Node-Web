export const normalizeKoreanPhone = (phone: string) => {
  const numbers = phone.replace(/\D/g, "");

  // 01012345678 → 821012345678
  if (/^010\d{8}$/.test(numbers)) {
    return `82${numbers.slice(1)}`;
  }

  // 이미 국제번호 형식
  if (/^8210\d{8}$/.test(numbers)) {
    return numbers;
  }

  return null;
};