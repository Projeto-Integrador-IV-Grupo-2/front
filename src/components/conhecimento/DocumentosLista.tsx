import { Link } from 'react-router-dom'
import { caminhoDocumento } from '../../routes/paths.ts'
import {
  ROTULOS_STATUS_CONTEUDO,
  ROTULOS_TIPO_CONTEUDO,
  type Conteudo,
} from '../../types/conteudo.ts'
import { Selo, SeloNeutro } from '../trilhas/StatusProgresso.tsx'
import { formatarInstante } from '../trilhas/formatacao.ts'
import styles from './DocumentosLista.module.css'

interface DocumentosListaProps {
  documentos: Conteudo[]
  /** ADMIN e GESTOR veem o status (rascunho ou publicado) de cada um. */
  mostrarStatus: boolean
}

/**
 * Título, categoria, área, tipo e data de atualização. No desktop é uma
 * tabela; no celular cada linha vira um cartão, com o rótulo de cada dado ao
 * lado do valor (ver o CSS).
 *
 * O título leva ao detalhe do documento (issue #49), onde ficam os arquivos,
 * o download e a pré-visualização.
 */
export function DocumentosLista({
  documentos,
  mostrarStatus,
}: DocumentosListaProps) {
  return (
    <table className={styles.tabela}>
      <caption className="visually-hidden">Documentos encontrados</caption>
      <thead>
        <tr>
          <th scope="col">Título</th>
          <th scope="col">Categoria</th>
          <th scope="col">Área</th>
          <th scope="col">Tipo</th>
          <th scope="col">Atualizado em</th>
          {mostrarStatus && <th scope="col">Status</th>}
        </tr>
      </thead>
      <tbody>
        {documentos.map((documento) => (
          <tr key={documento.id}>
            <th scope="row" className={styles.titulo}>
              <Link to={caminhoDocumento(documento.id)} className={styles.link}>
                {documento.titulo}
              </Link>
              {documento.descricao && (
                <span className={styles.descricao}>{documento.descricao}</span>
              )}
            </th>
            <td data-rotulo="Categoria">
              {documento.categoria?.nome ?? 'Sem categoria'}
            </td>
            <td data-rotulo="Área">
              {documento.area?.nome ?? 'Todas as áreas'}
            </td>
            <td data-rotulo="Tipo">
              <SeloNeutro>{ROTULOS_TIPO_CONTEUDO[documento.tipo]}</SeloNeutro>
            </td>
            <td data-rotulo="Atualizado em">
              <time dateTime={documento.atualizadoEm}>
                {formatarInstante(documento.atualizadoEm)}
              </time>
            </td>
            {mostrarStatus && (
              <td data-rotulo="Status">
                <Selo
                  tom={documento.status === 'PUBLICADO' ? 'sucesso' : 'atencao'}
                >
                  {ROTULOS_STATUS_CONTEUDO[documento.status]}
                </Selo>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
