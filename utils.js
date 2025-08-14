// Função auxiliar para gerar CPF válido para testes
function generateValidTestCPF() {
  // CPFs válidos para teste do Mercado Pago
  const testCPFs = [
    '11144477735',
    '11111111111', 
    '22222222222',
    '33333333333'
  ];
  return testCPFs[Math.floor(Math.random() * testCPFs.length)];
}

// Função para validar CPF
function isValidCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  
  const digits = cpf.split('').map(el => +el);
  const rest = (n) => (digits.slice(0, n).reduce((sum, el, index) => sum + el * (n + 1 - index), 0) * 10) % 11 % 10;
  
  return rest(9) === digits[9] && rest(10) === digits[10];
}

module.exports = { generateValidTestCPF, isValidCPF };
