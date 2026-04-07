export function validarCpf(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '')
  if (nums.length !== 11) return false
  if (/^(\d)\1+$/.test(nums)) return false

  const calc = (fator: number) =>
    nums
      .slice(0, fator - 1)
      .split('')
      .reduce((acc, n, i) => acc + parseInt(n) * (fator - i), 0)

  const dig = (soma: number) => {
    const r = (soma * 10) % 11
    return r >= 10 ? 0 : r
  }

  const d1 = dig(calc(10))
  const d2 = dig(calc(11))

  return d1 === parseInt(nums[9]) && d2 === parseInt(nums[10])
}

export function mascaraCpf(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}