/**
 * O nome do renderizador WebGL é de um desenho feito pela CPU (sem placa de vídeo ou com ela desligada)? Usado pelo
 * gráfico de notas para ficar leve nesses casos (U48).
 */
export function isSoftwareRenderer(name: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)
}
