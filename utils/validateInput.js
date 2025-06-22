function sanitizeInput(input) {
  // Aqui você pode melhorar depois, mas para já funcionar:
  if (typeof input !== 'string') return '';
  // Remove caracteres de controle e espaços desnecessários
  return input.replace(/[\x00-\x1F\x7F]+/g, '').trim();
}

module.exports = { sanitizeInput };
