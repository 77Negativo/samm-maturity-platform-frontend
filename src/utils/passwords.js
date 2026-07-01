export const generatePassword = (length = 12) => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%*?';
  const all = `${letters}${numbers}${symbols}`;
  const pick = (chars) => {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return chars[values[0] % chars.length];
  };

  const result = [pick(letters), pick(numbers), pick(symbols)];
  while (result.length < length) {
    result.push(pick(all));
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    const j = values[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
};
